# CermatTani (Repo Menyeluruh — Monorepo)

Repositori menyeluruh proyek **CermatTani** (InSaintek 2026) sesuai `PRD (1).md` dan `DESIGN (3).md` — khusus budidaya **tomat** berbasis computer vision + IoT surya + maskot **Cermo**.

## 📱 Download Aplikasi Android (siap install)

### [⬇️ Download CermatTani v1.1.0 (APK)](https://github.com/ahmadrhezkiprasetya/CermatTani/raw/main/applications/release/CermatTani-v1.1.0.apk)

| | |
|---|---|
| Versi | **1.1.0** |
| Ukuran | **21.5 MB** |
| Perangkat | Android 7.0 ke atas (HP 64-bit / arm64 — hampir semua HP Android sekarang) |
| File di repo | [`applications/release/CermatTani-v1.1.0.apk`](applications/release/CermatTani-v1.1.0.apk) |

**Cara install di HP:**

1. Buka link **Download** di atas dari browser HP Android, lalu unduh file APK-nya.
2. Buka file `CermatTani-v1.1.0.apk` dari notifikasi unduhan atau aplikasi **File**.
3. Bila muncul peringatan **"Install aplikasi tidak dikenal"**, ketuk **Setelan → izinkan dari sumber ini**, lalu kembali.
4. Ketuk **Install**, tunggu selesai, lalu **Buka**.
5. Masuk dengan akun yang sama seperti di website.

Yang sudah aktif di APK ini:
- **Scan foto & Chat Cermo** memakai AI **KoboiLLM** (hemat token: mode gambar ringan, jawaban JSON ringkas).
- **Pengingat Telegram** lewat bot **@CermatTaniBot**.
- **Sinkron akun & data** dengan Supabase (sama dengan website).

> Website: **https://cermattaniweb.vercel.app**

---

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

## 3. Cara Menjalankan & Build Mobile App (Flutter)

Buat file `applications/.env.json` (tidak ikut ke git) berisi kunci yang sama dengan website:

```json
{
  "SUPABASE_URL": "https://PROJECT-ID.supabase.co",
  "SUPABASE_ANON_KEY": "eyJ...",
  "KOBOILLM_API_KEY": "sk-...",
  "TELEGRAM_BOT_TOKEN": "123456:AA...",
  "GEMINI_API_KEY": ""
}
```

`KOBOILLM_API_KEY` dipakai untuk AI (Scan & Chat). `GEMINI_API_KEY` hanya cadangan bila KoboiLLM kosong.

```powershell
cd applications
flutter pub get

# Jalankan di HP/emulator
flutter run --dart-define-from-file=.env.json

# Build APK siap install (HP arm64)
flutter build apk --release --target-platform android-arm64 --dart-define-from-file=.env.json
# Hasil: applications/build/app/outputs/flutter-apk/app-release.apk
```

---

## 4. Cara Sinkronisasi ke 3 Repo GitHub

```powershell
git add .
git commit -m "Update CermatTani"
powershell -ExecutionPolicy Bypass -File .\sync-repos.ps1
```
