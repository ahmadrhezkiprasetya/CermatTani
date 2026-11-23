import { KnowledgeDisease, KnowledgeNutrient, RipenessStage } from '../types/cermattani';

/* Tabel referensi rentang hari menuju panen per tahap (F1.3) */
export const RIPENESS_REFERENCE: Record<
  RipenessStage,
  {
    label: string;
    color: string;
    minDays: number;
    maxDays: number;
    anjuran: 'Panen sekarang' | 'Tunggu';
    ringkasan: string;
    sumber: string;
  }
> = {
  mentah: {
    label: 'Mentah',
    color: '#5DBB63',
    minDays: 7,
    maxDays: 10,
    anjuran: 'Tunggu',
    ringkasan: 'Kulit masih hijau penuh. Tunggu 7–10 hari sambil jaga penyiraman teratur.',
    sumber: 'Balitsa Kementan RI — Panduan Indeks Kematangan Tomat (USDA Stage 1–2)',
  },
  setengah_matang: {
    label: 'Setengah matang',
    color: '#FFB63D',
    minDays: 2,
    maxDays: 4,
    anjuran: 'Tunggu',
    ringkasan: 'Warna mulai jingga/merah muda (breaker–pink). Siap panen 2–4 hari lagi.',
    sumber: 'Balitsa Kementan RI — Panduan Indeks Kematangan Tomat (USDA Stage 3–4)',
  },
  matang: {
    label: 'Matang',
    color: '#F2562B',
    minDays: 0,
    maxDays: 1,
    anjuran: 'Panen sekarang',
    ringkasan: 'Warna merah merata (> 90%). Cocok dipetik pagi atau sore agar buah tetap segar.',
    sumber: 'Balitsa Kementan RI — Panduan Indeks Kematangan Tomat (USDA Stage 5–6)',
  },
};

/* Basis pengetahuan penyakit tomat (F2.3 — organik/budidaya dulu, kimiawi + "baca label produk") */
export const KNOWLEDGE_DISEASES: Record<string, KnowledgeDisease> = {
  sehat: {
    id: 'sehat',
    penyakit: 'Sehat',
    bagianUmum: ['buah', 'daun', 'batang'],
    penyebab: 'Tidak ditemukan tanda serangan jamur, bakteri, atau virus yang mencolok pada foto.',
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
  },
  bercak_kering: {
    id: 'bercak_kering',
    penyakit: 'Bercak daun kering (Early blight)',
    bagianUmum: ['daun', 'batang'],
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
  },
  busuk_daun: {
    id: 'busuk_daun',
    penyakit: 'Busuk daun (Late blight)',
    bagianUmum: ['daun', 'buah', 'batang'],
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
  },
  bercak_bakteri: {
    id: 'bercak_bakteri',
    penyakit: 'Bercak bakteri',
    bagianUmum: ['daun', 'buah'],
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
      'Gunakan benih tomat sehat bersertifikat.',
      'Sterilkan peralatan kebun secara berkala.',
    ],
    sumber: 'Balitsa Kementan RI & University of Florida IFAS Tomato Disease Guide',
  },
  layu_batang: {
    id: 'layu_batang',
    penyakit: 'Layu fusarium / bakteri batang',
    bagianUmum: ['batang'],
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
  },
};

