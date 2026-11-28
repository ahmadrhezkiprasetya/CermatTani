# PRD — CermatTani

**Product Requirements Document**
Versi 1.0 · 23 Nov 2026 · Sumber: karya tulis "CermatTani" (InSaintek 2026, tema Smart Farming & Smart Renewable Energy for Agriculture)
Status: Draf untuk tim

---

## 1. Ringkasan

CermatTani adalah aplikasi web (mobile-first) yang membantu petani dan pelaku urban farming menilai **kematangan buah**, mengenali **penyakit**, dan menduga **kebutuhan pupuk** tomat dari foto, lalu menggabungkannya dengan **data sensor lahan** dari perangkat ESP32 yang dapat bertenaga surya. Hasilnya disimpan sebagai riwayat per tanaman, diubah menjadi jadwal panen, dan dijelaskan lewat chatbot bernama **Cermo** (maskot tomat).

**Komoditas awal:** tomat.
**Platform:** web app (PWA) + perangkat lapangan ESP32 + bot Telegram.

## 2. Masalah

Keputusan paling menentukan hasil budidaya (kapan panen, apa penyebab daun bermasalah, kapan memupuk atau menyiram) di lahan kecil masih berdasar pengamatan mata. Akibatnya:

- panen terlalu cepat atau terlambat,
- penyakit disadari setelah menyebar,
- pupuk dan air diberikan tanpa takaran terukur,
- tidak ada catatan yang bisa diulang atau dibandingkan.

Solusi yang ada terpisah: aplikasi diagnosis foto, dasbor sensor, dan irigasi otomatis. Tidak ada yang menyatukan foto, sensor, dan riwayat per tanaman.

## 3. Tujuan dan non-tujuan

### Tujuan
1. Menilai kematangan dan memperkirakan hari panen dari foto secara terukur.
2. Mengenali penyakit daun/buah/batang dan memberi solusi yang aman, organik lebih dulu.
3. Menduga kebutuhan pupuk dari foto dan data sensor.
4. Memantau lahan dan mengotomatisasi irigasi dengan perangkat IoT bertenaga surya.
5. Menyajikan hasil sebagai riwayat, peringatan, dan penjelasan yang dipahami pengguna awam.

### Non-tujuan (versi ini)
- Komoditas selain tomat.
- Pengganti uji tanah atau diagnosis penyuluh.
- Aplikasi native iOS/Android.
- Pembayaran, marketplace, atau jual beli hasil panen.
- Pengendalian hama otomatis (semprot).

## 4. Pengguna

| Persona | Profil | Kebutuhan utama | Hambatan |
|---|---|---|---|
| **Pak Joko**, petani tomat 0,3 ha | 48 th, ponsel Android menengah, sinyal naik-turun | Tahu kapan panen dan apa yang salah dengan daun | Literasi digital rendah, tulisan kecil tidak terbaca di terik |
| **Bu Rina**, urban farming | 35 th, pot/polybag di atap rumah | Jadwal siram dan pupuk teratur | Waktu terbatas, ingin pengingat |
| **Dimas**, mahasiswa/peneliti | 21 th, tertarik data | Data sensor, riwayat, ekspor | Butuh angka dan sumber |
| **Penyuluh pertanian** | Pendamping kelompok tani | Melihat riwayat tanaman anggota, mengonfirmasi diagnosis | Perlu akses baca ke kebun yang dibagikan (fase 2) |

## 5. Ruang lingkup fitur (13 fitur)

Status mengikuti target karya tulis (Bab 4.4): **T** = terimplementasi penuh, **P** = parsial/versi sederhana, **S** = rancangan atau simulasi (diberi lencana "Simulasi" di UI).

