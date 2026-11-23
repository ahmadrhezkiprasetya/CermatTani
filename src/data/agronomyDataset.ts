import {
  GrowthPhase,
  KnowledgeDisease,
  KnowledgeNutrient,
  Plant,
  PlantPart,
  RipenessStage,
  ScanRecord,
  SensorSnapshot,
} from '../types/cermattani';

/**
 * DATASET KHUSUS AGRONOMI CERMATTANI (Grounded Knowledge Base v2.0)
 * -----------------------------------------------------------------
 * Sumber acuan resmi:
 * - Balitsa (Balai Penelitian Tanaman Sayuran) Kementan RI
 * - FAO Integrated Pest Management (IPM) for Tomato & Solanaceae
 * - USDA Tomato Color Classification & Maturity Index (Stage 1–6)
 * - PlantVillage & University of Florida IFAS Horticulture Disease Reference
 * - IPNI (International Plant Nutrition Institute) Deficiency Guide
 *
 * Dataset ini dipakai langsung sebagai konteks grounding (RAG / system knowledge)
 * pada model AI Vision (/api/scan) dan Chatbot Cermo (/api/chat) agar:
 * 1. Diagnosis penyakit, kematangan, dan hara selalu konsisten dengan katalog resmi.
 * 2. AI tidak pernah halusinasi kelas/dosis di luar panduan agronomi terverifikasi.
 * 3. Chatbot dan Vision AI tetap 100% di dalam konteks pertanian & CermatTani.
 */

export interface CropDatasetEntry {
  id: string;
  namaUmum: string;
  varietasContoh: string[];
  suhuOptimalC: string;
  kelembapanTanahOptimal: string;
  kelembapanUdaraOptimal: string;
  umurPanenHst: string;
  bobotRataGram: number;
  catatanBudidaya: string;
  kataKunci: string[];
}

export interface DiseaseDatasetEntry extends KnowledgeDisease {
  ciriVisualSpesifik: string;
  tanamanRentan: string[];
  kataKunci: string[];
}

export interface NutrientDatasetEntry extends KnowledgeNutrient {
  ciriVisualSpesifik: string;
  kataKunci: string[];
}

export interface FarmProtocolEntry {
  id: string;
  topik: string;
  aturan: string;
  kataKunci: string[];
}

/* 1. Dataset Kematangan Buah (USDA Stage 1–6 & Balitsa Kementan RI) */
export const DATASET_RIPENESS: Record<
  RipenessStage,
  {
    label: string;
    color: string;
    minDays: number;
    maxDays: number;
    anjuran: 'Panen sekarang' | 'Tunggu';
    ciriVisual: string;
    ringkasan: string;
    penangananPascaPanen: string;
    sumber: string;
  }
> = {
  mentah: {
    label: 'Mentah',
    color: '#5DBB63',
    minDays: 7,
    maxDays: 10,
    anjuran: 'Tunggu',
    ciriVisual:
      'Kulit hijau penuh atau hijau muda merata (USDA Stage 1–2 Green/Mature Green), belum ada semburat kuning/jingga/merah, daging keras.',
    ringkasan: 'Kulit masih hijau penuh. Tunggu 7–10 hari sambil jaga penyiraman teratur.',
    penangananPascaPanen: 'Belum disarankan dipetik kecuali untuk kebutuhan transportasi sangat jauh.',
    sumber: 'Balitsa Kementan RI — Panduan Indeks Kematangan Tomat (USDA Stage 1–2)',
  },
  setengah_matang: {
    label: 'Setengah matang',
    color: '#FFB63D',
    minDays: 2,
    maxDays: 4,
    anjuran: 'Tunggu',
    ciriVisual:
      'Muncul warna kuning, jingga, atau merah muda 10%–60% dari ujung buah (USDA Stage 3–4 Breaker/Turning/Pink).',
    ringkasan: 'Warna mulai jingga/merah muda (breaker–pink). Siap panen 2–4 hari lagi.',
    penangananPascaPanen:
      'Dapat dipetik bila akan dikirim ke pasar jarak jauh (tahan simpan 4–6 hari suhu ruang).',
    sumber: 'Balitsa Kementan RI — Panduan Indeks Kematangan Tomat (USDA Stage 3–4)',
  },
  matang: {
    label: 'Matang',
    color: '#F2562B',
    minDays: 0,
    maxDays: 1,
    anjuran: 'Panen sekarang',
    ciriVisual:
      'Warna merah cerah atau merah tua merata > 85%–90% permukaan buah (USDA Stage 5–6 Light Red/Red), kulit mengilap, buah terasa berisi.',
    ringkasan: 'Warna merah merata (> 90%). Cocok dipetik pagi atau sore agar buah tetap segar.',
    penangananPascaPanen:
      'Petik beserta sedikit tangkai pada pagi (06.00–09.00) atau sore hari, simpan di wadah teduh tidak bertumpuk tinggi.',
    sumber: 'Balitsa Kementan RI — Panduan Indeks Kematangan Tomat (USDA Stage 5–6)',
  },
};

