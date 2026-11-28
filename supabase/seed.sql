
insert into public.knowledge_diseases (
  id, penyakit, komoditas, bagian_umum, penyebab, gejala, solusi_organik, solusi_kimia, pencegahan, sumber
) values
(
  'sehat',
  'Sehat',
  array['umum'],
  array['buah', 'daun', 'batang', 'bunga', 'keseluruhan'],
  'Tidak ditemukan tanda serangan jamur, bakteri, virus, atau hama yang mencolok pada foto.',
  'Daun segar merata sesuai karakter varietas, batang kokoh, permukaan hasil panen mulus tanpa bercak cekung.',
  array[
    'Pertahankan penyiraman di pangkal batang pada pagi atau sore hari agar tajuk tidak basah terlalu lama.',
    'Tambahkan mulsa organik (jerami, sekam, atau daun kering) untuk menjaga kelembapan dan suhu tanah stabil.'
  ],
  array[
    'Tidak diperlukan penyemprotan kimia. Hindari penggunaan pestisida preventif berlebihan; bila terpaksa gunakan produk terdaftar dan selalu baca label produk.'
  ],
  array[
    'Periksa bagian bawah daun minimal 2 kali seminggu, terutama saat cuaca lembap atau musim hujan.',
    'Bersihkan gulma dan pangkas daun tua yang menyentuh tanah agar sirkulasi udara lancar.'
  ],
  'Kementan RI & FAO Integrated Pest Management (IPM)'
),
(
  'bercak_kering',
  'Bercak daun kering (Early blight / Cercospora)',
  array['umum'],
  array['daun', 'batang'],
  'Infeksi jamur bercak daun (seperti Alternaria spp. atau Cercospora spp.) yang berkembang cepat saat daun sering lembap.',
  'Bercak cokelat tua melingkar atau bertepi kuning yang biasanya dimulai dari daun tua bagian bawah.',
  array[
    'Petik dan buang daun yang berbercak jauh dari lahan budidaya (jangan dijadikan kompos).',
    'Semprot fungisida nabati atau agen hayati Trichoderma / larutan baking soda 1 sendok teh per liter air + sedikit sabun cair nabati pada sore hari.',
    'Siram langsung ke area perakaran, hindari membasahi permukaan daun.'
  ],
  array[
    'Opsi terakhir bila serangan meluas (> 25% tajuk): fungisida kontak terdaftar sesuai komoditas tanaman. Wajib baca label produk, patuhi dosis dan masa tunggu panen.'
  ],
  array[
    'Atur jarak tanam agar cahaya matahari dan aliran udara masuk ke sela tanaman.',
    'Gunakan mulsa untuk mencegah percikan spora dari tanah ke daun bawah.',
    'Lakukan rotasi jenis tanaman antar musim tanam.'
  ],
  'Balitsa Kementan RI & PlantVillage Reference'
),
(
  'busuk_daun',
  'Busuk daun / Hawar daun (Late blight)',
  array['umum'],
  array['daun', 'buah', 'batang'],
  'Patogen jamur/oomycete (seperti Phytophthora spp.) yang menyebar sangat cepat saat kelembapan udara tinggi (>= 85%) dan suhu sejuk.',
  'Bercak basah hijau keabu-abuan lalu menghitam cepat pada tepi daun atau batang; di pagi lembap kadang tampak lapisan putih tipis di bawah daun.',
  array[
    'Segera pangkas dan musnahkan bagian tanaman yang terserang agar tidak menular ke tanaman sekitar.',
    'Kurangi kelembapan sekitar tajuk dengan menjarangkan daun rimbun bagian bawah dan hentikan siram atas.',
    'Aplikasikan agen hayati Bacillus subtilis atau fungisida tembaga yang diizinkan untuk budidaya organik.'
  ],
  array[
    'Bila gejala menyebar cepat di musim hujan: pertimbangkan fungisida spesifik sesuai anjuran penyuluh pertanian setempat. Wajib baca label produk, gunakan APD, dan taati masa tunggu panen.'
  ],
  array[
    'Pantau peringatan risiko iklim mikro di CermatTani setiap kali kelembapan udara tinggi.',
    'Pastikan drainase bedengan atau pot/polybag lancar agar air tidak menggenang.'
  ],
  'Kementan RI & FAO Plant Disease Advisory'
),
(
  'bercak_bakteri',
  'Bercak bakteri',
  array['umum'],
  array['daun', 'buah', 'batang'],
  'Bakteri patogen (seperti Xanthomonas spp. atau Pseudomonas spp.) yang terbawa benih atau menyebar lewat percikan hujan dan alat kebun.',
  'Bintik kecil cokelat kehitaman berair pada daun atau luka kasar kecil di permukaan batang/buah.',
  array[
    'Pisahkan dan buang bagian tanaman bergejala; cuci tangan serta gunting pangkas dengan sabun/alkohol sebelum menyentuh tanaman sehat.',
    'Hindari menyentuh atau memangkas tanaman saat daun masih basah oleh embun atau hujan.',
    'Gunakan bakterisida nabati (ekstrak daun sirih/bawang putih) sebagai penekan awal.'
  ],
  array[
    'Opsi terakhir pada serangan berat: bakterisida terdaftar berbahan tembaga sesuai rekomendasi penyuluh. Wajib baca label produk dan ikuti batas aman panen.'
  ],
  array[
    'Gunakan benih atau bibit sehat bersertifikat.',
    'Sterilkan peralatan budidaya secara berkala.'
  ],
  'Kementan RI & FAO Integrated Crop Management'
),
(
  'layu_batang',
  'Layu fusarium / Layu bakteri pembuluh',
  array['umum'],
  array['batang', 'akar', 'keseluruhan'],
  'Jamur tular tanah (Fusarium spp.) atau bakteri (Ralstonia spp.) yang menyumbat pembuluh air dari akar dan pangkal batang.',
  'Pangkal batang kecokelatan, daun layu mendadak di siang hari walau tanah cukup lembap.',
  array[
    'Cabut tanaman yang sudah layu permanen beserta tanah di sekitar perakaran agar tidak menular ke tanaman lain.',
    'Kocor lubang tanam sekitar dengan Trichoderma harzianum dan kompos matang untuk memperbaiki mikroba tanah.',
    'Tambahkan dolomit/kapur pertanian bila pH tanah terlalu asam (pH < 5,5).'
  ],
  array[
    'Penyemprotan daun tidak efektif untuk layu pembuluh. Konsultasikan ke penyuluh pertanian sebelum memakai perlakuan tanah kimiawi dan selalu baca label produk.'
  ],
  array[
    'Perbaiki drainase dan buat bedengan lebih tinggi saat musim hujan.',
    'Pilih varietas tanaman yang tahan layu serta lakukan rotasi tanaman.'
  ],
  'Kementan RI — Pengendalian Penyakit Tular Tanah'
),
(
  'embun_tepung',
  'Embun tepung (Powdery mildew)',
  array['umum'],
  array['daun', 'batang', 'bunga'],
  'Jamur golongan Erysiphales yang tumbuh pada permukaan daun di kondisi teduh dengan sirkulasi udara kurang baik.',
  'Lapisan serbuk putih keabu-abuan seperti tepung di permukaan atas maupun bawah daun.',
  array[
    'Pangkas daun yang tertutup serbuk putih berat agar tidak menyebar lewat angin.',
    'Semprot larutan baking soda ringan atau minyak nimba (neem oil) pada sore hari.',
    'Tingkatkan paparan sinar matahari dan jarak antar tanaman.'
  ],
  array[
    'Opsi terakhir bila serangan berat: fungisida berbahan sulfur/belerang sesuai aturan tanaman. Wajib baca label produk dan hindari penyemprotan saat matahari terik.'
  ],
  array[
    'Hindari pemupukan Nitrogen berlebihan yang membuat tajuk terlalu rimbun dan lembap.',
    'Jaga kebersihan daun gugur di sekitar lahan.'
  ],
  'Kementan RI & FAO IPM Guide'
)
on conflict (id) do update set
  penyakit = excluded.penyakit,
  komoditas = excluded.komoditas,
  bagian_umum = excluded.bagian_umum,
  penyebab = excluded.penyebab,
  gejala = excluded.gejala,
  solusi_organik = excluded.solusi_organik,
  solusi_kimia = excluded.solusi_kimia,
  pencegahan = excluded.pencegahan,
  sumber = excluded.sumber,
  updated_at = now();

