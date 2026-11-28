# CermatTani — Mobile App (Flutter)

Aplikasi mobile **CermatTani** (Android & iOS) dibangun menggunakan **Flutter**, **Riverpod**, dan **GoRouter** sesuai `PRD (1).md` dan `DESIGN (3).md` — khusus budidaya **tomat** berbasis computer vision + IoT surya + maskot **Cermo**.

## Download APK

**[⬇️ CermatTani v1.1.0 (Android, 21.5 MB)](https://github.com/ahmadrhezkiprasetya/CermatTani/raw/main/applications/release/CermatTani-v1.1.0.apk)** — buka dari HP Android, izinkan "install dari sumber ini", lalu Install.
File juga ada di folder [`release/`](release/CermatTani-v1.1.0.apk).

## Cara Menjalankan

```bash
# 1. Buat kerangka platform Android/iOS (jika belum ada)
flutter create --platforms=android,ios .

# 2. Unduh dependensi
flutter pub get

# 3. Jalankan di emulator atau perangkat fisik (kunci dari .env.json)
flutter run --dart-define-from-file=.env.json

# 4. Build APK siap install
flutter build apk --release --target-platform android-arm64 --dart-define-from-file=.env.json
```
