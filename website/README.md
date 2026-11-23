# CermatTani — Website (Next.js App Router + PWA)

Aplikasi web (PWA mobile-first) **CermatTani** dibangun menggunakan **Next.js 15 (App Router + TypeScript)** untuk pemantauan berbagai tanaman, kalender panen, irigasi, sensor IoT, dan energi surya berbasis computer vision + maskot **Cermo**.

## Cara Menjalankan

```bash
# 1. Pasang dependensi (jika belum)
npm install

# 2. Jalankan server pengembangan
npm run dev
```

Buka peramban di **http://localhost:3000**.

## Konfigurasi Supabase dan Telegram

Salin `.env.example` menjadi `.env.local`, lalu isi URL dan kunci publishable Supabase.
Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` di variabel publik atau di kode sisi klien.

Untuk Telegram server-side, isi `TELEGRAM_BOT_TOKEN` dan mulai percakapan dengan bot untuk memperoleh Chat ID numerik.

Untuk build produksi:
```bash
npm run build
npm run start
```
