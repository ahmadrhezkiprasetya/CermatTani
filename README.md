# CermatTani

Aplikasi **CermatTani** sesuai `PRD (1).md` dan `DESIGN (3).md` — khusus budidaya **tomat** berbasis computer vision + IoT surya + maskot **Cermo**:
- **Website (PWA + API Routes)**: **Next.js 15 (App Router + TypeScript)** di folder `src/` dan `public/`
- **Mobile Apps (Android / iOS)**: **Flutter (Riverpod + GoRouter)** di folder `lib/` dan `pubspec.yaml`

---

## 1. Cara Menjalankan Website (Next.js)

Pastikan **Node.js ≥ 18** sudah terpasang.

```bash
# 1. Pasang seluruh dependensi Next.js
npm install

# 2. Jalankan server pengembangan
npm run dev
```

Lalu buka peramban di **http://localhost:3000**.

Untuk build produksi:
```bash
npm run build
npm run start
```

---

## 2. Cara Menjalankan Aplikasi Mobile (Flutter)

Pastikan **Flutter SDK (Dart ≥ 3.4)** sudah terpasang dan emulator Android/iOS atau perangkat fisik tersambung.

```bash
# 1. Jika folder android/ dan ios/ belum ada di repo, buat kerangka platformnya dulu:
flutter create --platforms=android,ios .

# 2. Unduh dependensi Flutter
flutter pub get

# 3. Jalankan di emulator atau HP Android/iOS
flutter run
```
