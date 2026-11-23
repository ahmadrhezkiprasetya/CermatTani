# CermatTani (Repo Menyeluruh — Monorepo)

Repositori menyeluruh proyek **CermatTani** (InSaintek 2026) sesuai `PRD (1).md` dan `DESIGN (3).md` — khusus budidaya **tomat** berbasis computer vision + IoT surya + maskot **Cermo**.

## Struktur 3 Repositori (Monorepo + Git Subtree)

```text
CermatTani/                  -> Repo menyeluruh (remote: origin -> CermatTani)
├── PRD (1).md               -> Dokumen spesifikasi produk
├── DESIGN (3).md            -> Dokumen sistem desain
├── sync-repos.ps1           -> Skrip 1 perintah untuk sync ke 3 repo GitHub
├── website/                 -> Repo khusus Website Next.js (remote: web -> CermatTani-Web)
└── applications/            -> Repo khusus Mobile App Flutter (remote: app -> CermatTani-App)
```

| Remote Git | Folder | Tujuan Repo GitHub |
|---|---|---|
| `origin` | seluruh folder `/` | `https://github.com/ahmadrhezkiprasetya/CermatTani.git` |
| `web` | `website/` | `https://github.com/ahmadrhezkiprasetya/CermatTani-Web.git` |
| `app` | `applications/` | `https://github.com/ahmadrhezkiprasetya/CermatTani-App.git` |

---

## 1. Cara Menjalankan Website (Next.js)

```powershell
cd website
npm install   # cukup sekali jika node_modules belum ada
npm run dev
```

Buka peramban di **http://localhost:3000**.

---

## 2. Cara Menjalankan Mobile App (Flutter)

```powershell
cd applications
flutter create --platforms=android,ios .   # cukup sekali jika folder android/ & ios/ belum ada
flutter pub get
flutter run
```

---

## 3. Cara Sinkronisasi ke 3 Repo GitHub

1. Buat 2 repo kosong baru di GitHub (tanpa README/gitignore awal):
   - `CermatTani-Web`
   - `CermatTani-App`
   *(Jika nama repo berbeda, cukup ubah URL remote dengan `git remote set-url web <URL>` atau `git remote set-url app <URL>`.)*
2. Commit semua perubahan di repo menyeluruh ini:
   ```powershell
   git add .
   git commit -m "Pisahkan struktur website (Next.js) dan applications (Flutter)"
   ```
3. Jalankan skrip sinkronisasi 1 perintah:
   ```powershell
   # Push ke ketiga repo sekaligus (origin, web, dan app):
   .\sync-repos.ps1

   # Atau sync salah satu saja:
   .\sync-repos.ps1 -Target root
   .\sync-repos.ps1 -Target web
   .\sync-repos.ps1 -Target app
   ```
