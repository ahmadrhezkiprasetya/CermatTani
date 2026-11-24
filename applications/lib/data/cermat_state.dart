import 'dart:async';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

extension CermatIterableExt<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

enum PlantPart { buah, daun, batang }

enum RipenessStage { mentah, setengahMatang, matang }

enum AlertSeverity { info, warn, danger }

enum AlertType { jadwal, sensor, panen, scan, sistem }

enum ReminderCategory { siram, pupuk, cekDaun, panen }

class FarmModel {
  const FarmModel({
    required this.id,
    required this.nama,
    required this.lokasi,
    required this.luasLabel,
  });
  final String id;
  final String nama;
  final String lokasi;
  final String luasLabel;
}

class PlantModel {
  const PlantModel({
    required this.id,
    required this.farmId,
    required this.nama,
    required this.varietas,
    required this.tanggalTanam,
    required this.fase,
    this.bobotRataBuahGram = 85,
  });

  final String id;
  final String farmId;
  final String nama;
  final String varietas;
  final DateTime tanggalTanam;
  final String fase; // Bibit, Vegetatif, Berbunga, Berbuah, Panen
  final int bobotRataBuahGram;

  int get hst => DateTime.now().difference(tanggalTanam).inDays.clamp(0, 999);
}

class DetectionBoxModel {
  const DetectionBoxModel({
    required this.leftFrac,
    required this.topFrac,
    required this.widthFrac,
    required this.heightFrac,
    required this.stage,
    required this.confidence,
  });

  final double leftFrac, topFrac, widthFrac, heightFrac;
  final RipenessStage stage;
  final int confidence;
}

class DiseasePred {
  const DiseasePred(this.id, this.nama, this.confidence);
  final String id;
  final String nama;
  final int confidence;
}

class ScanModel {
  const ScanModel({
    required this.id,
    required this.plantId,
    required this.waktu,
    required this.bagian,
    required this.boxes,
    required this.tahapDominan,
    required this.jumlahBuah,
    required this.anjuranPanen,
    required this.estimasiHariMin,
    required this.estimasiHariMax,
    required this.estimasiDisesuaikanRiwayat,
    required this.estimasiBobotGram,
    required this.penyakitTop3,
    required this.penyakitUtamaId,
    required this.penyakitUtamaNama,
    required this.keyakinan,
    required this.keyakinanRendah,
    required this.dugaanHaraId,
    required this.dugaanHaraNama,
    required this.pakaiDataSensor,
    this.tanpaBuahTerdeteksi = false,
    this.diluarKonteksTanaman = false,
    this.photoBytes,
    this.aiModel,
    this.ringkasanAi = '',
    this.temuanVisual = const [],
  });

  final String id;
  final String plantId;
  final DateTime waktu;
  final PlantPart bagian;
  final List<DetectionBoxModel> boxes;
  final RipenessStage? tahapDominan;
  final int jumlahBuah;
  final String anjuranPanen;
  final int? estimasiHariMin;
  final int? estimasiHariMax;
  final bool estimasiDisesuaikanRiwayat;
  final int estimasiBobotGram;
  final List<DiseasePred> penyakitTop3;
  final String penyakitUtamaId;
  final String penyakitUtamaNama;
  final int keyakinan;
  final bool keyakinanRendah;
  final String dugaanHaraId;
  final String dugaanHaraNama;
  final bool pakaiDataSensor;
  final bool tanpaBuahTerdeteksi;
  final bool diluarKonteksTanaman;
  final Uint8List? photoBytes;
  final String? aiModel;
  final String ringkasanAi;
  final List<String> temuanVisual;
}

class KnowledgeDisease {
  const KnowledgeDisease({
    required this.id,
    required this.penyakit,
    required this.ciriVisualSpesifik,
    required this.penyebab,
    required this.gejala,
    required this.solusiOrganik,
    required this.solusiKimia,
    required this.pencegahan,
    required this.sumber,
    this.kataKunci = const [],
  });

  final String id;
  final String penyakit;
  final String ciriVisualSpesifik;
  final String penyebab;
  final String gejala;
  final List<String> solusiOrganik;
  final List<String> solusiKimia;
  final List<String> pencegahan;
  final String sumber;
  final List<String> kataKunci;
}

class KnowledgeNutrient {
  const KnowledgeNutrient({
    required this.id,
    required this.dugaan,
    required this.ciriVisualSpesifik,
    required this.gejala,
    required this.rekomendasiOrganik,
    required this.dosisPerFase,
    required this.sumber,
    this.kataKunci = const [],
  });

  final String id;
  final String dugaan;
  final String ciriVisualSpesifik;
  final String gejala;
  final String rekomendasiOrganik;
  final Map<String, String> dosisPerFase;
  final String sumber;
  final List<String> kataKunci;
}

class IrrigationEventModel {
  const IrrigationEventModel({
    required this.id,
    required this.waktu,
    required this.durasiMenit,
    required this.kelembapanAwal,
    required this.kelembapanAkhir,
    required this.mode,
  });

  final String id;
  final DateTime waktu;
  final int durasiMenit;
  final int kelembapanAwal;
  final int kelembapanAkhir;
  final String mode;
}

class HarvestEventModel {
  const HarvestEventModel({
    required this.id,
    required this.plantId,
    required this.tanggal,
    required this.sumber,
    required this.catatan,
  });

  final String id;
  final String plantId;
  final DateTime tanggal;
  final String sumber; // 'estimasi' | 'aktual'
  final String catatan;

  HarvestEventModel copyWith({String? sumber}) => HarvestEventModel(
        id: id,
        plantId: plantId,
        tanggal: tanggal,
        sumber: sumber ?? this.sumber,
        catatan: catatan,
      );
}

class FarmTaskModel {
  const FarmTaskModel({
    required this.id,
    required this.farmId,
    required this.judul,
    required this.waktuLabel,
    required this.selesai,
  });

  final String id;
  final String farmId;
  final String judul;
  final String waktuLabel;
  final bool selesai;

  FarmTaskModel copyWith({bool? selesai}) => FarmTaskModel(
        id: id,
        farmId: farmId,
        judul: judul,
        waktuLabel: waktuLabel,
        selesai: selesai ?? this.selesai,
      );
}

class ChatMsgModel {
  const ChatMsgModel({
    required this.id,
    required this.dariCermo,
    required this.isi,
    this.aiModel,
  });
  final String id;
  final bool dariCermo;
  final String isi;
  final String? aiModel;
}

class NotifModel {
  const NotifModel({
    required this.id,
    required this.judul,
    required this.isi,
    required this.waktu,
    required this.dibaca,
    this.severity = AlertSeverity.info,
    this.tipe = AlertType.sistem,
    this.actionRoute,
    this.actionLabel,
  });

  final String id;
  final String judul;
  final String isi;
  final String waktu;
  final bool dibaca;
  final AlertSeverity severity;
  final AlertType tipe;
  final String? actionRoute;
  final String? actionLabel;

  NotifModel copyWith({bool? dibaca}) => NotifModel(
        id: id,
        judul: judul,
        isi: isi,
        waktu: waktu,
        dibaca: dibaca ?? this.dibaca,
        severity: severity,
        tipe: tipe,
        actionRoute: actionRoute,
        actionLabel: actionLabel,
      );
}

class ReminderScheduleModel {
  const ReminderScheduleModel({
    required this.id,
    required this.judul,
    required this.jam, // 'HH:MM'
    required this.kategori,
    required this.aktif,
    required this.catatan,
  });

  final String id;
  final String judul;
  final String jam;
  final ReminderCategory kategori;
  final bool aktif;
  final String catatan;

  ReminderScheduleModel copyWith({
    String? judul,
    String? jam,
    ReminderCategory? kategori,
    bool? aktif,
    String? catatan,
  }) =>
      ReminderScheduleModel(
        id: id,
        judul: judul ?? this.judul,
        jam: jam ?? this.jam,
        kategori: kategori ?? this.kategori,
        aktif: aktif ?? this.aktif,
        catatan: catatan ?? this.catatan,
      );
}

class LiveAlertModel {
  const LiveAlertModel({
    required this.id,
    required this.judul,
    required this.isi,
    required this.severity,
    required this.tipe,
    required this.waktu,
    this.actionRoute,
    this.actionLabel,
  });

  final String id;
  final String judul;
  final String isi;
  final AlertSeverity severity;
  final AlertType tipe;
  final String waktu;
  final String? actionRoute;
  final String? actionLabel;
}

class Sensor24hPoint {
  const Sensor24hPoint({
    required this.jam,
    required this.tanah,
    required this.suhu,
    required this.udara,
    required this.cahayaKlux,
  });

