import {
  GrowthPhase,
  KnowledgeDisease,
  KnowledgeNutrient,
  Plant,
  RipenessStage,
  ScanRecord,
  SensorSnapshot,
} from '../types/cermattani';

/**
 * DATASET KHUSUS AGRONOMI & YOLOv8 CERMATTANI (Grounded Knowledge Base v3.0)
 * --------------------------------------------------------------------------
 * 24 Kelas Penyakit, Busuk Buah, Virus, Gangguan Fisiologis & Hama + 10 Kelas Hara + 8 Komoditas
 *
 * Sumber acuan resmi eksternal:
 * - PlantVillage Tomato & Vegetable Disease Benchmark (10 kelas utama)
 * - LaboroTomato Maturity Dataset (Stage 1–6)
 * - Balitsa (Balai Penelitian Tanaman Sayuran) Kementan RI
 * - University of Florida IFAS Extension (EDIS Vegetable Disease Handbook)
 * - FAO Integrated Pest Management (IPM) & EPPO Global Database
 * - IPNI (International Plant Nutrition Institute) Deficiency Guide
 */

export interface CropDatasetEntry {
  id: string;
  namaUmum: string;
  namaIlmiah: string;
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
  yoloClassId: number;
  namaIlmiahPatogen: string;
  wikiQuery: string;
  kategori: 'sehat' | 'jamur' | 'bakteri' | 'virus' | 'hama' | 'busuk_buah' | 'fisiologis';
  ciriVisualSpesifik: string;
  tanamanRentan: string[];
  kataKunci: string[];
}

export interface NutrientDatasetEntry extends KnowledgeNutrient {
  unsurSimbol: string;
  ciriVisualSpesifik: string;
  kataKunci: string[];
}

export interface FarmProtocolEntry {
  id: string;
  topik: string;
  aturan: string;
  kataKunci: string[];
}

/* 1. Dataset Kematangan Buah (YOLOv8 Class 0–2 | USDA Stage 1–6 & LaboroTomato) */
export const DATASET_RIPENESS: Record<
  RipenessStage,
  {
    yoloClassId: number;
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
    yoloClassId: 0,
    label: 'Mentah',
    color: '#48A370',
    minDays: 7,
    maxDays: 10,
    anjuran: 'Tunggu',
    ciriVisual:
      'Kulit hijau penuh atau hijau muda merata (USDA Stage 1–2 Green/Mature Green), belum ada semburat kuning/jingga/merah, daging keras.',
    ringkasan: 'Kulit masih hijau penuh. Tunggu 7–10 hari sambil jaga penyiraman teratur.',
    penangananPascaPanen: 'Belum disarankan dipetik kecuali untuk pengiriman jarak sangat jauh.',
    sumber: 'Balitsa Kementan RI & LaboroTomato (USDA Stage 1–2)',
  },
  setengah_matang: {
    yoloClassId: 1,
    label: 'Setengah matang',
    color: '#ECB04C',
    minDays: 2,
    maxDays: 4,
    anjuran: 'Tunggu',
    ciriVisual:
      'Muncul warna kuning, jingga, atau merah muda 10%–60% dari ujung buah (USDA Stage 3–4 Breaker/Turning/Pink).',
    ringkasan: 'Warna mulai jingga/merah muda (breaker–pink). Siap panen 2–4 hari lagi.',
    penangananPascaPanen:
      'Dapat dipetik bila akan dikirim ke pasar jarak jauh (tahan simpan 4–6 hari suhu ruang).',
    sumber: 'Balitsa Kementan RI & LaboroTomato (USDA Stage 3–4)',
  },
  matang: {
    yoloClassId: 2,
    label: 'Matang',
    color: '#E37153',
    minDays: 0,
    maxDays: 1,
    anjuran: 'Panen sekarang',
    ciriVisual:
      'Warna merah cerah atau merah tua merata > 85%–90% permukaan buah (USDA Stage 5–6 Light Red/Red), kulit mengilap, buah terasa berisi.',
    ringkasan: 'Warna merah merata (> 90%). Cocok dipetik pagi atau sore agar buah tetap segar.',
    penangananPascaPanen:
      'Petik beserta sedikit tangkai pada pagi (06.00–09.00) atau sore hari, simpan di wadah teduh tidak bertumpuk tinggi.',
    sumber: 'Balitsa Kementan RI & LaboroTomato (USDA Stage 5–6)',
  },
};

/* 2. Dataset 8 Komoditas Tanaman Kebun (lengkap dengan nama ilmiah untuk referensi eksternal GBIF/Wikipedia) */
export const DATASET_CROPS: CropDatasetEntry[] = [
  {
    id: 'tomat',
    namaUmum: 'Tomat',
    namaIlmiah: 'Solanum lycopersicum',
    varietasContoh: ['Servo F1', 'Gustavi', 'Rampai', 'Tomat Ceri', 'Tymoti F1'],
    suhuOptimalC: '20–28 °C',
    kelembapanTanahOptimal: '45–65%',
    kelembapanUdaraOptimal: '60–75% RH',
    umurPanenHst: '60–75 HST',
    bobotRataGram: 85,
    catatanBudidaya:
      'Siram di pangkal batang pagi hari, pasang ajir/lanjaran, pangkas tunas air rutin, jaga jarak tanam 50 × 60 cm agar sirkulasi udara lancar.',
    kataKunci: ['tomat', 'servo', 'gustavi', 'rampai', 'ceri', 'solanum lycopersicum'],
  },
  {
    id: 'cabai',
    namaUmum: 'Cabai',
    namaIlmiah: 'Capsicum annuum',
    varietasContoh: ['Cabai Rawit', 'Cabai Merah Keriting', 'Cabai Besar'],
    suhuOptimalC: '22–30 °C',
    kelembapanTanahOptimal: '45–60%',
    kelembapanUdaraOptimal: '60–75% RH',
    umurPanenHst: '75–90 HST',
    bobotRataGram: 8,
    catatanBudidaya:
      'Peka genangan air dan antraknosa (patek) di musim hujan; gunakan mulsa perak, drainase tinggi, dan sanitasi buah jatuh.',
    kataKunci: ['cabai', 'cabe', 'rawit', 'keriting', 'capsicum'],
  },
  {
    id: 'terong',
    namaUmum: 'Terong',
    namaIlmiah: 'Solanum melongena',
    varietasContoh: ['Terong Ungu Mustang', 'Terong Lalap Hijau', 'Terong Belanda'],
    suhuOptimalC: '22–30 °C',
    kelembapanTanahOptimal: '50–65%',
    kelembapanUdaraOptimal: '60–75% RH',
    umurPanenHst: '60–70 HST',
    bobotRataGram: 180,
    catatanBudidaya:
      'Rentan layu bakteri dan kutu kebul; jaga drainase bedengan, pangkas daun bawah tua, dan beri kompos matang berkala.',
    kataKunci: ['terong', 'terung', 'eggplant', 'solanum melongena'],
  },
  {
    id: 'kentang',
    namaUmum: 'Kentang',
    namaIlmiah: 'Solanum tuberosum',
    varietasContoh: ['Granola', 'Atlantik', 'Median'],
    suhuOptimalC: '15–22 °C',
    kelembapanTanahOptimal: '55–70%',
    kelembapanUdaraOptimal: '70–80% RH',
    umurPanenHst: '90–110 HST',
    bobotRataGram: 120,
    catatanBudidaya:
      'Sangat peka busuk daun Phytophthora (Late blight) pada dataran tinggi berkabut; gunakan bibit bersertifikat & pembumbunan guludan.',
    kataKunci: ['kentang', 'potato', 'granola', 'solanum tuberosum'],
  },
  {
    id: 'selada',
    namaUmum: 'Selada',
    namaIlmiah: 'Lactuca sativa',
    varietasContoh: ['Selada Keriting', 'Selada Romaine', 'Selada Butterhead'],
    suhuOptimalC: '16–24 °C',
    kelembapanTanahOptimal: '55–70%',
    kelembapanUdaraOptimal: '65–80% RH',
    umurPanenHst: '30–45 HST',
    bobotRataGram: 150,
    catatanBudidaya:
      'Butuh air stabil dan nitrogen seimbang agar daun renyah tidak pahit; beri naungan paranet saat terik.',
    kataKunci: ['selada', 'lettuce', 'lactuca sativa'],
  },
  {
    id: 'bayam',
    namaUmum: 'Bayam',
    namaIlmiah: 'Amaranthus tricolor',
    varietasContoh: ['Bayam Hijau Maestro', 'Bayam Merah Mira'],
    suhuOptimalC: '22–30 °C',
    kelembapanTanahOptimal: '50–65%',
    kelembapanUdaraOptimal: '60–75% RH',
    umurPanenHst: '25–30 HST',
    bobotRataGram: 40,
    catatanBudidaya:
      'Panen saat tinggi 20–25 cm sebelum berbunga; kebutuhan utama kompos matang dan penyiraman pagi/sore.',
    kataKunci: ['bayam', 'spinach', 'amaranthus'],
  },
  {
    id: 'mentimun',
    namaUmum: 'Mentimun',
    namaIlmiah: 'Cucumis sativus',
    varietasContoh: ['Timun Baby', 'Timun Lalap', 'Timun Jepang Kyuri'],
    suhuOptimalC: '21–30 °C',
    kelembapanTanahOptimal: '55–70%',
    kelembapanUdaraOptimal: '65–80% RH',
    umurPanenHst: '35–45 HST',
    bobotRataGram: 160,
    catatanBudidaya:
      'Pasang rambatan/para-para dan waspadai embun bulu (Downy mildew) serta embun tepung pada daun bawah.',
    kataKunci: ['timun', 'mentimun', 'ketimun', 'cucumis sativus'],
  },
  {
    id: 'sawi',
    namaUmum: 'Sawi & Pakcoy',
    namaIlmiah: 'Brassica rapa',
    varietasContoh: ['Pakcoy Nauli', 'Sawi Hijau Caisim', 'Sawi Putih'],
    suhuOptimalC: '18–27 °C',
    kelembapanTanahOptimal: '55–70%',
    kelembapanUdaraOptimal: '65–80% RH',
    umurPanenHst: '28–40 HST',
    bobotRataGram: 130,
    catatanBudidaya:
      'Jaga dari ulat daun kubis (Plutella) dan busuk lunak akar/pangkal dengan drainase baik dan mulsa.',
    kataKunci: ['sawi', 'pakcoy', 'caisim', 'brassica'],
  },
];

