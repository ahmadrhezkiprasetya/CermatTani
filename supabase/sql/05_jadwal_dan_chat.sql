-- ============================================================================
-- TAHAP 5: JADWAL PANEN & CHAT (harvest_events & chat_messages)
-- Jalankan setelah TAHAP 1 berhasil.
-- ============================================================================

create table if not exists public.harvest_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  tanggal date not null,
  sumber text not null default 'estimasi' check (sumber in ('estimasi', 'aktual')),
  catatan text not null default '',
  estimasi_kg numeric(8,2),
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_harvest_plant_tanggal on public.harvest_events (plant_id, tanggal);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plant_id uuid references public.plants (id) on delete set null,
  peran text not null check (peran in ('cermo', 'pengguna')),
  isi text not null,
  waktu timestamptz not null default now()
);

create index if not exists idx_chat_user_waktu on public.chat_messages (user_id, waktu asc);