/* 2. Dataset Profil Tanaman Kebun yang Didukung CermatTani */
export const DATASET_CROPS: CropDatasetEntry[] = [
  {
    id: 'tomat',
    namaUmum: 'Tomat',
    varietasContoh: ['Servo F1', 'Gustavi', 'Rampai', 'Tomat Ceri', 'Tymoti F1'],
    suhuOptimalC: '20–28 °C',
    kelembapanTanahOptimal: '45–65%',
    kelembapanUdaraOptimal: '60–75% RH',
    umurPanenHst: '60–75 HST',
    bobotRataGram: 85,
    catatanBudidaya:
      'Siram langsung di pangkal batang pagi hari, pasang ajir/lanjaran, pangkas tunas air rutin, jaga jarak tanam 50 × 60 cm agar sirkulasi udara lancar.',
    kataKunci: ['tomat', 'servo', 'gustavi', 'rampai', 'ceri', 'buah', 'panen'],
  },
  {
    id: 'cabai',
    namaUmum: 'Cabai',
    varietasContoh: ['Cabai Rawit', 'Cabai Merah Keriting', 'Cabai Besar'],
    suhuOptimalC: '22–30 °C',
    kelembapanTanahOptimal: '45–60%',
    kelembapanUdaraOptimal: '60–75% RH',
    umurPanenHst: '75–90 HST',
    bobotRataGram: 8,
    catatanBudidaya:
      'Sangat peka genangan air dan antraknosa (patek) di musim hujan; gunakan mulsa, drainase tinggi, dan sanitasi buah jatuh.',
    kataKunci: ['cabai', 'cabe', 'rawit', 'keriting', 'patek', 'antraknosa'],
  },
  {
    id: 'selada',
    namaUmum: 'Selada',
    varietasContoh: ['Selada Keriting', 'Selada Romaine', 'Selada Butterhead'],
    suhuOptimalC: '16–24 °C',
    kelembapanTanahOptimal: '55–70%',
    kelembapanUdaraOptimal: '65–80% RH',
    umurPanenHst: '30–45 HST',
    bobotRataGram: 150,
    catatanBudidaya:
      'Butuh ketersediaan air stabil dan nitrogen seimbang agar daun renyah tidak pahit; hindari panas terik ekstrem tanpa naungan.',
    kataKunci: ['selada', 'lettuce', 'daun', 'sayur'],
  },
  {
    id: 'bayam',
    namaUmum: 'Bayam',
    varietasContoh: ['Bayam Hijau', 'Bayam Merah'],
    suhuOptimalC: '22–30 °C',
    kelembapanTanahOptimal: '50–65%',
    kelembapanUdaraOptimal: '60–75% RH',
    umurPanenHst: '25–30 HST',
    bobotRataGram: 40,
    catatanBudidaya:
      'Panen saat tinggi 20–25 cm sebelum berbunga; kebutuhan utama kompos matang dan penyiraman teratur pagi/sore.',
    kataKunci: ['bayam', 'sayur', 'daun'],
  },
];