| # | Fitur | Status | Prioritas |
|---|---|---|---|
| 1 | Deteksi kematangan & estimasi hari panen | T | P0 |
| 2 | Deteksi penyakit & solusi | T | P0 |
| 3 | Rekomendasi pupuk | T | P0 |
| 4 | Timeline pertumbuhan per tanaman | T | P0 |
| 5 | Chatbot asisten tani (Cermo) | T | P0 |
| 6 | Estimasi hasil panen | P | P1 |
| 7 | Kalender panen + notifikasi Telegram | P | P1 |
| 8 | Integrasi sensor IoT | S | P1 |
| 9 | Perancangan tenaga surya | S | P2 |
| 10 | Irigasi otomatis | P | P1 |
| 11 | Peringatan risiko penyakit dari iklim mikro | P | P1 |
| 12 | Pemantauan level air tandon | P | P2 |
| 13 | Pemantauan energi surya | P | P2 |

## 6. Alur utama pengguna

1. **Masuk & onboarding:** Cermo menyapa, pengguna membuat kebun dan menambah tanaman (nama, varietas, tanggal tanam).
2. **Scan:** pilih bagian tanaman (buah / daun / batang) → ambil atau unggah foto.
3. **Proses:** animasi Cermo memindai; server menjalankan model kematangan, penyakit, dan gejala hara.
4. **Hasil:** tahap kematangan + "Panen sekarang / Tunggu X–Y hari", nama penyakit + solusi, rekomendasi pupuk.
5. **Simpan:** hasil masuk ke timeline tanaman dan, bila relevan, ke kalender panen.
6. **Tindak lanjut:** tanya Cermo, atau terima pengingat Telegram.

## 7. Kebutuhan fungsional

Format: ID · pernyataan · kriteria penerimaan (AC).

### F1 Deteksi kematangan & estimasi hari panen
- **F1.1** Pengguna dapat mengambil/mengunggah foto buah. AC: format JPG/PNG/HEIC ≤ 10 MB, dikompres di sisi klien sebelum unggah.
- **F1.2** Sistem mendeteksi tiap buah dan menandai tahap (mentah, setengah matang, matang). AC: kotak berlabel dan persentase keyakinan ditampilkan di atas foto.
- **F1.3** Sistem menampilkan rentang hari menuju panen dari tabel referensi tahap. AC: bila tanaman punya riwayat ≥ 2 scan, estimasi disesuaikan laju perubahan warna.
- **F1.4** Sistem memberi anjuran "Panen sekarang" atau "Tunggu". AC: anjuran tampil lebih besar dari angka keyakinan.
- **F1.5** Bila tidak ada buah terdeteksi, tampil pesan dengan saran cara memotret.

### F2 Deteksi penyakit & solusi
- **F2.1** Pengguna memilih bagian tanaman sebelum scan. AC: pilihan berupa ikon besar daun / buah / batang.
- **F2.2** Model memberi peringkat kemungkinan penyakit termasuk kelas "sehat". AC: tampil 3 teratas dengan persentase.
- **F2.3** Basis pengetahuan menampilkan penyebab, gejala pembanding, solusi, pencegahan, dan sumber. AC: solusi organik/budidaya tampil sebelum kimiawi, opsi kimiawi disertai "baca label produk".
- **F2.4** Keyakinan rendah menampilkan peringatan dan saran konfirmasi ke penyuluh. AC: ambang ditetapkan tim (default 60%) dan dapat diubah lewat konfigurasi.

### F3 Rekomendasi pupuk
- **F3.1** Model gejala hara menduga kekurangan unsur dari foto daun.
- **F3.2** Tabel aturan menerjemahkan dugaan menjadi jenis pupuk dan dosis umum per fase tumbuh.
- **F3.3** Bila data sensor tersedia, dugaan diberi bobot lebih tinggi dan diberi label "dengan data sensor"; tanpa sensor diberi label "dugaan visual".
- **F3.4** Disclaimer "bukan pengganti uji tanah" selalu tampil.

### F4 Timeline pertumbuhan per tanaman
- **F4.1** Setiap scan tersimpan dengan ID tanaman, waktu, tahap, hasil kesehatan, dan foto.
- **F4.2** Halaman timeline menampilkan grafik perkembangan dan menandai kapan penyakit pertama muncul.
- **F4.3** Pengguna dapat membuka kembali scan lama. AC: semua scan tersimpan tampil sesuai catatan.

