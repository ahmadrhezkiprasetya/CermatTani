# CermatTani (Repo Menyeluruh — Monorepo)

Repositori menyeluruh proyek **CermatTani** (InSaintek 2026) sesuai `PRD (1).md` dan `DESIGN (3).md` — khusus budidaya **tomat** berbasis computer vision + IoT surya + maskot **Cermo**.

## Struktur 3 Repositori (Monorepo + Git Subtree)

```text
CermatTani/                  -> Repo menyeluruh (origin -> CermatTani)
├── PRD (1).md               -> Dokumen spesifikasi produk
├── DESIGN (3).md            -> Dokumen sistem desain
├── supabase/                -> Schema SQL (11 tabel + RLS + Storage + Realtime) & seed.sql
├── sync-repos.ps1           -> Skrip 1 perintah untuk sync ke 3 repo GitHub
├── website/                 -> Repo khusus Website Next.js (web -> cermattani-web)
└── applications/            -> Repo khusus Mobile App Flutter (app -> cermattani-app)
```

---

## 1. Konfigurasi Database Supabase

1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor** di dashboard Supabase, lalu jalankan berurutan:
   - `supabase/migrations/001_cermattani_schema.sql` (membuat 11 tabel inti: `profiles`, `farms`, `plants`, `scans`, `knowledge_diseases`, `knowledge_nutrients`, `devices`, `sensor_readings`, `irrigation_events`, `harvest_events`, `chat_messages`, beserta RLS, Storage bucket `scan-photos`, dan Realtime).
   - `supabase/seed.sql` (mengisi data awal basis pengetahuan penyakit & pupuk tomat).
3. Ambil **Project URL**, **anon public key**, dan **service_role key** dari **Project Settings → API**.
4. Untuk **Website (Next.js)**: salin `website/.env.example` menjadi `website/.env.local` dan isi ketiga nilai tersebut.
5. Untuk **Mobile App (Flutter)**: jalankan dengan `--dart-define`:
   ```powershell
   cd applications
   flutter pub get
   flutter run --dart-define=SUPABASE_URL=https://PROJECT-ID.supabase.co --dart-define=SUPABASE_ANON_KEY=eyJ...
   ```

---

## 2. Cara Menjalankan Website (Next.js)

```powershell
cd website
npm install
npm run dev
```

Buka peramban di **http://localhost:3000**.

---

## 3. Cara Menjalankan Mobile App (Flutter)

```powershell
cd applications
flutter create --platforms=android,ios .   # cukup sekali jika folder android/ & ios/ belum ada
flutter pub get
flutter run
```

---

## 4. Cara Sinkronisasi ke 3 Repo GitHub

```powershell
git add .
git commit -m "Update CermatTani"
powershell -ExecutionPolicy Bypass -File .\sync-repos.ps1
```