/* Basis pengetahuan gejala hara & rekomendasi pupuk per fase (F3.2, F3.4) */
export const KNOWLEDGE_NUTRIENTS: Record<string, KnowledgeNutrient> = {
  cukup: {
    id: 'cukup',
    gejala: 'Warna daun hijau merata tanpa klorosis atau tepi terbakar.',
    dugaan: 'Hara terlihat seimbang',
    rekomendasiOrganik: 'Pertahankan kompos matang 250–500 g/tanaman tiap 3 minggu atau POC (Pupuk Organik Cair) 10 ml/liter air.',
    rekomendasiPupuk: 'Pemupukan berimbang NPK 16-16-16 sesuai jadwal fase tumbuh.',
    dosisPerFase: {
      Bibit: 'Kompos halus campur media tanam 1:1; belum perlu pupuk kimia pekat.',
      Vegetatif: 'NPK 16-16-16 sekitar 5–8 g/tanaman (kocor 1x per 10 hari) + POC daun.',
      Berbunga: 'NPK 16-16-16 sekitar 8–10 g/tanaman + tambahan unsur Kalium & Kalsium.',
      Berbuah: 'KNO3 putih / MKP dosis ringan 3–5 g/liter (kocor 200 ml/tanaman) tiap 10 hari.',
      Panen: 'Kurangi Nitrogen, jaga Kalium ringan & kompos agar buah manis dan tidak mudah pecah.',
    },
    sumber: 'Balitsa Kementan RI — Acuan Umum Pemupukan Tomat',
  },
  kurang_nitrogen: {
    id: 'kurang_nitrogen',
    gejala: 'Daun tua bagian bawah menguning pucat merata, pertumbuhan batang agak melambat.',
    dugaan: 'Dugaan kekurangan Nitrogen (N)',
    rekomendasiOrganik: 'Berikan POC urin kelinci/fermentasi daun hijau (10–15 ml/liter) atau kompos kotoran ayam matang 300–500 g di sekitar perakaran.',
    rekomendasiPupuk: 'NPK 16-16-16 atau ZA/Urea dosis rendah secara kocor di pangkal batang.',
    dosisPerFase: {
      Bibit: 'POC ringan 5 ml/liter air, kocor 100 ml/polybag seminggu sekali.',
      Vegetatif: 'NPK 16-16-16 (8–10 g/tanaman) atau Urea ringan 3–5 g/liter dikocor 200 ml/tanaman.',
      Berbunga: 'Gunakan NPK seimbang 8 g/tanaman; hindari Nitrogen berlebih agar bunga tidak rontok.',
      Berbuah: 'Utamakan kompos cair / NPK rendah N (seperti 12-12-17) 5 g/tanaman agar buah tetap padat.',
      Panen: 'Cukup kompos ringan 250 g/tanaman, tidak perlu tambahan Urea.',
    },
    sumber: 'Balitsa Kementan RI & IPNI Tomato Nutrient Deficiency Guide',
  },
  kurang_kalium: {
    id: 'kurang_kalium',
    gejala: 'Tepi daun tua menguning lalu mengering kecokelatan, warna pematangan buah kurang merata.',
    dugaan: 'Dugaan kekurangan Kalium (K)',
    rekomendasiOrganik: 'Tambahkan abu sekam bakar 100–200 g/tanaman atau POC kulit pisang/sabut kelapa 15 ml/liter air.',
    rekomendasiPupuk: 'KNO3 Putih atau KCl dosis ringan saat fase berbunga–berbuah.',
    dosisPerFase: {
      Bibit: 'Tambahkan sedikit abu sekam ke media tanam.',
      Vegetatif: 'NPK 16-16-16 (5–8 g/tanaman) + abu sekam.',
      Berbunga: 'KNO3 Putih 3–5 g/liter air, kocor 200 ml/tanaman tiap 10 hari.',
      Berbuah: 'KNO3 Putih atau NPK grower (15-9-20) 8–10 g/tanaman tiap 10 hari.',
      Panen: 'POC kalium organik 15 ml/liter tiap 14 hari untuk kualitas panen berikutnya.',
    },
    sumber: 'Balitsa Kementan RI & FAO Plant Nutrition Guide',
  },
  kurang_kalsium: {
    id: 'kurang_kalsium',
    gejala: 'Daun muda agak melengkung, atau ujung bawah buah mulai cekung gelap (blossom end rot).',
    dugaan: 'Dugaan kekurangan Kalsium (Ca)',
    rekomendasiOrganik: 'Taburkan tepung cangkang telur halus / dolomit 20–30 g di sekitar pangkal dan jaga penyiraman agar tidak terlalu kering lalu mendadak basah.',
    rekomendasiPupuk: 'Kalsium nitrat (Ca(NO3)2) dosis ringan secara kocor.',
    dosisPerFase: {
      Bibit: 'Dolomit 1 sendok teh per polybag saat tanam.',
      Vegetatif: 'Dolomit 20 g/tanaman di sekitar perakaran.',
      Berbunga: 'Kalsium nitrat 2–3 g/liter air, kocor 200 ml/tanaman tiap 10–14 hari.',
      Berbuah: 'Kalsium nitrat 3 g/liter kocor + jaga kelembapan tanah 45–65%.',
      Panen: 'Jaga irigasi stabil + dolomit ringan setelah panen gelombang pertama.',
    },
    sumber: 'Balitsa Kementan RI — Penanganan Busuk Ujung Buah Tomat',
  },
};