### F5 Chatbot asisten tani (Cermo)
- **F5.1** Chatbot (LLM via API) menerima hasil scan terbaru sebagai konteks.
- **F5.2** Topik dibatasi pada budidaya tomat dan hasil scan; di luar itu Cermo menolak dengan sopan.
- **F5.3** Setiap jawaban diberi tag "Saran, bukan keputusan akhir".
- **F5.4** Ada saran pertanyaan cepat ("Apa arti hasil ini?", "Kapan panen?", "Pupuk apa?").

### F6 Estimasi hasil panen
- **F6.1** Jumlah buah dihitung dari kotak deteksi F1, dikali bobot rata-rata per buah.
- **F6.2** Angka diberi label "estimasi kasar" karena foto hanya menangkap sebagian tanaman.

### F7 Kalender panen & notifikasi Telegram
- **F7.1** Estimasi hari panen menjadi entri di kalender aplikasi.
- **F7.2** Pengguna menautkan akun Telegram sekali (kode tautan 6 digit).
- **F7.3** Bot mengirim pengingat pada waktu terjadwal. AC: pesan terkirim sesuai jadwal pada uji.

### F8 Integrasi sensor IoT
- **F8.1** ESP32 mengirim kelembapan tanah (dan NPK bila ada) ke server lewat Wi-Fi.
- **F8.2** Dasbor menampilkan nilai terbaru dan grafik 24 jam.
- **F8.3** Data yang berasal dari simulasi diberi lencana "Simulasi" di semua tampilan.

### F9 Tenaga surya (rancangan)
- **F9.1** Halaman kalkulator menghitung `E_harian = P × t`, `C_baterai = E × H / (DoD × η)`, `P_panel = E / (PSH × f_rugi)`.
- **F9.2** Hasil ditampilkan dengan asumsi yang dapat diubah; contoh awal: 1 W, 24 jam, 2 hari otonomi, DoD 0,8, η 0,85, PSH 4, f 0,7 → ≈ 24 Wh, ≈ 71 Wh, ≈ 8,6 Wp (dibulatkan 10 Wp).

### F10 Irigasi otomatis
- **F10.1** Pompa menyala bila kelembapan < ambang bawah dan mati saat ≥ ambang atas. AC: kedua ambang dapat diatur dari dasbor.
- **F10.2** Pengaman: durasi pompa maksimum per siklus dan tombol manual (nyala/mati).
- **F10.3** Pompa tidak menyala bila level tandon kritis (F12).
- **F10.4** Riwayat siklus pompa tersimpan dan tampil.

### F11 Peringatan risiko penyakit dari iklim mikro
- **F11.1** Sensor suhu & kelembapan udara (DHT22/BME280) dan cahaya (BH1750) dipantau.
- **F11.2** Bila kelembapan tinggi bertahan melewati ambang, kirim peringatan dini dan tombol "Scan penyakit".
- **F11.3** Peringatan hanya muncul saat ambang terlewati. Ambang diisi dari literatur dengan sumber tercantum.

### F12 Level air tandon
- **F12.1** Sensor ultrasonik mengukur jarak; ESP32 menghitung persentase isi.
- **F12.2** Peringatan saat level rendah (default < 20%).

### F13 Energi surya
- **F13.1** INA219 menampilkan tegangan, arus, daya, dan perkiraan sisa baterai.
- **F13.2** Saat baterai rendah, ESP32 masuk mode hemat dan mengirim data lebih jarang; UI menampilkan status "Mode hemat" (Cermo tidur).

### Lintas fitur
- **X1** Banyak kebun dan banyak tanaman per akun.
- **X2** Mode gelap/terang, bahasa Indonesia (bahasa Inggris fase 2).
- **X3** Data simulasi selalu berlabel.
- **X4** Ekspor riwayat scan dan sensor ke CSV.
- **X5** Onboarding < 2 menit sampai scan pertama.

## 8. Kebutuhan non-fungsional