  final String jam;
  final int tanah;
  final double suhu;
  final int udara;
  final double cahayaKlux;
}

/// Dataset Penyakit & Hama Terkurasi CermatTani v2.0 (10 kelas resmi, sinkron Web)
const knowledgeDiseases = <String, KnowledgeDisease>{
  'sehat': KnowledgeDisease(
    id: 'sehat',
    penyakit: 'Sehat',
    ciriVisualSpesifik:
        'Daun hijau segar seragam tanpa bercak nekrotik/cincin/mosaik, batang tegak utuh tanpa luka cokelat basah, kulit buah mulus tidak cekung.',
    penyebab: 'Tidak ditemukan tanda serangan jamur, bakteri, virus, atau hama yang mencolok.',
    gejala: 'Daun hijau segar merata, batang kokoh, permukaan buah mulus.',
    solusiOrganik: [
      'Pertahankan penyiraman di pangkal batang pada pagi hari agar daun tidak basah lama.',
      'Tambahkan mulsa organik (jerami/sekam) untuk menjaga kelembapan tanah stabil.',
    ],
    solusiKimia: [
      'Tidak diperlukan penyemprotan kimia. Bila terpaksa gunakan produk terdaftar dan selalu baca label produk.',
    ],
    pencegahan: [
      'Periksa bagian bawah daun 2 kali seminggu, terutama saat cuaca lembap.',
      'Pangkas daun tua yang menyentuh tanah agar sirkulasi udara lancar.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Tomato IPM',
    kataKunci: ['sehat', 'normal', 'aman', 'rawat'],
  ),
  'bercak_kering': KnowledgeDisease(
    id: 'bercak_kering',
    penyakit: 'Bercak daun kering (Early blight)',
    ciriVisualSpesifik:
        'Bercak cokelat tua kehitaman berbentuk cincin konsentris (target spot) pada daun tua bagian bawah, dikelilingi tepi kuning.',
    penyebab: 'Jamur Alternaria solani yang berkembang cepat pada cuaca hangat dan daun sering basah.',
    gejala: 'Bercak cokelat tua melingkar konsentris pada daun tua dengan tepi menguning.',
    solusiOrganik: [
      'Petik dan buang daun berbercak jauh dari bedengan (jangan dijadikan kompos).',
      'Semprot fungisida nabati / agen hayati Trichoderma atau larutan baking soda 1 sdt/liter pada sore hari.',
      'Siram langsung di tanah dekat akar, hindari membasahi tajuk daun.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan meluas (> 25% daun): fungisida kontak mankozeb/klorotalonil. Wajib baca label produk, patuhi dosis dan masa tunggu panen.',
    ],
    pencegahan: [
      'Jaga jarak tanam minimal 50 × 60 cm dan gunakan mulsa.',
      'Lakukan rotasi tanaman setelah panen.',
    ],
    sumber: 'Balitsa Kementan RI & PlantVillage Reference',
    kataKunci: ['bercak', 'kering', 'early blight', 'alternaria', 'cincin', 'cokelat'],
  ),
  'busuk_daun': KnowledgeDisease(
    id: 'busuk_daun',
    penyakit: 'Busuk daun (Late blight)',
    ciriVisualSpesifik:
        'Bercak lebar tampak basah hijau keabu-abuan lalu cepat menghitam di tepi daun/batang; pada RH tinggi muncul kapang putih halus di balik daun.',
    penyebab: 'Phytophthora infestans yang cepat menyebar saat kelembapan udara ≥ 85% dan suhu 18–26 °C.',
    gejala: 'Bercak basah hijau keabu-abuan lalu menghitam cepat pada tepi daun.',
    solusiOrganik: [
      'Segera pangkas dan musnahkan bagian tanaman terserang agar tidak menular.',
      'Pangkas daun bawah yang rimbun dan hentikan penyiraman dari atas.',
      'Aplikasikan fungisida tembaga organik atau Bacillus subtilis.',
    ],
    solusiKimia: [
      'Opsi terakhir di musim hujan: fungisida spesifik oomycete atas arahan penyuluh. Wajib baca label produk dan gunakan APD.',
    ],
    pencegahan: [
      'Pantau peringatan iklim mikro di CermatTani saat kelembapan tinggi.',
      'Pastikan drainase bedengan lancar.',
    ],
    sumber: 'Balitsa Kementan RI & FAO Tomato Late Blight Advisory',
    kataKunci: ['busuk daun', 'late blight', 'phytophthora', 'basah', 'hitam', 'jamur'],
  ),
  'bercak_bakteri': KnowledgeDisease(
    id: 'bercak_bakteri',
    penyakit: 'Bercak bakteri',
    ciriVisualSpesifik:
        'Bintik kecil (1–3 mm) cokelat kehitaman berair tersebar di daun atau koreng kasar kecil menonjol bertepi terang pada buah.',
    penyebab: 'Bakteri Xanthomonas spp. terbawa benih atau percikan hujan/tangan saat merawat tanaman.',
    gejala: 'Bintik kecil cokelat kehitaman berair di daun atau koreng kecil kasar di kulit buah.',
    solusiOrganik: [
      'Buang daun/buah bergejala; cuci tangan & gunting pangkas dengan alkohol sebelum menyentuh tanaman sehat.',
      'Hindari menyentuh tanaman saat daun basah oleh embun atau hujan.',
      'Semprot bakterisida nabati (ekstrak daun sirih/bawang putih).',
    ],
    solusiKimia: [
      'Opsi terakhir pada serangan berat: bakterisida tembaga hidroksida sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Gunakan benih sehat bersertifikat dan sterilkan peralatan kebun berkala.'],
    sumber: 'Balitsa Kementan RI & UF IFAS Tomato Guide',
    kataKunci: ['bakteri', 'bintik', 'koreng', 'xanthomonas'],
  ),
  'layu_batang': KnowledgeDisease(
    id: 'layu_batang',
    penyakit: 'Layu fusarium / bakteri batang',
    ciriVisualSpesifik:
        'Pangkal batang kecokelatan/menghitam, daun layu mendadak siang hari walau tanah lembap, pembuluh dalam batang berwarna cokelat.',
    penyebab: 'Jamur Fusarium oxysporum atau bakteri Ralstonia yang menyerang pembuluh batang bawah.',
    gejala: 'Pangkal batang kecokelatan dan daun layu siang hari walau tanah lembap.',
    solusiOrganik: [
      'Cabut tanaman layu permanen agar tidak menular ke bedengan sebelah.',
      'Kocor lubang tanam sekitar dengan Trichoderma dan kompos matang.',
      'Tambahkan dolomit bila tanah terlalu asam (pH < 5,5).',
    ],
    solusiKimia: [
      'Semprot daun tidak efektif untuk layu pembuluh. Konsultasi penyuluh sebelum perlakuan tanah dan selalu baca label produk.',
    ],
    pencegahan: ['Buat bedengan lebih tinggi di musim hujan & pilih varietas tahan layu (Servo F1).'],
    sumber: 'Balitsa Kementan RI',
    kataKunci: ['layu', 'fusarium', 'ralstonia', 'batang', 'terkulai'],
  ),
  'keriting_kuning': KnowledgeDisease(
    id: 'keriting_kuning',
    penyakit: 'Virus kuning / keriting daun (TYLCV)',
    ciriVisualSpesifik:
        'Daun muda menggulung ke atas seperti sendok, permukaan keriting kerdil, tepi & sela tulang daun menguning cerah.',
    penyebab: 'Tomato Yellow Leaf Curl Virus (TYLCV) ditularkan kutu kebul (Bemisia tabaci).',
    gejala: 'Daun pucuk mengeriting, menggulung ke atas, menguning cerah, tanaman kerdil.',
    solusiOrganik: [
      'Pasang perangkap likat kuning (yellow sticky trap) untuk menangkap kutu kebul.',
      'Semprot bagian bawah daun dengan minyak nimba (neem oil) sore hari.',
      'Cabut tanaman muda yang terserang parah agar tidak menular.',
    ],
    solusiKimia: [
      'Virus tidak bisa disembuhkan obat; pengendalian hanya menyasar kutu kebul sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Gunakan mulsa plastik perak atau kelambu serangga di persemaian.'],
    sumber: 'Balitsa Kementan RI & FAO TYLCV Guide',
    kataKunci: ['keriting', 'kuning', 'virus', 'tylcv', 'kutu kebul', 'kerdil'],
  ),
  'bercak_septoria': KnowledgeDisease(
    id: 'bercak_septoria',
    penyakit: 'Bercak daun Septoria',
    ciriVisualSpesifik:
        'Banyak bercak bulat kecil (2–4 mm) bertengah abu-abu/putih pucat bertepi cokelat gelap tajam di daun bawah.',
    penyebab: 'Jamur Septoria lycopersici yang menyebar lewat percikan air hujan/siraman atas.',
    gejala: 'Bercak kecil bulat banyak di daun bawah bertengah abu-abu, daun cepat rontok.',
    solusiOrganik: [
      'Pangkas daun bawah yang terinfeksi dan musnahkan di luar kebun.',
      'Pasang mulsa jerami dan siram langsung di tanah.',
      'Aplikasikan Trichoderma atau fungisida nabati serai wangi sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan cepat naik ke daun atas: fungisida kontak sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Jangan merawat tanaman saat daun basah dan lakukan rotasi tanaman.'],
    sumber: 'PlantVillage & UF IFAS Reference',
    kataKunci: ['septoria', 'abu-abu', 'bercak kecil', 'rontok'],
  ),
  'busuk_ujung_buah': KnowledgeDisease(
    id: 'busuk_ujung_buah',
    penyakit: 'Busuk ujung buah (Blossom end rot)',
    ciriVisualSpesifik:
        'Bercak gelap cokelat kehitaman cekung dan kering di bagian ujung bawah buah (sisi bekas bunga).',
    penyebab: 'Gangguan fisiologis serapan Kalsium (Ca) akibat fluktuasi siram atau tanah asam.',
    gejala: 'Bagian bawah/ujung buah berubah cokelat kehitaman, cekung, dan keras.',
    solusiOrganik: [
      'Petik buah yang terlanjur busuk ujung agar energi dialihkan ke buah sehat.',
      'Jaga penyiraman stabil (tanah 45–65%) dan pasang mulsa organik.',
      'Taburkan tepung cangkang telur halus atau dolomit 20–30 g di sekitar pangkal.',
    ],
    solusiKimia: [
      'Bila perlu koreksi cepat: kocor Kalsium nitrat 2–3 g/liter (200 ml/tanaman). Ini bukan jamur jadi tidak perlu fungisida; baca label produk.',
    ],
    pencegahan: ['Hindari Nitrogen berlebih saat berbunga/berbuah dan jaga pH tanah 6,0–6,8.'],
    sumber: 'Balitsa Kementan RI',
    kataKunci: ['busuk ujung', 'blossom end rot', 'ujung buah', 'cekung', 'kalsium'],
  ),
  'antraknosa': KnowledgeDisease(
    id: 'antraknosa',
    penyakit: 'Antraknosa / patek buah',
    ciriVisualSpesifik:
        'Bercak bulat cekung basah pada kulit buah matang/setengah matang, tengah gelap/jingga spora.',
    penyebab: 'Jamur Colletotrichum spp. yang menginfeksi buah matang saat lembap dan hujan.',
    gejala: 'Bercak cekung melingkar pada buah, buah cepat membusuk.',
    solusiOrganik: [
      'Petik dan kubur buah bergejala patek agar spora tidak menyebar.',
      'Panen segera saat matang dan gunakan ajir + mulsa agar buah tidak menyentuh tanah.',
      'Semprot fungisida nabati atau agen hayati Trichoderma/Bacillus.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan berat di musim hujan: fungisida sesuai penyuluh. Wajib baca label produk dan taati masa tunggu panen.',
    ],
    pencegahan: ['Gunakan benih sehat, jarak tanam lebar, dan drainase lancar.'],
    sumber: 'Balitsa Kementan RI',
    kataKunci: ['antraknosa', 'patek', 'colletotrichum', 'busuk buah'],
  ),
  'serangan_hama_daun': KnowledgeDisease(
    id: 'serangan_hama_daun',
    penyakit: 'Serangan hama daun (Penggorok / Ulat / Kutu)',
    ciriVisualSpesifik:
        'Liang korokan berliku putih keperakan pada daun (Liriomyza), lubang gigitan ulat di daun/buah, atau koloni kutu di balik daun.',
    penyebab: 'Lalat penggorok daun (Liriomyza), ulat buah/daun, kutu daun, atau tungau.',
    gejala: 'Daun berlubang, bergaris korokan putih berliku, atau ada serangga kecil di balik daun.',
    solusiOrganik: [
      'Ambil ulat atau daun berkorok parah secara manual pagi/sore.',
      'Pasang perangkap likat kuning untuk penggorok daun & kutu kebul.',
      'Semprot pestisida nabati minyak nimba atau larutan bawang putih sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila populasi tinggi: insektisida selektif sesuai penyuluh. Wajib baca label produk & masa tunggu panen.',
    ],
    pencegahan: ['Tanam refugia (marigold, kenikir, kemangi) di tepi bedengan.'],
    sumber: 'Balitsa Kementan RI & FAO IPM',
    kataKunci: ['hama', 'ulat', 'kutu', 'penggorok', 'lubang', 'serangga'],
  ),
};

/// Dataset Hara & Rekomendasi Pupuk CermatTani v2.0 (6 kelas resmi, sinkron Web)
const knowledgeNutrients = <String, KnowledgeNutrient>{
  'cukup': KnowledgeNutrient(
    id: 'cukup',
    dugaan: 'Hara terlihat seimbang',
    ciriVisualSpesifik: 'Daun hijau segar merata tanpa klorosis seragam, tepi terbakar, atau semburat ungu tua.',
    gejala: 'Warna daun hijau merata tanpa klorosis atau tepi terbakar.',
    rekomendasiOrganik: 'Pertahankan kompos matang 250–500 g/tanaman tiap 3 minggu atau POC 10 ml/liter.',
    dosisPerFase: {
      'Bibit': 'Kompos halus campur media 1:1; belum perlu pupuk kimia pekat.',
      'Vegetatif': 'NPK 16-16-16 sekitar 5–8 g/tanaman (kocor tiap 10 hari) + POC.',
      'Berbunga': 'NPK 16-16-16 sekitar 8–10 g/tanaman + tambahan Kalium & Kalsium.',
      'Berbuah': 'KNO3 putih dosis ringan 3–5 g/liter (kocor 200 ml/tanaman) tiap 10 hari.',
      'Panen': 'Kurangi Nitrogen, jaga Kalium ringan & kompos agar buah manis.',
    },
    sumber: 'Balitsa Kementan RI — Acuan Umum Pemupukan Tomat',
    kataKunci: ['seimbang', 'cukup', 'normal', 'npk', 'kompos'],
  ),
  'kurang_nitrogen': KnowledgeNutrient(
    id: 'kurang_nitrogen',
    dugaan: 'Dugaan kekurangan Nitrogen (N)',
    ciriVisualSpesifik: 'Daun tua bagian bawah menguning pucat merata, ukuran daun mengecil, batang kurus.',
    gejala: 'Daun tua bagian bawah menguning pucat merata, pertumbuhan batang melambat.',
    rekomendasiOrganik: 'POC fermentasi daun hijau (10–15 ml/liter) atau kompos matang 300–500 g/tanaman.',
    dosisPerFase: {
      'Bibit': 'POC ringan 5 ml/liter air, kocor 100 ml/polybag seminggu sekali.',
      'Vegetatif': 'NPK 16-16-16 (8–10 g/tanaman) atau Urea ringan 3–5 g/liter dikocor 200 ml.',
      'Berbunga': 'NPK seimbang 8 g/tanaman; hindari Nitrogen berlebih agar bunga tidak rontok.',
      'Berbuah': 'Utamakan kompos cair / NPK rendah N (5 g/tanaman).',
      'Panen': 'Cukup kompos ringan 250 g/tanaman.',
    },
    sumber: 'Balitsa Kementan RI & IPNI Tomato Guide',
    kataKunci: ['nitrogen', 'kuning', 'pucat', 'urea'],
  ),
  'kurang_fosfor': KnowledgeNutrient(
    id: 'kurang_fosfor',
    dugaan: 'Dugaan kekurangan Fosfor (P)',
    ciriVisualSpesifik: 'Bagian bawah/tulang daun tua berubah keunguan atau hijau gelap kusam, pembungaan lambat.',
    gejala: 'Daun tua hijau gelap kusam dengan semburat ungu kemerahan di balik daun.',
    rekomendasiOrganik: 'Kompos guano dosis tipis 50–100 g/tanaman atau pupuk hayati pelarut fosfat + kompos matang.',
    dosisPerFase: {
      'Bibit': 'Kompos matang + sedikit fosfat alam ke media tanam.',
      'Vegetatif': 'SP-36 sekitar 5–8 g/tanaman ditabur melingkar 10 cm dari batang.',
      'Berbunga': 'MKP 2–3 g/liter air, kocor 200 ml/tanaman tiap 10 hari.',
      'Berbuah': 'MKP 3 g/liter kocor 1x per 14 hari bila pembentukan buah melambat.',
      'Panen': 'Cukup kompos matang agar ketersediaan P tanah tetap terjaga.',
    },
    sumber: 'Balitsa Kementan RI & IPNI Reference',
    kataKunci: ['fosfor', 'ungu', 'keunguan', 'mkp', 'sp36'],
  ),
  'kurang_kalium': KnowledgeNutrient(
    id: 'kurang_kalium',
    dugaan: 'Dugaan kekurangan Kalium (K)',
    ciriVisualSpesifik: 'Tepi daun tua menguning lalu mengering kecokelatan seperti terbakar, buah matang belang.',
    gejala: 'Tepi daun tua menguning lalu mengering, pematangan buah kurang merata.',
    rekomendasiOrganik: 'Abu sekam bakar 100–200 g/tanaman atau POC kulit pisang/sabut kelapa 15 ml/liter.',
    dosisPerFase: {
      'Bibit': 'Tambahkan sedikit abu sekam ke media tanam.',
      'Vegetatif': 'NPK 16-16-16 (5–8 g/tanaman) + abu sekam.',
      'Berbunga': 'KNO3 Putih 3–5 g/liter, kocor 200 ml/tanaman tiap 10 hari.',
      'Berbuah': 'KNO3 Putih atau NPK grower 8–10 g/tanaman tiap 10 hari.',
      'Panen': 'POC kalium organik 15 ml/liter tiap 14 hari.',
    },
    sumber: 'Balitsa Kementan RI & FAO Plant Nutrition',
    kataKunci: ['kalium', 'tepi daun', 'terbakar', 'kno3', 'manis'],
  ),
  'kurang_kalsium': KnowledgeNutrient(
    id: 'kurang_kalsium',
    dugaan: 'Dugaan kekurangan Kalsium (Ca)',
    ciriVisualSpesifik: 'Daun muda pucuk melengkung tidak normal atau ujung bawah buah cekung hitam (blossom end rot).',
    gejala: 'Daun muda melengkung atau ujung buah mulai cekung gelap.',
    rekomendasiOrganik: 'Tepung cangkang telur halus / dolomit 20–30 g di sekitar pangkal + jaga siram stabil.',
    dosisPerFase: {
      'Bibit': 'Dolomit 1 sdt per polybag saat tanam.',
      'Vegetatif': 'Dolomit 20 g/tanaman di sekitar perakaran.',
      'Berbunga': 'Kalsium nitrat 2–3 g/liter, kocor 200 ml/tanaman tiap 10–14 hari.',
      'Berbuah': 'Kalsium nitrat 3 g/liter kocor + jaga kelembapan tanah 45–65%.',
      'Panen': 'Jaga irigasi stabil + dolomit ringan setelah panen gelombang pertama.',
    },
    sumber: 'Balitsa Kementan RI',
    kataKunci: ['kalsium', 'dolomit', 'cangkang telur', 'busuk ujung'],
  ),
  'kurang_magnesium': KnowledgeNutrient(
    id: 'kurang_magnesium',
    dugaan: 'Dugaan kekurangan Magnesium (Mg)',
    ciriVisualSpesifik: 'Sela antar tulang daun tua menguning sementara tulang daun tetap hijau jelas membentuk jaring.',
    gejala: 'Sela tulang daun tua menguning sedangkan tulang daun tetap hijau.',
    rekomendasiOrganik: 'Kapur dolomit 20–30 g/tanaman (mengandung Ca & Mg alami) atau kompos matang.',
    dosisPerFase: {
      'Bibit': 'Dolomit 1 sdt campur media tanam.',
      'Vegetatif': 'Dolomit 20 g/tanaman atau garam Epsom (MgSO4) 2 g/liter.',
      'Berbunga': 'MgSO4 2 g/liter kocor 1x per 14 hari.',
      'Berbuah': 'MgSO4 2 g/liter kocor + hindari kelebihan Kalium.',
      'Panen': 'Dolomit ringan 20 g/tanaman untuk regenerasi tajuk.',
    },
    sumber: 'IPNI & Balitsa Kementan RI',
    kataKunci: ['magnesium', 'tulang daun', 'epsom', 'dolomit'],
  ),
};

class CermatState {
  const CermatState({
    required this.onboarded,
    required this.userName,
    required this.themeMode,
    required this.farms,
    required this.activeFarmId,
    required this.plants,
    required this.scans,
    required this.harvestEvents,
    required this.irrigationEvents,
    required this.tasks,
    required this.chatMessages,
    required this.notifications,
    required this.jadwalPengingat,
    required this.peringatanOtomatisSensor,
    required this.activeAlerts,
    required this.chatPlantId,
    required this.telegramChatId,
    required this.telegramCode,
    required this.telegramTime,
    required this.kelembapanTanah,
    required this.nitrogenMgKg,
    required this.fosforMgKg,
    required this.kaliumMgKg,
    required this.suhuUdara,
    required this.kelembapanUdara,
    required this.cahayaLux,
    required this.levelTandon,
    required this.teganganVolt,
    required this.arusMa,
    required this.bateraiPersen,
    required this.sensorTersedia,
    required this.cuacaPreset,
    required this.sensor24h,
    required this.irigasiAuto,
    required this.pompaMenyala,
    required this.ambangTanahBawah,
    required this.ambangTanahAtas,
    required this.durasiMaksPompa,
    required this.ambangKeyakinanRendah,
    required this.ambangKelembapanPenyakit,
    required this.ambangTandonRendah,
    required this.ambangBateraiHemat,
  });

  final bool onboarded;
  final String userName;
  final ThemeMode themeMode;
  final List<FarmModel> farms;
  final String activeFarmId;
  final List<PlantModel> plants;
  final List<ScanModel> scans;
  final List<HarvestEventModel> harvestEvents;
  final List<IrrigationEventModel> irrigationEvents;
  final List<FarmTaskModel> tasks;
  final List<ChatMsgModel> chatMessages;
  final List<NotifModel> notifications;
  final List<ReminderScheduleModel> jadwalPengingat;
  final bool peringatanOtomatisSensor;
  final List<LiveAlertModel> activeAlerts;
  final String? chatPlantId;
  final String? telegramChatId;
  final String telegramCode;
  final String telegramTime;

  // Sensor simulasi ESP32
  final int kelembapanTanah;
  final int nitrogenMgKg;
  final int fosforMgKg;
  final int kaliumMgKg;
  final double suhuUdara;
  final int kelembapanUdara;
  final int cahayaLux;
  final int levelTandon;
  final double teganganVolt;
  final int arusMa;
  final int bateraiPersen;
  final bool sensorTersedia;
  final String cuacaPreset; // 'cerah' | 'kemarau' | 'hujan' | 'malam'
  final List<Sensor24hPoint> sensor24h;

  // Pengaturan & ambang
  final bool irigasiAuto;
  final bool pompaMenyala;
  final int ambangTanahBawah;
  final int ambangTanahAtas;
  final int durasiMaksPompa;
  final int ambangKeyakinanRendah;
  final int ambangKelembapanPenyakit;
  final int ambangTandonRendah;
  final int ambangBateraiHemat;

  FarmModel get activeFarm =>
      farms.firstWhere((f) => f.id == activeFarmId, orElse: () => farms.first);

  List<PlantModel> get activePlants => plants.where((p) => p.farmId == activeFarm.id).toList();

  bool get isTankCritical => levelTandon < ambangTandonRendah;
  bool get isSoilDry => kelembapanTanah < ambangTanahBawah;
  bool get isDiseaseRisk => kelembapanUdara >= ambangKelembapanPenyakit;
  bool get isPowerSave => bateraiPersen <= ambangBateraiHemat;
  double get dayaWatt => double.parse(((teganganVolt * arusMa) / 1000).toStringAsFixed(2));
  int get jarakUltrasonikCm => (100 - levelTandon).clamp(0, 100);

  /// Daftar kondisi sensor real-time yang sedang melewati ambang
  List<LiveAlertModel> get liveSensorAlerts {
    final list = <LiveAlertModel>[];
    if (isTankCritical) {
      list.add(
        LiveAlertModel(
          id: 'live-tank',
          judul: 'Tandon air kritis ($levelTandon%)',
          isi: 'Di bawah ambang $ambangTandonRendah%. Pompa ditahan agar tidak kering — segera isi tandon.',
          severity: AlertSeverity.danger,
          tipe: AlertType.sensor,
          waktu: 'Aktif sekarang',
          actionRoute: '/sensor',
          actionLabel: 'Buka Lahan',
        ),
      );
    }
    if (isSoilDry) {
      list.add(
        LiveAlertModel(
          id: 'live-soil',
          judul: 'Tanah kering ($kelembapanTanah%)',
          isi: 'Kelembapan di bawah ambang $ambangTanahBawah%. ${pompaMenyala ? 'Pompa otomatis sedang menyiram.' : 'Segera aktifkan penyiraman.'}',
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          waktu: 'Aktif sekarang',
          actionRoute: '/sensor',
          actionLabel: 'Cek Irigasi',
        ),
      );
    }
    if (isDiseaseRisk) {
      list.add(
        LiveAlertModel(
          id: 'live-rh',
          judul: 'Risiko jamur tinggi (RH $kelembapanUdara%)',
          isi: 'Kelembapan udara ≥ $ambangKelembapanPenyakit% memicu busuk daun. Cek bagian bawah daun & hindari siram tajuk.',
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          waktu: 'Aktif sekarang',
          actionRoute: '/scan',
          actionLabel: 'Scan Daun',
        ),
      );
    }
    if (isPowerSave) {
      list.add(
        LiveAlertModel(
          id: 'live-bat',
          judul: 'Baterai surya rendah ($bateraiPersen%)',
          isi: 'Mode hemat daya aktif (≤ $ambangBateraiHemat%). Periksa panel surya & beban pompa.',
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          waktu: 'Aktif sekarang',
          actionRoute: '/solar',
          actionLabel: 'Energi Surya',
        ),
      );
    }
    return list;
  }

  int get totalUnreadBadge =>
      notifications.where((n) => !n.dibaca).length + liveSensorAlerts.length;

  CermatState copyWith({
    bool? onboarded,
    String? userName,
    ThemeMode? themeMode,
    List<FarmModel>? farms,
    String? activeFarmId,
    List<PlantModel>? plants,
    List<ScanModel>? scans,
    List<HarvestEventModel>? harvestEvents,
    List<IrrigationEventModel>? irrigationEvents,
    List<FarmTaskModel>? tasks,
    List<ChatMsgModel>? chatMessages,
    List<NotifModel>? notifications,
    List<ReminderScheduleModel>? jadwalPengingat,
    bool? peringatanOtomatisSensor,
    List<LiveAlertModel>? activeAlerts,
    String? chatPlantId,
    String? telegramChatId,
    bool clearTelegram = false,
    String? telegramCode,
    String? telegramTime,
    int? kelembapanTanah,
    int? nitrogenMgKg,
    int? fosforMgKg,
    int? kaliumMgKg,
    double? suhuUdara,
    int? kelembapanUdara,
    int? cahayaLux,
    int? levelTandon,
    double? teganganVolt,
    int? arusMa,
    int? bateraiPersen,
    bool? sensorTersedia,
    String? cuacaPreset,
    List<Sensor24hPoint>? sensor24h,
    bool? irigasiAuto,
    bool? pompaMenyala,
    int? ambangTanahBawah,
    int? ambangTanahAtas,
    int? durasiMaksPompa,
    int? ambangKeyakinanRendah,
    int? ambangKelembapanPenyakit,
    int? ambangTandonRendah,
    int? ambangBateraiHemat,
  }) {
    return CermatState(
      onboarded: onboarded ?? this.onboarded,
      userName: userName ?? this.userName,
      themeMode: themeMode ?? this.themeMode,
      farms: farms ?? this.farms,
      activeFarmId: activeFarmId ?? this.activeFarmId,
      plants: plants ?? this.plants,
      scans: scans ?? this.scans,
      harvestEvents: harvestEvents ?? this.harvestEvents,
      irrigationEvents: irrigationEvents ?? this.irrigationEvents,
      tasks: tasks ?? this.tasks,
      chatMessages: chatMessages ?? this.chatMessages,
      notifications: notifications ?? this.notifications,
      jadwalPengingat: jadwalPengingat ?? this.jadwalPengingat,
      peringatanOtomatisSensor: peringatanOtomatisSensor ?? this.peringatanOtomatisSensor,
      activeAlerts: activeAlerts ?? this.activeAlerts,
      chatPlantId: chatPlantId ?? this.chatPlantId,
      telegramChatId: clearTelegram ? null : (telegramChatId ?? this.telegramChatId),
      telegramCode: telegramCode ?? this.telegramCode,
      telegramTime: telegramTime ?? this.telegramTime,
      kelembapanTanah: kelembapanTanah ?? this.kelembapanTanah,
      nitrogenMgKg: nitrogenMgKg ?? this.nitrogenMgKg,
      fosforMgKg: fosforMgKg ?? this.fosforMgKg,
      kaliumMgKg: kaliumMgKg ?? this.kaliumMgKg,
      suhuUdara: suhuUdara ?? this.suhuUdara,
      kelembapanUdara: kelembapanUdara ?? this.kelembapanUdara,
      cahayaLux: cahayaLux ?? this.cahayaLux,
      levelTandon: levelTandon ?? this.levelTandon,
      teganganVolt: teganganVolt ?? this.teganganVolt,
      arusMa: arusMa ?? this.arusMa,
      bateraiPersen: bateraiPersen ?? this.bateraiPersen,
      sensorTersedia: sensorTersedia ?? this.sensorTersedia,
      cuacaPreset: cuacaPreset ?? this.cuacaPreset,
      sensor24h: sensor24h ?? this.sensor24h,
      irigasiAuto: irigasiAuto ?? this.irigasiAuto,
      pompaMenyala: pompaMenyala ?? this.pompaMenyala,
      ambangTanahBawah: ambangTanahBawah ?? this.ambangTanahBawah,
      ambangTanahAtas: ambangTanahAtas ?? this.ambangTanahAtas,
      durasiMaksPompa: durasiMaksPompa ?? this.durasiMaksPompa,
      ambangKeyakinanRendah: ambangKeyakinanRendah ?? this.ambangKeyakinanRendah,
      ambangKelembapanPenyakit: ambangKelembapanPenyakit ?? this.ambangKelembapanPenyakit,
      ambangTandonRendah: ambangTandonRendah ?? this.ambangTandonRendah,
      ambangBateraiHemat: ambangBateraiHemat ?? this.ambangBateraiHemat,
    );
  }
}

const _defaultSensor24h = <Sensor24hPoint>[
  Sensor24hPoint(jam: '00:00', tanah: 56, suhu: 22.8, udara: 82, cahayaKlux: 0.2),
  Sensor24hPoint(jam: '03:00', tanah: 54, suhu: 21.9, udara: 84, cahayaKlux: 0.1),
  Sensor24hPoint(jam: '06:00', tanah: 51, suhu: 23.4, udara: 80, cahayaKlux: 8.5),
  Sensor24hPoint(jam: '09:00', tanah: 44, suhu: 27.1, udara: 71, cahayaKlux: 31.2),
  Sensor24hPoint(jam: '12:00', tanah: 36, suhu: 30.4, udara: 63, cahayaKlux: 44.8),
  Sensor24hPoint(jam: '15:00', tanah: 58, suhu: 28.2, udara: 69, cahayaKlux: 29.4),
  Sensor24hPoint(jam: '18:00', tanah: 53, suhu: 25.7, udara: 76, cahayaKlux: 4.8),
  Sensor24hPoint(jam: '21:00', tanah: 49, suhu: 24.1, udara: 79, cahayaKlux: 0.3),
];

const _defaultReminders = <ReminderScheduleModel>[
  ReminderScheduleModel(
    id: 'rem-siram-pagi',
    judul: 'Siram Pagi Kebun',
    jam: '07:00',
    kategori: ReminderCategory.siram,
    aktif: true,
    catatan: 'Siram pangkal batang sebelum matahari terik.',
  ),
  ReminderScheduleModel(
    id: 'rem-cek-daun',
    judul: 'Cek Bercak Daun & Hama',
    jam: '08:30',
    kategori: ReminderCategory.cekDaun,
    aktif: true,
    catatan: 'Periksa bagian bawah daun dan pindai bila ada bercak.',
  ),
  ReminderScheduleModel(
    id: 'rem-pupuk',
    judul: 'Pemupukan Organik / Kocor',
    jam: '09:00',
    kategori: ReminderCategory.pupuk,
    aktif: false,
    catatan: 'Kompos/POC ringan sesuai fase tumbuh tanaman.',
  ),
  ReminderScheduleModel(
    id: 'rem-siram-sore',
    judul: 'Siram Sore & Cek Tandon',
    jam: '16:30',
    kategori: ReminderCategory.siram,
    aktif: true,
    catatan: 'Pastikan kelembapan tanah ideal 45–65% dan tandon terisi.',
  ),
  ReminderScheduleModel(
    id: 'rem-panen',
    judul: 'Pengingat Jadwal Panen',
    jam: '07:15',
    kategori: ReminderCategory.panen,
    aktif: true,
    catatan: 'Petik buah tomat matang pada pagi hari agar segar.',
  ),
];

CermatState _seedState({bool onboarded = false}) {
  final now = DateTime.now();
  return CermatState(
    onboarded: onboarded,
    userName: 'Pak Joko',
    themeMode: ThemeMode.light,
    farms: const [
      FarmModel(id: 'farm-1', nama: 'Kebun Blok A — Ciawi', lokasi: 'Ciawi, Bogor', luasLabel: '0,3 ha'),
      FarmModel(id: 'farm-2', nama: 'Polybag Atap — Rumah', lokasi: 'Teras atas', luasLabel: '24 polybag'),
    ],
    activeFarmId: 'farm-1',
    plants: [
      PlantModel(
        id: 'plant-1',
        farmId: 'farm-1',
        nama: 'Tomat Servo #01',
        varietas: 'Servo F1',
        tanggalTanam: now.subtract(const Duration(days: 62)),
        fase: 'Panen',
      ),
      PlantModel(
        id: 'plant-2',
        farmId: 'farm-1',
        nama: 'Tomat Servo #02',
        varietas: 'Servo F1',
        tanggalTanam: now.subtract(const Duration(days: 55)),
        fase: 'Berbuah',
      ),
      PlantModel(
        id: 'plant-3',
        farmId: 'farm-1',
        nama: 'Tomat Gustavi #03',
        varietas: 'Gustavi',
        tanggalTanam: now.subtract(const Duration(days: 44)),
        fase: 'Berbunga',
        bobotRataBuahGram: 95,
      ),
      PlantModel(
        id: 'plant-4',
        farmId: 'farm-1',
        nama: 'Tomat Rampai #04',
        varietas: 'Rampai',
        tanggalTanam: now.subtract(const Duration(days: 26)),
        fase: 'Vegetatif',
        bobotRataBuahGram: 30,
      ),
      PlantModel(
        id: 'plant-5',
        farmId: 'farm-2',
        nama: 'Tomat Ceri Atap #01',
        varietas: 'Tomat Ceri',
        tanggalTanam: now.subtract(const Duration(days: 58)),
        fase: 'Berbuah',
        bobotRataBuahGram: 25,
      ),
    ],
    // NOL data dummy scan & chat — 100% hasil Gemini AI nyata
    scans: const [],
    harvestEvents: [
      HarvestEventModel(
        id: 'harv-1',
        plantId: 'plant-1',
        tanggal: now,
        sumber: 'estimasi',
        catatan: 'Cek kematangan pagi ini sebelum dipetik',
      ),
      HarvestEventModel(
        id: 'harv-2',
        plantId: 'plant-2',
        tanggal: now.add(const Duration(days: 3)),
        sumber: 'estimasi',
        catatan: 'Perkiraan mulai memerah 2–4 hari lagi',
      ),
      HarvestEventModel(
        id: 'harv-3',
        plantId: 'plant-1',
        tanggal: now.subtract(const Duration(days: 6)),
        sumber: 'aktual',
        catatan: 'Panen gelombang pertama selesai',
      ),
    ],
    irrigationEvents: [
      IrrigationEventModel(
        id: 'irr-1',
        waktu: now.subtract(const Duration(hours: 6)),
        durasiMenit: 9,
        kelembapanAwal: 33,
        kelembapanAkhir: 66,
        mode: 'Otomatis',
      ),
      IrrigationEventModel(
        id: 'irr-2',
        waktu: now.subtract(const Duration(days: 1)),
        durasiMenit: 7,
        kelembapanAwal: 34,
        kelembapanAkhir: 65,
        mode: 'Otomatis',
      ),
    ],
    tasks: const [
      FarmTaskModel(id: 't1', farmId: 'farm-1', judul: 'Scan kematangan Tomat Servo #01', waktuLabel: 'Hari ini · Pagi', selesai: false),
      FarmTaskModel(id: 't2', farmId: 'farm-1', judul: 'Cek bagian bawah daun Gustavi #03', waktuLabel: 'Hari ini · Siang', selesai: false),
      FarmTaskModel(id: 't3', farmId: 'farm-1', judul: 'Beri kompos/POC ringan bedengan A', waktuLabel: 'Besok · 07:00', selesai: false),
      FarmTaskModel(id: 't4', farmId: 'farm-1', judul: 'Cek pipa tetes & level tandon', waktuLabel: 'Kemarin', selesai: true),
    ],
    chatMessages: const [],
    notifications: const [],
    jadwalPengingat: _defaultReminders,
    peringatanOtomatisSensor: true,
    activeAlerts: const [],
    chatPlantId: 'plant-1',
    telegramChatId: null,
    telegramCode: '482916',
    telegramTime: '07:00',
    kelembapanTanah: 48,
    nitrogenMgKg: 64,
    fosforMgKg: 52,
    kaliumMgKg: 71,
    suhuUdara: 26.5,
    kelembapanUdara: 76,
    cahayaLux: 28400,
    levelTandon: 62,
    teganganVolt: 12.6,
    arusMa: 88,
    bateraiPersen: 78,
    sensorTersedia: true,
    cuacaPreset: 'cerah',
    sensor24h: _defaultSensor24h,
    irigasiAuto: true,
    pompaMenyala: false,
    ambangTanahBawah: 35,
    ambangTanahAtas: 65,
    durasiMaksPompa: 15,
    ambangKeyakinanRendah: 60,
    ambangKelembapanPenyakit: 85,
    ambangTandonRendah: 20,
    ambangBateraiHemat: 20,
  );
}

class CermatNotifier extends StateNotifier<CermatState> {
  CermatNotifier() : super(_seedState(onboarded: false)) {
    _clockTimer = Timer.periodic(const Duration(seconds: 15), (_) => _checkSchedules());
  }

  Timer? _clockTimer;
  final Set<String> _firedScheduleSlots = {};

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  String _formatNowTime() {
    final now = DateTime.now();
    final hh = now.hour.toString().padLeft(2, '0');
    final mm = now.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  void _checkSchedules() {
    final now = DateTime.now();
    final hhmm = _formatNowTime();
    final dateKey = '${now.year}-${now.month}-${now.day}';
    for (final sched in state.jadwalPengingat) {
      if (!sched.aktif || sched.jam != hhmm) continue;
      final slotKey = '$dateKey|${sched.id}|${sched.jam}';
      if (_firedScheduleSlots.contains(slotKey)) continue;
      _firedScheduleSlots.add(slotKey);

      final route = switch (sched.kategori) {
        ReminderCategory.siram => '/sensor',
        ReminderCategory.cekDaun => '/scan',
        ReminderCategory.pupuk => '/plants',
        ReminderCategory.panen => '/calendar',
      };
      final actionLabel = switch (sched.kategori) {
        ReminderCategory.siram => 'Cek Lahan',
        ReminderCategory.cekDaun => 'Scan Daun',
        ReminderCategory.pupuk => 'Lihat Tanaman',
        ReminderCategory.panen => 'Buka Kalender',
      };

      pushAlert(
        judul: 'Jadwal ${sched.jam} · ${sched.judul}',
        isi: sched.catatan,
        severity: AlertSeverity.info,
        tipe: AlertType.jadwal,
        actionRoute: route,
        actionLabel: actionLabel,
      );
    }
  }

  void pushAlert({
    required String judul,
    required String isi,
    AlertSeverity severity = AlertSeverity.info,
    AlertType tipe = AlertType.sistem,
    String? actionRoute,
    String? actionLabel,
  }) {
    final id = 'al-${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(999)}';
    final waktu = 'Hari ini · ${_formatNowTime()}';
    final live = LiveAlertModel(
      id: id,
      judul: judul,
      isi: isi,
      severity: severity,
      tipe: tipe,
      waktu: waktu,
      actionRoute: actionRoute,
      actionLabel: actionLabel,
    );
    final notif = NotifModel(
      id: id,
      judul: judul,
      isi: isi,
      waktu: waktu,
      dibaca: false,
      severity: severity,
      tipe: tipe,
      actionRoute: actionRoute,
      actionLabel: actionLabel,
    );
    final nextActive = [live, ...state.activeAlerts].take(3).toList();
    state = state.copyWith(
      activeAlerts: nextActive,
      notifications: [notif, ...state.notifications].take(40).toList(),
    );

    // Auto-hilangkan banner toast kanan atas setelah 8 detik (riwayat tetap tersimpan di Notifikasi)
    Future<void>.delayed(const Duration(seconds: 8), () {
      if (mounted) dismissAlert(id);
    });
  }

  void dismissAlert(String id) {
    if (!state.activeAlerts.any((a) => a.id == id)) return;
    state = state.copyWith(
      activeAlerts: state.activeAlerts.where((a) => a.id != id).toList(),
    );
  }

  void triggerTestAlert() {
    pushAlert(
      judul: 'Uji Pengingat Kanan Atas Aktif',
      isi: 'Jadwal siram, panen, dan peringatan sensor kebun akan muncul di sudut kanan atas tepat waktu.',
      severity: AlertSeverity.warn,
      tipe: AlertType.jadwal,
      actionRoute: '/notifications',
      actionLabel: 'Atur Jadwal',
    );
  }

  void updateReminderSchedule(String id, {String? jam, bool? aktif, String? judul, String? catatan}) {
    state = state.copyWith(
      jadwalPengingat: state.jadwalPengingat
          .map(
            (r) => r.id == id
                ? r.copyWith(jam: jam, aktif: aktif, judul: judul, catatan: catatan)
                : r,
          )
          .toList(),
    );
  }

  void addReminderSchedule({
    required String judul,
    required String jam,
    required ReminderCategory kategori,
    String catatan = '',
  }) {
    final cleanTitle = judul.trim();
    if (cleanTitle.isEmpty) return;
    final item = ReminderScheduleModel(
      id: 'rem-${DateTime.now().millisecondsSinceEpoch}',
      judul: cleanTitle,
      jam: jam,
      kategori: kategori,
      aktif: true,
      catatan: catatan.trim().isEmpty ? 'Pengingat kebun terjadwal CermatTani.' : catatan.trim(),
    );
    state = state.copyWith(jadwalPengingat: [...state.jadwalPengingat, item]);
  }

  void deleteReminderSchedule(String id) {
    state = state.copyWith(
      jadwalPengingat: state.jadwalPengingat.where((r) => r.id != id).toList(),
    );
  }

  void setSensorAutoAlerts(bool enabled) =>
      state = state.copyWith(peringatanOtomatisSensor: enabled);

  void completeOnboarding({
    String? userName,
    String? farmName,
    String? farmLocation,
    String? plantName,
    String? varietas,
  }) {
    var farms = [...state.farms];
    var activeFarmId = state.activeFarmId;
    var plants = [...state.plants];

    if (farmName != null && farmName.trim().isNotEmpty) {
      final fid = 'farm-${DateTime.now().millisecondsSinceEpoch}';
      farms = [
        FarmModel(
          id: fid,
          nama: farmName.trim(),
          lokasi: (farmLocation?.trim().isNotEmpty ?? false) ? farmLocation!.trim() : 'Lahan utama',
          luasLabel: 'Kebun tomat',
        ),
        ...farms,
      ];
      activeFarmId = fid;
      if (plantName != null && plantName.trim().isNotEmpty) {
        plants = [
          PlantModel(
            id: 'plant-${DateTime.now().millisecondsSinceEpoch}',
            farmId: fid,
            nama: plantName.trim(),
            varietas: varietas ?? 'Servo F1',
            tanggalTanam: DateTime.now().subtract(const Duration(days: 40)),
            fase: 'Berbuah',
          ),
          ...plants,
        ];
      }
    }

    state = state.copyWith(
      onboarded: true,
      userName: (userName?.trim().isNotEmpty ?? false) ? userName!.trim() : state.userName,
      farms: farms,
      activeFarmId: activeFarmId,
      plants: plants,
    );
  }

  void reopenOnboarding() => state = state.copyWith(onboarded: false);
  void setUserName(String nama) =>
      state = state.copyWith(userName: nama.trim().isEmpty ? state.userName : nama.trim());
  void setThemeMode(ThemeMode mode) => state = state.copyWith(themeMode: mode);
  void selectFarm(String farmId) => state = state.copyWith(activeFarmId: farmId);

  void addFarm(String nama, String lokasi) {
    final fid = 'farm-${DateTime.now().millisecondsSinceEpoch}';
    state = state.copyWith(
      farms: [...state.farms, FarmModel(id: fid, nama: nama.trim(), lokasi: lokasi.trim(), luasLabel: 'Kebun tomat')],
      activeFarmId: fid,
    );
  }

  void addPlant(String nama, String varietas, String fase, DateTime tanggalTanam) {
    final p = PlantModel(
      id: 'plant-${DateTime.now().millisecondsSinceEpoch}',
      farmId: state.activeFarm.id,
      nama: nama.trim(),
      varietas: varietas,
      tanggalTanam: tanggalTanam,
      fase: fase,
      bobotRataBuahGram: varietas.toLowerCase().contains('ceri') ? 25 : 85,
    );
    state = state.copyWith(plants: [p, ...state.plants]);
  }

  void saveScan(ScanModel scan) {
    final harvests = [...state.harvestEvents];
    if (scan.bagian == PlantPart.buah && scan.estimasiHariMin != null && !scan.tanpaBuahTerdeteksi) {
      harvests.insert(
        0,
        HarvestEventModel(
          id: 'harv-${DateTime.now().millisecondsSinceEpoch}',
          plantId: scan.plantId,
          tanggal: DateTime.now().add(Duration(days: scan.estimasiHariMin!)),
          sumber: 'estimasi',
          catatan: scan.anjuranPanen == 'Panen sekarang'
              ? '${scan.jumlahBuah} buah matang siap dipetik'
              : 'Tunggu ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari (${scan.jumlahBuah} buah)',
        ),
      );
    }
    state = state.copyWith(
      scans: [scan, ...state.scans],
      harvestEvents: harvests,
      chatPlantId: scan.plantId,
    );
    final plantName = state.plants.where((p) => p.id == scan.plantId).firstOrNull?.nama ?? 'Tanaman';
    pushAlert(
      judul: 'Hasil scan $plantName tersimpan',
      isi: scan.bagian == PlantPart.buah && !scan.tanpaBuahTerdeteksi
          ? '${scan.anjuranPanen} (${scan.jumlahBuah} buah) · ${scan.penyakitUtamaNama}'
          : '${scan.penyakitUtamaNama} (yakin ${scan.keyakinan}%)',
      severity: scan.penyakitUtamaId == 'sehat' ? AlertSeverity.info : AlertSeverity.warn,
      tipe: AlertType.scan,
      actionRoute: '/plants',
      actionLabel: 'Lihat Riwayat',
    );
  }

  void toggleTask(String id) {
    state = state.copyWith(
      tasks: state.tasks.map((t) => t.id == id ? t.copyWith(selesai: !t.selesai) : t).toList(),
    );
  }

  void addTask(String judul, String waktuLabel) {
    final clean = judul.trim();
    if (clean.isEmpty) return;
    final item = FarmTaskModel(
      id: 't-${DateTime.now().millisecondsSinceEpoch}',
      farmId: state.activeFarm.id,
      judul: clean,
      waktuLabel: waktuLabel.trim().isEmpty ? 'Hari ini' : waktuLabel.trim(),
      selesai: false,
    );
    state = state.copyWith(tasks: [item, ...state.tasks]);
  }

  void markHarvestActual(String id) {
    state = state.copyWith(
      harvestEvents: state.harvestEvents.map((h) => h.id == id ? h.copyWith(sumber: 'aktual') : h).toList(),
    );
  }

  void addHarvestEvent(String plantId, DateTime tanggal, String catatan) {
    state = state.copyWith(
      harvestEvents: [
        HarvestEventModel(
          id: 'harv-${DateTime.now().millisecondsSinceEpoch}',
          plantId: plantId,
          tanggal: tanggal,
          sumber: 'estimasi',
          catatan: catatan.trim().isEmpty ? 'Jadwal panen manual' : catatan.trim(),
        ),
        ...state.harvestEvents,
      ],
    );
  }

  void updateSensor({
    int? kelembapanTanah,
    double? suhuUdara,
    int? kelembapanUdara,
    int? cahayaLux,
    int? levelTandon,
    int? bateraiPersen,
    bool? sensorTersedia,
    String? cuacaPreset,
  }) {
    final prevTankCrit = state.isTankCritical;
    final prevSoilDry = state.isSoilDry;
    final prevRisk = state.isDiseaseRisk;
    final prevBatLow = state.isPowerSave;

    var next = state.copyWith(
      kelembapanTanah: kelembapanTanah,
      suhuUdara: suhuUdara,
      kelembapanUdara: kelembapanUdara,
      cahayaLux: cahayaLux,
      levelTandon: levelTandon,
      bateraiPersen: bateraiPersen,
      teganganVolt: bateraiPersen != null
          ? double.parse((11.1 + (bateraiPersen / 100) * 1.9).toStringAsFixed(1))
          : null,
      sensorTersedia: sensorTersedia,
      cuacaPreset: cuacaPreset,
    );

    // Perbarui titik terakhir grafik 24 jam agar langsung responsif mengikuti slider/simulasi
    if (next.sensor24h.isNotEmpty) {
      final updated24h = [...next.sensor24h];
      updated24h[updated24h.length - 1] = Sensor24hPoint(
        jam: 'Kini',
        tanah: next.kelembapanTanah,
        suhu: next.suhuUdara,
        udara: next.kelembapanUdara,
        cahayaKlux: double.parse((next.cahayaLux / 1000).toStringAsFixed(1)),
      );
      next = next.copyWith(sensor24h: updated24h);
    }

    // Evaluasi interlock pompa & tandon kritis
    if (next.isTankCritical && next.pompaMenyala) {
      next = next.copyWith(pompaMenyala: false);
    } else if (next.irigasiAuto && !next.isTankCritical) {
      if (next.kelembapanTanah < next.ambangTanahBawah && !next.pompaMenyala) {
        next = next.copyWith(
          pompaMenyala: true,
          irrigationEvents: [
            IrrigationEventModel(
              id: 'irr-${DateTime.now().millisecondsSinceEpoch}',
              waktu: DateTime.now(),
              durasiMenit: min(8, next.durasiMaksPompa),
              kelembapanAwal: next.kelembapanTanah,
              kelembapanAkhir: next.ambangTanahAtas,
              mode: 'Otomatis',
            ),
            ...next.irrigationEvents,
          ],
        );
      } else if (next.kelembapanTanah >= next.ambangTanahAtas && next.pompaMenyala) {
        next = next.copyWith(pompaMenyala: false);
      }
    }
    state = next;

    // Pemicu live alert kanan atas saat sensor baru melewati ambang
    if (state.peringatanOtomatisSensor) {
      if (state.isTankCritical && !prevTankCrit) {
        pushAlert(
          judul: 'Tandon air kritis (${state.levelTandon}%)',
          isi: 'Pompa otomatis ditahan agar tidak kering. Segera isi ulang tandon.',
          severity: AlertSeverity.danger,
          tipe: AlertType.sensor,
          actionRoute: '/sensor',
          actionLabel: 'Buka Lahan',
        );
      }
      if (state.isSoilDry && !prevSoilDry) {
        pushAlert(
          judul: 'Tanah mulai kering (${state.kelembapanTanah}%)',
          isi: state.pompaMenyala
              ? 'Pompa irigasi otomatis sudah dinyalakan.'
              : 'Aktifkan pompa atau cek tandon di menu Lahan.',
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          actionRoute: '/sensor',
          actionLabel: 'Cek Irigasi',
        );
      }
      if (state.isDiseaseRisk && !prevRisk) {
        pushAlert(
          judul: 'Risiko jamur meningkat (RH ${state.kelembapanUdara}%)',
          isi: 'Udara terlalu lembap. Hindari menyiram daun dan cek bagian bawah daun.',
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          actionRoute: '/scan',
          actionLabel: 'Scan Daun',
        );
      }
      if (state.isPowerSave && !prevBatLow) {
        pushAlert(
          judul: 'Baterai surya masuk Mode Hemat (${state.bateraiPersen}%)',
          isi: 'Interval pengiriman ESP32 diperlambat untuk menjaga daya.',
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          actionRoute: '/solar',
          actionLabel: 'Energi Surya',
        );
      }
    }
  }

  /// Preset skenario cuaca interaktif untuk Simulator 3D Lahan
  void applyWeatherScenario(String preset) {
    switch (preset) {
      case 'kemarau':
        updateSensor(
          cuacaPreset: 'kemarau',
          kelembapanTanah: 28,
          suhuUdara: 33.4,
          kelembapanUdara: 54,
          cahayaLux: 48200,
          levelTandon: 42,
          bateraiPersen: 94,
        );
      case 'hujan':
        updateSensor(
          cuacaPreset: 'hujan',
          kelembapanTanah: 74,
          suhuUdara: 22.8,
          kelembapanUdara: 89,
          cahayaLux: 7600,
          levelTandon: 88,
          bateraiPersen: 54,
        );
      case 'malam':
        updateSensor(
          cuacaPreset: 'malam',
          kelembapanTanah: 52,
          suhuUdara: 21.4,
          kelembapanUdara: 81,
          cahayaLux: 350,
          levelTandon: 64,
          bateraiPersen: 46,
        );
      default:
        updateSensor(
          cuacaPreset: 'cerah',
          kelembapanTanah: 50,
          suhuUdara: 26.8,
          kelembapanUdara: 72,
          cahayaLux: 29500,
          levelTandon: 68,
          bateraiPersen: 82,
        );
    }
  }

  void setIrigasiAuto(bool auto) => state = state.copyWith(irigasiAuto: auto);

  void updateThresholds({
    int? tanahBawah,
    int? tanahAtas,
    int? durasiMaks,
    int? keyakinanRendah,
    int? kelembapanPenyakit,
    int? tandonRendah,
  }) {
    state = state.copyWith(
      ambangTanahBawah: tanahBawah,
      ambangTanahAtas: tanahAtas,
      durasiMaksPompa: durasiMaks,
      ambangKeyakinanRendah: keyakinanRendah,
      ambangKelembapanPenyakit: kelembapanPenyakit,
      ambangTandonRendah: tandonRendah,
    );
  }

  String toggleManualPump() {
    final turnOn = !state.pompaMenyala;
    if (turnOn && state.isTankCritical) {
      return 'Tandon tinggal ${state.levelTandon}%. Pompa kutahan dulu supaya tidak kering.';
    }
    final events = [...state.irrigationEvents];
    if (turnOn) {
      events.insert(
        0,
        IrrigationEventModel(
          id: 'irr-${DateTime.now().millisecondsSinceEpoch}',
          waktu: DateTime.now(),
          durasiMenit: min(5, state.durasiMaksPompa),
          kelembapanAwal: state.kelembapanTanah,
          kelembapanAkhir: min(state.ambangTanahAtas, state.kelembapanTanah + 12),
          mode: 'Manual',
        ),
      );
    }
    state = state.copyWith(pompaMenyala: turnOn, irrigationEvents: events);
    return turnOn
        ? 'Pompa dinyalakan manual (batas aman maks ${state.durasiMaksPompa} menit).'
        : 'Pompa dimatikan.';
  }

  void linkTelegram(String handle) {
    state = state.copyWith(
      telegramChatId: handle.trim().isEmpty ? '@pakjoko_tani' : handle.trim(),
    );
    pushAlert(
      judul: 'Bot Telegram tertaut',
      isi: 'Pengingat panen aktif pukul ${state.telegramTime} WIB.',
      severity: AlertSeverity.info,
      tipe: AlertType.jadwal,
      actionRoute: '/calendar',
      actionLabel: 'Kalender',
    );
  }

  void unlinkTelegram() => state = state.copyWith(clearTelegram: true);

  void setTelegramTime(String jam) => state = state.copyWith(telegramTime: jam);

  void regenerateTelegramCode() {
    final code = (100000 + Random().nextInt(900000)).toString();
    state = state.copyWith(telegramCode: code);
  }

  void sendTestTelegram() {
    pushAlert(
      judul: 'Pesan Telegram terkirim (Uji)',
      isi: 'Halo ${state.userName}! Pengingat panen CermatTani (${state.telegramTime} WIB) aktif.',
      severity: AlertSeverity.info,
      tipe: AlertType.jadwal,
      actionRoute: '/calendar',
      actionLabel: 'Kalender',
    );
  }

  void setChatPlant(String plantId) => state = state.copyWith(chatPlantId: plantId);

  void appendChatMessage(ChatMsgModel msg) {
    state = state.copyWith(chatMessages: [...state.chatMessages, msg]);
  }

  void clearChatMessages() => state = state.copyWith(chatMessages: const []);

  void markAllNotifsRead() {
    state = state.copyWith(
      notifications: state.notifications.map((n) => n.copyWith(dibaca: true)).toList(),
    );
  }

  void clearNotifications() => state = state.copyWith(notifications: const []);

  void resetDemo() => state = _seedState(onboarded: true);

  void deleteAllData() {
    state = _seedState(onboarded: false).copyWith(
      farms: const [FarmModel(id: 'farm-empty', nama: 'Kebun Baru', lokasi: 'Belum diisi', luasLabel: 'Kebun tomat')],
      activeFarmId: 'farm-empty',
      plants: const [],
      scans: const [],
      harvestEvents: const [],
      tasks: const [],
      chatMessages: const [],
      notifications: const [],
      activeAlerts: const [],
    );
  }
}

final cermatProvider = StateNotifierProvider<CermatNotifier, CermatState>((ref) => CermatNotifier());