/* Generator foto sampel realistis (SVG Data URL) agar demo langsung siap tanpa foto eksternal */
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export interface DemoPhotoPreset {
  id: string;
  label: string;
  deskripsi: string;
  bagian: 'buah' | 'daun' | 'batang';
  fotoUrl: string;
}

export const DEMO_PHOTO_PRESETS: DemoPhotoPreset[] = [
  {
    id: 'buah_campur',
    label: 'Buah tomat campur (3 tahap)',
    deskripsi: '1 mentah, 1 setengah matang, 1 matang — uji F1 & F6',
    bagian: 'buah',
    fotoUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#214E34"/>
            <stop offset="100%" stop-color="#123023"/>
          </linearGradient>
          <radialGradient id="redT" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stop-color="#FF825C"/>
            <stop offset="55%" stop-color="#F2562B"/>
            <stop offset="100%" stop-color="#B93010"/>
          </radialGradient>
          <radialGradient id="halfT" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stop-color="#FFD878"/>
            <stop offset="55%" stop-color="#FFB63D"/>
            <stop offset="100%" stop-color="#C97710"/>
          </radialGradient>
          <radialGradient id="rawT" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stop-color="#9BE38E"/>
            <stop offset="60%" stop-color="#5DBB63"/>
            <stop offset="100%" stop-color="#2D7B3B"/>
          </radialGradient>
        </defs>
        <rect width="640" height="420" fill="url(#bg1)"/>
        <path d="M0 95 Q180 40 360 110 T640 80 V0 H0Z" fill="#2A6542" opacity="0.6"/>
        <ellipse cx="120" cy="340" rx="140" ry="70" fill="#1B472E" opacity="0.7"/>
        <ellipse cx="520" cy="320" rx="160" ry="85" fill="#1C5033" opacity="0.7"/>
        <path d="M110 30 C160 130 220 140 315 110 C420 75 490 120 530 40" stroke="#3E8F56" stroke-width="10" fill="none" stroke-linecap="round"/>
        <line x1="168" y1="112" x2="168" y2="175" stroke="#4BA464" stroke-width="7"/>
        <line x1="322" y1="110" x2="322" y2="165" stroke="#4BA464" stroke-width="7"/>
        <line x1="478" y1="98" x2="478" y2="180" stroke="#4BA464" stroke-width="7"/>
        <circle cx="168" cy="240" r="66" fill="url(#redT)"/>
        <ellipse cx="144" cy="212" rx="16" ry="9" transform="rotate(-28 144 212)" fill="#fff" opacity="0.38"/>
        <path d="M168 178 C152 166 138 172 136 184 C150 186 160 184 168 178Z" fill="#2A8044"/>
        <path d="M168 178 C184 166 198 172 200 184 C186 186 176 184 168 178Z" fill="#3DBE74"/>
        <circle cx="322" cy="222" r="58" fill="url(#halfT)"/>
        <ellipse cx="302" cy="198" rx="14" ry="8" transform="rotate(-26 302 198)" fill="#fff" opacity="0.35"/>
        <path d="M322 168 C308 158 296 164 295 174 C307 176 315 174 322 168Z" fill="#2A8044"/>
        <path d="M322 168 C336 158 348 164 349 174 C337 176 329 174 322 168Z" fill="#3DBE74"/>
        <circle cx="478" cy="242" r="56" fill="url(#rawT)"/>
        <ellipse cx="458" cy="218" rx="13" ry="7" transform="rotate(-26 458 218)" fill="#fff" opacity="0.32"/>
        <path d="M478 190 C464 180 452 186 451 196 C463 198 471 196 478 190Z" fill="#1F6F38"/>
        <path d="M478 190 C492 180 504 186 505 196 C493 198 485 196 478 190Z" fill="#329955"/>
      </svg>
    `),
  },
  {
    id: 'buah_siap_panen',
    label: 'Buah matang siap panen (4 buah)',
    deskripsi: 'Semua merah matang — memicu "Panen sekarang" + konfeti',
    bagian: 'buah',
    fotoUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
        <defs>
          <radialGradient id="redRipe" cx="35%" cy="28%" r="68%">
            <stop offset="0%" stop-color="#FF8B66"/>
            <stop offset="50%" stop-color="#F2562B"/>
            <stop offset="100%" stop-color="#AA2809"/>
          </radialGradient>
        </defs>
        <rect width="640" height="420" fill="#183F2B"/>
        <ellipse cx="320" cy="70" rx="340" ry="90" fill="#245B3D"/>
        <path d="M70 50 Q320 120 570 48" stroke="#47A262" stroke-width="10" fill="none"/>
        <circle cx="150" cy="200" r="54" fill="url(#redRipe)"/>
        <circle cx="282" cy="252" r="60" fill="url(#redRipe)"/>
        <circle cx="412" cy="196" r="55" fill="url(#redRipe)"/>
        <circle cx="516" cy="264" r="52" fill="url(#redRipe)"/>
        <ellipse cx="132" cy="180" rx="12" ry="7" transform="rotate(-25 132 180)" fill="#fff" opacity="0.4"/>
        <ellipse cx="262" cy="228" rx="14" ry="8" transform="rotate(-25 262 228)" fill="#fff" opacity="0.4"/>
        <ellipse cx="394" cy="176" rx="12" ry="7" transform="rotate(-25 394 176)" fill="#fff" opacity="0.4"/>
        <ellipse cx="498" cy="244" rx="11" ry="6" transform="rotate(-25 498 244)" fill="#fff" opacity="0.4"/>
      </svg>
    `),
  },
  {
    id: 'daun_bercak',
    label: 'Daun dengan bercak kering',
    deskripsi: 'Uji F2 deteksi penyakit (organik dulu) + F3 pupuk',
    bagian: 'daun',
    fotoUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
        <rect width="640" height="420" fill="#244032"/>
        <path d="M90 360 C130 220 220 90 360 72 C485 58 555 140 532 246 C506 364 320 388 90 360Z" fill="#3B8E4F"/>
        <path d="M105 352 C220 250 360 165 510 120" stroke="#76C27D" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M235 245 L210 155 M310 198 L295 110 M385 162 L440 245 M280 220 L355 295" stroke="#6BB673" stroke-width="4" stroke-linecap="round"/>
        <g>
          <circle cx="330" cy="190" r="34" fill="#D5B842" opacity="0.8"/>
          <circle cx="330" cy="190" r="24" fill="#6F4423"/>
          <circle cx="330" cy="190" r="14" fill="none" stroke="#9B663A" stroke-width="3"/>
          <circle cx="330" cy="190" r="6" fill="#4A2B14"/>
        </g>
        <g>
          <circle cx="425" cy="250" r="28" fill="#D9BE4C" opacity="0.8"/>
          <circle cx="425" cy="250" r="19" fill="#6B3F1E"/>
          <circle cx="425" cy="250" r="10" fill="none" stroke="#99643B" stroke-width="2.5"/>
        </g>
        <g>
          <circle cx="240" cy="260" r="22" fill="#D5B842" opacity="0.72"/>
          <circle cx="240" cy="260" r="14" fill="#704322"/>
        </g>
      </svg>
    `),
  },
  {
    id: 'daun_kuning_ragu',
    label: 'Daun menguning (keyakinan rendah 54%)',
    deskripsi: 'Uji F2.4 peringatan kuning < 60% & F3 kurang Nitrogen',
    bagian: 'daun',
    fotoUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
        <rect width="640" height="420" fill="#2C3E31"/>
        <path d="M110 340 C160 190 250 85 390 84 C505 84 550 175 510 278 C466 370 280 375 110 340Z" fill="#B9C952"/>
        <path d="M125 332 C240 245 365 170 495 138" stroke="#D9E27B" stroke-width="7" fill="none" stroke-linecap="round"/>
        <ellipse cx="410" cy="220" rx="85" ry="52" fill="#E3D75B" opacity="0.55"/>
        <circle cx="395" cy="230" r="12" fill="#8C6E32" opacity="0.55"/>
      </svg>
    `),
  },
  {
    id: 'foto_kosong',
    label: 'Foto gelap / tanpa buah terdeteksi',
    deskripsi: 'Uji F1.5 pesan saran cara memotret',
    bagian: 'buah',
    fotoUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
        <rect width="640" height="420" fill="#18221D"/>
        <ellipse cx="180" cy="240" rx="180" ry="110" fill="#1F2E26" opacity="0.7"/>
        <ellipse cx="470" cy="190" rx="190" ry="120" fill="#23342B" opacity="0.6"/>
        <path d="M40 380 Q320 280 600 390" stroke="#2D4236" stroke-width="18" fill="none"/>
      </svg>
    `),
  },
];
