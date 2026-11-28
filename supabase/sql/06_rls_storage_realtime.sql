-- ============================================================================
-- TAHAP 6: KEAMANAN (RLS), STORAGE FOTO SCAN & REALTIME IOT
-- Jalankan setelah TAHAP 1 s.d. TAHAP 5 berhasil.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.plants enable row level security;
alter table public.scans enable row level security;
alter table public.knowledge_diseases enable row level security;
alter table public.knowledge_nutrients enable row level security;
alter table public.devices enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.irrigation_events enable row level security;
alter table public.harvest_events enable row level security;
alter table public.chat_messages enable row level security;

-- Helper kepemilikan
create or replace function public.owns_farm(target_farm_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.farms
    where id = target_farm_id and user_id = auth.uid()
  );
$$;

create or replace function public.owns_plant(target_plant_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.plants p
    join public.farms f on f.id = p.farm_id
    where p.id = target_plant_id and f.user_id = auth.uid()
  );
$$;

create or replace function public.owns_device(target_device_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.devices d
    join public.farms f on f.id = d.farm_id
    where d.id = target_device_id and f.user_id = auth.uid()
  );
$$;

-- RLS Policies per tabel
drop policy if exists "profiles_own_all" on public.profiles;
create policy "profiles_own_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "farms_own_all" on public.farms;
create policy "farms_own_all" on public.farms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plants_own_all" on public.plants;
create policy "plants_own_all" on public.plants
  for all using (public.owns_farm(farm_id)) with check (public.owns_farm(farm_id));

drop policy if exists "scans_own_all" on public.scans;
create policy "scans_own_all" on public.scans
  for all using (public.owns_plant(plant_id)) with check (public.owns_plant(plant_id));

drop policy if exists "knowledge_diseases_read" on public.knowledge_diseases;
create policy "knowledge_diseases_read" on public.knowledge_diseases
  for select using (true);

drop policy if exists "knowledge_nutrients_read" on public.knowledge_nutrients;
create policy "knowledge_nutrients_read" on public.knowledge_nutrients
  for select using (true);

drop policy if exists "devices_own_all" on public.devices;
create policy "devices_own_all" on public.devices
  for all using (public.owns_farm(farm_id)) with check (public.owns_farm(farm_id));

drop policy if exists "sensor_readings_own_all" on public.sensor_readings;
create policy "sensor_readings_own_all" on public.sensor_readings
  for all using (public.owns_device(device_id)) with check (public.owns_device(device_id));

drop policy if exists "irrigation_events_own_all" on public.irrigation_events;
create policy "irrigation_events_own_all" on public.irrigation_events
  for all using (public.owns_device(device_id)) with check (public.owns_device(device_id));

drop policy if exists "harvest_events_own_all" on public.harvest_events;
create policy "harvest_events_own_all" on public.harvest_events
  for all using (public.owns_plant(plant_id)) with check (public.owns_plant(plant_id));

drop policy if exists "chat_messages_own_all" on public.chat_messages;
create policy "chat_messages_own_all" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage Bucket 'scan-photos' (Private, maks 10 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scan-photos',
  'scan-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "scan_photos_owner_select" on storage.objects;
create policy "scan_photos_owner_select" on storage.objects
  for select using (
    bucket_id = 'scan-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "scan_photos_owner_insert" on storage.objects;
create policy "scan_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'scan-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "scan_photos_owner_delete" on storage.objects;
create policy "scan_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'scan-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Aktifkan Realtime untuk sensor & perangkat IoT
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sensor_readings'
  ) then
    alter publication supabase_realtime add table public.sensor_readings;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end $$;

-- Hak akses GRANT dasar agar API Supabase (anon, authenticated, service_role) tidak terkena 42501
grant usage on schema public to anon, authenticated, service_role;
grant select on public.knowledge_diseases, public.knowledge_nutrients to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on function public.owns_farm(uuid) to authenticated, service_role;
grant execute on function public.owns_plant(uuid) to authenticated, service_role;
grant execute on function public.owns_device(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
