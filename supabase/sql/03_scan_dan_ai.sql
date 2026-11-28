-- ============================================================================
-- TAHAP 3: SCAN & AI (scans — umum untuk semua bagian & jenis tanaman)
-- Jalankan setelah TAHAP 1 dan TAHAP 2 berhasil.
-- ============================================================================

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  waktu timestamptz not null default now(),
  bagian text not null check (bagian in ('buah', 'daun', 'batang', 'bunga', 'akar', 'keseluruhan')),
  foto_path text,
  foto_ukuran_asli_kb integer,
  foto_ukuran_kompres_kb integer,
  -- Hasil kematangan / kondisi panen & estimasi hasil
  boxes jsonb not null default '[]'::jsonb,
  tahap_dominan text,
  jumlah_objek integer not null default 0,
  anjuran_panen text not null default 'Pantau berkala',
  estimasi_hari_min integer,
  estimasi_hari_max integer,
  estimasi_disesuaikan_riwayat boolean not null default false,
  estimasi_bobot_gram integer not null default 0,
  -- Hasil penyakit / kesehatan
  penyakit_top3 jsonb not null default '[]'::jsonb,
  penyakit_utama_id text references public.knowledge_diseases (id) on delete set null,
  penyakit_utama_nama text not null default 'Sehat',
  keyakinan integer not null check (keyakinan between 0 and 100),
  keyakinan_rendah boolean not null default false,
  -- Dugaan hara & rekomendasi pupuk
  dugaan_hara_id text references public.knowledge_nutrients (id) on delete set null,
  dugaan_hara_nama text not null default 'Hara terlihat seimbang',
  pakai_data_sensor boolean not null default false,
  objek_tidak_terdeteksi boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_scans_plant_waktu on public.scans (plant_id, waktu desc);
