# DESIGN.md — CermatTani

Sistem desain untuk aplikasi web CermatTani (pemantauan kematangan, penyakit, dan kebutuhan pupuk tomat berbasis computer vision + IoT surya).
Versi 1.0 · 23 Nov 2026

---

## 1. Ringkasan arah desain

**Satu kalimat:** terang, ramah, dan seperti kebun yang rapi. Petani awam harus paham hasil scan dalam 5 detik, tanpa membaca istilah teknis.

Tiga referensi yang dipakai, dan apa yang diambil dari masing-masing:

| Referensi | Yang diambil | Yang tidak diambil |
|---|---|---|
| **Plant Monitor (Morten Solvstrom)** | Kartu putih lembut dengan radius besar, panel ilustrasi pemandangan di sisi kanan, kartu metrik berwarna (lime, putih, hijau tua), alur fase tumbuh dengan avatar bulat, gauge setengah lingkaran | Sidebar sempit berisi ikon kecil saja (terlalu kecil untuk petani) |
| **Agri-cultur Dashboard** | Sidebar gelap dengan item aktif lime, ringkasan komoditas dengan cincin persentase, kartu prakiraan cuaca per hari, kartu "analisis prediktif" berbatang progres, ilustrasi besar ladang | Warna pastel yang terlalu pucat untuk teks kecil |
| **FarmVista** | Struktur navigasi lengkap (Dashboard, Tanaman, Tanah & Air, Cuaca, Tugas), sapaan "Selamat pagi", grafik area hasil panen dengan tooltip, tabel tugas, versi mobile dengan bottom-nav | Gauge pelangi (terlalu ramai) |

Kesimpulan gaya: **hijau segar sebagai warna utama, lime sebagai penanda aktif, tomat merah-oranye sebagai warna aksen komoditas dan aksi penting, hijau tua gelap untuk kartu penekanan.** Bentuk bulat, ilustrasi datar (flat) dengan bayangan lembut, dan satu maskot yang menemani setiap layar.

---

## 2. Prinsip

1. **Foto dulu.** Tombol "Scan" selalu terlihat. Fitur 1–5 berbasis foto, jadi aksi utama petani adalah memotret.
2. **Hasil = keputusan.** Kartu hasil menampilkan "Panen sekarang" atau "Tunggu 4–6 hari" lebih besar dari angka mAP atau persen keyakinan.
3. **Jujur soal ketidakpastian.** Keyakinan rendah ditampilkan sebagai peringatan kuning dengan saran ke penyuluh. Data simulasi diberi lencana "Simulasi".
4. **Organik lebih dulu.** Solusi organik tampil di atas solusi kimia, dengan label jelas.
5. **Satu maskot, satu suara.** Cermo bicara dengan kalimat pendek, tidak menggurui, tidak pernah memberi diagnosis final.
6. **Gerak bermakna.** Animasi menjelaskan perubahan (scan berjalan, pompa menyala, baterai terisi), bukan hiasan acak. Semua dimatikan lewat `prefers-reduced-motion`.

---

## 3. Warna

Semua warna didefinisikan sebagai token. Mode gelap tersedia.

### Inti
| Token | Terang | Gelap | Pakai untuk |
|---|---|---|---|
| `--leaf-600` | `#17803F` | `#3DBE74` | Tombol utama dan teks hijau (kontras 5:1 dengan putih) |
| `--leaf-500` | `#1F9D55` | `#3DBE74` | Grafik, garis, ikon dekoratif (bukan untuk teks kecil) |
| `--leaf-700` | `#157A41` | `#2FA862` | Hover tombol utama |
| `--lime-300` | `#D8F36A` | `#C9E85A` | Item nav aktif, kartu metrik sorot |
| `--forest-900` | `#0E4F43` | `#0A3A32` | Kartu penekanan (gauge, statistik), sidebar kontras |
| `--tomato-500` | `#F2562B` | `#FF6B42` | Aksen komoditas tomat, batang grafik aktif, peringatan ringan |
| `--sun-400` | `#FFB63D` | `#FFC45E` | Setengah matang, peringatan, matahari |

### Netral (dengan sedikit rona hijau)
| Token | Terang | Gelap |
|---|---|---|
| `--bg` | `#EEF7F1` | `#0C1713` |
| `--surface` | `#FFFFFF` | `#14231D` |
| `--surface-2` | `#F5FAF6` | `#1A2D25` |
| `--ink` | `#14302A` | `#EAF5EE` |
| `--ink-soft` | `#5B746B` | `#9DB8AD` |
| `--line` | `#DCEBE1` | `#25402F` |

