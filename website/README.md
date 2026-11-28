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

1. Salin `.env.example` menjadi `.env.local`, lalu isi URL, anon key, dan service role key Supabase. Jangan pernah memakai awalan `NEXT_PUBLIC_` untuk service role key atau token Telegram.
2. Jalankan `supabase/migrations/20261125000000_telegram_linking.sql` di Supabase SQL Editor.
3. Di Telegram, buka **@BotFather**, jalankan `/newbot`, isi nama tampilan dan username yang berakhiran `bot`, lalu simpan token yang diberikan sebagai `TELEGRAM_BOT_TOKEN`. Set username bot di `TELEGRAM_BOT_USERNAME` (tanpa `@`).
4. Opsional, atur profil bot melalui `/setdescription`, `/setabouttext`, dan `/setuserpic`.
5. Di BotFather, kirim `/setcommands` dan pilih bot, lalu masukkan:

   ```text
   start - Mulai dan hubungkan akun CermatTani
   help - Bantuan penggunaan bot
   status - Cek status koneksi akun
   unlink - Putuskan koneksi akun
   ```

6. Isi `TELEGRAM_WEBHOOK_SECRET` dengan rahasia acak. Buat nilai aman, misalnya dengan `node -p "require('node:crypto').randomBytes(32).toString('base64url')"`.
7. Deploy aplikasi ke URL HTTPS publik. Telegram tidak dapat mengirim webhook ke `localhost`. Jalankan skrip berikut di PowerShell dari root project. Skrip membaca token dan secret dari environment atau `.env`, memeriksa agar token bot cocok dengan deployment Vercel, menguji endpoint dan secret webhook, lalu mendaftarkan webhook tanpa menampilkan token:

   ```powershell
   .\scripts\setup-telegram-webhook.ps1
   ```

   URL deployment sudah diatur di skrip. Jika konfigurasi disimpan di file lain, tambahkan `-EnvFile ".env.local"`. Verifikasi status dari kartu Telegram di **Kalender → Telegram**; jika webhook belum terdaftar atau Telegram gagal menghubunginya, halaman akan menampilkan status/error webhook.

8. Login ke CermatTani, buka **Kalender → Telegram**, buat kode tautan, lalu tekan **Start** dari tautan bot. Kode berlaku 10 menit, hanya bisa digunakan sekali, dan status koneksi diperbarui otomatis.

Koneksi Telegram disimpan di tabel Supabase yang hanya dapat diakses server. API pengiriman memverifikasi sesi pengguna dan mengambil Chat ID dari akun tersebut; klien tidak dapat memilih Chat ID tujuan. Pengingat jadwal yang sudah ada dikirim ketika aplikasi berjalan. Pengiriman terjadwal saat browser tertutup memerlukan job terjadwal/cron di deployment.

Untuk build produksi:
```bash
npm run build
npm run start
```