| Aspek | Target |
|---|---|
| Kinerja | Hasil scan ≤ 5 detik pada koneksi 4G (target tim, diukur saat uji) |
| Ketersediaan | Server demo ≥ 95% selama masa penjurian |
| Koneksi lemah | Foto dikompres di klien; antrean unggah ulang otomatis; halaman utama berfungsi offline-baca (PWA cache) |
| Perangkat | Android Chrome 100+, iOS Safari 15+, layar 360px ke atas |
| Keamanan | HTTPS, kunci API hanya di server, token perangkat per ESP32, batas laju pada endpoint scan dan chat |
| Privasi | Foto milik pengguna; izin penggunaan foto/data pihak ketiga dicantumkan; pengguna dapat menghapus akun dan data |
| Aksesibilitas | WCAG AA, target sentuh ≥ 48px, status tidak hanya lewat warna |
| Pelokalan | Bahasa awam, tanpa istilah ML di antarmuka petani |
| Kejujuran hasil | Setiap hasil model memuat tingkat keyakinan; hasil dataset dan foto lapangan dilaporkan terpisah di dokumentasi |

## 9. Arsitektur ringkas

```
Ponsel (PWA) ──foto──▶ Server (API)
                         ├─ Model kematangan (YOLOv8)
                         ├─ Model penyakit (MobileNet/EfficientNet)
                         ├─ Model gejala hara
                         ├─ Basis pengetahuan (penyakit, pupuk)
                         ├─ Database (pengguna, tanaman, scan, sensor)
                         ├─ LLM API (Cermo)
                         └─ Bot Telegram (pengingat)
ESP32 ──Wi-Fi/HTTP──▶ Server   (garis putus: rancangan/simulasi untuk F8, F9)
 ├ sensor tanah, DHT22/BME280, BH1750, ultrasonik, INA219
 ├ relay → pompa mini
 └ panel surya + pengontrol + baterai (rancangan)
```

### Model data (inti)
| Entitas | Kolom utama |
|---|---|
| `user` | id, nama, telegram_chat_id, bahasa |
| `farm` | id, user_id, nama, lokasi |
| `plant` | id, farm_id, nama, varietas, tanggal_tanam, fase |
| `scan` | id, plant_id, waktu, bagian, foto_url, tahap, jumlah_buah, penyakit, keyakinan, dugaan_hara, estimasi_hari |
| `knowledge_disease` | penyakit, penyebab, gejala, solusi_organik, solusi_kimia, pencegahan, sumber |
| `knowledge_nutrient` | gejala, dugaan, rekomendasi, dosis_per_fase, sumber |
| `device` | id, farm_id, token, tipe, status, simulasi (bool) |
| `sensor_reading` | id, device_id, waktu, jenis, nilai, simulasi |
| `irrigation_event` | id, device_id, mulai, selesai, kelembapan_awal, kelembapan_akhir, mode |
| `harvest_event` | id, plant_id, tanggal, sumber (estimasi/aktual) |
| `chat_message` | id, user_id, plant_id, peran, isi, waktu |

### Endpoint garis besar
`POST /scan` · `GET /plants/:id/timeline` · `POST /chat` · `GET/POST /calendar` · `POST /telegram/link` · `POST /device/readings` · `GET /devices/:id/status` · `POST /devices/:id/pump` · `GET/PUT /devices/:id/thresholds` · `POST /solar/calc`

## 10. Pengalaman & desain

Lihat `DESIGN.md`. Intinya: terang, ramah, maskot **Cermo**, hijau segar + lime + tomat, kartu bulat, animasi bermakna, tombol Scan selalu terlihat, mobile-first.

### Daftar layar
1. Onboarding (3 langkah, Cermo melambai)
2. Beranda (sapaan, hero Scan, ringkasan tanaman, fase tumbuh, cuaca mikro, jadwal panen)
3. Scan (pilih bagian → kamera → proses → hasil)
4. Hasil scan (kematangan / penyakit / pupuk dalam tab)
5. Tanaman & timeline
6. Kalender panen
7. Lahan (sensor, irigasi, tandon)
8. Energi surya (monitor + kalkulator)
9. Tanya Cermo (chat)
10. Pengaturan (akun, Telegram, ambang, tema)

## 11. Metrik keberhasilan