/* 3. Dataset Penyakit & Hama Terkurasi (Visual Signature + Organik Dulu + Sumber Resmi) */
export const DATASET_DISEASES: Record<string, DiseaseDatasetEntry> = {
  sehat: {
    id: 'sehat',
    penyakit: 'Sehat',
    bagianUmum: ['buah', 'daun', 'batang'],
    tanamanRentan: ['Tomat', 'Cabai', 'Selada', 'Bayam'],
    ciriVisualSpesifik:
      'Daun hijau segar seragam tanpa bercak nekrotik/cincin/mosaik, batang tegak utuh tanpa luka cokelat basah, kulit buah mulus tidak busuk/cekung.',
    penyebab: 'Tidak ditemukan tanda serangan jamur, bakteri, virus, atau hama yang mencolok pada foto.',
    gejala: 'Daun hijau segar merata, batang kokoh, permukaan buah mulus tanpa bercak cekung.',
    solusiOrganik: [
      'Pertahankan penyiraman di pangkal batang pada pagi hari agar daun tidak basah lama.',
      'Tambahkan mulsa organik (jerami atau sekam) untuk menjaga kelembapan tanah stabil.',
    ],
    solusiKimia: [
      'Tidak diperlukan penyemprotan kimia. Hindari penggunaan pestisida preventif berlebihan; bila terpaksa gunakan produk terdaftar dan selalu baca label produk.',
    ],
    pencegahan: [
      'Periksa bagian bawah daun 2 kali seminggu, terutama saat cuaca lembap.',
      'Pangkas tunas air dan daun paling bawah yang menyentuh tanah agar aliran udara lancar.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Integrated Pest Management for Tomato',
    kataKunci: ['sehat', 'normal', 'aman', 'rawat', 'pencegahan'],
  },
  bercak_kering: {
    id: 'bercak_kering',
    penyakit: 'Bercak daun kering (Early blight)',
    bagianUmum: ['daun', 'batang'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Bercak cokelat tua hingga kehitaman berbentuk cincin konsentris (seperti papan panah/target spot) pada daun tua bagian bawah, dikelilingi tepi kuning (halo klorosis).',
    penyebab: 'Jamur Alternaria solani yang berkembang cepat pada cuaca hangat dan daun sering basah.',
    gejala: 'Bercak cokelat tua melingkar seperti cincin konsentris pada daun tua, tepi bercak menguning.',
    solusiOrganik: [
      'Petik dan buang daun yang berbercak jauh dari bedengan (jangan dijadikan kompos).',
      'Semprot fungisida nabati atau agen hayati Trichoderma / larutan baking soda 1 sendok teh per liter air + sedikit sabun cair nabati pada sore hari.',
      'Siram langsung ke tanah dekat akar, hindari menyiram membasahi tajuk daun.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan meluas (> 25% daun): fungisida kontak berbahan aktif mankozeb atau klorotalonil secara bergantian. Wajib baca label produk, patuhi dosis dan masa tunggu panen.',
    ],
    pencegahan: [
      'Beri jarak tanam minimal 50 × 60 cm agar angin mudah masuk.',
      'Gunakan mulsa untuk mencegah percikan spora dari tanah ke daun bawah.',
      'Rotasi tanaman setelah panen (hindari menanam tomat/cabai terus-menerus di lahan sama).',
    ],
    sumber: 'Balitsa Kementan RI (Pengendalian OPT Tomat) & PlantVillage Reference',
    kataKunci: ['bercak', 'kering', 'early blight', 'alternaria', 'cincin', 'cokelat', 'daun tua'],
  },
  busuk_daun: {
    id: 'busuk_daun',
    penyakit: 'Busuk daun (Late blight)',
    bagianUmum: ['daun', 'buah', 'batang'],
    tanamanRentan: ['Tomat'],
    ciriVisualSpesifik:
      'Bercak lebar tampak basah berwarna hijau keabu-abuan lalu cepat menghitam/cokelat gelap di tepi daun atau batang; pada kelembapan tinggi muncul lapisan kapang putih halus di balik daun.',
    penyebab: 'Oomycete Phytophthora infestans yang menyebar sangat cepat saat kelembapan udara ≥ 85% dan suhu sejuk (18–26 °C).',
    gejala: 'Bercak basah hijau keabu-abuan lalu menghitam cepat pada tepi daun; di pagi lembap terlihat lapisan putih tipis di bawah daun.',
    solusiOrganik: [
      'Segera pangkas dan musnahkan bagian tanaman yang terserang agar tidak menular ke tanaman sebelah.',
      'Kurangi kelembapan sekitar tajuk dengan memangkas daun rimbun bagian bawah dan hentikan siram atas.',
      'Aplikasi fungisida tembaga organik yang diizinkan untuk budidaya organik atau agen hayati Bacillus subtilis.',
    ],
    solusiKimia: [
      'Bila gejala menyebar cepat di musim hujan: pertimbangkan fungisida spesifik oomycete sesuai anjuran penyuluh setempat. Wajib baca label produk, gunakan APD, dan taati masa tunggu sebelum panen.',
    ],
    pencegahan: [
      'Pantau peringatan risiko iklim mikro di CermatTani setiap kali kelembapan udara tinggi.',
      'Pastikan drainase bedengan lancar agar air hujan tidak menggenang.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Tomato Late Blight Advisory',
    kataKunci: ['busuk daun', 'late blight', 'phytophthora', 'basah', 'hitam', 'hujan', 'lembap', 'jamur'],
  },
  bercak_bakteri: {
    id: 'bercak_bakteri',
    penyakit: 'Bercak bakteri',
    bagianUmum: ['daun', 'buah'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Bintik-bintik kecil (1–3 mm) cokelat kehitaman tampak berair tersebar pada daun atau koreng kecil kasar menonjol bertepi terang pada permukaan buah.',
    penyebab: 'Bakteri Xanthomonas spp. yang terbawa benih atau menyebar lewat percikan hujan dan tangan saat merawat tanaman.',
    gejala: 'Bintik kecil cokelat kehitaman berair pada daun atau koreng kecil kasar di permukaan buah tomat.',
    solusiOrganik: [
      'Pisahkan dan buang daun atau buah bergejala; cuci tangan serta gunting pangkas dengan alkohol/sabun sebelum menyentuh tanaman sehat.',
      'Hindari menyentuh tanaman saat daun masih basah oleh embun atau hujan.',
      'Semprot bakterisida nabati (ekstrak daun sirih/bawang putih) sebagai penekan awal.',
    ],
    solusiKimia: [
      'Opsi terakhir pada serangan berat: bakterisida berbahan tembaga hidroksida sesuai rekomendasi penyuluh. Wajib baca label produk dan ikuti batas aman panen.',
    ],
    pencegahan: [
      'Gunakan benih sehat bersertifikat.',
      'Sterilkan peralatan kebun secara berkala.',
    ],
    sumber: 'Balitsa Kementan RI & University of Florida IFAS Tomato Disease Guide',
    kataKunci: ['bakteri', 'bintik', 'koreng', 'xanthomonas', 'berair'],
  },
  layu_batang: {
    id: 'layu_batang',
    penyakit: 'Layu fusarium / bakteri batang',
    bagianUmum: ['batang', 'daun'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Pangkal batang menghitam/kecokelatan atau membusuk, daun terkulai layu mendadak (sering satu sisi dulu) meski media tanam masih lembap, jaringan pembuluh dalam batang berwarna cokelat.',
    penyebab: 'Jamur Fusarium oxysporum atau bakteri Ralstonia solanacearum yang menyerang jaringan pembuluh dari akar/batang bawah.',
    gejala: 'Batang bawah kecokelatan, daun layu mendadak di siang hari walau tanah cukup lembap.',
    solusiOrganik: [
      'Cabut tanaman yang sudah layu permanen beserta tanah di sekitar perakaran agar tidak menular ke bedengan lain.',
      'Kocor lubang tanam sekitar dengan Trichoderma harzianum dan kompos matang untuk memperbaiki mikroba tanah.',
      'Tambahkan dolomit/kapur pertanian bila tanah terlalu asam (pH < 5,5).',
    ],
    solusiKimia: [
      'Tidak efektif menyemprot daun untuk layu pembuluh. Konsultasikan ke penyuluh sebelum memakai perlakuan tanah kimiawi dan selalu baca label produk.',
    ],
    pencegahan: [
      'Perbaiki drainase dan buat bedengan lebih tinggi di musim hujan.',
      'Pilih varietas tomat tahan layu (seperti Servo F1 / Gustavi).',
    ],
    sumber: 'Balitsa Kementan RI — Penyakit Layu Tanaman Solanaceae',
    kataKunci: ['layu', 'fusarium', 'ralstonia', 'batang', 'terkulai', 'pangkal', 'akar'],
  },
  keriting_kuning: {
    id: 'keriting_kuning',
    penyakit: 'Virus kuning / keriting daun (TYLCV)',
    bagianUmum: ['daun'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Daun muda menggulung/melengkung ke atas seperti sendok, permukaan keriting kerdil, tepi dan sela tulang daun menguning cerah (klorosis tajam), pertumbuhan pucuk terhambat.',
    penyebab: 'Tomato Yellow Leaf Curl Virus (TYLCV) / Gemini virus yang ditularkan oleh kutu kebul (Bemisia tabaci).',
    gejala: 'Daun pucuk mengeriting, menggulung ke atas, menguning cerah, tanaman tampak kerdil.',
    solusiOrganik: [
      'Pasang perangkap likat kuning (yellow sticky trap) di sekitar kebun untuk menangkap kutu kebul pembawa virus.',
      'Semprot bagian bawah daun dengan minyak nimba (neem oil) atau larutan sabun insektisida nabati pada sore hari.',
      'Cabut tanaman muda yang terserang sangat parah agar tidak menjadi sumber penularan.',
    ],
    solusiKimia: [
      'Virus tidak bisa disembuhkan dengan obat; pengendalian hanya menyasar vektor kutu kebul bila populasi tinggi sesuai anjuran penyuluh. Wajib baca label produk dan gunakan secara bijak.',
    ],
    pencegahan: [
      'Gunakan mulsa plastik perak atau kelambu serangga (insect net) di persemaian.',
      'Bersihkan gulma inang kutu kebul di pinggir bedengan.',
    ],
    sumber: 'Balitsa Kementan RI & FAO TYLCV Management Guide',
    kataKunci: ['keriting', 'kuning', 'virus', 'gemini', 'tylcv', 'kutu kebul', 'menggulung', 'kerdil'],
  },
  bercak_septoria: {
    id: 'bercak_septoria',
    penyakit: 'Bercak daun Septoria',
    bagianUmum: ['daun'],
    tanamanRentan: ['Tomat'],
    ciriVisualSpesifik:
      'Banyak bercak bulat kecil (2–4 mm) bertengah abu-abu/putih pucat dengan pinggiran cokelat gelap tajam pada daun bawah; sering tampak titik hitam kecil di tengah bercak.',
    penyebab: 'Jamur Septoria lycopersici yang menyebar lewat percikan air hujan atau penyiraman atas.',
    gejala: 'Bercak kecil bulat banyak di daun bawah dengan pusat keabu-abuan dan tepi gelap, daun cepat menguning dan rontok.',
    solusiOrganik: [
      'Pangkas daun bawah yang terinfeksi dan musnahkan di luar area kebun.',
      'Pasang mulsa jerami/plastik dan siram langsung ke permukaan tanah (jangan menyiram dari atas tajuk).',
      'Aplikasikan agen hayati Trichoderma atau fungisida nabati serai wangi secara rutin sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan cepat naik ke daun atas: fungisida kontak berbahan aktif klorotalonil atau tembaga sesuai dosis penyuluh. Wajib baca label produk.',
    ],
    pencegahan: [
      'Jangan merawat tanaman saat daun masih basah.',
      'Lakukan rotasi tanaman non-Solanaceae minimal 1 musim.',
    ],
    sumber: 'PlantVillage & University of Florida IFAS Tomato Disease Reference',
    kataKunci: ['septoria', 'abu-abu', 'bercak kecil', 'rontok'],
  },
  busuk_ujung_buah: {
    id: 'busuk_ujung_buah',
    penyakit: 'Busuk ujung buah (Blossom end rot)',
    bagianUmum: ['buah'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Bercak gelap cokelat kehitaman yang cekung dan kering/seperti kulit di bagian bawah/ujung buah (sisi bekas bunga), bukan di pangkal tangkai.',
    penyebab: 'Gangguan fisiologis akibat serapan Kalsium (Ca) tidak lancar ke buah, dipicu fluktuasi penyiraman (terlalu kering lalu terlalu basah) atau tanah terlalu asam.',
    gejala: 'Bagian bawah/ujung buah berubah cokelat kehitaman, cekung, dan keras.',
    solusiOrganik: [
      'Petik buah yang sudah terlanjur busuk ujung agar energi tanaman dialihkan ke buah sehat.',
      'Jaga penyiraman rutin dan stabil (kelembapan tanah 45–65%) serta pasang mulsa organik.',
      'Taburkan tepung cangkang telur halus atau dolomit 20–30 g di sekitar pangkal tanaman.',
    ],
    solusiKimia: [
      'Bila perlu koreksi cepat: kocor Kalsium nitrat dosis ringan (2–3 g/liter, 200 ml/tanaman). Ini bukan penyakit jamur sehingga fungisida tidak diperlukan; selalu baca label produk pupuk.',
    ],
    pencegahan: [
      'Hindari pemupukan Nitrogen (Urea) berlebihan saat fase berbunga dan berbuah.',
      'Jaga pH tanah sekitar 6,0–6,8 dengan pengapuran dolomit sebelum tanam.',
    ],
    sumber: 'Balitsa Kementan RI — Penanganan Busuk Ujung Buah Tomat',
    kataKunci: ['busuk ujung', 'blossom end rot', 'ujung buah', 'pantat hitam', 'cekung', 'kalsium'],
  },
  antraknosa: {
    id: 'antraknosa',
    penyakit: 'Antraknosa / patek buah',
    bagianUmum: ['buah'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Bercak bulat cekung basah pada kulit buah matang/setengah matang, tengahnya gelap atau berisi lingkaran spora berwarna jingga/merah muda/hitam.',
    penyebab: 'Jamur Colletotrichum spp. yang mudah menginfeksi buah matang saat cuaca lembap dan hujan.',
    gejala: 'Bercak cekung melingkar pada buah, buah cepat membusuk sebelum atau segera setelah dipanen.',
    solusiOrganik: [
      'Segera petik dan kubur/musnahkan buah yang bergejala patek agar spora tidak menyebar ke buah sehat.',
      'Panen buah segera saat matang, hindari buah menyentuh tanah langsung dengan ajir dan mulsa.',
      'Semprot fungisida nabati (ekstrak lengkuas/kunyit atau agen hayati Trichoderma/Bacillus).',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan berat di musim hujan: fungisida berbahan aktif azoksistrobin atau mankozeb sesuai anjuran penyuluh. Wajib baca label produk dan patuhi masa tunggu panen.',
    ],
    pencegahan: [
      'Gunakan benih sehat dan jaga jarak tanam cukup lebar.',
      'Kurangi kelembapan kebun lewat drainase dan pemangkasan tunas air.',
    ],
    sumber: 'Balitsa Kementan RI — Pengendalian Antraknosa Cabai & Tomat',
    kataKunci: ['antraknosa', 'patek', 'colletotrichum', 'busuk buah', 'cekung'],
  },
  serangan_hama_daun: {
    id: 'serangan_hama_daun',
    penyakit: 'Serangan hama daun (Penggorok / Ulat / Kutu)',
    bagianUmum: ['daun', 'buah'],
    tanamanRentan: ['Tomat', 'Cabai', 'Selada', 'Bayam'],
    ciriVisualSpesifik:
      'Terlihat liang korokan berliku putih keperakan pada daun (Liriomyza), lubang gigitan ulat pada daun/buah, atau koloni kutu kecil putih/hijau di balik daun.',
    penyebab: 'Hama lalat penggorok daun (Liriomyza), ulat buah/daun (Helicoverpa/Spodoptera), kutu daun (Aphids), atau tungau.',
    gejala: 'Daun berlubang, terdapat garis korokan putih berliku, atau terdapat serangga kecil di balik daun.',
    solusiOrganik: [
      'Ambil ulat atau daun berkorok parah secara manual pada pagi/sore hari.',
      'Pasang perangkap likat kuning untuk penggorok daun & kutu kebul.',
      'Semprot pestisida nabati minyak nimba (neem oil) atau larutan bawang putih + sabun cair nabati ke bagian bawah daun sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila populasi melewati ambang ekonomi: insektisida selektif sesuai anjuran penyuluh. Wajib baca label produk, gunakan APD, dan taati masa tunggu panen.',
    ],
    pencegahan: [
      'Tanam tanaman pengusir hama/refugia (kenikir, marigold/tahi ayam, kemangi) di tepi bedengan.',
      'Jaga kebersihan gulma sekitar lahan.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Integrated Pest Management',
    kataKunci: ['hama', 'ulat', 'kutu', 'penggorok', 'liriomyza', 'lubang', 'dimakan', 'serangga', 'thrips', 'tungau'],
  },
};

/* 4. Dataset Hara & Rekomendasi Pupuk per Fase (Organik Dulu + Acuan Umum Bukan Pengganti Uji Tanah) */
export const DATASET_NUTRIENTS: Record<string, NutrientDatasetEntry> = {
  cukup: {
    id: 'cukup',
    ciriVisualSpesifik:
      'Daun hijau segar merata dari bawah ke atas, tidak ada penguningan seragam, tidak ada tepi terbakar, tidak ada warna ungu tua di balik daun.',
    gejala: 'Warna daun hijau merata tanpa klorosis atau tepi terbakar.',
    dugaan: 'Hara terlihat seimbang',
    rekomendasiOrganik:
      'Pertahankan kompos matang 250–500 g/tanaman tiap 3 minggu atau POC (Pupuk Organik Cair) 10 ml/liter air.',
    rekomendasiPupuk: 'Pemupukan berimbang NPK 16-16-16 sesuai jadwal fase tumbuh.',
    dosisPerFase: {
      Bibit: 'Kompos halus campur media tanam 1:1; belum perlu pupuk kimia pekat.',
      Vegetatif: 'NPK 16-16-16 sekitar 5–8 g/tanaman (kocor 1x per 10 hari) + POC daun.',
      Berbunga: 'NPK 16-16-16 sekitar 8–10 g/tanaman + tambahan unsur Kalium & Kalsium.',
      Berbuah: 'KNO3 putih / MKP dosis ringan 3–5 g/liter (kocor 200 ml/tanaman) tiap 10 hari.',
      Panen: 'Kurangi Nitrogen, jaga Kalium ringan & kompos agar buah manis dan tidak mudah pecah.',
    },
    sumber: 'Balitsa Kementan RI — Acuan Umum Pemupukan Tomat',
    kataKunci: ['seimbang', 'cukup', 'normal', 'rutin', 'npk', 'kompos'],
  },
  kurang_nitrogen: {
    id: 'kurang_nitrogen',
    ciriVisualSpesifik:
      'Daun tua bagian bawah menguning pucat merata (klorosis seragam dari tangkai hingga ujung), ukuran daun mengecil, batang agak kurus.',
    gejala: 'Daun tua bagian bawah menguning pucat merata, pertumbuhan batang agak melambat.',
    dugaan: 'Dugaan kekurangan Nitrogen (N)',
    rekomendasiOrganik:
      'Berikan POC urin kelinci/fermentasi daun hijau (10–15 ml/liter) atau kompos kotoran ayam matang 300–500 g di sekitar perakaran.',
    rekomendasiPupuk: 'NPK 16-16-16 atau ZA/Urea dosis rendah secara kocor di pangkal batang.',
    dosisPerFase: {
      Bibit: 'POC ringan 5 ml/liter air, kocor 100 ml/polybag seminggu sekali.',
      Vegetatif: 'NPK 16-16-16 (8–10 g/tanaman) atau Urea ringan 3–5 g/liter dikocor 200 ml/tanaman.',
      Berbunga: 'Gunakan NPK seimbang 8 g/tanaman; hindari Nitrogen berlebih agar bunga tidak rontok.',
      Berbuah: 'Utamakan kompos cair / NPK rendah N (seperti 12-12-17) 5 g/tanaman agar buah tetap padat.',
      Panen: 'Cukup kompos ringan 250 g/tanaman, tidak perlu tambahan Urea.',
    },
    sumber: 'Balitsa Kementan RI & IPNI Tomato Nutrient Deficiency Guide',
    kataKunci: ['nitrogen', 'kuning', 'pucat', 'daun bawah', 'urea', 'za', 'kerdil'],
  },
  kurang_fosfor: {
    id: 'kurang_fosfor',
    ciriVisualSpesifik:
      'Bagian bawah/tulang daun tua berubah keunguan atau hijau gelap kusam, pertumbuhan akar dan pembungaan lambat.',
    gejala: 'Daun tua tampak hijau gelap kusam dengan semburat ungu kemerahan di balik daun dan tulang daun.',
    dugaan: 'Dugaan kekurangan Fosfor (P)',
    rekomendasiOrganik:
      'Tambahkan kompos kotoran kelelawar (guano) dosis tipis 50–100 g/tanaman atau pupuk hayati pelarut fosfat + kompos matang.',
    rekomendasiPupuk: 'SP-36 atau MKP (Mono Kalium Fosfat) dosis ringan saat awal tanam hingga berbunga.',
    dosisPerFase: {
      Bibit: 'Campurkan kompos matang + sedikit fosfat alam ke media tanam.',
      Vegetatif: 'SP-36 sekitar 5–8 g/tanaman ditabur melingkar 10 cm dari batang.',
      Berbunga: 'MKP 2–3 g/liter air, kocor 200 ml/tanaman tiap 10 hari untuk membantu pembungaan.',
      Berbuah: 'MKP 3 g/liter kocor 1x per 14 hari bila pembentukan buah melambat.',
      Panen: 'Cukup kompos matang agar ketersediaan P tanah tetap terjaga.',
    },
    sumber: 'Balitsa Kementan RI & IPNI Plant Nutrition Reference',
    kataKunci: ['fosfor', 'ungu', 'keunguan', 'bunga rontok', 'mkp', 'sp36'],
  },
  kurang_kalium: {
    id: 'kurang_kalium',
    ciriVisualSpesifik:
      'Pinggiran/tepi daun tua menguning lalu mengering kecokelatan seperti terbakar (marginal scorch), pematangan buah belang/tidak merata.',
    gejala: 'Tepi daun tua menguning lalu mengering kecokelatan, warna pematangan buah kurang merata.',
    dugaan: 'Dugaan kekurangan Kalium (K)',
    rekomendasiOrganik:
      'Tambahkan abu sekam bakar 100–200 g/tanaman atau POC kulit pisang/sabut kelapa 15 ml/liter air.',
    rekomendasiPupuk: 'KNO3 Putih atau KCl dosis ringan saat fase berbunga–berbuah.',
    dosisPerFase: {
      Bibit: 'Tambahkan sedikit abu sekam ke media tanam.',
      Vegetatif: 'NPK 16-16-16 (5–8 g/tanaman) + abu sekam.',
      Berbunga: 'KNO3 Putih 3–5 g/liter air, kocor 200 ml/tanaman tiap 10 hari.',
      Berbuah: 'KNO3 Putih atau NPK grower (15-9-20) 8–10 g/tanaman tiap 10 hari.',
      Panen: 'POC kalium organik 15 ml/liter tiap 14 hari untuk kualitas panen berikutnya.',
    },
    sumber: 'Balitsa Kementan RI & FAO Plant Nutrition Guide',
    kataKunci: ['kalium', 'tepi daun', 'terbakar', 'kno3', 'kcl', 'buah belang', 'manis'],
  },
  kurang_kalsium: {
    id: 'kurang_kalsium',
    ciriVisualSpesifik:
      'Daun muda pucuk melengkung/keriting tidak normal, atau muncul bercak cekung hitam/cokelat di ujung bawah buah (blossom end rot).',
    gejala: 'Daun muda agak melengkung, atau ujung bawah buah mulai cekung gelap (blossom end rot).',
    dugaan: 'Dugaan kekurangan Kalsium (Ca)',
    rekomendasiOrganik:
      'Taburkan tepung cangkang telur halus / dolomit 20–30 g di sekitar pangkal dan jaga penyiraman agar tidak terlalu kering lalu mendadak basah.',
    rekomendasiPupuk: 'Kalsium nitrat (Ca(NO3)2) dosis ringan secara kocor.',
    dosisPerFase: {
      Bibit: 'Dolomit 1 sendok teh per polybag saat tanam.',
      Vegetatif: 'Dolomit 20 g/tanaman di sekitar perakaran.',
      Berbunga: 'Kalsium nitrat 2–3 g/liter air, kocor 200 ml/tanaman tiap 10–14 hari.',
      Berbuah: 'Kalsium nitrat 3 g/liter kocor + jaga kelembapan tanah 45–65%.',
      Panen: 'Jaga irigasi stabil + dolomit ringan setelah panen gelombang pertama.',
    },
    sumber: 'Balitsa Kementan RI — Penanganan Busuk Ujung Buah Tomat',
    kataKunci: ['kalsium', 'dolomit', 'cangkang telur', 'busuk ujung', 'blossom end rot', 'pucuk'],
  },
  kurang_magnesium: {
    id: 'kurang_magnesium',
    ciriVisualSpesifik:
      'Klorosis antar-tulang daun pada daun tua (area di antara urat daun menguning sementara tulang daun tetap hijau jelas membentuk pola jaring).',
    gejala: 'Sela-sela tulang daun tua menguning sedangkan tulang daun tetap hijau.',
    dugaan: 'Dugaan kekurangan Magnesium (Mg)',
    rekomendasiOrganik:
      'Berikan kapur dolomit 20–30 g/tanaman (mengandung Ca & Mg alami) atau kompos matang secara rutin.',
    rekomendasiPupuk: 'Garam Epsom (Magnesium sulfat / MgSO4) 2 g/liter air dikocor ringan atau semprot daun sore hari.',
    dosisPerFase: {
      Bibit: 'Dolomit 1 sendok teh campur media tanam.',
      Vegetatif: 'Dolomit 20 g/tanaman atau MgSO4 2 g/liter (200 ml/tanaman).',
      Berbunga: 'MgSO4 2 g/liter kocor 1x per 14 hari.',
      Berbuah: 'MgSO4 2 g/liter kocor + hindari kelebihan Kalium agar serapan Mg tidak terhambat.',
      Panen: 'Dolomit ringan 20 g/tanaman untuk regenerasi tajuk.',
    },
    sumber: 'IPNI Tomato Nutrient Deficiency Guide & Balitsa Kementan RI',
    kataKunci: ['magnesium', 'tulang daun hijau', 'antar tulang', 'epsom', 'dolomit'],
  },
};

/* 5. Dataset Protokol Operasional Lahan, Irigasi, Tandon & Energi Surya CermatTani */
export const DATASET_PROTOCOLS: FarmProtocolEntry[] = [
  {
    id: 'irigasi_otomatis',
    topik: 'Irigasi Otomatis & Kelembapan Tanah',
    aturan:
      'Rentang kelembapan tanah ideal tomat/cabai adalah 45–65%. Pompa otomatis menyala jika kelembapan tanah turun di bawah ambang bawah (default 35%) dan mati di ambang atas (default 65%), dengan batas aman durasi pompa maksimal 15 menit per siklus. Siram di pangkal batang pagi/sore hari, hindari membasahi daun di malam hari.',
    kataKunci: ['siram', 'irigasi', 'pompa', 'kelembapan tanah', 'kering', 'basah', 'air'],
  },
  {
    id: 'tandon_air',
    topik: 'Keamanan Level Air Tandon',
    aturan:
      'Sensor ultrasonik mengukur sisa air tandon. Jika level air tandon turun di bawah ambang kritis (default < 20%), pompa otomatis ditahan (interlock kering) agar dinamo pompa tidak rusak. Segera isi tandon sebelum menyalakan irigasi kembali.',
    kataKunci: ['tandon', 'tangki', 'ultrasonik', 'air habis', 'pompa kering'],
  },
  {
    id: 'iklim_mikro_jamur',
    topik: 'Peringatan Risiko Jamur Iklim Mikro',
    aturan:
      'Jika kelembapan udara ≥ 85% RH berlangsung lama (≥ 4 jam) terutama pada suhu 18–26 °C, risiko busuk daun (Phytophthora infestans) dan bercak daun meningkat tinggi. Langkah cepat: hentikan siram tajuk, pangkas daun rimbun bagian bawah agar angin mengalir, dan cek bagian bawah daun setiap pagi.',
    kataKunci: ['lembap', 'kelembapan udara', 'suhu', 'cuaca', 'hujan', 'jamur', 'risiko'],
  },
  {
    id: 'energi_surya',
    topik: 'Energi Surya & Mode Hemat Baterai INA219',
    aturan:
      'Panel surya + baterai 12V menyuplai ESP32 dan pompa. Jika baterai turun di bawah 20%, ESP32 masuk Mode Hemat (interval kirim data diperlambat & irigasi non-darurat ditunda). Ukuran panel & baterai dapat dihitung di menu Energi Surya sesuai beban harian (Wh) dan hari mendung.',
    kataKunci: ['surya', 'panel', 'baterai', 'energi', 'watt', 'volt', 'ina219', 'mendung', 'listrik'],
  },
  {
    id: 'kalender_telegram',
    topik: 'Kalender Panen & Pengingat Bot Telegram',
    aturan:
      'Setiap hasil scan buah yang disimpan ke timeline otomatis menjadwalkan perkiraan panen di Kalender Panen. Petani dapat menautkan Bot Telegram di menu Kalender atau Pengaturan untuk menerima pengingat harian jadwal panen.',
    kataKunci: ['kalender', 'jadwal', 'telegram', 'bot', 'pengingat', 'notifikasi', 'panen'],
  },
  {
    id: 'kejujuran_ai',
    topik: 'Aturan Kejujuran AI & Konfirmasi Penyuluh',
    aturan:
      'Jika seberapa yakin Cermo di bawah ambang (default < 60%), wajib sarankan foto ulang di pencahayaan terang jarak 20–40 cm dan konfirmasi ke penyuluh pertanian setempat. Estimasi bobot panen selalu disebut "estimasi kasar", rekomendasi pupuk "bukan pengganti uji tanah", dan data sensor simulasi tetap dijelaskan berlabel Simulasi.',
    kataKunci: ['yakin', 'akurasi', 'ragu', 'foto ulang', 'penyuluh', 'uji tanah', 'simulasi'],
  },
];

/* 6. Builder Konteks Dataset Khusus untuk Vision AI (/api/scan) */
export function buildGroundedVisionDatasetPrompt(): string {
  const ripenessBlock = Object.entries(DATASET_RIPENESS)
    .map(
      ([id, r]) =>
        `- "${id}" (${r.label}): ${r.ciriVisual} | Estimasi ${r.minDays}–${r.maxDays} hari | Anjuran: "${r.anjuran}"`
    )
    .join('\n');

  const diseaseBlock = Object.values(DATASET_DISEASES)
    .map(
      (d) =>
        `- "${d.id}" (${d.penyakit}) [bagian: ${d.bagianUmum.join('/')}]: ${d.ciriVisualSpesifik}`
    )
    .join('\n');

  const nutrientBlock = Object.values(DATASET_NUTRIENTS)
    .map((n) => `- "${n.id}" (${n.dugaan}): ${n.ciriVisualSpesifik}`)
    .join('\n');

  return `=== DATASET KHUSUS REFERENSI VISION CERMATTANI (WAJIB DIPATUHI) ===
[A. KEMATANGAN BUAH]
${ripenessBlock}

[B. KATALOG PENYAKIT & HAMA RESMI — HANYA GUNAKAN ID INI]
${diseaseBlock}

[C. KATALOG DUGAAN HARA RESMI — HANYA GUNAKAN ID INI]
${nutrientBlock}
=== AKHIR DATASET ===`;
}

/* 7. Builder Konteks Dataset Khusus (Grounded RAG Retrieval) untuk Chatbot Cermo (/api/chat) */
export function buildGroundedChatDatasetContext(params: {
  message: string;
  plant: Plant | null;
  latestScan: ScanRecord | null;
  sensor: SensorSnapshot | null;
}): string {
  const q = params.message.toLowerCase();
  const sections: string[] = [];

  // A. Profil tanaman yang cocok dengan tanaman aktif atau pertanyaan
  const matchedCrops = DATASET_CROPS.filter((crop) => {
    const plantText = `${params.plant?.nama || ''} ${params.plant?.varietas || ''}`.toLowerCase();
    return (
      crop.kataKunci.some((k) => q.includes(k) || plantText.includes(k)) ||
      crop.id === 'tomat'
    );
  }).slice(0, 2);

  sections.push(
    `[DATASET TANAMAN]\n${matchedCrops
      .map(
        (c) =>
          `- ${c.namaUmum} (varietas: ${c.varietasContoh.join(', ')}): Suhu ${c.suhuOptimalC}, Tanah ${c.kelembapanTanahOptimal}, Udara ${c.kelembapanUdaraOptimal}, Umur panen ${c.umurPanenHst}, Bobot rata ~${c.bobotRataGram}g. Budidaya: ${c.catatanBudidaya}`
      )
      .join('\n')}`
  );

  // B. Dataset kematangan bila ditanya soal panen/buah/kematangan atau ada scan buah
  if (
    params.latestScan?.bagian === 'buah' ||
    /panen|matang|mentah|petik|buah|warna|hasil|berapa hari/.test(q)
  ) {
    sections.push(
      `[DATASET KEMATANGAN BUAH]\n${Object.values(DATASET_RIPENESS)
        .map(
          (r) =>
            `- ${r.label}: ${r.ciriVisual} -> ${r.anjuran} (${r.minDays}–${r.maxDays} hari). Pasca panen: ${r.penangananPascaPanen}`
        )
        .join('\n')}`
    );
  }

  // C. Dataset penyakit yang relevan dengan hasil scan terbaru atau pertanyaan
  const diseaseIds = new Set<string>();
  if (params.latestScan?.penyakitUtamaId && DATASET_DISEASES[params.latestScan.penyakitUtamaId]) {
    diseaseIds.add(params.latestScan.penyakitUtamaId);
  }
  for (const d of Object.values(DATASET_DISEASES)) {
    if (d.kataKunci.some((k) => q.includes(k)) || q.includes(d.penyakit.toLowerCase())) {
      diseaseIds.add(d.id);
    }
  }
  if (/penyakit|sakit|bercak|busuk|layu|jamur|hama|obat|semprot|organik|daun/.test(q) && diseaseIds.size < 2) {
    diseaseIds.add('bercak_kering');
    diseaseIds.add('busuk_daun');
  }
  if (diseaseIds.size > 0) {
    const entries = Array.from(diseaseIds)
      .slice(0, 3)
      .map((id) => DATASET_DISEASES[id])
      .filter(Boolean);
    sections.push(
      `[DATASET PENYAKIT & SOLUSI TERKURASI]\n${entries
        .map(
          (d) =>
            `- ${d.penyakit} (${d.id}): Penyebab: ${d.penyebab} | Gejala: ${d.gejala} | Organik dulu: ${d.solusiOrganik.join(' ; ')} | Opsi kimia terakhir: ${d.solusiKimia.join(' ')} | Pencegahan: ${d.pencegahan.join(' ; ')} | Sumber: ${d.sumber}`
        )
        .join('\n')}`
    );
  }

  // D. Dataset hara & pupuk yang relevan
  const nutrientIds = new Set<string>();
  if (params.latestScan?.dugaanHaraId && DATASET_NUTRIENTS[params.latestScan.dugaanHaraId]) {
    nutrientIds.add(params.latestScan.dugaanHaraId);
  }
  for (const n of Object.values(DATASET_NUTRIENTS)) {
    if (n.kataKunci.some((k) => q.includes(k))) {
      nutrientIds.add(n.id);
    }
  }
  if (/pupuk|hara|nutrisi|npk|kompos|kuning|dosis|takaran/.test(q) && nutrientIds.size === 0) {
    nutrientIds.add('cukup');
    nutrientIds.add('kurang_nitrogen');
    nutrientIds.add('kurang_kalium');
  }
  if (nutrientIds.size > 0) {
    const fase: GrowthPhase = params.plant?.fase || 'Berbuah';
    const entries = Array.from(nutrientIds)
      .slice(0, 3)
      .map((id) => DATASET_NUTRIENTS[id])
      .filter(Boolean);
    sections.push(
      `[DATASET HARA & PUPUK FASE ${fase.toUpperCase()}]\n${entries
        .map(
          (n) =>
            `- ${n.dugaan}: Gejala: ${n.gejala} | Organik: ${n.rekomendasiOrganik} | Dosis fase ${fase}: ${n.dosisPerFase[fase]} | Sumber: ${n.sumber}`
        )
        .join('\n')}`
    );
  }

  // E. Dataset protokol irigasi, tandon, iklim mikro, surya, kalender
  const matchedProtocols = DATASET_PROTOCOLS.filter((p) =>
    p.kataKunci.some((k) => q.includes(k))
  );
  if (matchedProtocols.length > 0) {
    sections.push(
      `[DATASET PROTOKOL CERMATTANI]\n${matchedProtocols
        .map((p) => `- ${p.topik}: ${p.aturan}`)
        .join('\n')}`
    );
  }

  return sections.join('\n\n');
}
