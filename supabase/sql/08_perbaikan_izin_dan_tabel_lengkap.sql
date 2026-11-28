-- ============================================================================
-- TAHAP 8: PERBAIKAN IZIN AKSES (FIX ERROR 42501) + 3 TABEL BARU LENGKAP
-- Jalankan di Supabase SQL Editor (copy-paste semua lalu klik RUN).
-- Aman dijalankan berulang kali (100% idempotent).
--
-- Yang diperbaiki & ditambahkan:
-- 1. Memberikan GRANT akses schema, tabel, sequence & fungsi ke role
--    `anon`, `authenticated`, dan `service_role` (mengatasi 42501 permission denied).
-- 2. Menambah 3 tabel aplikasi yang sebelumnya belum ada di Supabase:
--    - public.farm_tasks          (tugas harian kebun per farm)
--    - public.reminder_schedules  (jadwal pengingat siram/cek daun/pupuk/panen)
--    - public.notifications       (riwayat notifikasi & peringatan lonceng)
-- 3. Menambah kolom preferensi notifikasi di public.profiles.
-- 4. Melepas FK kaku pada scans.penyakit_utama_id & dugaan_hara_id agar
--    hasil scan AI (termasuk penyakit eksternal baru) tidak pernah ditolak DB.
-- 5. Backfill akun auth.users ke public.profiles & reload schema cache PostgREST.
-- ============================================================================

-- 1. Kolom preferensi notifikasi tambahan di public.profiles
alter table public.profiles
  add column if not exists notifikasi_browser boolean not null default false,
  add column if not exists peringatan_otomatis_sensor boolean not null default true;

-- 2. Pengaman tabel scans agar ID penyakit/hara baru dari AI tidak memicu error FK 23503
alter table public.scans drop constraint if exists scans_penyakit_utama_id_fkey;
alter table public.scans drop constraint if exists scans_dugaan_hara_id_fkey;
create index if not exists idx_scans_penyakit_id on public.scans (penyakit_utama_id);
create index if not exists idx_scans_hara_id on public.scans (dugaan_hara_id);

-- 3. Backfill semua akun auth.users yang belum punya baris di public.profiles
insert into public.profiles (id, nama, telegram_link_code)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'nama', split_part(u.email, '@', 1), 'Pengguna'),
  lpad((floor(random() * 900000) + 100000)::text, 6, '0')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 4. TABEL 12: Tugas Harian Kebun (farm_tasks)
create table if not exists public.farm_tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  plant_id uuid references public.plants (id) on delete set null,
  judul text not null,
  kategori text not null default 'cek' check (kategori in ('siram', 'cek', 'panen', 'pupuk')),
  waktu_label text not null default 'Hari ini',
  selesai boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_farm_tasks_farm_id on public.farm_tasks (farm_id, created_at desc);

-- 5. TABEL 13: Jadwal Pengingat Rutin (reminder_schedules)
create table if not exists public.reminder_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  kategori text not null default 'siram' check (kategori in ('siram', 'cek_daun', 'pupuk', 'panen')),
  jam text not null default '07:00',
  aktif boolean not null default true,
  catatan text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_reminder_schedules_user_jam
  on public.reminder_schedules (user_id, jam asc);

-- 6. TABEL 14: Riwayat Notifikasi & Peringatan (notifications)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  judul text not null,
  isi text not null,
  waktu_label text not null default 'Baru saja',
  tipe text not null default 'telegram'
    check (tipe in ('panen', 'penyakit', 'tandon', 'energi', 'telegram', 'siram', 'pupuk')),
  severity text not null default 'info'
    check (severity in ('info', 'warn', 'bad', 'ok')),
  dibaca boolean not null default false,
  action_label text,
  action_screen text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- 7. Aktifkan RLS & Kebijakan Kepemilikan untuk 3 tabel baru
alter table public.farm_tasks enable row level security;
alter table public.reminder_schedules enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "farm_tasks_own_all" on public.farm_tasks;
create policy "farm_tasks_own_all" on public.farm_tasks
  for all using (public.owns_farm(farm_id)) with check (public.owns_farm(farm_id));

drop policy if exists "reminder_schedules_own_all" on public.reminder_schedules;
create policy "reminder_schedules_own_all" on public.reminder_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications_own_all" on public.notifications;
create policy "notifications_own_all" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. PERBAIKAN UTAMA: GRANT hak akses schema, 14 tabel, sequence & fungsi
-- (Tanpa GRANT ini, Supabase mengembalikan 42501 permission denied walau RLS sudah ada!)
grant usage on schema public to anon, authenticated, service_role;

grant select on public.knowledge_diseases, public.knowledge_nutrients
  to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on function public.owns_farm(uuid) to authenticated, service_role;
grant execute on function public.owns_plant(uuid) to authenticated, service_role;
grant execute on function public.owns_device(uuid) to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

-- 9. Muat ulang cache skema API PostgREST agar perubahan langsung aktif
notify pgrst, 'reload schema';