| Metrik | Cara ukur | Target (isi setelah uji) |
|---|---|---|
| mAP50 model kematangan | Data uji dataset & foto lapangan, dilaporkan terpisah | [ISI] |
| Akurasi model penyakit | Data uji & foto lapangan, per kelas | [ISI] |
| Akurasi model gejala hara | Data uji | [ISI] |
| MAE estimasi hari panen | Dibanding pengamatan nyata | [ISI] |
| Selisih hitung buah | Model vs hitung manual | [ISI] |
| Pembacaan sensor | Selisih terhadap alat ukur pembanding | [ISI] |
| Siklus irigasi | Pompa menyala/mati sesuai ambang | 100% pada uji |
| Pengingat Telegram | Pesan terkirim tepat waktu | 100% pada uji |
| Waktu ke scan pertama | Uji pengguna 5–10 orang | ≤ 2 menit |
| Pemahaman hasil | Uji pengguna: bisa menyebut tindakan berikutnya | ≥ 80% |

## 12. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Akurasi turun pada foto lapangan (latar tak terkendali) | Hasil salah | Lapor terpisah; panduan cara memotret di UI; peringatan keyakinan rendah; kumpulkan foto lapangan tim |
| Data latih terbatas untuk gejala hara | Rekomendasi kurang tepat | Gabung dengan tabel aturan; label "dugaan visual"; disclaimer uji tanah |
| LLM memberi saran berbahaya | Keselamatan | Batasi topik, system prompt ketat, tag "saran", organik dulu, daftar larangan |
| Perangkat IoT belum sempat dirakit | Fitur 8–13 tak bisa didemokan | Data simulasi berlabel "Simulasi"; status fitur dinyatakan jujur |
| Sinyal buruk di lahan | Scan gagal | Kompresi, antrean ulang, cache PWA |
| Hak cipta dataset / foto | Hukum | Cantumkan sumber dan izin (PlantVillage, LaboroTomato) |
| Pompa jalan tanpa air | Pompa rusak | Interlock level tandon (F10.3), batas durasi |
| Dosis pupuk keliru | Merugikan tanaman | Dosis sebagai acuan umum + sumber + disahkan pembimbing/penyuluh |

## 13. Rencana rilis

| Fase | Isi | Keterangan |
|---|---|---|
| **M0 Fondasi** | Data, pelatihan model, basis pengetahuan awal | Colab, dataset publik + foto tim |
| **M1 Inti foto** | F1–F5 end-to-end di web | Target demo utama |
| **M2 Kalender & estimasi** | F6, F7 | Telegram bot |
| **M3 Lapangan** | F8, F10, F11, F12 pada ESP32 / simulasi | Label "Simulasi" bila belum dirakit |
| **M4 Energi** | F9, F13 | Kalkulator + monitor INA219 |
| **M5 Uji & dokumentasi** | Uji skenario Bab 4, uji pengguna, perbaikan | Isi metrik dan Bab 4–5 |
| **Fase 2 (di luar karya)** | Komoditas lain, akses penyuluh, bahasa Inggris, native app | |

## 14. Pertanyaan terbuka (dari karya tulis, perlu diisi tim)

1. Tabel rentang hari menuju panen per tahap (mentah / setengah matang / matang) beserta sumber.
2. Proporsi pembagian data latih/validasi/uji.
3. Sumber data foto gejala hara.
4. Daftar penyakit tomat per kelas model dan isi basis pengetahuan (penyebab, solusi, pencegahan, sumber).
5. Dosis pupuk per gejala dan fase tumbuh, serta pengesahan pembimbing/penyuluh.
6. Ambang kelembapan udara risiko penyakit dengan sumber literatur.
7. Status akhir tiap fitur: dirakit atau simulasi.
8. Daya rata-rata perangkat terukur dan PSH lokasi untuk menggantikan asumsi F9.
9. Nama produk pembanding untuk tabel solusi sejenis.
10. Target kriteria keberhasilan numerik per fitur.

## 15. Lampiran

- Keterkaitan tema InSaintek: Smart Farming → F1–F8, F10–F12; Smart Renewable Energy for Agriculture → F9, F13.
- Dokumen terkait: `DESIGN.md`, antarmuka beranimasi (artifact "CermatTani").
