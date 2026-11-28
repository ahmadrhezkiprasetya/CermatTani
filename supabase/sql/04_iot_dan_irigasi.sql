-- ============================================================================
-- TAHAP 4: IOT & IRIGASI (devices, sensor_readings, irrigation_events)
-- Jalankan setelah TAHAP 1 berhasil.
-- ============================================================================

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  nama_perangkat text not null default 'ESP32 Lahan Utama',
  token_hash text not null unique,
  tipe text not null default 'ESP32 + Sensor Tanah + DHT22/BME280 + BH1750 + Ultrasonik + INA219',
  status text not null default 'aktif' check (status in ('aktif', 'mode_hemat', 'offline')),
  simulasi boolean not null default true,
  irigasi_otomatis boolean not null default true,
  pompa_menyala boolean not null default false,
  ambang_tanah_bawah integer not null default 35 check (ambang_tanah_bawah between 10 and 80),
  ambang_tanah_atas integer not null default 65 check (ambang_tanah_atas between 20 and 95),
  durasi_maks_pompa_menit integer not null default 15 check (durasi_maks_pompa_menit between 1 and 60),
  ambang_kelembapan_penyakit integer not null default 85 check (ambang_kelembapan_penyakit between 60 and 98),
  ambang_tandon_rendah integer not null default 20 check (ambang_tandon_rendah between 5 and 50),
  ambang_baterai_hemat integer not null default 20 check (ambang_baterai_hemat between 5 and 40),
  last_seen_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_devices_farm_id on public.devices (farm_id);

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  device_id uuid not null references public.devices (id) on delete cascade,
  waktu timestamptz not null default now(),
  kelembapan_tanah numeric(5,2),
  ph_tanah numeric(4,2),
  nitrogen_mg_kg numeric(6,2),
  fosfor_mg_kg numeric(6,2),
  kalium_mg_kg numeric(6,2),
  suhu_udara numeric(5,2),
  kelembapan_udara numeric(5,2),
  cahaya_lux numeric(8,1),
  jarak_ultrasonik_cm numeric(6,2),
  level_tandon_persen numeric(5,2),
  tegangan_volt numeric(5,2),
  arus_ma numeric(7,2),
  daya_watt numeric(6,2),
  baterai_persen numeric(5,2),
  simulasi boolean not null default true
);

create index if not exists idx_sensor_readings_device_waktu
  on public.sensor_readings (device_id, waktu desc);

create table if not exists public.irrigation_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  mulai timestamptz not null default now(),
  selesai timestamptz,
  durasi_menit integer not null default 0,
  kelembapan_awal integer not null,
  kelembapan_akhir integer,
  mode text not null check (mode in ('Otomatis', 'Manual')),
  simulasi boolean not null default true
);

create index if not exists idx_irrigation_device_mulai
  on public.irrigation_events (device_id, mulai desc);