### Semantik (terpisah dari aksen)
| Status | Warna | Contoh |
|---|---|---|
| Baik / sehat / matang | `#1F9D55` | Daun sehat, buah matang |
| Perhatian / setengah matang | `#FFB63D` | Kelembapan tinggi, keyakinan rendah |
| Bahaya / penyakit | `#E5484D` | Busuk daun, tandon hampir habis |
| Info / air | `#2B8FD9` | Level tandon, irigasi |
| Simulasi | `#7A6CF0` | Lencana data simulasi |

### Kematangan tomat (dipakai konsisten di kotak deteksi, chip, kalender)
Mentah `#5DBB63` · Setengah matang `#FFB63D` · Matang `#F2562B`

Kontras teks: `--ink` di atas `--surface` ≥ 12:1. Teks putih hanya di atas `--leaf-600`, `--forest-900`, `--tomato-500` (ukuran ≥ 16px tebal).

---

## 4. Tipografi

| Peran | Font | Bobot | Catatan |
|---|---|---|---|
| Judul & angka besar | **Fredoka** | 500, 600 | Bulat, ramah, cocok dengan maskot |
| Teks & antarmuka | **Plus Jakarta Sans** | 400, 500, 600, 700 | Terbaca baik di layar kecil dan di bawah matahari |
| Angka tabel | Plus Jakarta Sans + `tabular-nums` | | Kolom angka sejajar |

Fallback: `"Fredoka", "Nunito", ui-rounded, system-ui, sans-serif` dan `"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif`.

Skala (rem, dasar 16px):

| Nama | Ukuran / tinggi baris | Pakai |
|---|---|---|
| display | 2.75 / 1.05 | Judul hero |
| h1 | 2 / 1.15 | Judul halaman |
| h2 | 1.5 / 1.2 | Judul kartu besar |
| h3 | 1.125 / 1.3 | Judul kartu |
| body | 1 / 1.6 | Teks utama |
| small | 0.875 / 1.5 | Keterangan |
| micro | 0.75 / 1.4 | Lencana, sumbu grafik |

Aturan: teks utama tidak lebih kecil dari 16px di mobile. Lebar baris maksimum 65 karakter. Kalimat huruf kecil biasa (sentence case), tanpa huruf kapital semua.

---

## 5. Bentuk, jarak, bayangan

- **Grid jarak:** kelipatan 4px (4, 8, 12, 16, 24, 32, 48).
- **Radius:** kartu besar `24px`, kartu `20px`, kontrol & tombol `14px`, chip & lencana `999px`, avatar bulat penuh.
- **Bayangan:** `0 1px 2px rgba(20,48,42,.06), 0 8px 24px rgba(20,48,42,.08)` pada kartu; tombol utama `0 6px 0 var(--leaf-700)` (efek tombol 3D tipis, ramah ditekan jari).
- **Garis:** 1px `--line`, hanya untuk pemisah dalam kartu, bukan untuk membingkai kartu.
- **Target sentuh:** minimal 48×48px. Tombol scan 64px.
- **Gutter halaman:** 16px mobile, 24px tablet, 32px desktop.

---

## 6. Tata letak

### Desktop (≥ 1100px) — gabungan Plant Monitor + Agri-cultur
```
┌────────┬──────────────────────────────────┬─────────────┐
│ Sidebar│ Sapaan + pencarian + notifikasi   │  Panel      │
│ gelap  ├──────────────────────────────────┤  ilustrasi  │
│ 240px  │ Hero scan (maskot + tombol Scan)  │  kebun +    │
│        ├───────────────┬──────────────────┤  Jadwal     │
│ Nav    │ Fase tumbuh   │ Kartu metrik x3  │  panen      │
│ Kebun  │ Produksi/Hasil│ Gauge statistik  │  (gelap)    │
│ Maskot │ Tabel tugas   │ Cuaca mikro      │             │
└────────┴───────────────┴──────────────────┴─────────────┘
```

### Tablet (700–1099px)
Sidebar menjadi rel ikon + label; panel ilustrasi pindah ke bawah sebagai kartu.

### Mobile (< 700px) — mengikuti versi mobile FarmVista
Satu kolom, bottom-nav 5 item (Beranda, Scan, Tanaman, Lahan, Cermo), tombol Scan menonjol di tengah bottom-nav.

### Navigasi
Beranda · **Scan** · Tanaman (timeline) · Kalender panen · Lahan (sensor, irigasi, tandon) · Energi surya · Tanya Cermo (chatbot) · Pengaturan

---

## 7. Komponen

