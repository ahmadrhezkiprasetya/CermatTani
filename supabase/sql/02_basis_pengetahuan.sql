-- ============================================================================
-- TAHAP 2: BASIS PENGETAHUAN (knowledge_diseases & knowledge_nutrients)
-- Jalankan setelah TAHAP 1 berhasil.
-- ============================================================================

create table if not exists public.knowledge_diseases (
  id text primary key,
  penyakit text not null,
  komoditas text[] not null default array['umum'],
  bagian_umum text[] not null default '{}',
  penyebab text not null,
  gejala text not null,
  solusi_organik text[] not null default '{}',
  solusi_kimia text[] not null default '{}',
  pencegahan text[] not null default '{}',
  sumber text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_nutrients (
  id text primary key,
  komoditas text[] not null default array['umum'],
  gejala text not null,
  dugaan text not null,
  rekomendasi_organik text not null,
  rekomendasi_pupuk text not null,
  dosis_per_fase jsonb not null default '{}'::jsonb,
  sumber text not null,
  updated_at timestamptz not null default now()
);