/* 3. Dataset 24 Kelas Penyakit, Busuk Buah, Virus & Hama (Sinkron 1:1 dengan YOLOv8 Class 3–26) */
export const DATASET_DISEASES: Record<string, DiseaseDatasetEntry> = {
  sehat: {
    id: 'sehat',
    yoloClassId: 3,
    penyakit: 'Sehat',
    namaIlmiahPatogen: 'Solanum lycopersicum',
    wikiQuery: 'Solanum lycopersicum',
    kategori: 'sehat',
    bagianUmum: ['buah', 'daun', 'batang'],
    tanamanRentan: ['Tomat', 'Cabai', 'Terong', 'Kentang', 'Selada', 'Bayam', 'Mentimun', 'Sawi'],
    ciriVisualSpesifik:
      'Daun hijau segar seragam tanpa bercak nekrotik/cincin/mosaik/serbuk, batang tegak utuh tanpa luka cokelat basah, kulit buah mulus tidak busuk/cekung/pecah.',
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
    sumber: 'Balitsa Kementan RI, PlantVillage & FAO IPM',
    kataKunci: ['sehat', 'normal', 'aman', 'rawat'],
  },
  bercak_kering: {
    id: 'bercak_kering',
    yoloClassId: 4,
    penyakit: 'Bercak daun kering (Early blight)',
    namaIlmiahPatogen: 'Alternaria solani',
    wikiQuery: 'Alternaria solani',
    kategori: 'jamur',
    bagianUmum: ['daun', 'batang'],
    tanamanRentan: ['Tomat', 'Kentang', 'Terong', 'Cabai'],
    ciriVisualSpesifik:
      'Bercak cokelat tua hingga kehitaman berbentuk cincin konsentris (seperti papan panah/bullseye) pada daun tua bagian bawah, dikelilingi tepi kuning (halo klorosis).',
    penyebab: 'Jamur Alternaria solani yang berkembang cepat pada cuaca hangat dan daun sering basah.',
    gejala: 'Bercak cokelat tua melingkar konsentris pada daun tua, tepi bercak menguning.',
    solusiOrganik: [
      'Petik dan buang daun yang berbercak jauh dari bedengan (jangan dijadikan kompos).',
      'Semprot fungisida nabati atau agen hayati Trichoderma / larutan baking soda 1 sdt/liter + sedikit sabun cair nabati sore hari.',
      'Siram langsung ke tanah dekat akar, hindari menyiram membasahi tajuk daun.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan meluas (> 25% daun): fungisida kontak mankozeb atau klorotalonil secara bergantian. Wajib baca label produk, patuhi dosis & masa tunggu panen.',
    ],
    pencegahan: [
      'Beri jarak tanam minimal 50 × 60 cm dan pasang mulsa untuk menahan percikan spora dari tanah.',
      'Lakukan rotasi tanaman non-Solanaceae setelah panen.',
    ],
    sumber: 'PlantVillage, Balitsa Kementan RI & UF/IFAS Extension',
    kataKunci: ['bercak kering', 'early blight', 'alternaria', 'cincin', 'bullseye', 'bercak'],
  },
  busuk_daun: {
    id: 'busuk_daun',
    yoloClassId: 5,
    penyakit: 'Busuk daun / Hawar daun (Late blight)',
    namaIlmiahPatogen: 'Phytophthora infestans',
    wikiQuery: 'Phytophthora infestans',
    kategori: 'jamur',
    bagianUmum: ['daun', 'buah', 'batang'],
    tanamanRentan: ['Tomat', 'Kentang'],
    ciriVisualSpesifik:
      'Bercak lebar tampak basah berwarna hijau keabu-abuan lalu cepat menghitam/cokelat gelap di tepi daun atau batang; pada RH tinggi muncul lapisan kapang putih halus di balik daun.',
    penyebab: 'Oomycete Phytophthora infestans yang menyebar sangat cepat saat kelembapan udara ≥ 85% dan suhu 18–26 °C.',
    gejala: 'Bercak basah hijau keabu-abuan lalu menghitam cepat pada tepi daun; di pagi lembap terlihat lapisan putih tipis di bawah daun.',
    solusiOrganik: [
      'Segera pangkas dan musnahkan bagian tanaman terserang jauh dari kebun agar tidak menular cepat.',
      'Pangkas daun rimbun bagian bawah dan hentikan penyiraman dari atas tajuk.',
      'Aplikasikan fungisida tembaga organik atau agen hayati Bacillus subtilis.',
    ],
    solusiKimia: [
      'Bila gejala menyebar cepat di musim hujan: pertimbangkan fungisida spesifik oomycete sesuai anjuran penyuluh setempat. Wajib baca label produk, gunakan APD, dan taati masa tunggu panen.',
    ],
    pencegahan: [
      'Pantau peringatan risiko iklim mikro di CermatTani setiap kali kelembapan udara tinggi.',
      'Pastikan drainase bedengan lancar agar air hujan tidak menggenang.',
    ],
    sumber: 'PlantVillage, Balitsa Kementan RI & FAO Late Blight Advisory',
    kataKunci: ['busuk daun', 'hawar', 'late blight', 'phytophthora', 'basah', 'hitam', 'hujan'],
  },
  kapang_daun: {
    id: 'kapang_daun',
    yoloClassId: 6,
    penyakit: 'Kapang daun (Leaf mold)',
    namaIlmiahPatogen: 'Passalora fulva',
    wikiQuery: 'Passalora fulva',
    kategori: 'jamur',
    bagianUmum: ['daun'],
    tanamanRentan: ['Tomat'],
    ciriVisualSpesifik:
      'Bercak kuning kehijauan pucat tidak beraturan di permukaan atas daun tua, disertai lapisan kapang beludru cokelat zaitun/ungu keabu-abuan di permukaan bawah daun.',
    penyebab: 'Jamur Passalora fulva (Fulvia fulva) yang sangat menyukai kelembapan udara tinggi (> 85%) di greenhouse atau bedengan terlalu rimbun.',
    gejala: 'Sisi atas daun berbintik kuning pucat, sementara sisi bawah tertutup lapisan beludru cokelat kehijauan/zaitun.',
    solusiOrganik: [
      'Petik daun tua yang terinfeksi secara hati-hati ke dalam kantong agar spora tidak beterbangan.',
      'Tingkatkan ventilasi/sirkulasi udara dengan memangkas tunas air dan daun bawah.',
      'Semprot fungisida nabati (ekstrak serai wangi/bawang putih) atau larutan kalium bikarbonat/baking soda ringan ke sisi bawah daun.',
    ],
    solusiKimia: [
      'Opsi terakhir pada serangan berat di greenhouse: fungisida kontak terdaftar sesuai penyuluh. Wajib baca label produk dan masa tunggu panen.',
    ],
    pencegahan: [
      'Hindari menyiram pada sore/malam hari agar kelembapan tajuk turun cepat.',
      'Gunakan varietas tomat tahan kapang daun dan atur jarak tanam lega.',
    ],
    sumber: 'PlantVillage & UF/IFAS Tomato Leaf Mold Guide',
    kataKunci: ['kapang daun', 'leaf mold', 'beludru', 'zaitun', 'passalora', 'fulvia'],
  },
  bercak_septoria: {
    id: 'bercak_septoria',
    yoloClassId: 7,
    penyakit: 'Bercak daun Septoria',
    namaIlmiahPatogen: 'Septoria lycopersici',
    wikiQuery: 'Septoria lycopersici',
    kategori: 'jamur',
    bagianUmum: ['daun'],
    tanamanRentan: ['Tomat'],
    ciriVisualSpesifik:
      'Banyak bercak bulat kecil (2–4 mm) bertengah abu-abu/putih pucat dengan pinggiran cokelat gelap tajam pada daun bawah; sering tampak titik hitam kecil di pusat bercak.',
    penyebab: 'Jamur Septoria lycopersici yang menyebar lewat percikan air hujan atau penyiraman atas.',
    gejala: 'Bercak kecil bulat banyak di daun bawah dengan pusat abu-abu dan tepi gelap, daun cepat menguning dan rontok.',
    solusiOrganik: [
      'Pangkas daun bawah yang terinfeksi dan musnahkan di luar area kebun.',
      'Pasang mulsa jerami/plastik dan siram langsung ke permukaan tanah.',
      'Aplikasikan agen hayati Trichoderma atau fungisida nabati serai wangi sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan cepat naik ke daun atas: fungisida kontak klorotalonil atau tembaga sesuai dosis penyuluh. Wajib baca label produk.',
    ],
    pencegahan: [
      'Jangan merawat/memangkas tanaman saat daun masih basah.',
      'Lakukan rotasi tanaman non-Solanaceae minimal 1 musim.',
    ],
    sumber: 'PlantVillage & UF/IFAS Tomato Disease Reference',
    kataKunci: ['septoria', 'abu-abu', 'bercak kecil', 'rontok'],
  },
  bercak_target: {
    id: 'bercak_target',
    yoloClassId: 8,
    penyakit: 'Bercak target (Target spot)',
    namaIlmiahPatogen: 'Corynespora cassiicola',
    wikiQuery: 'Corynespora cassiicola',
    kategori: 'jamur',
    bagianUmum: ['daun', 'buah', 'batang'],
    tanamanRentan: ['Tomat', 'Mentimun', 'Cabai'],
    ciriVisualSpesifik:
      'Bercak cokelat gelap bulat melebar dengan zona cincin target tipis pada daun tengah-bawah, sering berlubang/sobek di bagian tengah bercak tua, kadang meninggalkan lesi cokelat cekung pada buah hijau.',
    penyebab: 'Jamur Corynespora cassiicola yang berkembang pesat pada suhu hangat (24–30 °C) dan periode basah panjang.',
    gejala: 'Bercak cokelat kehitaman berpola cincin target di daun yang cepat menyatu hingga daun gugur, serta bercak cekung kecil di buah.',
    solusiOrganik: [
      'Buang daun bawah yang bergejala berat untuk memutus sumber spora.',
      'Beri jarak tanam dan pangkas cabang berlebih agar daun cepat kering setelah embun pagi.',
      'Semprot fungisida nabati / Bacillus subtilis secara berkala di sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan merusak tajuk luas: fungisida protektan sesuai arahan penyuluh setempat. Wajib baca label produk & masa tunggu panen.',
    ],
    pencegahan: [
      'Bersihkan sisa tanaman panen sebelumnya karena spora bertahan di serasah tanah.',
      'Gunakan mulsa dan penyiraman tetes di pangkal batang.',
    ],
    sumber: 'PlantVillage & UF/IFAS Target Spot of Tomato',
    kataKunci: ['target spot', 'bercak target', 'corynespora', 'berlubang', 'cincin'],
  },
  bercak_bakteri: {
    id: 'bercak_bakteri',
    yoloClassId: 9,
    penyakit: 'Bercak bakteri (Bacterial spot)',
    namaIlmiahPatogen: 'Xanthomonas perforans',
    wikiQuery: 'Xanthomonas',
    kategori: 'bakteri',
    bagianUmum: ['daun', 'buah'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Bintik-bintik kecil (1–3 mm) cokelat kehitaman tampak berair tersebar pada daun atau koreng kecil kasar menonjol bertepi terang pada kulit buah.',
    penyebab: 'Bakteri Xanthomonas spp. terbawa benih atau menyebar lewat percikan hujan dan tangan saat merawat tanaman.',
    gejala: 'Bintik kecil cokelat kehitaman berair pada daun atau koreng kasar di permukaan buah.',
    solusiOrganik: [
      'Pisahkan dan buang daun/buah bergejala; cuci tangan & gunting pangkas dengan alkohol/sabun sebelum menyentuh tanaman sehat.',
      'Hindari menyentuh tanaman saat daun masih basah oleh embun atau hujan.',
      'Semprot bakterisida nabati (ekstrak daun sirih/bawang putih) sebagai penekan awal.',
    ],
    solusiKimia: [
      'Opsi terakhir pada serangan berat: bakterisida berbahan tembaga hidroksida sesuai penyuluh. Wajib baca label produk dan ikuti batas aman panen.',
    ],
    pencegahan: [
      'Gunakan benih sehat bersertifikat dan sterilkan peralatan kebun berkala.',
    ],
    sumber: 'PlantVillage, Balitsa Kementan RI & UF/IFAS',
    kataKunci: ['bakteri', 'bacterial spot', 'koreng', 'xanthomonas', 'berair'],
  },
  bintik_bakteri: {
    id: 'bintik_bakteri',
    yoloClassId: 10,
    penyakit: 'Bintik bakteri (Bacterial speck)',
    namaIlmiahPatogen: 'Pseudomonas syringae pv. tomato',
    wikiQuery: 'Pseudomonas syringae',
    kategori: 'bakteri',
    bagianUmum: ['daun', 'buah'],
    tanamanRentan: ['Tomat'],
    ciriVisualSpesifik:
      'Bintik hitam sangat kecil (< 1–2 mm) seperti tusukan jarum dikelilingi lingkaran kuning jelas pada daun, dan bintik hitam dangkal halus pada kulit buah hijau.',
    penyebab: 'Bakteri Pseudomonas syringae pv. tomato yang berkembang cepat pada cuaca sejuk (18–24 °C) dan basah/berembun.',
    gejala: 'Bintik hitam kecil bertepi kuning di daun dan bintik hitam dangkal berukuran < 2 mm di kulit buah.',
    solusiOrganik: [
      'Pangkas daun terinfeksi saat cuaca kering agar tidak menyebarkan bakteri lewat tangan basah.',
      'Gunakan mulsa untuk mencegah percikan dari tanah dan siram hanya di pangkal batang.',
      'Aplikasikan ekstrak bawang putih/sirih atau agen hayati antagonis.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan cepat meluas di musim dingin/hujan: bakterisida berbasis tembaga sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: [
      'Gunakan benih bebas patogen dan lakukan rotasi tanaman minimal 2 musim.',
    ],
    sumber: 'UF/IFAS Extension & UC IPM Bacterial Speck Guide',
    kataKunci: ['bintik bakteri', 'bacterial speck', 'pseudomonas', 'tusukan jarum'],
  },
  kanker_bakteri: {
    id: 'kanker_bakteri',
    yoloClassId: 11,
    penyakit: 'Kanker bakteri (Bacterial canker)',
    namaIlmiahPatogen: 'Clavibacter michiganensis',
    wikiQuery: 'Clavibacter michiganensis',
    kategori: 'bakteri',
    bagianUmum: ['batang', 'buah', 'daun'],
    tanamanRentan: ['Tomat'],
    ciriVisualSpesifik:
      'Tepi daun mengering cokelat hangus satu sisi (firing), batang memiliki celah/luka memanjang kecokelatan (canker), dan pada buah tampak bintik kecil putih berpusat cokelat seperti "mata burung" (bird\'s-eye spot).',
    penyebab: 'Bakteri Clavibacter michiganensis subsp. michiganensis yang menular lewat benih, luka pemangkasan, dan gunting kebun.',
    gejala: 'Tepi daun mengering sepihak, luka memanjang pada batang, dan bintik "mata burung" putih berpusat gelap di kulit buah.',
    solusiOrganik: [
      'Segera cabut dan musnahkan tanaman yang bergejala berat ke luar lahan (jangan dijadikan kompos).',
      'Sterilkan gunting pangkas, ajir, dan tangan dengan alkohol 70% atau larutan pemutih encer tiap berpindah tanaman.',
      'Hindari memangkas tunas air saat tanaman masih basah.',
    ],
    solusiKimia: [
      'Tidak ada obat penyembuh infeksi sistemik kanker bakteri; penyemprotan tembaga hanya menekan penularan permukaan sesuai arahan penyuluh. Wajib baca label produk.',
    ],
    pencegahan: [
      'Gunakan benih tersertifikasi bersih patogen dan rendam air hangat 50 °C (25 menit) sebelum semai.',
      'Rotasi lahan 2–3 tahun bebas Solanaceae bila pernah terserang berat.',
    ],
    sumber: 'UF/IFAS Extension & EPPO Global Database',
    kataKunci: ['kanker bakteri', 'bacterial canker', 'clavibacter', 'mata burung', 'birds eye'],
  },
  embun_tepung: {
    id: 'embun_tepung',
    yoloClassId: 12,
    penyakit: 'Embun tepung (Powdery mildew)',
    namaIlmiahPatogen: 'Oidium neolycopersici',
    wikiQuery: 'Powdery mildew',
    kategori: 'jamur',
    bagianUmum: ['daun', 'batang'],
    tanamanRentan: ['Tomat', 'Cabai', 'Mentimun', 'Terong'],
    ciriVisualSpesifik:
      'Lapisan serbuk putih keabu-abuan seperti taburan bedak/tepung pada permukaan atas maupun bawah daun, lama-kelamaan daun menguning dan mengering.',
    penyebab: 'Jamur golongan Erysiphales (Oidium / Leveillula) yang menyebar cepat lewat angin pada kondisi hangat dan tajuk teduh.',
    gejala: 'Permukaan daun tertutup bercak serbuk putih seperti tepung dan daun mulai kusam/menguning.',
    solusiOrganik: [
      'Pangkas daun yang tertutup serbuk putih berat agar spora tidak menyebar lewat angin.',
      'Semprot larutan baking soda 1 sdt/liter + sedikit minyak nabati/sabun cair organik atau minyak nimba (neem oil) sore hari.',
      'Tingkatkan paparan sinar matahari dan aliran udara antar tanaman.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan berat: fungisida berbahan sulfur/belerang sesuai dosis tanaman. Wajib baca label produk dan hindari semprot saat terik > 32 °C.',
    ],
    pencegahan: [
      'Hindari pemupukan Nitrogen berlebihan yang membuat daun terlalu rimbun dan lembap.',
      'Bersihkan daun gugur di sekitar pangkal tanaman.',
    ],
    sumber: 'Balitsa Kementan RI, UF/IFAS & FAO IPM',
    kataKunci: ['embun tepung', 'powdery mildew', 'tepung', 'bedak', 'putih', 'oidium'],
  },
  embun_bulu: {
    id: 'embun_bulu',
    yoloClassId: 13,
    penyakit: 'Embun bulu (Downy mildew)',
    namaIlmiahPatogen: 'Pseudoperonospora cubensis',
    wikiQuery: 'Downy mildew',
    kategori: 'jamur',
    bagianUmum: ['daun'],
    tanamanRentan: ['Mentimun', 'Selada', 'Sawi', 'Bayam'],
    ciriVisualSpesifik:
      'Bercak kuning bersudut tajam dibatasi oleh tulang daun di sisi atas daun (seperti papan catur), disertai bulu halus keunguan/abu-abu di permukaan bawah daun saat pagi lembap.',
    penyebab: 'Oomycete golongan Peronosporaceae yang aktif saat malam sejuk, berembun tebal, dan hujan berkepanjangan.',
    gejala: 'Bercak kuning menyudut mengikuti urat daun di atas, dan lapisan spora berbulu keabu-abuan di balik daun.',
    solusiOrganik: [
      'Petik daun tua terinfeksi di pagi hari setelah embun mengering.',
      'Siram hanya di pangkal tanah pada pagi hari dan buka sirkulasi udara sekitar bedengan.',
      'Aplikasikan agen hayati Bacillus subtilis atau fungisida tembaga organik.',
    ],
    solusiKimia: [
      'Opsi terakhir saat serangan meluas di musim hujan: fungisida oomycete sesuai arahan penyuluh. Wajib baca label produk & masa tunggu panen.',
    ],
    pencegahan: [
      'Pasang mulsa & rambatan tinggi, hindari jarak tanam terlalu rapat.',
    ],
    sumber: 'FAO IPM & UF/IFAS Vegetable Disease Handbook',
    kataKunci: ['embun bulu', 'downy mildew', 'bersudut', 'catur', 'pseudoperonospora'],
  },
  layu_batang: {
    id: 'layu_batang',
    yoloClassId: 14,
    penyakit: 'Layu fusarium / Layu bakteri pembuluh',
    namaIlmiahPatogen: 'Fusarium oxysporum',
    wikiQuery: 'Fusarium oxysporum',
    kategori: 'jamur',
    bagianUmum: ['batang', 'daun'],
    tanamanRentan: ['Tomat', 'Cabai', 'Terong', 'Kentang'],
    ciriVisualSpesifik:
      'Pangkal batang kecokelatan/menghitam, daun terkulai layu mendadak (sering satu sisi dulu) walau tanah lembap; pembuluh dalam batang berwarna cokelat bila dibelah.',
    penyebab: 'Jamur tular tanah Fusarium oxysporum atau bakteri Ralstonia solanacearum yang menyumbat pembuluh air batang.',
    gejala: 'Batang bawah kecokelatan dan daun layu mendadak siang hari walau tanah cukup lembap.',
    solusiOrganik: [
      'Cabut tanaman layu permanen beserta tanah di sekitar akar agar tidak menular ke bedengan sebelah.',
      'Kocor lubang tanam sekitar dengan Trichoderma harzianum dan kompos matang.',
      'Tambahkan dolomit/kapur pertanian bila pH tanah terlalu asam (pH < 5,5).',
    ],
    solusiKimia: [
      'Semprot daun tidak efektif untuk layu pembuluh. Konsultasi penyuluh sebelum perlakuan tanah kimiawi dan selalu baca label produk.',
    ],
    pencegahan: [
      'Buat bedengan tinggi berdrainase baik di musim hujan dan pilih varietas tahan layu (Servo F1 / Gustavi).',
    ],
    sumber: 'Balitsa Kementan RI & UF/IFAS Vascular Wilt Guide',
    kataKunci: ['layu', 'fusarium', 'ralstonia', 'batang', 'terkulai', 'pembuluh'],
  },
  busuk_pangkal_sklerotium: {
    id: 'busuk_pangkal_sklerotium',
    yoloClassId: 15,
    penyakit: 'Busuk pangkal batang (Southern blight)',
    namaIlmiahPatogen: 'Athelia rolfsii',
    wikiQuery: 'Athelia rolfsii',
    kategori: 'jamur',
    bagianUmum: ['batang'],
    tanamanRentan: ['Tomat', 'Cabai', 'Terong', 'Kentang'],
    ciriVisualSpesifik:
      'Luka cokelat membusuk melingkar tepat di leher/pangkal batang permukaan tanah, diselimuti benang jamur putih seperti kipas (miselium) dan butiran kecil bulat cokelat mirip biji sawi (sklerotia).',
    penyebab: 'Jamur tular tanah Athelia rolfsii (Sclerotium rolfsii) yang aktif di tanah hangat dan lembap penuh sisa tanaman mentah.',
    gejala: 'Tanaman layu mendadak, pangkal batang membusuk tertutup benang putih serta butiran kecil cokelat seperti biji sawi.',
    solusiOrganik: [
      'Cabut tanaman terinfeksi beserta 5 cm tanah permukaan di sekeliling pangkal agar butiran sklerotia tidak jatuh ke bedengan.',
      'Kocor area sekitar dengan agen hayati Trichoderma harzianum dan tambahkan kompos matang + dolomit.',
      'Hindari menumpuk mulsa basah menempel langsung ke kulit batang.',
    ],
    solusiKimia: [
      'Konsultasikan perlakuan tanah ke penyuluh bila serangan meluas di lahan basah; selalu baca label produk.',
    ],
    pencegahan: [
      'Lakukan solarisasi tanah / penjemuran bedengan sebelum tanam dan jaga pH tanah 6,5.',
    ],
    sumber: 'UF/IFAS Southern Blight Guide & Balitsa Kementan RI',
    kataKunci: ['busuk pangkal', 'southern blight', 'sklerotium', 'benang putih', 'biji sawi', 'rebah semai'],
  },
  keriting_kuning: {
    id: 'keriting_kuning',
    yoloClassId: 16,
    penyakit: 'Virus kuning / Keriting daun (TYLCV)',
    namaIlmiahPatogen: 'Tomato yellow leaf curl virus',
    wikiQuery: 'Tomato yellow leaf curl virus',
    kategori: 'virus',
    bagianUmum: ['daun'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Daun muda menggulung/melengkung ke atas seperti sendok, permukaan keriting kerdil, tepi dan sela tulang daun menguning cerah, pertumbuhan pucuk terhambat.',
    penyebab: 'Tomato Yellow Leaf Curl Virus (TYLCV) / Gemini virus yang ditularkan oleh kutu kebul (Bemisia tabaci).',
    gejala: 'Daun pucuk mengeriting, menggulung ke atas, menguning cerah, tanaman tampak kerdil.',
    solusiOrganik: [
      'Pasang perangkap likat kuning (yellow sticky trap) untuk menangkap kutu kebul pembawa virus.',
      'Semprot bagian bawah daun dengan minyak nimba (neem oil) atau sabun insektisida nabati sore hari.',
      'Cabut tanaman muda yang terserang sangat parah agar tidak menjadi sumber penularan.',
    ],
    solusiKimia: [
      'Virus tidak bisa disembuhkan obat; pengendalian hanya menyasar vektor kutu kebul bila populasi tinggi sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: [
      'Gunakan mulsa plastik perak atau kelambu serangga di persemaian serta bersihkan gulma pinggir bedengan.',
    ],
    sumber: 'PlantVillage, Balitsa Kementan RI & FAO TYLCV Guide',
    kataKunci: ['keriting', 'kuning', 'virus', 'gemini', 'tylcv', 'kutu kebul', 'menggulung'],
  },
  virus_mosaik: {
    id: 'virus_mosaik',
    yoloClassId: 17,
    penyakit: 'Virus mosaik (Tomato mosaic virus / ToMV)',
    namaIlmiahPatogen: 'Tomato mosaic virus',
    wikiQuery: 'Tomato mosaic virus',
    kategori: 'virus',
    bagianUmum: ['daun', 'buah'],
    tanamanRentan: ['Tomat', 'Cabai', 'Terong'],
    ciriVisualSpesifik:
      'Pola belang-belang hijau muda, kuning, dan hijau tua (mosaik/mottling) pada helai daun, daun kadang menyempit melintir seperti tali sepatu (fernleaf), dan pematangan buah belang.',
    penyebab: 'Tomato Mosaic Virus (ToMV / TMV) yang sangat mudah menular lewat kontak tangan, rokok, benih, dan alat pangkas.',
    gejala: 'Daun belang hijau-kuning tidak merata (mosaik), bentuk daun menyempit/cacat, pertumbuhan terhambat.',
    solusiOrganik: [
      'Pisahkan dan cabut tanaman muda yang bergejala berat agar tidak menulari baris tanaman saat pemangkasan.',
      'Cuci tangan dengan air sabun/susu skim dan sterilkan gunting pangkas sebelum menyentuh tanaman sehat.',
      'Hindari merokok saat merawat tanaman tomat/cabai karena virus tembakau mudah menempel di tangan.',
    ],
    solusiKimia: [
      'Tidak ada obat kimia penyembuh virus tanaman; fokus penuh pada sanitasi alat dan benih sehat.',
    ],
    pencegahan: [
      'Gunakan benih varietas tahan ToMV dan sanitasi alat pangkas antar petak.',
    ],
    sumber: 'PlantVillage & UF/IFAS Tomato Mosaic Virus Reference',
    kataKunci: ['mosaik', 'mosaic', 'tomv', 'tmv', 'belang', 'tali sepatu'],
  },
  virus_bercak_layu: {
    id: 'virus_bercak_layu',
    yoloClassId: 18,
    penyakit: 'Virus bercak layu / perunggu (TSWV)',
    namaIlmiahPatogen: 'Tomato spotted wilt orthotospovirus',
    wikiQuery: 'Tomato spotted wilt virus',
    kategori: 'virus',
    bagianUmum: ['daun', 'buah'],
    tanamanRentan: ['Tomat', 'Cabai', 'Selada'],
    ciriVisualSpesifik:
      'Daun muda berwarna perunggu kecokelatan (bronzing) berbintik gelap lalu menggulung ke bawah, sedangkan pada buah matang muncul pola cincin kuning/jingga melingkar mencolok.',
    penyebab: 'Tomato Spotted Wilt Virus (TSWV) yang ditularkan oleh hama trips (Thrips spp.).',
    gejala: 'Pucuk berwarna perunggu dengan bercak gelap dan kulit buah matang berpola cincin kuning-merah melingkar.',
    solusiOrganik: [
      'Cabut segera tanaman terinfeksi berat karena virus tidak dapat sembuh dan menjadi sumber penularan trips.',
      'Pasang perangkap likat biru/kuning untuk menekan populasi trips dan semprot minyak nimba sore hari.',
      'Bersihkan gulma berbunga di sekitar kebun yang menjadi inang trips.',
    ],
    solusiKimia: [
      'Virus tidak dapat diobati; pengendalian insektisida selektif hanya ditujukan pada trips bila populasi tinggi sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: [
      'Gunakan mulsa plastik perak reflektif untuk mengusir trips dan tanam varietas tahan TSWV.',
    ],
    sumber: 'UF/IFAS Extension & EPPO TSWV Reference',
    kataKunci: ['tswv', 'perunggu', 'bronzing', 'cincin buah', 'trips', 'spotted wilt'],
  },
  tungau_laba: {
    id: 'tungau_laba',
    yoloClassId: 19,
    penyakit: 'Tungau laba-laba (Two-spotted spider mite)',
    namaIlmiahPatogen: 'Tetranychus urticae',
    wikiQuery: 'Tetranychus urticae',
    kategori: 'hama',
    bagianUmum: ['daun'],
    tanamanRentan: ['Tomat', 'Cabai', 'Terong', 'Mentimun'],
    ciriVisualSpesifik:
      'Permukaan daun berbintik kuning pucat sangat halus seperti debu (stippling), berubah kecokelatan/perunggu kusam, dan sering tampak jaring tipis sangat halus serta tungau mungil di balik daun.',
    penyebab: 'Hama tungau Tetranychus urticae yang meledak populasinya saat cuaca panas dan kering.',
    gejala: 'Daun penuh bintik pucat halus, kusam seperti berdebu, dan ada jaring tipis di sisi bawah daun.',
    solusiOrganik: [
      'Semprotkan air bersih agak kencang ke sisi bawah daun pada pagi hari untuk merontokkan tungau & jaringnya.',
      'Semprot minyak nimba (neem oil) atau larutan sabun insektisida nabati merata ke bawah daun tiap 4–5 hari di sore hari.',
      'Jaga kelembapan kebun tidak terlalu kering dan pangkas daun rusak parah.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan berat di musim kemarau: akarisida/mitisida selektif (bukan insektisida biasa) sesuai anjuran penyuluh. Wajib baca label produk & masa tunggu panen.',
    ],
    pencegahan: [
      'Cek sisi bawah daun rutin saat kemarau dan hindari penyemprotan insektisida spektrum luas yang membunuh predator alami tungau.',
    ],
    sumber: 'PlantVillage & UC IPM Spider Mites Guide',
    kataKunci: ['tungau', 'spider mite', 'tetranychus', 'jaring', 'bintik halus', 'kemarau'],
  },
  serangan_hama_daun: {
    id: 'serangan_hama_daun',
    yoloClassId: 20,
    penyakit: 'Serangan hama daun (Penggorok / Ulat / Kutu)',
    namaIlmiahPatogen: 'Liriomyza',
    wikiQuery: 'Liriomyza',
    kategori: 'hama',
    bagianUmum: ['daun', 'buah'],
    tanamanRentan: ['Tomat', 'Cabai', 'Selada', 'Bayam', 'Sawi', 'Mentimun'],
    ciriVisualSpesifik:
      'Liang korokan berliku putih keperakan pada daun (Liriomyza), lubang gigitan ulat pada daun/buah, atau koloni kutu daun/kutu kebul kecil di balik daun.',
    penyebab: 'Hama lalat penggorok daun (Liriomyza), ulat buah/daun (Helicoverpa/Spodoptera), atau kutu daun (Aphids).',
    gejala: 'Daun berlubang, terdapat garis korokan putih berliku, atau terdapat serangga kecil di balik daun.',
    solusiOrganik: [
      'Ambil ulat atau daun berkorok parah secara manual pada pagi/sore hari.',
      'Pasang perangkap likat kuning untuk penggorok daun & kutu kebul.',
      'Semprot pestisida nabati minyak nimba atau larutan bawang putih + sabun cair nabati ke bawah daun sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila populasi melewati ambang ekonomi: insektisida selektif sesuai penyuluh. Wajib baca label produk, gunakan APD, dan taati masa tunggu panen.',
    ],
    pencegahan: [
      'Tanam tanaman refugia (marigold, kenikir, kemangi) di tepi bedengan & bersihkan gulma.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Integrated Pest Management',
    kataKunci: ['hama', 'ulat', 'kutu', 'penggorok', 'liriomyza', 'lubang', 'dimakan', 'aphid'],
  },
  busuk_ujung_buah: {
    id: 'busuk_ujung_buah',
    yoloClassId: 21,
    penyakit: 'Busuk ujung buah (Blossom end rot)',
    namaIlmiahPatogen: 'Blossom end rot',
    wikiQuery: 'Blossom end rot',
    kategori: 'busuk_buah',
    bagianUmum: ['buah'],
    tanamanRentan: ['Tomat', 'Cabai', 'Terong'],
    ciriVisualSpesifik:
      'Bercak gelap cokelat kehitaman yang cekung dan kering/seperti kulit di bagian bawah/ujung buah (sisi bekas bunga), bukan di pangkal tangkai.',
    penyebab: 'Gangguan fisiologis akibat serapan Kalsium (Ca) tidak lancar ke buah, dipicu fluktuasi penyiraman atau tanah terlalu asam.',
    gejala: 'Bagian bawah/ujung buah berubah cokelat kehitaman, cekung, dan keras.',
    solusiOrganik: [
      'Petik buah yang sudah busuk ujung agar energi tanaman dialihkan ke buah sehat.',
      'Jaga penyiraman rutin dan stabil (kelembapan tanah 45–65%) serta pasang mulsa organik.',
      'Taburkan tepung cangkang telur halus atau dolomit 20–30 g di sekitar pangkal tanaman.',
    ],
    solusiKimia: [
      'Bila perlu koreksi cepat: kocor Kalsium nitrat 2–3 g/liter (200 ml/tanaman). Ini bukan jamur sehingga fungisida tidak diperlukan; selalu baca label produk pupuk.',
    ],
    pencegahan: [
      'Hindari Nitrogen berlebih saat fase berbunga/berbuah & jaga pH tanah 6,0–6,8.',
    ],
    sumber: 'Balitsa Kementan RI & UF/IFAS Blossom End Rot',
    kataKunci: ['busuk ujung', 'blossom end rot', 'ujung buah', 'pantat hitam', 'cekung', 'kalsium'],
  },
  antraknosa: {
    id: 'antraknosa',
    yoloClassId: 22,
    penyakit: 'Antraknosa / Patek buah',
    namaIlmiahPatogen: 'Colletotrichum coccodes',
    wikiQuery: 'Colletotrichum',
    kategori: 'busuk_buah',
    bagianUmum: ['buah'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Bercak bulat cekung basah pada kulit buah matang/setengah matang, tengahnya gelap atau berisi lingkaran spora berwarna jingga/merah muda/hitam.',
    penyebab: 'Jamur Colletotrichum spp. yang mudah menginfeksi buah matang saat cuaca lembap dan hujan.',
    gejala: 'Bercak cekung melingkar pada buah, buah cepat membusuk sebelum atau segera setelah dipanen.',
    solusiOrganik: [
      'Segera petik dan kubur/musnahkan buah bergejala patek agar spora tidak menyebar ke buah sehat.',
      'Panen buah segera saat matang dan hindari buah menyentuh tanah langsung dengan ajir + mulsa.',
      'Semprot fungisida nabati (ekstrak lengkuas/kunyit atau agen hayati Trichoderma/Bacillus).',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan berat di musim hujan: fungisida azoksistrobin atau mankozeb sesuai penyuluh. Wajib baca label produk & masa tunggu panen.',
    ],
    pencegahan: [
      'Gunakan benih sehat, jaga jarak tanam cukup lebar, dan drainase bedengan lancar.',
    ],
    sumber: 'Balitsa Kementan RI & UF/IFAS Anthracnose Guide',
    kataKunci: ['antraknosa', 'patek', 'colletotrichum', 'busuk buah', 'cekung'],
  },
  busuk_basah_buah: {
    id: 'busuk_basah_buah',
    yoloClassId: 23,
    penyakit: 'Busuk basah buah (Bacterial soft rot)',
    namaIlmiahPatogen: 'Pectobacterium carotovorum',
    wikiQuery: 'Pectobacterium carotovorum',
    kategori: 'busuk_buah',
    bagianUmum: ['buah'],
    tanamanRentan: ['Tomat', 'Cabai', 'Kentang', 'Sawi'],
    ciriVisualSpesifik:
      'Buah tampak lembek berair seperti kantong air, kulit keriput/mengelupas mudah pecah, warna kusam kecokelatan atau kehijauan gelap, jaringan dalam mencair/berlendir.',
    penyebab: 'Bakteri Pectobacterium carotovorum (Erwinia) masuk lewat luka gores, retakan kulit, atau tusukan serangga saat hangat dan lembap.',
    gejala: 'Bagian buah melunak berair, kulit mudah pecah dan mengelupas, daging buah mencair serta berbau asam menyengat.',
    solusiOrganik: [
      'Segera petik dan kubur buah busuk jauh dari bedengan (jangan dijadikan kompos).',
      'Cuci tangan serta gunting/pisau kebun dengan alkohol atau sabun sebelum menyentuh buah sehat.',
      'Hentikan penyiraman mengenai buah dan pasang perangkap likat kuning/feromon untuk mengendalikan serangga pembuat luka.',
    ],
    solusiKimia: [
      'Buah yang sudah busuk basah tidak dapat disembuhkan. Lindungi buah sehat sekitar dengan bakterisida tembaga sesuai penyuluh bila meluas. Wajib baca label produk.',
    ],
    pencegahan: [
      'Pasang ajir & mulsa agar buah tidak menyentuh tanah basah dan panen hati-hati jangan sampai tergores.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Post-Harvest Soft Rot Guide',
    kataKunci: ['busuk basah', 'soft rot', 'lembek', 'berair', 'bau', 'erwinia', 'pectobacterium', 'busuk buah', 'busuk'],
  },
  busuk_jamur_buah: {
    id: 'busuk_jamur_buah',
    yoloClassId: 24,
    penyakit: 'Busuk jamur buah (Phytophthora / Buckeye rot)',
    namaIlmiahPatogen: 'Phytophthora nicotianae',
    wikiQuery: 'Buckeye rot of tomato',
    kategori: 'busuk_buah',
    bagianUmum: ['buah'],
    tanamanRentan: ['Tomat'],
    ciriVisualSpesifik:
      'Bercak lebar cokelat keabu-abuan agak keras hingga melunak di kulit buah (sering berpola cincin gelap konsentris seperti mata rusa), kadang disertai lapisan kapang putih tipis saat lembap.',
    penyebab: 'Oomycete Phytophthora parasitica / P. infestans yang terpercik dari tanah lembap ke buah bagian bawah saat hujan.',
    gejala: 'Bercak cokelat keabu-abuan melebar di permukaan buah, kulit mengeras lalu membusuk ke bagian dalam.',
    solusiOrganik: [
      'Petik dan musnahkan seluruh buah berbercak jauh dari lahan agar spora tidak menyebar.',
      'Pasang mulsa jerami/plastik untuk menahan percikan tanah ke buah bawah.',
      'Pangkas daun bawah rimbun dan aplikasikan Trichoderma atau fungisida tembaga organik.',
    ],
    solusiKimia: [
      'Opsi terakhir di musim hujan deras: fungisida protektan oomycete untuk melindungi buah sehat sekitar sesuai penyuluh. Wajib baca label produk & masa tunggu panen.',
    ],
    pencegahan: [
      'Ikat batang pada ajir sehingga dompolan buah menggantung minimal 25 cm dari tanah dan drainase lancar.',
    ],
    sumber: 'Balitsa Kementan RI & UF/IFAS Buckeye Rot Reference',
    kataKunci: ['buckeye', 'busuk jamur', 'jamur buah', 'busuk cokelat', 'busuk buah', 'busuk'],
  },
  busuk_kapang_abu: {
    id: 'busuk_kapang_abu',
    yoloClassId: 25,
    penyakit: 'Busuk kapang abu-abu (Botrytis / Grey mold)',
    namaIlmiahPatogen: 'Botrytis cinerea',
    wikiQuery: 'Botrytis cinerea',
    kategori: 'busuk_buah',
    bagianUmum: ['buah', 'batang'],
    tanamanRentan: ['Tomat', 'Cabai', 'Selada'],
    ciriVisualSpesifik:
      'Bercak cokelat muda lunak berair pada permukaan buah atau pangkal kelopak/tangkai yang diselimuti lapisan jamur berbulu halus berwarna abu-abu kecokelatan seperti beludru.',
    penyebab: 'Jamur Botrytis cinerea yang berkembang pesat pada kelembapan udara > 80%, suhu sejuk, dan sirkulasi udara pengap.',
    gejala: 'Kulit buah atau pangkal tangkai membusuk lunak dan ditumbuhi lapisan spora abu-abu berbulu halus.',
    solusiOrganik: [
      'Petik buah berkapang secara perlahan dan langsung masukkan ke kantong tertutup agar spora tidak beterbangan.',
      'Pangkas daun rimbun sekitar dompolan buah dan hindari penyiraman sore hari.',
      'Bersihkan sisa bunga layu pada buah lalu semprot Bacillus subtilis / Trichoderma pagi hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan tinggi di musim hujan/greenhouse: fungisida khusus Botrytis sesuai penyuluh. Wajib baca label produk dan gunakan APD.',
    ],
    pencegahan: [
      'Jaga jarak tanam & ventilasi kebun, hindari Nitrogen berlebihan yang membuat tajuk terlalu lembap.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Grey Mold IPM',
    kataKunci: ['kapang abu', 'botrytis', 'grey mold', 'jamur abu', 'berbulu', 'busuk buah', 'busuk'],
  },
  buah_pecah_sengatan: {
    id: 'buah_pecah_sengatan',
    yoloClassId: 26,
    penyakit: 'Buah pecah / Sengatan matahari (Cracking & Sunscald)',
    namaIlmiahPatogen: 'Sunscald',
    wikiQuery: 'Sunscald',
    kategori: 'fisiologis',
    bagianUmum: ['buah'],
    tanamanRentan: ['Tomat', 'Cabai'],
    ciriVisualSpesifik:
      'Kulit buah retak/pecah memanjang atau melingkar di sekitar pangkal tangkai (fruit cracking), atau tampak bercak putih kekuningan tipis berkerut seperti melepuh/terbakar matahari di sisi buah yang terekspos (sunscald).',
    penyebab: 'Gangguan fisiologis akibat lonjakan air mendadak setelah tanah kering (buah pecah) atau paparan terik matahari langsung pada buah tanpa naungan daun (sunscald).',
    gejala: 'Retakan kulit buah yang rawan membusuk atau bercak melepuh putih pucat di bahu buah.',
    solusiOrganik: [
      'Segera petik buah yang pecah lebar sebelum dihinggapi bakteri busuk basah atau lalat buah.',
      'Atur penyiraman rutin dan merata (kelembapan tanah 45–65%) + pasang mulsa organik.',
      'Sisakan cukup daun pelindung di atas dompolan buah atau gunakan paranet 30% saat kemarau terik.',
    ],
    solusiKimia: [
      'Ini gangguan fisiologis (bukan penyakit menular), sehingga tidak perlu fungisida atau insektisida.',
    ],
    pencegahan: [
      'Hindari memangkas daun atas secara berlebihan dan jaga jadwal irigasi stabil lewat sensor CermatTani.',
    ],
    sumber: 'UF/IFAS Physiological Disorders of Tomato & Balitsa Kementan RI',
    kataKunci: ['buah pecah', 'retak', 'cracking', 'sunscald', 'terbakar matahari', 'melepuh'],
  },
};

/* 4. Dataset 10 Kelas Hara Makro & Mikro (Organik Dulu + Acuan Umum Bukan Pengganti Uji Tanah) */
export const DATASET_NUTRIENTS: Record<string, NutrientDatasetEntry> = {
  cukup: {
    id: 'cukup',
    unsurSimbol: 'Seimbang',
    ciriVisualSpesifik:
      'Daun hijau segar merata dari bawah ke atas, tidak ada penguningan seragam, tidak ada tepi terbakar, tidak ada klorosis antar-urat.',
    gejala: 'Warna daun hijau merata tanpa klorosis atau tepi terbakar.',
    dugaan: 'Hara terlihat seimbang',
    rekomendasiOrganik:
      'Pertahankan kompos matang 250–500 g/tanaman tiap 3 minggu atau POC (Pupuk Organik Cair) 10 ml/liter air.',
    rekomendasiPupuk: 'Pemupukan berimbang NPK 16-16-16 sesuai jadwal fase tumbuh.',
    dosisPerFase: {
      Bibit: 'Kompos halus campur media tanam 1:1; belum perlu pupuk kimia pekat.',
      Vegetatif: 'NPK 16-16-16 sekitar 5–8 g/tanaman (kocor 1x per 10 hari) + POC daun.',
      Berbunga: 'NPK 16-16-16 sekitar 8–10 g/tanaman + tambahan Kalium & Kalsium.',
      Berbuah: 'KNO3 putih / MKP dosis ringan 3–5 g/liter (kocor 200 ml/tanaman) tiap 10 hari.',
      Panen: 'Kurangi Nitrogen, jaga Kalium ringan & kompos agar buah manis dan tidak mudah pecah.',
    },
    sumber: 'Balitsa Kementan RI — Acuan Umum Pemupukan',
    kataKunci: ['seimbang', 'cukup', 'normal', 'npk', 'kompos'],
  },
  kurang_nitrogen: {
    id: 'kurang_nitrogen',
    unsurSimbol: 'N',
    ciriVisualSpesifik:
      'Daun tua bagian bawah menguning pucat merata dari tangkai hingga ujung, ukuran daun mengecil, batang kurus.',
    gejala: 'Daun tua bagian bawah menguning pucat merata, pertumbuhan batang melambat.',
    dugaan: 'Dugaan kekurangan Nitrogen (N)',
    rekomendasiOrganik:
      'POC fermentasi daun hijau/urin kelinci (10–15 ml/liter) atau kompos kotoran ayam matang 300–500 g di sekitar perakaran.',
    rekomendasiPupuk: 'NPK 16-16-16 atau ZA/Urea dosis rendah secara kocor di pangkal batang.',
    dosisPerFase: {
      Bibit: 'POC ringan 5 ml/liter air, kocor 100 ml/polybag seminggu sekali.',
      Vegetatif: 'NPK 16-16-16 (8–10 g/tanaman) atau Urea ringan 3–5 g/liter dikocor 200 ml.',
      Berbunga: 'Gunakan NPK seimbang 8 g/tanaman; hindari Nitrogen berlebih agar bunga tidak rontok.',
      Berbuah: 'Utamakan kompos cair / NPK rendah N (5 g/tanaman).',
      Panen: 'Cukup kompos ringan 250 g/tanaman.',
    },
    sumber: 'Balitsa Kementan RI & IPNI Nutrient Guide',
    kataKunci: ['nitrogen', 'kuning', 'pucat', 'daun bawah', 'urea'],
  },
  kurang_fosfor: {
    id: 'kurang_fosfor',
    unsurSimbol: 'P',
    ciriVisualSpesifik:
      'Bagian bawah/tulang daun tua berubah keunguan atau hijau gelap kusam, pertumbuhan akar & pembungaan lambat.',
    gejala: 'Daun tua hijau gelap kusam dengan semburat ungu kemerahan di balik daun.',
    dugaan: 'Dugaan kekurangan Fosfor (P)',
    rekomendasiOrganik:
      'Kompos guano dosis tipis 50–100 g/tanaman atau pupuk hayati pelarut fosfat + kompos matang.',
    rekomendasiPupuk: 'SP-36 atau MKP dosis ringan saat awal tanam hingga berbunga.',
    dosisPerFase: {
      Bibit: 'Campurkan kompos matang + sedikit fosfat alam ke media tanam.',
      Vegetatif: 'SP-36 sekitar 5–8 g/tanaman ditabur melingkar 10 cm dari batang.',
      Berbunga: 'MKP 2–3 g/liter air, kocor 200 ml/tanaman tiap 10 hari.',
      Berbuah: 'MKP 3 g/liter kocor 1x per 14 hari bila pembentukan buah melambat.',
      Panen: 'Cukup kompos matang agar ketersediaan P tanah tetap terjaga.',
    },
    sumber: 'Balitsa Kementan RI & IPNI Reference',
    kataKunci: ['fosfor', 'ungu', 'keunguan', 'mkp', 'sp36'],
  },
  kurang_kalium: {
    id: 'kurang_kalium',
    unsurSimbol: 'K',
    ciriVisualSpesifik:
      'Tepi/pinggiran daun tua menguning lalu mengering kecokelatan seperti terbakar (marginal scorch), pematangan buah belang.',
    gejala: 'Tepi daun tua menguning lalu mengering kecokelatan, warna pematangan buah kurang merata.',
    dugaan: 'Dugaan kekurangan Kalium (K)',
    rekomendasiOrganik:
      'Abu sekam bakar 100–200 g/tanaman atau POC kulit pisang/sabut kelapa 15 ml/liter air.',
    rekomendasiPupuk: 'KNO3 Putih atau KCl dosis ringan saat fase berbunga–berbuah.',
    dosisPerFase: {
      Bibit: 'Tambahkan sedikit abu sekam ke media tanam.',
      Vegetatif: 'NPK 16-16-16 (5–8 g/tanaman) + abu sekam.',
      Berbunga: 'KNO3 Putih 3–5 g/liter air, kocor 200 ml/tanaman tiap 10 hari.',
      Berbuah: 'KNO3 Putih atau NPK grower 8–10 g/tanaman tiap 10 hari.',
      Panen: 'POC kalium organik 15 ml/liter tiap 14 hari.',
    },
    sumber: 'Balitsa Kementan RI & FAO Plant Nutrition',
    kataKunci: ['kalium', 'tepi daun', 'terbakar', 'kno3', 'kcl', 'buah belang'],
  },
  kurang_kalsium: {
    id: 'kurang_kalsium',
    unsurSimbol: 'Ca',
    ciriVisualSpesifik:
      'Daun muda pucuk melengkung/keriting ujung, atau muncul bercak cekung hitam/cokelat di ujung bawah buah (blossom end rot).',
    gejala: 'Daun muda melengkung atau ujung bawah buah mulai cekung gelap.',
    dugaan: 'Dugaan kekurangan Kalsium (Ca)',
    rekomendasiOrganik:
      'Tepung cangkang telur halus / dolomit 20–30 g di sekitar pangkal + jaga penyiraman stabil.',
    rekomendasiPupuk: 'Kalsium nitrat (Ca(NO3)2) dosis ringan secara kocor.',
    dosisPerFase: {
      Bibit: 'Dolomit 1 sdt per polybag saat tanam.',
      Vegetatif: 'Dolomit 20 g/tanaman di sekitar perakaran.',
      Berbunga: 'Kalsium nitrat 2–3 g/liter air, kocor 200 ml/tanaman tiap 10–14 hari.',
      Berbuah: 'Kalsium nitrat 3 g/liter kocor + jaga kelembapan tanah 45–65%.',
      Panen: 'Jaga irigasi stabil + dolomit ringan setelah panen gelombang pertama.',
    },
    sumber: 'Balitsa Kementan RI — Penanganan Defisiensi Ca',
    kataKunci: ['kalsium', 'dolomit', 'cangkang telur', 'busuk ujung', 'blossom end rot'],
  },
  kurang_magnesium: {
    id: 'kurang_magnesium',
    unsurSimbol: 'Mg',
    ciriVisualSpesifik:
      'Klorosis antar-tulang daun pada daun tua (area di antara urat daun menguning sementara tulang daun tetap hijau jelas).',
    gejala: 'Sela-sela tulang daun tua menguning sedangkan tulang daun tetap hijau.',
    dugaan: 'Dugaan kekurangan Magnesium (Mg)',
    rekomendasiOrganik:
      'Kapur dolomit 20–30 g/tanaman (mengandung Ca & Mg alami) atau kompos matang rutin.',
    rekomendasiPupuk: 'Garam Epsom (MgSO4) 2 g/liter air dikocor ringan atau semprot sore hari.',
    dosisPerFase: {
      Bibit: 'Dolomit 1 sdt campur media tanam.',
      Vegetatif: 'Dolomit 20 g/tanaman atau MgSO4 2 g/liter (200 ml/tanaman).',
      Berbunga: 'MgSO4 2 g/liter kocor 1x per 14 hari.',
      Berbuah: 'MgSO4 2 g/liter kocor + hindari kelebihan Kalium.',
      Panen: 'Dolomit ringan 20 g/tanaman untuk regenerasi tajuk.',
    },
    sumber: 'IPNI & Balitsa Kementan RI',
    kataKunci: ['magnesium', 'tulang daun hijau', 'antar tulang', 'epsom', 'dolomit'],
  },
  kurang_besi: {
    id: 'kurang_besi',
    unsurSimbol: 'Fe',
    ciriVisualSpesifik:
      'Daun muda pucuk atas menguning cerah hingga hampir putih di antara tulang daun, sementara urat daun halus tetap hijau kontras (terjadi pada daun MUDA, berbeda dengan Mg di daun tua).',
    gejala: 'Daun muda bagian pucuk menguning pucat dengan tulang daun tetap hijau tegas.',
    dugaan: 'Dugaan kekurangan Besi (Fe)',
    rekomendasiOrganik:
      'Tambahkan kompos matang kaya humus + asam humat untuk menurunkan pH tanah basa (> 7,2) dan memperbaiki serapan besi alami.',
    rekomendasiPupuk: 'Pupuk mikro kelat besi (Fe-EDTA) 0,5–1 g/liter disemprot tipis ke daun sore hari.',
    dosisPerFase: {
      Bibit: 'Pastikan media tanam berdrainase baik & tidak terlalu basah (pH 6,0–6,5).',
      Vegetatif: 'Kompos matang + semprot daun Fe-EDTA 0,5 g/liter 1x per 14 hari.',
      Berbunga: 'Pupuk mikro majemuk dosis ringan via daun sore hari.',
      Berbuah: 'Jaga pH tanah tidak terlalu basa & tambahkan asam humat kocor.',
      Panen: 'Tambahkan bahan organik kompos untuk pemulihan media.',
    },
    sumber: 'IPNI Micronutrient Deficiency Guide & FAO Plant Nutrition',
    kataKunci: ['besi', 'iron', 'fe', 'pucuk kuning', 'daun muda kuning'],
  },
  kurang_boron: {
    id: 'kurang_boron',
    unsurSimbol: 'B',
    ciriVisualSpesifik:
      'Tunas pucuk mengeras/rapuh dan mati, tangkai daun mudah patah, bunga sering rontok, dan muncul bercak gabus kasar/retak di sekitar bahu buah.',
    gejala: 'Pucuk kerdil/rapuh, bunga mudah gugur, dan kulit sekitar tangkai buah bergabus/retak.',
    dugaan: 'Dugaan kekurangan Boron (B)',
    rekomendasiOrganik:
      'Kompos matang beragam bahan organik + mulsa untuk menjaga tanah tidak kekeringan ekstrem.',
    rekomendasiPupuk: 'Pupuk mikro mengandung Boron (misal Boraks pertanian / asam borat) dosis SANGAT RENDAH 0,5 g/liter — jangan berlebihan karena rentang aman Boron sempit.',
    dosisPerFase: {
      Bibit: 'Cukup media kaya kompos matang.',
      Vegetatif: 'Pupuk mikro majemuk dosis anjuran label 1x per bulan.',
      Berbunga: 'Semprot mikro Boron 0,5 g/liter tipis 1x saat awal berbunga.',
      Berbuah: 'Jaga kelembapan tanah stabil agar serapan Boron alami lancar.',
      Panen: 'Tambahkan kompos matang pascapanen.',
    },
    sumber: 'IPNI Boron Guide & Balitsa Kementan RI',
    kataKunci: ['boron', 'bunga rontok', 'pucuk rapuh', 'gabus buah'],
  },
  kurang_sulfur: {
    id: 'kurang_sulfur',
    unsurSimbol: 'S',
    ciriVisualSpesifik:
      'Seluruh daun muda bagian atas menguning pucat seragam termasuk tulang daunnya, disertai warna kemerahan/keunguan pada batang dan tangkai daun muda.',
    gejala: 'Daun muda bagian atas menguning seragam dan tangkai daun tampak kemerahan.',
    dugaan: 'Dugaan kekurangan Sulfur (S)',
    rekomendasiOrganik:
      'Kompos matang / pupuk kandang terfermentasi sempurna dan gipsum pertanian alami 15–20 g/tanaman.',
    rekomendasiPupuk: 'Pupuk ZA (Amonium Sulfat) atau Magnesium Sulfat (MgSO4) dosis ringan 2–3 g/liter.',
    dosisPerFase: {
      Bibit: 'Media tanam kaya kompos matang.',
      Vegetatif: 'ZA atau MgSO4 ringan 2 g/liter kocor 200 ml/tanaman.',
      Berbunga: 'MgSO4 / ZK (Kalium Sulfat) 2–3 g/liter kocor.',
      Berbuah: 'ZK (Kalium Sulfat) 3 g/liter untuk menambah Kalium sekaligus Sulfur.',
      Panen: 'Tambahkan kompos matang untuk musim berikutnya.',
    },
    sumber: 'IPNI Plant Nutrition Guide & FAO',
    kataKunci: ['sulfur', 'belerang', 'za', 'daun muda kuning seragam'],
  },
  kurang_seng: {
    id: 'kurang_seng',
    unsurSimbol: 'Zn',
    ciriVisualSpesifik:
      'Daun muda tumbuh mengecil, menyempit seperti pita (little leaf), jarak antar ruas memendek (roset), dan muncul klorosis antar tulang daun muda.',
    gejala: 'Daun muda mengecil menyempit, ruas batang memendek, dan muncul bercak kuning di sela urat.',
    dugaan: 'Dugaan kekurangan Seng (Zn)',
    rekomendasiOrganik:
      'Kompos kotoran ternak matang + pupuk hayati mikoriza untuk meningkatkan ketersediaan Seng tanah.',
    rekomendasiPupuk: 'Pupuk mikro kelat Zn (Zn-EDTA) 0,5 g/liter semprot daun sore hari bila pH tanah terlalu tinggi.',
    dosisPerFase: {
      Bibit: 'Gunakan kompos matang dan hindari pengapuran berlebihan.',
      Vegetatif: 'Semprot pupuk mikro mengandung Zn 0,5 g/liter 1x per 14 hari.',
      Berbunga: 'Cukup pemeliharaan kompos + hindari Fosfor berlebih yang mengikat Zn.',
      Berbuah: 'Jaga keseimbangan pH tanah 6,0–6,8.',
      Panen: 'Tambahkan bahan organik saat olah tanah.',
    },
    sumber: 'IPNI Micronutrient Reference & UF/IFAS',
    kataKunci: ['seng', 'zinc', 'zn', 'daun mengecil', 'roset'],
  },
};

/* 5. Dataset Protokol Operasional Lahan, Irigasi, Tandon & Energi Surya */
export const DATASET_PROTOCOLS: FarmProtocolEntry[] = [
  {
    id: 'irigasi_otomatis',
    topik: 'Irigasi Otomatis & Kelembapan Tanah',
    aturan:
      'Rentang kelembapan tanah ideal tomat/cabai adalah 45–65%. Pompa otomatis menyala jika kelembapan tanah turun di bawah ambang bawah (default 35%) dan mati di ambang atas (default 65%), dengan batas aman durasi pompa maksimal 15 menit per siklus.',
    kataKunci: ['siram', 'irigasi', 'pompa', 'kelembapan tanah', 'kering', 'basah', 'air'],
  },
  {
    id: 'tandon_air',
    topik: 'Keamanan Level Air Tandon',
    aturan:
      'Sensor ultrasonik mengukur sisa air tandon. Jika level air tandon turun di bawah ambang kritis (< 20%), pompa otomatis ditahan (interlock kering) agar dinamo pompa tidak rusak.',
    kataKunci: ['tandon', 'tangki', 'ultrasonik', 'air habis', 'pompa kering'],
  },
  {
    id: 'iklim_mikro_jamur',
    topik: 'Peringatan Risiko Jamur Iklim Mikro',
    aturan:
      'Jika kelembapan udara ≥ 85% RH berlangsung lama pada suhu 18–26 °C, risiko Phytophthora (Late blight), Leaf mold, dan Botrytis meningkat tinggi. Hentikan siram tajuk, pangkas daun bawah, dan cek sisi bawah daun.',
    kataKunci: ['lembap', 'kelembapan udara', 'suhu', 'cuaca', 'hujan', 'jamur', 'risiko'],
  },
  {
    id: 'energi_surya',
    topik: 'Energi Surya & Mode Hemat Baterai INA219',
    aturan:
      'Jika baterai turun ≤ 20%, ESP32 masuk Mode Hemat (interval kirim data diperlambat & irigasi non-darurat ditunda).',
    kataKunci: ['surya', 'panel', 'baterai', 'energi', 'watt', 'volt', 'ina219'],
  },
  {
    id: 'kejujuran_ai',
    topik: 'Aturan Kejujuran AI & Konfirmasi Penyuluh',
    aturan:
      'Jika keyakinan di bawah 60%, sarankan foto ulang di cahaya terang jarak 20–40 cm dan konfirmasi ke penyuluh pertanian setempat. Rekomendasi pupuk selalu bukan pengganti uji tanah.',
    kataKunci: ['yakin', 'akurasi', 'ragu', 'foto ulang', 'penyuluh', 'uji tanah'],
  },
];

/* 6. Builder Konteks Dataset Lengkap v3.0 (24 Penyakit + 10 Hara) untuk Vision AI */
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
        `- "${d.id}" (${d.penyakit} | ${d.namaIlmiahPatogen}) [${d.kategori}, bagian: ${d.bagianUmum.join('/')}]: ${d.ciriVisualSpesifik}`
    )
    .join('\n');

  const nutrientBlock = Object.values(DATASET_NUTRIENTS)
    .map((n) => `- "${n.id}" (${n.dugaan}): ${n.ciriVisualSpesifik}`)
    .join('\n');

  return `=== DATASET KHUSUS YOLOv8 & AGRONOMI CERMATTANI v3.0 (24 PENYAKIT + 10 HARA) ===
[A. KEMATANGAN BUAH SEGAR (Class 0–2)]
${ripenessBlock}

[B. KATALOG 24 PENYAKIT, BUSUK BUAH, VIRUS & HAMA RESMI (Class 3–26) — HANYA GUNAKAN ID INI]
${diseaseBlock}

[C. KATALOG 10 DUGAAN HARA MAKRO & MIKRO RESMI — HANYA GUNAKAN ID INI]
${nutrientBlock}
=== AKHIR DATASET ===`;
}

/* 7. Builder Konteks Dataset RAG untuk Chatbot Cermo (/api/chat) */
export function buildGroundedChatDatasetContext(params: {
  message: string;
  plant: Plant | null;
  latestScan: ScanRecord | null;
  sensor: SensorSnapshot | null;
}): string {
  const q = params.message.toLowerCase();
  const sections: string[] = [];

  const matchedCrops = DATASET_CROPS.filter((crop) => {
    const plantText = `${params.plant?.nama || ''} ${params.plant?.varietas || ''}`.toLowerCase();
    return (
      crop.kataKunci.some((k) => q.includes(k) || plantText.includes(k)) ||
      crop.id === 'tomat'
    );
  }).slice(0, 3);

  sections.push(
    `[DATASET TANAMAN]\n${matchedCrops
      .map(
        (c) =>
          `- ${c.namaUmum} (${c.namaIlmiah}; varietas: ${c.varietasContoh.join(', ')}): Suhu ${c.suhuOptimalC}, Tanah ${c.kelembapanTanahOptimal}, Udara ${c.kelembapanUdaraOptimal}, Umur panen ${c.umurPanenHst}, Bobot ~${c.bobotRataGram}g. Budidaya: ${c.catatanBudidaya}`
      )
      .join('\n')}`
  );

  const isDiseaseFocusedScan =
    params.latestScan?.fokusOutput === 'penyakit' ||
    params.latestScan?.fokusOutput === 'hara';
  if (
    (!isDiseaseFocusedScan && params.latestScan?.bagian === 'buah') ||
    /panen|matang|mentah|petik|warna|simpan|berapa hari/.test(q)
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

  const diseaseIds = new Set<string>();
  if (params.latestScan?.penyakitUtamaId && DATASET_DISEASES[params.latestScan.penyakitUtamaId]) {
    diseaseIds.add(params.latestScan.penyakitUtamaId);
  }
  if (params.latestScan?.penyakitRinganId && DATASET_DISEASES[params.latestScan.penyakitRinganId]) {
    diseaseIds.add(params.latestScan.penyakitRinganId);
  }
  for (const d of Object.values(DATASET_DISEASES)) {
    if (
      d.kataKunci.some((k) => q.includes(k)) ||
      q.includes(d.penyakit.toLowerCase()) ||
      q.includes(d.namaIlmiahPatogen.toLowerCase())
    ) {
      diseaseIds.add(d.id);
    }
  }
  if (/penyakit|sakit|busuk|bercak|layu|jamur|virus|hama|tungau|obat|semprot|organik/.test(q) && diseaseIds.size < 2) {
    diseaseIds.add('bercak_kering');
    diseaseIds.add('busuk_daun');
  }
  if (diseaseIds.size > 0) {
    const entries = Array.from(diseaseIds)
      .slice(0, 4)
      .map((id) => DATASET_DISEASES[id])
      .filter(Boolean);
    sections.push(
      `[DATASET PENYAKIT & SOLUSI TERKURASI v3.0]\n${entries
        .map(
          (d) =>
            `- ${d.penyakit} (${d.namaIlmiahPatogen}): Penyebab: ${d.penyebab} | Gejala: ${d.gejala} | Organik dulu: ${d.solusiOrganik.join(' ; ')} | Opsi kimia terakhir: ${d.solusiKimia.join(' ')} | Pencegahan: ${d.pencegahan.join(' ; ')} | Sumber: ${d.sumber}`
        )
        .join('\n')}`
    );
  }

  const nutrientIds = new Set<string>();
  if (params.latestScan?.adaGejalaHara && params.latestScan?.dugaanHaraId && DATASET_NUTRIENTS[params.latestScan.dugaanHaraId]) {
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