| Komponen | Spesifikasi |
|---|---|
| **Tombol utama** | Latar `--leaf-600`, teks putih Fredoka 600, radius 14, bayangan bawah 6px, ditekan: turun 4px |
| **Tombol sekunder** | Putih, garis 1.5px `--leaf-600`, teks hijau |
| **Tombol scan (FAB)** | Lingkaran 64px, ikon kamera, denyut lembut tiap 4 detik. Latar `--tomato-btn` `#D63D12` agar teks/ikon putih lolos kontras 4.5:1 (`--tomato-500` hanya untuk ilustrasi dan batang grafik) |
| **Kartu** | `--surface`, radius 24, bayangan lembut, padding 20–24 |
| **Kartu metrik** | 3 varian: lime (sorot), putih, hijau tua (penekanan). Ikon bulat + label + nilai Fredoka besar |
| **Chip tahap** | Pil dengan titik warna tahap (mentah/setengah/matang) |
| **Kotak deteksi** | Garis 3px warna tahap, label pil di atas kotak: "Matang 92%" |
| **Cincin persentase** | Seperti Agri-cultur, stroke 8px, animasi isi 900ms |
| **Gauge** | Setengah lingkaran gradien merah → kuning → hijau (Plant Monitor), jarum beranimasi |
| **Grafik area** | Gradien hijau ke transparan, titik akhir ditekankan, tooltip pil gelap (FarmVista) |
| **Batang produksi** | Pastel persik, batang aktif `--tomato-500` (Plant Monitor) |
| **Timeline tanaman** | Garis bergelombang menghubungkan avatar bulat per scan, penyakit ditandai titik merah |
| **Kalender panen** | Sel hari dengan chip tomat kecil; hari panen ditandai `--tomato-500` |
| **Lencana simulasi** | Pil ungu "Simulasi" pada setiap data yang bukan dari perangkat nyata |
| **Peringatan** | Kartu dengan ikon dan maskot kecil, warna sesuai status, selalu berisi langkah berikutnya |
| **Gelembung chat** | Cermo: putih dengan avatar maskot; pengguna: hijau. Setiap jawaban Cermo diakhiri tag "Saran, bukan keputusan akhir" |
| **Toggle irigasi** | Saklar besar 56×32 dengan ikon pompa; tombol manual dan batas durasi di bawahnya |
| **Indikator baterai** | Ikon baterai terisi bergelombang, tegangan/arus/daya di bawahnya |

---

## 8. Maskot: Cermo si Tomat

**Konsep:** tomat ceri bulat dengan tunas daun di kepala dan kaca pembesar kecil. Nama diambil dari "cermat". Ia cekatan, ramah, dan sedikit jenaka, mirip teman yang mengajak berkeliling kebun.

**Anatomi (SVG)**
- Badan: lingkaran tomat `#F2562B` dengan sorot putih di kiri atas dan bayangan `#D8431C` di kanan bawah.
- Tunas: 3 daun hijau (`#1F9D55`, `#3DBE74`) dan tangkai kecil melengkung.
- Wajah: mata bulat hitam dengan sorot putih, pipi merah muda, senyum lebar.
- Tangan: dua bulatan kecil. Tangan kanan memegang kaca pembesar bergagang hijau.
- Kaki: dua bulatan kecil putih-krem (sepatu bot).

**Ekspresi / pose**
| Pose | Dipakai saat |
|---|---|
| Sapa (melambai) | Beranda, onboarding |
| Memindai (kaca pembesar bergerak, mata mengikuti) | Proses scan berjalan |
| Senang (melompat, mata berbinar) | Tanaman sehat, panen siap |
| Khawatir (alis miring, keringat) | Penyakit terdeteksi, kelembapan tinggi |
| Minum (membawa tetes air) | Irigasi menyala, tandon rendah |
| Berpikir (titik-titik) | Chatbot mengetik |
| Tidur (zZz) | Mode hemat baterai |

**Animasi dasar**
- Napas: skala 1 → 1.03 setiap 3 detik.
- Kedip: setiap 4–6 detik (acak).
- Mata mengikuti kursor / sentuhan (maks 4px).
- Daun bergoyang pelan (rotasi ±4°).
- Klik: melompat dengan squash & stretch, 500ms, menampilkan tip singkat.

**Suara & kalimat contoh**
- "Halo! Yuk, cek tomatmu hari ini."
- "Wah, ada 3 tomat yang sudah merah. Panen 2 hari lagi ya."
- "Hm, daun ini mirip bercak. Aku belum yakin, coba tanya penyuluh juga."
- "Tandon tinggal 18%. Pompa kutahan dulu supaya tidak kering."

**Aturan penggunaan:** jangan menutupi data, ukuran minimum 40px, selalu ada di hero scan dan di keadaan kosong, tidak muncul di tabel atau grafik.

---