insert into public.knowledge_nutrients (
  id, komoditas, gejala, dugaan, rekomendasi_organik, rekomendasi_pupuk, dosis_per_fase, sumber
) values
(
  'cukup',
  array['umum'],
  'Warna daun hijau sehat merata tanpa klorosis, nekrosis, atau tepi terbakar.',
  'Hara terlihat seimbang',
  'Pertahankan kompos matang 250-500 g/tanaman tiap 3-4 minggu atau POC (Pupuk Organik Cair) 10 ml/liter air.',
  'Pemupukan berimbang NPK sesuai kebutuhan fase tumbuh dan jenis tanaman.',
  '{
    "Bibit": "Media tanam + kompos halus matang; belum perlu pupuk kimia pekat.",
    "Vegetatif": "NPK seimbang dosis ringan (kocor tiap 10-14 hari) + POC organik.",
    "Generatif": "NPK seimbang + tambahan unsur Fosfor, Kalium, dan mikro sesuai jenis tanaman.",
    "Berbunga": "Kurangi Nitrogen berlebih, tingkatkan Fosfor, Kalium, dan Kalsium ringan.",
    "Berbuah": "Utamakan Kalium (K) dan Kalsium (Ca) untuk kualitas hasil panen.",
    "Panen": "Cukup pemeliharaan kompos/POC ringan agar tanah tetap subur."
  }'::jsonb,
  'Kementan RI — Acuan Umum Pemupukan Berimbang (Bukan pengganti uji tanah)'
),
(
  'kurang_nitrogen',
  array['umum'],
  'Daun tua bagian bawah menguning pucat merata, pertumbuhan tunas dan batang melambat.',
  'Dugaan kekurangan Nitrogen (N)',
  'Berikan POC fermentasi daun hijau/urin ternak (10-15 ml/liter) atau kompos kotoran ternak matang di sekitar perakaran.',
  'Pupuk sumber Nitrogen (NPK seimbang, ZA, atau Urea dosis rendah) secara kocor di area akar.',
  '{
    "Bibit": "POC ringan 5 ml/liter air seminggu sekali.",
    "Vegetatif": "NPK seimbang atau sumber Nitrogen dosis ringan secara kocor tiap 10 hari.",
    "Generatif": "Gunakan NPK seimbang secukupnya; hindari Nitrogen berlebih agar bunga/bakal buah tidak rontok.",
    "Berbunga": "NPK seimbang dosis rendah + kompos cair.",
    "Berbuah": "Utamakan kompos/POC ringan, hindari Urea pekat.",
    "Panen": "Kompos matang ringan untuk pemulihan media tanam."
  }'::jsonb,
  'Kementan RI & IPNI Plant Nutrition Guide (Bukan pengganti uji tanah)'
),
(
  'kurang_fosfor',
  array['umum'],
  'Pertumbuhan akar dan tanaman lambat, daun tua tampak hijau gelap kusam atau keunguan di bagian bawah.',
  'Dugaan kekurangan Fosfor (P)',
  'Tambahkan kompos matang, guano, atau tepung tulang organik ke sekitar perakaran.',
  'Pupuk sumber Fosfor (SP-36 atau MKP dosis ringan) sesuai fase tumbuh.',
  '{
    "Bibit": "Campurkan kompos matang kaya bahan organik pada media semai.",
    "Vegetatif": "Berikan sumber Fosfor dasar di sekitar perakaran saat persiapan atau awal tanam.",
    "Generatif": "MKP dosis ringan 2-3 g/liter secara kocor tiap 10-14 hari.",
    "Berbunga": "MKP atau pupuk tinggi P dosis ringan untuk mendukung pembungaan.",
    "Berbuah": "Cukup NPK seimbang + kompos.",
    "Panen": "Perbaiki bahan organik tanah menjelang tanam berikutnya."
  }'::jsonb,
  'Kementan RI & FAO Plant Nutrition Guide (Bukan pengganti uji tanah)'
),
(
  'kurang_kalium',
  array['umum'],
  'Tepi daun tua menguning lalu mengering kecokelatan, batang kurang kokoh atau kualitas hasil panen menurun.',
  'Dugaan kekurangan Kalium (K)',
  'Tambahkan abu sekam bakar 100-200 g/tanaman atau POC kulit pisang/sabut kelapa 15 ml/liter air.',
  'Sumber Kalium (KNO3 Putih, ZK, atau KCl dosis ringan) terutama pada fase generatif.',
  '{
    "Bibit": "Tambahkan sedikit abu sekam ke media tanam.",
    "Vegetatif": "NPK seimbang + abu sekam tipis di sekitar pangkal.",
    "Generatif": "Sumber Kalium (KNO3/ZK) dosis ringan secara kocor tiap 10-14 hari.",
    "Berbunga": "KNO3 Putih 3-5 g/liter kocor 200 ml/tanaman tiap 10 hari.",
    "Berbuah": "NPK tinggi Kalium atau KNO3 dosis anjuran umum tiap 10 hari.",
    "Panen": "POC kalium organik tiap 14 hari untuk menjaga kualitas panen."
  }'::jsonb,
  'Kementan RI & FAO Plant Nutrition Guide (Bukan pengganti uji tanah)'
),
(
  'kurang_kalsium',
  array['umum'],
  'Daun muda melengkung atau keriting di ujung, atau ujung buah/tunas mengalami busuk kering.',
  'Dugaan kekurangan Kalsium (Ca)',
  'Taburkan dolomit atau tepung cangkang telur halus di sekitar pangkal serta jaga penyiraman stabil.',
  'Kalsium nitrat (Ca(NO3)2) dosis ringan secara kocor di perakaran.',
  '{
    "Bibit": "Tambahkan sedikit dolomit ke media tanam bila pH asam.",
    "Vegetatif": "Dolomit 20 g/tanaman di sekitar perakaran.",
    "Generatif": "Kalsium nitrat 2-3 g/liter air secara kocor tiap 10-14 hari.",
    "Berbunga": "Kalsium nitrat 2-3 g/liter + jaga kelembapan tanah tidak kering mendadak.",
    "Berbuah": "Kalsium nitrat 3 g/liter kocor + jaga penyiraman teratur.",
    "Panen": "Jaga irigasi stabil dan tambahkan dolomit ringan pascapanen."
  }'::jsonb,
  'Kementan RI — Penanganan Defisiensi Kalsium Tanaman (Bukan pengganti uji tanah)'
),
(
  'kurang_magnesium',
  array['umum'],
  'Daun tua menguning di antara tulang daun (klorosis interveinal) sementara tulang daun tetap hijau.',
  'Dugaan kekurangan Magnesium (Mg)',
  'Berikan dolomit (mengandung Ca & Mg) dan kompos matang di sekitar perakaran.',
  'Magnesium sulfat (garam Inggris/Kieserite) dosis ringan 2-3 g/liter secara kocor.',
  '{
    "Bibit": "Gunakan media tanam kaya kompos matang.",
    "Vegetatif": "Dolomit tipis di sekitar perakaran.",
    "Generatif": "Magnesium sulfat 2 g/liter kocor tiap 14 hari bila gejala terlihat.",
    "Berbunga": "Magnesium sulfat 2-3 g/liter kocor.",
    "Berbuah": "Dolomit ringan atau Magnesium sulfat dosis rendah.",
    "Panen": "Tambahkan kompos & dolomit saat olah tanah berikutnya."
  }'::jsonb,
  'Kementan RI & IPNI Guide (Bukan pengganti uji tanah)'
)
on conflict (id) do update set
  komoditas = excluded.komoditas,
  gejala = excluded.gejala,
  dugaan = excluded.dugaan,
  rekomendasi_organik = excluded.rekomendasi_organik,
  rekomendasi_pupuk = excluded.rekomendasi_pupuk,
  dosis_per_fase = excluded.dosis_per_fase,
  sumber = excluded.sumber,
  updated_at = now();
