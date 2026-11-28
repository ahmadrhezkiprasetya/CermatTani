-- ============================================================================
-- TAHAP 1: AKUN & KEBUN (profiles, farms, plants — semua jenis tanaman)
-- Copy-paste seluruh isi file ini ke Supabase SQL Editor lalu klik RUN.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Tabel Akun (profiles, terhubung 1:1 dengan auth.users Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null default 'Pengguna',
  peran text not null default 'Petani',
  telegram_chat_id text unique,
  telegram_link_code text,
  telegram_reminder_time text not null default '07:00',
  bahasa text not null default 'id',
  tema text not null default 'light' check (tema in ('light', 'dark', 'system')),
  ambang_keyakinan_rendah integer not null default 60 check (ambang_keyakinan_rendah between 30 and 95),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: otomatis buat baris profiles saat user mendaftar via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nama, telegram_link_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', split_part(new.email, '@', 1), 'Pengguna'),
    lpad((floor(random() * 900000) + 100000)::text, 6, '0')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tabel Kebun (multi-kebun per akun)
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nama text not null,
  lokasi text not null default 'Lahan utama',
  luas_label text not null default 'Lahan budidaya',
  created_at timestamptz not null default now()
);

create index if not exists idx_farms_user_id on public.farms (user_id);

-- 3. Tabel Tanaman (umum untuk semua jenis komoditas)
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  nama text not null,
  komoditas text not null default 'Umum',
  varietas text not null default 'Umum',
  bobot_rata_hasil_gram integer check (bobot_rata_hasil_gram is null or bobot_rata_hasil_gram > 0),
  tanggal_tanam date not null default current_date,
  fase text not null default 'Vegetatif',
  catatan text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_plants_farm_id on public.plants (farm_id);
create index if not exists idx_plants_komoditas on public.plants (komoditas);