## 9. Ilustrasi

Gaya datar bergradasi lembut seperti panel kanan Plant Monitor: bukit hijau berlapis, pohon cemara, kincir angin, sawah berundak, langit biru muda. Dipakai untuk: panel jadwal panen (desktop), kartu "Kelola banyak kebun", keadaan kosong, onboarding. Ilustrasi tidak boleh mengandung teks.

Ikon: gaya garis 1.75px, ujung bulat, 24px, dua nada (garis + isian lembut).

---

## 10. Gerak (animasi)

| Momen | Animasi | Durasi / easing |
|---|---|---|
| Muat halaman | Kartu naik 12px + memudar masuk, berurutan 60ms | 500ms `cubic-bezier(.2,.8,.2,1)` |
| Cermo napas, kedip, daun | Berulang halus | 3–6 dtk |
| Tombol ditekan | Turun 4px, bayangan hilang | 120ms |
| Scan | Garis hijau menyapu foto, kotak deteksi tumbuh satu per satu, Cermo memindai | 2.4 dtk total |
| Cincin & gauge | Isi dari 0 ke nilai | 900ms ease-out |
| Batang grafik | Tumbuh dari bawah, berurutan | 600ms |
| Garis grafik | Digambar dengan stroke-dashoffset | 1.2 dtk |
| Angka | Menghitung naik | 800ms |
| Pompa menyala | Tetes air jatuh ke tanah, tanah menggelap | berulang 1.2 dtk |
| Baterai surya | Gelombang isi naik, sinar matahari berputar | 8 dtk loop |
| Panen siap | Konfeti tomat kecil | 1.2 dtk sekali |
| Ganti halaman | Cross-fade + geser 16px | 280ms |
| Hover kartu | Naik 3px | 200ms |

`prefers-reduced-motion: reduce` mematikan semua animasi berulang dan menggantinya dengan perubahan status instan.

---

## 11. Salinan (copy)

- Bahasa Indonesia sehari-hari, kalimat pendek, sapaan "kamu".
- Tombol berupa kata kerja: "Scan tanaman", "Simpan ke timeline", "Jadwalkan panen".
- Istilah teknis diterjemahkan: "keyakinan model" → "seberapa yakin Cermo", "mAP" tidak muncul di antarmuka petani.
- Pesan kosong berisi ajakan: "Belum ada scan. Foto satu tomat untuk mulai."
- Pesan galat menyebut penyebab dan solusi: "Foto terlalu gelap. Coba dekat jendela atau nyalakan lampu."
- Disclaimer wajib: hasil pupuk "bukan pengganti uji tanah", hasil penyakit "konfirmasi ke penyuluh bila ragu".

---

## 12. Aksesibilitas

- Kontras WCAG AA minimum; teks kecil AA besar.
- Status tidak hanya lewat warna (selalu ikon + label).
- Fokus papan ketik terlihat (cincin 3px `--leaf-600` dengan jarak 2px).
- Alt-text pada hasil deteksi: "3 tomat terdeteksi: 1 mentah, 1 setengah matang, 1 matang".
- Mode gelap untuk pemakaian pagi/sore.
- Uji di layar terik: kontras tinggi di teks utama, tombol besar.
- Dukungan layar ponsel kecil (360px) dan koneksi lambat (gambar ilustrasi berupa SVG).

---

## 13. Token CSS siap pakai

```css
:root {
  --leaf-600:#17803F; --leaf-500:#1F9D55; --leaf-700:#0F5E2D; --lime-300:#D8F36A;
  --forest-900:#0E4F43; --tomato-500:#F2562B; --tomato-btn:#D63D12; --sun-400:#FFB63D;
  --bg:#EEF7F1; --surface:#FFFFFF; --surface-2:#F5FAF6;
  --ink:#14302A; --ink-soft:#5B746B; --line:#DCEBE1;
  --ok:#1F9D55; --warn:#FFB63D; --bad:#E5484D; --water:#2B8FD9; --sim:#7A6CF0;
  --r-card:24px; --r-ctl:14px;
  --font-display:"Fredoka","Nunito",ui-rounded,system-ui,sans-serif;
  --font-body:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  --shadow-card:0 1px 2px rgba(20,48,42,.06),0 8px 24px rgba(20,48,42,.08);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --leaf-600:#3DBE74; --leaf-700:#2FA862; --lime-300:#C9E85A;
    --forest-900:#0A3A32; --tomato-500:#FF6B42; --sun-400:#FFC45E;
    --bg:#0C1713; --surface:#14231D; --surface-2:#1A2D25;
    --ink:#EAF5EE; --ink-soft:#9DB8AD; --line:#25402F;
  }
}
```
