create table if not exists public.telegram_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id bigint not null unique,
  telegram_username text,
  connected_at timestamptz not null default now()
);

create table if not exists public.telegram_link_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[0-9]{6}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_link_attempts (
  chat_id bigint primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0
);

alter table public.telegram_connections enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.telegram_link_attempts enable row level security;

revoke all on public.telegram_connections from public, anon, authenticated;
revoke all on public.telegram_link_codes from public, anon, authenticated;
revoke all on public.telegram_link_attempts from public, anon, authenticated;
grant all on public.telegram_connections to service_role;
grant all on public.telegram_link_codes to service_role;
grant all on public.telegram_link_attempts to service_role;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'telegram_chat_id'
  ) then
    execute $migration$
      insert into public.telegram_connections (user_id, telegram_chat_id)
      select distinct on (p.telegram_chat_id::text)
        p.id,
        p.telegram_chat_id::text::bigint
      from public.profiles p
      where p.telegram_chat_id is not null
        and p.telegram_chat_id::text ~ '^[0-9]+$'
      order by p.telegram_chat_id::text, p.id
      on conflict do nothing
    $migration$;
  end if;
end;
$$;

create or replace function public.create_telegram_link_code(
  p_user_id uuid,
  p_code text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_code !~ '^[0-9]{6}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '15 minutes' then
    raise exception 'Invalid Telegram link code or expiry';
  end if;

  delete from public.telegram_link_codes
  where expires_at <= now();
  delete from public.telegram_link_attempts
  where window_started_at < now() - interval '1 day';

  insert into public.telegram_link_codes (user_id, code, expires_at)
  values (p_user_id, p_code, p_expires_at)
  on conflict (user_id) do update
  set code = excluded.code,
      expires_at = excluded.expires_at,
      created_at = now();
end;
$$;

create or replace function public.complete_telegram_link(
  p_code text,
  p_chat_id bigint,
  p_username text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if p_code !~ '^[0-9]{6}$' or p_chat_id <= 0 then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_chat_id::text, 0));

  select user_id into v_user_id
  from public.telegram_link_codes
  where code = p_code
    and expires_at > now()
  for update;

  if v_user_id is null then
    return null;
  end if;

  if exists (
    select 1 from public.telegram_connections
    where telegram_chat_id = p_chat_id and user_id <> v_user_id
  ) then
    raise exception using errcode = '23505', message = 'Telegram account already linked';
  end if;

  insert into public.telegram_connections (
    user_id, telegram_chat_id, telegram_username, connected_at
  )
  values (v_user_id, p_chat_id, nullif(p_username, ''), now())
  on conflict (user_id) do update
  set telegram_chat_id = excluded.telegram_chat_id,
      telegram_username = excluded.telegram_username,
      connected_at = excluded.connected_at;

  delete from public.telegram_link_codes where user_id = v_user_id;
  delete from public.telegram_link_attempts where chat_id = p_chat_id;
  return v_user_id;
end;
$$;

create or replace function public.allow_telegram_link_attempt(p_chat_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_count integer;
begin
  if p_chat_id <= 0 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_chat_id::text, 0));
  insert into public.telegram_link_attempts as current_attempts (
    chat_id, window_started_at, attempt_count
  )
  values (p_chat_id, now(), 1)
  on conflict (chat_id) do update
  set attempt_count = case
        when current_attempts.window_started_at <= now() - interval '10 minutes' then 1
        else current_attempts.attempt_count + 1
      end,
      window_started_at = case
        when current_attempts.window_started_at <= now() - interval '10 minutes' then now()
        else current_attempts.window_started_at
      end
  returning attempt_count into v_attempt_count;

  return v_attempt_count <= 5;
end;
$$;

create or replace function public.unlink_telegram_account(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chat_id bigint;
begin
  delete from public.telegram_connections
  where user_id = p_user_id
  returning telegram_chat_id into v_chat_id;

  delete from public.telegram_link_codes where user_id = p_user_id;
  return v_chat_id;
end;
$$;

create or replace function public.unlink_telegram_by_chat_id(p_chat_id bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_connections
  where telegram_chat_id = p_chat_id;

  if v_user_id is null then
    return null;
  end if;

  perform public.unlink_telegram_account(v_user_id);
  return v_user_id;
end;
$$;

revoke all on function public.create_telegram_link_code(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.allow_telegram_link_attempt(bigint) from public, anon, authenticated;
revoke all on function public.complete_telegram_link(text, bigint, text) from public, anon, authenticated;
revoke all on function public.unlink_telegram_account(uuid) from public, anon, authenticated;
revoke all on function public.unlink_telegram_by_chat_id(bigint) from public, anon, authenticated;

grant execute on function public.create_telegram_link_code(uuid, text, timestamptz) to service_role;
grant execute on function public.allow_telegram_link_attempt(bigint) to service_role;
grant execute on function public.complete_telegram_link(text, bigint, text) to service_role;
grant execute on function public.unlink_telegram_account(uuid) to service_role;
grant execute on function public.unlink_telegram_by_chat_id(bigint) to service_role;
