import 'dart:async';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'plant_varieties.dart';
import 'services/supabase_sync_service.dart';
import 'services/telegram_service.dart';

extension CermatIterableExt<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

enum PlantPart { buah, daun, batang }

enum ScanOutputFocus { kematangan, penyakit, hara, tidakTerdeteksi }

enum RipenessStage { mentah, setengahMatang, matang }

class KnowledgeRipeness {
  const KnowledgeRipeness({
    required this.label,
    required this.anjuran,
    required this.minDays,
    required this.maxDays,
    required this.ciriVisual,
    required this.ringkasan,
    required this.penangananPascaPanen,
    required this.sumber,
  });

  final String label;
  final String anjuran;
  final int minDays;
  final int maxDays;
  final String ciriVisual;
  final String ringkasan;
  final String penangananPascaPanen;
  final String sumber;
}

const knowledgeRipeness = <RipenessStage, KnowledgeRipeness>{
  RipenessStage.mentah: KnowledgeRipeness(
    label: 'Mentah',
    anjuran: 'Tunggu',
    minDays: 7,
    maxDays: 10,
    ciriVisual: 'Kulit hijau penuh atau hijau muda merata (USDA Stage 1–2), belum ada semburat kuning/jingga/merah, daging keras.',
    ringkasan: 'Kulit masih hijau penuh. Tunggu 7–10 hari sambil jaga penyiraman teratur.',
    penangananPascaPanen: 'Belum disarankan dipetik kecuali untuk pengiriman jarak sangat jauh.',
    sumber: 'Balitsa Kementan RI — Indeks Kematangan Tomat (USDA Stage 1–2)',
  ),
  RipenessStage.setengahMatang: KnowledgeRipeness(
    label: 'Setengah matang',
    anjuran: 'Tunggu',
    minDays: 2,
    maxDays: 4,
    ciriVisual: 'Muncul warna kuning, jingga, atau merah muda 10%–60% dari ujung buah (USDA Stage 3–4).',
    ringkasan: 'Warna mulai jingga/merah muda (breaker–pink). Siap panen 2–4 hari lagi.',
    penangananPascaPanen: 'Dapat dipetik bila akan dikirim ke pasar jarak jauh (tahan simpan 4–6 hari suhu ruang).',
    sumber: 'Balitsa Kementan RI — Indeks Kematangan Tomat (USDA Stage 3–4)',
  ),
  RipenessStage.matang: KnowledgeRipeness(
    label: 'Matang',
    anjuran: 'Panen sekarang',
    minDays: 0,
    maxDays: 1,
    ciriVisual: 'Warna merah cerah atau merah tua merata > 85%–90% permukaan buah (USDA Stage 5–6), kulit mengilap.',
    ringkasan: 'Warna merah merata (> 90%). Cocok dipetik pagi atau sore agar buah tetap segar.',
    penangananPascaPanen: 'Petik beserta sedikit tangkai pada pagi (06.00–09.00) atau sore hari, simpan di wadah teduh tidak bertumpuk tinggi.',
    sumber: 'Balitsa Kementan RI — Indeks Kematangan Tomat (USDA Stage 5–6)',
  ),
};

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
    this.fokusOutput = ScanOutputFocus.kematangan,
    this.penyakitRinganId,
    this.adaGejalaHara = false,
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
  final ScanOutputFocus fokusOutput;
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
  final String? penyakitRinganId;
  final bool adaGejalaHara;
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
    this.namaIlmiahPatogen = '',
    this.wikiQuery = '',
    this.kataKunci = const [],
  });

  final String id;
  final String penyakit;
  final String namaIlmiahPatogen;
  final String wikiQuery;
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

/// Dataset Penyakit & Hama Terkurasi CermatTani v3.0 (24 kelas resmi, sinkron Web & YOLOv8)
const knowledgeDiseases = <String, KnowledgeDisease>{
  'sehat': KnowledgeDisease(
    id: 'sehat',
    penyakit: 'Sehat',
    namaIlmiahPatogen: 'Solanum lycopersicum',
    wikiQuery: 'Solanum lycopersicum',
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
    namaIlmiahPatogen: 'Alternaria solani',
    wikiQuery: 'Alternaria solani',
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
    namaIlmiahPatogen: 'Phytophthora infestans',
    wikiQuery: 'Phytophthora infestans',
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
    namaIlmiahPatogen: 'Xanthomonas perforans',
    wikiQuery: 'Xanthomonas',
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
    namaIlmiahPatogen: 'Fusarium oxysporum',
    wikiQuery: 'Fusarium oxysporum',
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
    namaIlmiahPatogen: 'Tomato yellow leaf curl virus',
    wikiQuery: 'Tomato yellow leaf curl virus',
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
    namaIlmiahPatogen: 'Septoria lycopersici',
    wikiQuery: 'Septoria lycopersici',
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
    namaIlmiahPatogen: 'Blossom end rot',
    wikiQuery: 'Blossom end rot',
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
    namaIlmiahPatogen: 'Colletotrichum coccodes',
    wikiQuery: 'Colletotrichum',
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
  'busuk_basah_buah': KnowledgeDisease(
    id: 'busuk_basah_buah',
    penyakit: 'Busuk basah buah (Bacterial soft rot)',
    namaIlmiahPatogen: 'Pectobacterium carotovorum',
    wikiQuery: 'Pectobacterium carotovorum',
    ciriVisualSpesifik:
        'Buah tampak lembek berair seperti kantong air, kulit keriput/mengelupas mudah pecah, warna kusam kecokelatan, jaringan dalam mencair.',
    penyebab: 'Bakteri Pectobacterium carotovorum (Erwinia) masuk lewat luka kulit atau tusukan serangga saat hangat dan lembap.',
    gejala: 'Bagian buah melunak berair, kulit mudah pecah mengelupas, daging buah mencair dan berbau asam.',
    solusiOrganik: [
      'Segera petik dan kubur buah busuk jauh dari bedengan agar tidak menular (jangan dijadikan kompos).',
      'Cuci tangan serta gunting kebun dengan alkohol/sabun sebelum menyentuh buah sehat.',
      'Hentikan siram mengenai buah dan pasang perangkap likat kuning/feromon untuk mengendalikan serangga pembuat luka.',
    ],
    solusiKimia: [
      'Buah yang sudah busuk basah tidak dapat disembuhkan. Lindungi buah sehat sekitar dengan bakterisida tembaga sesuai penyuluh bila meluas. Wajib baca label produk.',
    ],
    pencegahan: ['Pasang ajir & mulsa agar buah tidak menyentuh tanah basah, panen hati-hati jangan tergores.'],
    sumber: 'Balitsa Kementan RI & FAO Post-Harvest Tomato Guide',
    kataKunci: ['busuk basah', 'soft rot', 'lembek', 'berair', 'bau', 'busuk buah', 'busuk'],
  ),
  'busuk_jamur_buah': KnowledgeDisease(
    id: 'busuk_jamur_buah',
    penyakit: 'Busuk jamur buah (Phytophthora / Buckeye rot)',
    namaIlmiahPatogen: 'Phytophthora nicotianae',
    wikiQuery: 'Buckeye rot of tomato',
    ciriVisualSpesifik:
        'Bercak lebar cokelat keabu-abuan agak keras hingga melunak di kulit buah berpola cincin gelap konsentris, kadang ada kapang putih tipis.',
    penyebab: 'Oomycete Phytophthora parasitica / P. infestans yang terpercik dari tanah lembap ke buah bagian bawah.',
    gejala: 'Bercak cokelat keabu-abuan melebar di permukaan buah, kulit mengeras lalu membusuk ke dalam.',
    solusiOrganik: [
      'Petik dan musnahkan seluruh buah berbercak jauh dari lahan agar spora tidak menyebar.',
      'Pasang mulsa jerami/plastik untuk menahan percikan tanah ke buah bagian bawah.',
      'Pangkas daun bawah rimbun dan aplikasikan Trichoderma atau fungisida tembaga organik.',
    ],
    solusiKimia: [
      'Opsi terakhir di musim hujan: fungisida protektan oomycete untuk melindungi buah sehat sekitar sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Ikat batang pada ajir sehingga dompolan buah menggantung minimal 25 cm dari tanah dan drainase lancar.'],
    sumber: 'Balitsa Kementan RI & UF IFAS Tomato Fruit Rot Reference',
    kataKunci: ['buckeye', 'busuk jamur', 'jamur buah', 'busuk cokelat', 'busuk buah', 'busuk'],
  ),
  'busuk_kapang_abu': KnowledgeDisease(
    id: 'busuk_kapang_abu',
    penyakit: 'Busuk kapang abu-abu (Botrytis / Grey mold)',
    namaIlmiahPatogen: 'Botrytis cinerea',
    wikiQuery: 'Botrytis cinerea',
    ciriVisualSpesifik:
        'Bercak cokelat muda lunak berair pada buah atau pangkal tangkai yang diselimuti lapisan spora abu-abu berbulu halus seperti beludru.',
    penyebab: 'Jamur Botrytis cinerea berkembang cepat pada kelembapan udara > 80% dan sirkulasi udara pengap.',
    gejala: 'Kulit buah atau pangkal tangkai membusuk lunak dan ditumbuhi lapisan jamur abu-abu berbulu halus.',
    solusiOrganik: [
      'Petik buah berkapang perlahan langsung masukkan ke kantong tertutup agar spora abu-abu tidak beterbangan.',
      'Pangkas daun rimbun di sekitar dompolan buah dan hindari penyiraman sore hari.',
      'Bersihkan sisa bunga layu pada buah lalu semprot agen hayati Bacillus subtilis / Trichoderma pagi hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan tinggi di musim hujan: fungisida khusus Botrytis sesuai penyuluh. Wajib baca label produk dan gunakan APD.',
    ],
    pencegahan: ['Jaga jarak tanam & ventilasi kebun, hindari Nitrogen berlebih yang membuat tajuk terlalu lembap.'],
    sumber: 'Balitsa Kementan RI & FAO Tomato IPM',
    kataKunci: ['kapang abu', 'botrytis', 'grey mold', 'berbulu', 'busuk buah', 'busuk'],
  ),
  'kapang_daun': KnowledgeDisease(
    id: 'kapang_daun',
    penyakit: 'Kapang daun (Leaf mold)',
    namaIlmiahPatogen: 'Passalora fulva',
    wikiQuery: 'Passalora fulva',
    ciriVisualSpesifik:
        'Bercak kuning kehijauan pucat di atas daun tua dengan lapisan beludru cokelat zaitun/abu-abu di permukaan bawah daun.',
    penyebab: 'Jamur Passalora fulva yang berkembang cepat pada kelembapan udara > 85% di tajuk rimbun.',
    gejala: 'Sisi atas daun berbintik kuning pucat, sisi bawah berbulu beludru cokelat zaitun.',
    solusiOrganik: [
      'Petik daun terinfeksi hati-hati ke kantong tertutup agar spora tidak beterbangan.',
      'Pangkas tunas air dan daun bawah untuk melancarkan aliran udara.',
      'Semprot fungisida nabati atau larutan baking soda ringan ke sisi bawah daun.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan meluas: fungisida kontak sesuai anjuran penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Hindari siram sore/malam hari dan jaga jarak tanam lega.'],
    sumber: 'PlantVillage & UF/IFAS Leaf Mold Guide',
    kataKunci: ['kapang daun', 'leaf mold', 'beludru', 'zaitun', 'passalora'],
  ),
  'bercak_target': KnowledgeDisease(
    id: 'bercak_target',
    penyakit: 'Bercak target (Target spot)',
    namaIlmiahPatogen: 'Corynespora cassiicola',
    wikiQuery: 'Corynespora cassiicola',
    ciriVisualSpesifik:
        'Bercak cokelat gelap bulat melebar dengan pola cincin target pada daun tengah-bawah, sering berlubang di tengahnya.',
    penyebab: 'Jamur Corynespora cassiicola yang berkembang pada suhu hangat dan daun basah lama.',
    gejala: 'Bercak cokelat kehitaman berpola target yang menyatu hingga daun gugur, kadang bercak cekung di buah hijau.',
    solusiOrganik: [
      'Buang daun bawah yang bergejala berat untuk memutus sumber spora.',
      'Pangkas cabang rimbun dan semprot Bacillus subtilis / fungisida nabati sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan berat: fungisida protektan sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Bersihkan sisa tanaman panen sebelumnya dan pasang mulsa + irigasi tetes.'],
    sumber: 'PlantVillage & UF/IFAS Target Spot Guide',
    kataKunci: ['target spot', 'bercak target', 'corynespora'],
  ),
  'bintik_bakteri': KnowledgeDisease(
    id: 'bintik_bakteri',
    penyakit: 'Bintik bakteri (Bacterial speck)',
    namaIlmiahPatogen: 'Pseudomonas syringae pv. tomato',
    wikiQuery: 'Pseudomonas syringae',
    ciriVisualSpesifik:
        'Bintik hitam sangat kecil (< 2 mm) seperti tusukan jarum bertepi kuning jelas pada daun, dan bintik hitam dangkal pada buah hijau.',
    penyebab: 'Bakteri Pseudomonas syringae pv. tomato pada cuaca sejuk berembun.',
    gejala: 'Bintik hitam kecil bertepi kuning di daun dan bintik hitam halus < 2 mm pada kulit buah.',
    solusiOrganik: [
      'Pangkas daun terinfeksi saat cuaca kering dan pasang mulsa.',
      'Siram hanya di pangkal batang dan aplikasikan ekstrak bawang putih/sirih.',
    ],
    solusiKimia: [
      'Opsi terakhir di musim hujan: bakterisida berbasis tembaga sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Gunakan benih bersih patogen dan rotasi lahan minimal 2 musim.'],
    sumber: 'UF/IFAS & UC IPM Bacterial Speck Guide',
    kataKunci: ['bintik bakteri', 'bacterial speck', 'pseudomonas'],
  ),
  'kanker_bakteri': KnowledgeDisease(
    id: 'kanker_bakteri',
    penyakit: 'Kanker bakteri (Bacterial canker)',
    namaIlmiahPatogen: 'Clavibacter michiganensis',
    wikiQuery: 'Clavibacter michiganensis',
    ciriVisualSpesifik:
        'Tepi daun hangus sepihak (firing), luka memanjang cokelat di batang, dan bintik putih berpusat cokelat seperti mata burung pada kulit buah.',
    penyebab: 'Bakteri Clavibacter michiganensis menular lewat benih, luka pangkas, dan gunting kebun.',
    gejala: 'Tepi daun mengering satu sisi, batang bercelah cokelat, buah berbintik mata burung.',
    solusiOrganik: [
      'Segera cabut dan musnahkan tanaman bergejala berat ke luar lahan (jangan dikompos).',
      'Sterilkan gunting pangkas, ajir, dan tangan dengan alkohol 70% setiap pindah tanaman.',
    ],
    solusiKimia: [
      'Infeksi sistemik tidak bisa disembuhkan obat; tembaga hanya menekan penularan permukaan sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Gunakan benih bersertifikat dan rotasi lahan bebas Solanaceae 2–3 tahun.'],
    sumber: 'UF/IFAS & EPPO Global Database',
    kataKunci: ['kanker bakteri', 'bacterial canker', 'clavibacter', 'mata burung'],
  ),
  'embun_tepung': KnowledgeDisease(
    id: 'embun_tepung',
    penyakit: 'Embun tepung (Powdery mildew)',
    namaIlmiahPatogen: 'Oidium neolycopersici',
    wikiQuery: 'Powdery mildew',
    ciriVisualSpesifik:
        'Lapisan serbuk putih keabu-abuan seperti tepung di permukaan atas/bawah daun.',
    penyebab: 'Jamur Erysiphales yang menyebar lewat angin pada tajuk teduh.',
    gejala: 'Daun tertutup serbuk putih seperti tepung lalu menguning dan mengering.',
    solusiOrganik: [
      'Pangkas daun tertutup serbuk berat dan tingkatkan paparan matahari.',
      'Semprot baking soda 1 sdt/liter + sabun cair nabati atau minyak nimba sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan berat: fungisida sulfur sesuai dosis. Wajib baca label produk.',
    ],
    pencegahan: ['Hindari Nitrogen berlebih dan jaga kebersihan daun gugur.'],
    sumber: 'Balitsa Kementan RI & FAO IPM',
    kataKunci: ['embun tepung', 'powdery mildew', 'tepung', 'bedak'],
  ),
  'embun_bulu': KnowledgeDisease(
    id: 'embun_bulu',
    penyakit: 'Embun bulu (Downy mildew)',
    namaIlmiahPatogen: 'Pseudoperonospora cubensis',
    wikiQuery: 'Downy mildew',
    ciriVisualSpesifik:
        'Bercak kuning bersudut tajam dibatasi tulang daun di atas daun, dan bulu halus abu-abu keunguan di balik daun.',
    penyebab: 'Oomycete Peronosporaceae saat malam sejuk berembun tebal.',
    gejala: 'Bercak kuning menyudut mengikuti urat daun dan lapisan bulu halus di sisi bawah daun.',
    solusiOrganik: [
      'Petik daun tua terinfeksi pagi hari setelah embun kering dan siram hanya di pangkal tanah.',
      'Semprot agen hayati Bacillus subtilis atau tembaga organik.',
    ],
    solusiKimia: [
      'Opsi terakhir saat musim hujan: fungisida oomycete sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Pasang mulsa, rambatan tinggi, dan atur jarak tanam lega.'],
    sumber: 'FAO IPM & UF/IFAS Vegetable Guide',
    kataKunci: ['embun bulu', 'downy mildew', 'bersudut'],
  ),
  'busuk_pangkal_sklerotium': KnowledgeDisease(
    id: 'busuk_pangkal_sklerotium',
    penyakit: 'Busuk pangkal batang (Southern blight)',
    namaIlmiahPatogen: 'Athelia rolfsii',
    wikiQuery: 'Athelia rolfsii',
    ciriVisualSpesifik:
        'Pangkal batang permukaan tanah membusuk cokelat tertutup benang jamur putih seperti kipas dan butiran cokelat mirip biji sawi.',
    penyebab: 'Jamur tular tanah Athelia rolfsii di tanah hangat lembap.',
    gejala: 'Tanaman layu mendadak dengan benang putih & butiran biji sawi cokelat di pangkal batang.',
    solusiOrganik: [
      'Cabut tanaman beserta 5 cm tanah permukaan sekeliling pangkal agar sklerotia tidak jatuh.',
      'Kocor Trichoderma harzianum, kompos matang, dan dolomit.',
    ],
    solusiKimia: [
      'Konsultasikan perlakuan tanah ke penyuluh bila meluas; wajib baca label produk.',
    ],
    pencegahan: ['Solarisasi tanah sebelum tanam dan jangan menumpuk mulsa basah menempel batang.'],
    sumber: 'UF/IFAS Southern Blight & Balitsa Kementan RI',
    kataKunci: ['busuk pangkal', 'southern blight', 'sklerotium', 'benang putih', 'rebah semai'],
  ),
  'virus_mosaik': KnowledgeDisease(
    id: 'virus_mosaik',
    penyakit: 'Virus mosaik (Tomato mosaic virus / ToMV)',
    namaIlmiahPatogen: 'Tomato mosaic virus',
    wikiQuery: 'Tomato mosaic virus',
    ciriVisualSpesifik:
        'Pola belang hijau muda-kuning-hijau tua (mosaik) pada helai daun, daun menyempit melintir, pematangan buah belang.',
    penyebab: 'Tomato Mosaic Virus (ToMV / TMV) menular lewat kontak tangan, rokok, benih, dan alat pangkas.',
    gejala: 'Daun belang mosaik hijau-kuning, bentuk daun cacat menyempit.',
    solusiOrganik: [
      'Cabut tanaman muda bergejala berat dan cuci tangan dengan sabun/susu skim sebelum menyentuh tanaman sehat.',
      'Sterilkan gunting pangkas dan hindari merokok saat merawat tanaman.',
    ],
    solusiKimia: ['Tidak ada obat penyembuh virus tanaman; fokus pada sanitasi alat & benih sehat.'],
    pencegahan: ['Gunakan varietas tahan ToMV dan sanitasi alat antar petak.'],
    sumber: 'PlantVillage & UF/IFAS ToMV Guide',
    kataKunci: ['mosaik', 'mosaic', 'tomv', 'tmv', 'belang'],
  ),
  'virus_bercak_layu': KnowledgeDisease(
    id: 'virus_bercak_layu',
    penyakit: 'Virus bercak layu / perunggu (TSWV)',
    namaIlmiahPatogen: 'Tomato spotted wilt orthotospovirus',
    wikiQuery: 'Tomato spotted wilt virus',
    ciriVisualSpesifik:
        'Daun muda berwarna perunggu kecokelatan berbintik gelap menggulung ke bawah, buah matang berpola cincin kuning-merah.',
    penyebab: 'Tomato Spotted Wilt Virus (TSWV) ditularkan oleh trips (Thrips spp.).',
    gejala: 'Pucuk perunggu berbintik gelap dan kulit buah berpola cincin kuning mencolok.',
    solusiOrganik: [
      'Cabut segera tanaman terinfeksi berat dan pasang perangkap likat biru/kuning untuk trips.',
      'Semprot minyak nimba sore hari dan bersihkan gulma berbunga pinggir lahan.',
    ],
    solusiKimia: [
      'Virus tidak dapat diobati; insektisida selektif hanya menyasar trips sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Gunakan mulsa perak reflektif untuk mengusir trips dan pilih varietas tahan TSWV.'],
    sumber: 'UF/IFAS & EPPO TSWV Reference',
    kataKunci: ['tswv', 'perunggu', 'bronzing', 'trips', 'spotted wilt'],
  ),
  'tungau_laba': KnowledgeDisease(
    id: 'tungau_laba',
    penyakit: 'Tungau laba-laba (Two-spotted spider mite)',
    namaIlmiahPatogen: 'Tetranychus urticae',
    wikiQuery: 'Tetranychus urticae',
    ciriVisualSpesifik:
        'Daun penuh bintik kuning pucat halus seperti debu (stippling), berubah perunggu kusam, dan ada jaring tipis halus di balik daun.',
    penyebab: 'Hama tungau Tetranychus urticae yang meledak saat cuaca panas dan kering.',
    gejala: 'Daun berbintik pucat halus, kusam berdebu, dengan jaring tipis di sisi bawah daun.',
    solusiOrganik: [
      'Semprotkan air bersih ke sisi bawah daun pagi hari untuk merontokkan tungau & jaringnya.',
      'Semprot minyak nimba atau sabun insektisida nabati ke bawah daun tiap 4–5 hari sore hari.',
    ],
    solusiKimia: [
      'Opsi terakhir saat serangan berat: akarisida selektif (bukan insektisida biasa) sesuai penyuluh. Wajib baca label produk.',
    ],
    pencegahan: ['Pantau balik daun rutin saat kemarau dan jaga kelembapan kebun tidak terlalu kering.'],
    sumber: 'PlantVillage & UC IPM Spider Mites Guide',
    kataKunci: ['tungau', 'spider mite', 'tetranychus', 'jaring'],
  ),
  'buah_pecah_sengatan': KnowledgeDisease(
    id: 'buah_pecah_sengatan',
    penyakit: 'Buah pecah / Sengatan matahari (Cracking & Sunscald)',
    namaIlmiahPatogen: 'Sunscald',
    wikiQuery: 'Sunscald',
    ciriVisualSpesifik:
        'Kulit buah retak/pecah memanjang atau melingkar di pangkal tangkai, atau bercak putih kekuningan tipis berkerut terbakar matahari di bahu buah.',
    penyebab: 'Gangguan fisiologis akibat lonjakan air mendadak setelah tanah kering atau paparan terik matahari langsung tanpa naungan daun.',
    gejala: 'Retakan kulit buah rawan membusuk atau bercak melepuh putih pucat di bahu buah.',
    solusiOrganik: [
      'Segera petik buah yang pecah lebar sebelum dihinggapi bakteri busuk basah.',
      'Atur penyiraman rutin merata (tanah 45–65%) + pasang mulsa organik.',
      'Sisakan cukup daun pelindung di atas dompolan buah atau pasang paranet 30%.',
    ],
    solusiKimia: ['Gangguan fisiologis (bukan penyakit menular), tidak perlu fungisida atau insektisida.'],
    pencegahan: ['Hindari memangkas daun atas berlebihan dan jaga jadwal irigasi stabil.'],
    sumber: 'UF/IFAS Physiological Disorders & Balitsa Kementan RI',
    kataKunci: ['buah pecah', 'retak', 'cracking', 'sunscald', 'terbakar matahari'],
  ),
  'serangan_hama_daun': KnowledgeDisease(
    id: 'serangan_hama_daun',
    penyakit: 'Serangan hama daun (Penggorok / Ulat / Kutu)',
    namaIlmiahPatogen: 'Liriomyza',
    wikiQuery: 'Liriomyza',
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

/// Dataset Hara & Rekomendasi Pupuk CermatTani v3.0 (10 kelas makro & mikro resmi, sinkron Web)
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
  'kurang_besi': KnowledgeNutrient(
    id: 'kurang_besi',
    dugaan: 'Dugaan kekurangan Besi (Fe)',
    ciriVisualSpesifik: 'Daun muda pucuk atas menguning cerah di antara tulang daun sementara urat halus tetap hijau kontras.',
    gejala: 'Daun muda pucuk menguning pucat dengan tulang daun tetap hijau tegas.',
    rekomendasiOrganik: 'Kompos matang kaya humus + asam humat untuk menyeimbangkan pH tanah basa (> 7,2).',
    dosisPerFase: {
      'Bibit': 'Pastikan media berdrainase baik (pH 6,0–6,5).',
      'Vegetatif': 'Kompos matang + semprot daun kelat besi (Fe-EDTA) 0,5 g/liter 1x per 14 hari.',
      'Berbunga': 'Pupuk mikro majemuk dosis ringan via daun sore hari.',
      'Berbuah': 'Jaga pH tanah tidak terlalu basa & tambahkan asam humat kocor.',
      'Panen': 'Tambahkan kompos matang pascapanen.',
    },
    sumber: 'IPNI Micronutrient Guide & FAO',
    kataKunci: ['besi', 'iron', 'fe', 'pucuk kuning'],
  ),
  'kurang_boron': KnowledgeNutrient(
    id: 'kurang_boron',
    dugaan: 'Dugaan kekurangan Boron (B)',
    ciriVisualSpesifik: 'Pucuk mengeras rapuh/mati, bunga mudah gugur, kulit bahu buah bergabus atau retak.',
    gejala: 'Pucuk rapuh/kerdil, bunga rontok, kulit sekitar tangkai buah bergabus.',
    rekomendasiOrganik: 'Kompos matang beragam bahan organik + mulsa untuk menjaga kelembapan stabil.',
    dosisPerFase: {
      'Bibit': 'Media tanam kaya kompos matang.',
      'Vegetatif': 'Pupuk mikro majemuk dosis anjuran label 1x per bulan.',
      'Berbunga': 'Semprot mikro Boron dosis sangat rendah 0,5 g/liter tipis 1x saat awal berbunga.',
      'Berbuah': 'Jaga kelembapan tanah stabil agar serapan Boron alami lancar.',
      'Panen': 'Tambahkan kompos matang pascapanen.',
    },
    sumber: 'IPNI Boron Guide & Balitsa Kementan RI',
    kataKunci: ['boron', 'bunga rontok', 'pucuk rapuh', 'gabus'],
  ),
  'kurang_sulfur': KnowledgeNutrient(
    id: 'kurang_sulfur',
    dugaan: 'Dugaan kekurangan Sulfur (S)',
    ciriVisualSpesifik: 'Seluruh daun muda bagian atas menguning pucat seragam termasuk tulang daunnya, tangkai kemerahan.',
    gejala: 'Daun muda bagian atas menguning seragam dan tangkai tampak kemerahan.',
    rekomendasiOrganik: 'Kompos matang terfermentasi sempurna dan gipsum pertanian alami 15–20 g/tanaman.',
    dosisPerFase: {
      'Bibit': 'Media tanam kaya kompos matang.',
      'Vegetatif': 'ZA atau MgSO4 ringan 2 g/liter kocor 200 ml/tanaman.',
      'Berbunga': 'MgSO4 / ZK (Kalium Sulfat) 2–3 g/liter kocor.',
      'Berbuah': 'ZK 3 g/liter untuk menambah Kalium sekaligus Sulfur.',
      'Panen': 'Tambahkan kompos matang untuk musim berikutnya.',
    },
    sumber: 'IPNI Plant Nutrition Guide & FAO',
    kataKunci: ['sulfur', 'belerang', 'za'],
  ),
  'kurang_seng': KnowledgeNutrient(
    id: 'kurang_seng',
    dugaan: 'Dugaan kekurangan Seng (Zn)',
    ciriVisualSpesifik: 'Daun muda mengecil menyempit seperti pita (little leaf), ruas batang memendek (roset), klorosis antar-urat.',
    gejala: 'Daun muda mengecil menyempit, ruas batang memendek, muncul bercak kuning di sela urat.',
    rekomendasiOrganik: 'Kompos kotoran ternak matang + pupuk hayati mikoriza untuk meningkatkan ketersediaan Seng.',
    dosisPerFase: {
      'Bibit': 'Kompos matang dan hindari pengapuran berlebih.',
      'Vegetatif': 'Semprot pupuk mikro kelat Zn (Zn-EDTA) 0,5 g/liter sore hari 1x per 14 hari.',
      'Berbunga': 'Kompos + hindari Fosfor berlebihan yang mengikat Zn.',
      'Berbuah': 'Jaga pH tanah seimbang 6,0–6,8.',
      'Panen': 'Tambahkan bahan organik saat olah tanah.',
    },
    sumber: 'IPNI Micronutrient Reference & UF/IFAS',
    kataKunci: ['seng', 'zinc', 'zn', 'daun mengecil'],
  ),
};

class CermatState {
  const CermatState({
    required this.onboarded,
    required this.userName,
    this.authEmail,
    this.activeDeviceId,
    this.dbSyncError,
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
    this.chatContextScan,
    this.pendingChatQuestion,
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
  final String? authEmail;
  final String? activeDeviceId;
  final String? dbSyncError;
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
  final ScanModel? chatContextScan;
  final String? pendingChatQuestion;
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
    String? authEmail,
    bool clearAuthEmail = false,
    String? activeDeviceId,
    String? dbSyncError,
    bool clearDbSyncError = false,
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
    ScanModel? chatContextScan,
    bool clearChatContextScan = false,
    String? pendingChatQuestion,
    bool clearPendingChatQuestion = false,
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
      authEmail: clearAuthEmail ? null : (authEmail ?? this.authEmail),
      activeDeviceId: activeDeviceId ?? this.activeDeviceId,
      dbSyncError: clearDbSyncError ? null : (dbSyncError ?? this.dbSyncError),
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
      chatContextScan: clearChatContextScan ? null : (chatContextScan ?? this.chatContextScan),
      pendingChatQuestion:
          clearPendingChatQuestion ? null : (pendingChatQuestion ?? this.pendingChatQuestion),
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
        nama: 'Cabai Rawit #01',
        varietas: 'Cabai Rawit',
        tanggalTanam: now.subtract(const Duration(days: 62)),
        fase: 'Panen',
        bobotRataBuahGram: 8,
      ),
      PlantModel(
        id: 'plant-2',
        farmId: 'farm-1',
        nama: 'Tomat Servo #01',
        varietas: 'Tomat Servo F1',
        tanggalTanam: now.subtract(const Duration(days: 55)),
        fase: 'Berbuah',
        bobotRataBuahGram: 85,
      ),
      PlantModel(
        id: 'plant-3',
        farmId: 'farm-1',
        nama: 'Terong Ungu #01',
        varietas: 'Terong Ungu',
        tanggalTanam: now.subtract(const Duration(days: 44)),
        fase: 'Berbunga',
        bobotRataBuahGram: 180,
      ),
      PlantModel(
        id: 'plant-4',
        farmId: 'farm-1',
        nama: 'Selada Keriting #01',
        varietas: 'Selada Keriting',
        tanggalTanam: now.subtract(const Duration(days: 26)),
        fase: 'Vegetatif',
        bobotRataBuahGram: 150,
      ),
      PlantModel(
        id: 'plant-5',
        farmId: 'farm-2',
        nama: 'Stroberi Teras #01',
        varietas: 'Stroberi',
        tanggalTanam: now.subtract(const Duration(days: 58)),
        fase: 'Berbuah',
        bobotRataBuahGram: 20,
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
      FarmTaskModel(id: 't1', farmId: 'farm-1', judul: 'Scan kematangan Cabai Rawit #01', waktuLabel: 'Hari ini · Pagi', selesai: false),
      FarmTaskModel(id: 't2', farmId: 'farm-1', judul: 'Cek bagian bawah daun Terong Ungu #01', waktuLabel: 'Hari ini · Siang', selesai: false),
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
  CermatNotifier() : super(_seedState(onboarded: SupabaseSyncService.currentUser != null)) {
    _clockTimer = Timer.periodic(const Duration(seconds: 15), (_) => _checkSchedules());
    if (SupabaseSyncService.currentUser != null) {
      Future<void>.microtask(_hydrateFromSupabaseAccount);
    }
  }

  Future<void> _hydrateFromSupabaseAccount({
    String? nama,
    String? namaKebun,
    String? lokasiKebun,
  }) async {
    try {
      final starterErr = await SupabaseSyncService.ensureStarterWorkspace(
        nama: nama,
        namaKebun: namaKebun,
        lokasiKebun: lokasiKebun,
      );
      final bundle = await SupabaseSyncService.fetchAccountBundle();
      if (!mounted || bundle == null) return;
      final nextFarms = bundle.farms.isNotEmpty ? bundle.farms : state.farms;
      final nextPlants = bundle.plants.isNotEmpty ? bundle.plants : state.plants;
      final combinedErr = starterErr ?? bundle.syncError;
      state = state.copyWith(
        onboarded: true,
        userName: bundle.userName,
        authEmail: bundle.email,
        activeDeviceId: bundle.activeDeviceId,
        dbSyncError: combinedErr,
        clearDbSyncError: combinedErr == null,
        themeMode: bundle.themeMode,
        farms: nextFarms,
        activeFarmId: nextFarms.first.id,
        plants: nextPlants,
        scans: bundle.scans,
        harvestEvents: bundle.harvestEvents,
        chatMessages: bundle.chatMessages,
        irrigationEvents:
            bundle.irrigationEvents.isNotEmpty ? bundle.irrigationEvents : state.irrigationEvents,
        tasks: bundle.tasks.isNotEmpty ? bundle.tasks : state.tasks,
        jadwalPengingat: bundle.reminders.isNotEmpty ? bundle.reminders : state.jadwalPengingat,
        notifications: bundle.notifications.isNotEmpty ? bundle.notifications : state.notifications,
        peringatanOtomatisSensor: bundle.peringatanOtomatisSensor,
        ambangKeyakinanRendah: bundle.ambangKeyakinanRendah,
        telegramChatId: bundle.telegramChatId,
        clearTelegram: bundle.telegramChatId == null,
        telegramCode: bundle.telegramCode,
        telegramTime: bundle.telegramTime,
        irigasiAuto: bundle.irigasiAuto,
        pompaMenyala: bundle.pompaMenyala,
        ambangTanahBawah: bundle.ambangTanahBawah,
        ambangTanahAtas: bundle.ambangTanahAtas,
        durasiMaksPompa: bundle.durasiMaksPompa,
        ambangKelembapanPenyakit: bundle.ambangKelembapanPenyakit,
        ambangTandonRendah: bundle.ambangTandonRendah,
        ambangBateraiHemat: bundle.ambangBateraiHemat,
        kelembapanTanah: bundle.kelembapanTanah,
        nitrogenMgKg: bundle.nitrogenMgKg,
        fosforMgKg: bundle.fosforMgKg,
        kaliumMgKg: bundle.kaliumMgKg,
        suhuUdara: bundle.suhuUdara,
        kelembapanUdara: bundle.kelembapanUdara,
        cahayaLux: bundle.cahayaLux,
        levelTandon: bundle.levelTandon,
        teganganVolt: bundle.teganganVolt,
        arusMa: bundle.arusMa,
        bateraiPersen: bundle.bateraiPersen,
        sensor24h: bundle.sensor24h.length >= 2 ? bundle.sensor24h : state.sensor24h,
        chatPlantId: nextPlants.isNotEmpty ? nextPlants.first.id : state.chatPlantId,
      );
      if (combinedErr != null) {
        pushAlert(
          judul: 'Sinkronisasi Database Tertunda',
          isi: combinedErr,
          severity: AlertSeverity.danger,
          tipe: AlertType.sistem,
        );
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(dbSyncError: SupabaseSyncService.formatError(e));
      }
    }
  }

  Future<void> refreshSupabaseSync() => _hydrateFromSupabaseAccount();

  Future<void> signInWithSupabase(String email, String password) async {
    final res = await SupabaseSyncService.signIn(email, password);
    if (res.user == null) {
      throw Exception('Login gagal. Periksa email dan kata sandi kamu.');
    }
    state = state.copyWith(onboarded: true, authEmail: res.user!.email ?? email);
    await _hydrateFromSupabaseAccount();
  }

  Future<bool> registerWithSupabase({
    required String nama,
    required String email,
    required String password,
    String? namaKebun,
    String? lokasiKebun,
  }) async {
    final res = await SupabaseSyncService.signUp(
      email: email,
      password: password,
      nama: nama,
    );
    if (res.session != null && res.user != null) {
      state = state.copyWith(onboarded: true, userName: nama, authEmail: res.user!.email ?? email);
      await _hydrateFromSupabaseAccount(
        nama: nama,
        namaKebun: namaKebun,
        lokasiKebun: lokasiKebun,
      );
      return false;
    }
    return true;
  }

  Future<void> signOutFromSupabase() async {
    await SupabaseSyncService.signOut();
    if (!mounted) return;
    state = _seedState(onboarded: false);
  }

  Timer? _clockTimer;
  Timer? _sensorSyncTimer;
  final Set<String> _firedScheduleSlots = {};

  @override
  void dispose() {
    _clockTimer?.cancel();
    _sensorSyncTimer?.cancel();
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
      _forwardToTelegram(
        kind: 'reminder',
        title: 'Pengingat Kebun · ${sched.judul} (${sched.jam} WIB)',
        message: sched.catatan,
        lines: ['Kebun aktif: ${state.activeFarm.nama}'],
      );
    }
  }

  void _forwardToTelegram({
    required String kind,
    required String title,
    required String message,
    List<String> lines = const [],
  }) {
    final chatId = state.telegramChatId;
    if (chatId == null || chatId.isEmpty || !TelegramService.isConfigured) return;
    unawaited(
      TelegramService.sendNotification(
        chatId: chatId,
        kind: kind,
        title: title,
        message: message,
        lines: lines,
      ),
    );
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
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.insertNotification(notif));
    }

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
    if (state.authEmail != null) {
      unawaited(
        SupabaseSyncService.updateReminderSchedule(
          id,
          jam: jam,
          aktif: aktif,
          judul: judul,
          catatan: catatan,
        ),
      );
    }
  }

  void addReminderSchedule({
    required String judul,
    required String jam,
    required ReminderCategory kategori,
    String catatan = '',
  }) {
    final cleanTitle = judul.trim();
    if (cleanTitle.isEmpty) return;
    final tempId = 'rem-${DateTime.now().millisecondsSinceEpoch}';
    final cleanNote = catatan.trim().isEmpty ? 'Pengingat kebun terjadwal CermatTani.' : catatan.trim();
    final item = ReminderScheduleModel(
      id: tempId,
      judul: cleanTitle,
      jam: jam,
      kategori: kategori,
      aktif: true,
      catatan: cleanNote,
    );
    state = state.copyWith(jadwalPengingat: [...state.jadwalPengingat, item]);
    if (state.authEmail != null) {
      unawaited(
        SupabaseSyncService.insertReminderSchedule(
          judul: cleanTitle,
          jam: jam,
          kategori: kategori,
          catatan: cleanNote,
        ).then((created) {
          if (!mounted || created == null) return;
          state = state.copyWith(
            jadwalPengingat: state.jadwalPengingat.map((r) => r.id == tempId ? created : r).toList(),
          );
        }),
      );
    }
  }

  void deleteReminderSchedule(String id) {
    state = state.copyWith(
      jadwalPengingat: state.jadwalPengingat.where((r) => r.id != id).toList(),
    );
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.deleteReminderSchedule(id));
    }
  }

  void setSensorAutoAlerts(bool enabled) {
    state = state.copyWith(peringatanOtomatisSensor: enabled);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateProfileSettings(peringatanOtomatisSensor: enabled));
    }
  }

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
          luasLabel: 'Kebun hortikultura',
        ),
        ...farms,
      ];
      activeFarmId = fid;
      if (plantName != null && plantName.trim().isNotEmpty) {
        final chosenVar = (varietas?.trim().isNotEmpty ?? false) ? varietas!.trim() : 'Cabai Rawit';
        plants = [
          PlantModel(
            id: 'plant-${DateTime.now().millisecondsSinceEpoch}',
            farmId: fid,
            nama: plantName.trim(),
            varietas: chosenVar,
            tanggalTanam: DateTime.now().subtract(const Duration(days: 40)),
            fase: 'Berbuah',
            bobotRataBuahGram: estimateWeightForVariety(chosenVar),
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
  void setUserName(String nama) {
    final clean = nama.trim();
    if (clean.isEmpty) return;
    state = state.copyWith(userName: clean);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateUserName(clean));
    }
  }

  void setThemeMode(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateProfileSettings(themeMode: mode));
    }
  }
  void selectFarm(String farmId) => state = state.copyWith(activeFarmId: farmId);

  void addFarm(String nama, String lokasi) {
    final fid = 'farm-${DateTime.now().millisecondsSinceEpoch}';
    final localFarm = FarmModel(id: fid, nama: nama.trim(), lokasi: lokasi.trim(), luasLabel: 'Kebun hortikultura');
    state = state.copyWith(
      farms: [...state.farms, localFarm],
      activeFarmId: fid,
    );
    if (state.authEmail != null) {
      unawaited(
        SupabaseSyncService.insertFarm(nama, lokasi).then((created) {
          if (!mounted || created == null) return;
          state = state.copyWith(
            farms: state.farms.map((f) => f.id == fid ? created : f).toList(),
            activeFarmId: state.activeFarmId == fid ? created.id : state.activeFarmId,
          );
        }),
      );
    }
  }

  void addPlant(String nama, String varietas, String fase, DateTime tanggalTanam) {
    final tempId = 'plant-${DateTime.now().millisecondsSinceEpoch}';
    final activeFarmId = state.activeFarm.id;
    final p = PlantModel(
      id: tempId,
      farmId: activeFarmId,
      nama: nama.trim(),
      varietas: varietas,
      tanggalTanam: tanggalTanam,
      fase: fase,
      bobotRataBuahGram: estimateWeightForVariety(varietas),
    );
    state = state.copyWith(plants: [p, ...state.plants]);
    if (state.authEmail != null) {
      unawaited(
        SupabaseSyncService.insertPlant(activeFarmId, nama, varietas, fase, tanggalTanam).then((created) {
          if (!mounted || created == null) return;
          state = state.copyWith(
            plants: state.plants.map((pl) => pl.id == tempId ? created : pl).toList(),
          );
        }),
      );
    }
  }

  void saveScan(ScanModel scan) {
    final harvests = [...state.harvestEvents];
    DateTime? harvestDate;
    String? harvestNote;
    if (scan.fokusOutput == ScanOutputFocus.kematangan &&
        scan.estimasiHariMin != null &&
        !scan.tanpaBuahTerdeteksi) {
      harvestDate = DateTime.now().add(Duration(days: scan.estimasiHariMin!));
      harvestNote = scan.anjuranPanen == 'Panen sekarang'
          ? '${scan.jumlahBuah} buah matang siap dipetik'
          : 'Tunggu ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari (${scan.jumlahBuah} buah)';
      harvests.insert(
        0,
        HarvestEventModel(
          id: 'harv-${DateTime.now().millisecondsSinceEpoch}',
          plantId: scan.plantId,
          tanggal: harvestDate,
          sumber: 'estimasi',
          catatan: harvestNote,
        ),
      );
    }
    state = state.copyWith(
      scans: [scan, ...state.scans],
      harvestEvents: harvests,
      chatPlantId: scan.plantId,
      chatContextScan: scan,
    );
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.insertScan(scan));
      if (harvestDate != null && harvestNote != null) {
        unawaited(SupabaseSyncService.insertHarvest(scan.plantId, harvestDate, harvestNote));
      }
    }
    final plantName = state.plants.where((p) => p.id == scan.plantId).firstOrNull?.nama ?? 'Tanaman';
    final alertBody = switch (scan.fokusOutput) {
      ScanOutputFocus.kematangan => '${scan.anjuranPanen} (${scan.jumlahBuah} buah)',
      ScanOutputFocus.penyakit => '${scan.penyakitUtamaNama} (yakin ${scan.keyakinan}%)',
      ScanOutputFocus.hara => '${scan.dugaanHaraNama} (yakin ${scan.keyakinan}%)',
      ScanOutputFocus.tidakTerdeteksi => 'Perlu foto ulang di tempat terang',
    };
    pushAlert(
      judul: 'Hasil scan $plantName tersimpan',
      isi: alertBody,
      severity: scan.fokusOutput == ScanOutputFocus.penyakit ? AlertSeverity.warn : AlertSeverity.info,
      tipe: AlertType.scan,
      actionRoute: '/plants',
      actionLabel: 'Lihat Riwayat',
    );
    if (scan.penyakitUtamaId != 'sehat') {
      final dis = knowledgeDiseases[scan.penyakitUtamaId];
      _forwardToTelegram(
        kind: 'scan',
        title: 'Temuan Penyakit: ${dis?.penyakit ?? scan.penyakitUtamaNama}',
        message: 'Tanaman $plantName terdeteksi indikasi penyakit (keyakinan ${scan.keyakinan}%).',
        lines: [
          if (dis != null) ...dis.solusiOrganik.take(2).map((s) => 'Solusi organik: $s'),
          'Buka CermatTani untuk diskusi lanjutan dengan Chatbot Cermo.',
        ],
      );
    }
  }

  void toggleTask(String id) {
    bool? nextDone;
    state = state.copyWith(
      tasks: state.tasks.map((t) {
        if (t.id != id) return t;
        nextDone = !t.selesai;
        return t.copyWith(selesai: !t.selesai);
      }).toList(),
    );
    if (state.authEmail != null && nextDone != null) {
      unawaited(SupabaseSyncService.toggleFarmTask(id, nextDone!));
    }
  }

  void addTask(String judul, String waktuLabel) {
    final clean = judul.trim();
    if (clean.isEmpty) return;
    final tempId = 't-${DateTime.now().millisecondsSinceEpoch}';
    final label = waktuLabel.trim().isEmpty ? 'Hari ini' : waktuLabel.trim();
    final farmId = state.activeFarm.id;
    final item = FarmTaskModel(
      id: tempId,
      farmId: farmId,
      judul: clean,
      waktuLabel: label,
      selesai: false,
    );
    state = state.copyWith(tasks: [item, ...state.tasks]);
    if (state.authEmail != null) {
      unawaited(
        SupabaseSyncService.insertFarmTask(farmId, clean, label).then((created) {
          if (!mounted || created == null) return;
          state = state.copyWith(
            tasks: state.tasks.map((t) => t.id == tempId ? created : t).toList(),
          );
        }),
      );
    }
  }

  void markHarvestActual(String id) {
    state = state.copyWith(
      harvestEvents: state.harvestEvents.map((h) => h.id == id ? h.copyWith(sumber: 'aktual') : h).toList(),
    );
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.markHarvestActual(id));
    }
  }

  void addHarvestEvent(String plantId, DateTime tanggal, String catatan) {
    final note = catatan.trim().isEmpty ? 'Jadwal panen manual' : catatan.trim();
    state = state.copyWith(
      harvestEvents: [
        HarvestEventModel(
          id: 'harv-${DateTime.now().millisecondsSinceEpoch}',
          plantId: plantId,
          tanggal: tanggal,
          sumber: 'estimasi',
          catatan: note,
        ),
        ...state.harvestEvents,
      ],
    );
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.insertHarvest(plantId, tanggal, note));
    }
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
    IrrigationEventModel? autoIrrEvent;
    final prevPump = state.pompaMenyala;
    if (next.isTankCritical && next.pompaMenyala) {
      next = next.copyWith(pompaMenyala: false);
    } else if (next.irigasiAuto && !next.isTankCritical) {
      if (next.kelembapanTanah < next.ambangTanahBawah && !next.pompaMenyala) {
        autoIrrEvent = IrrigationEventModel(
          id: 'irr-${DateTime.now().millisecondsSinceEpoch}',
          waktu: DateTime.now(),
          durasiMenit: min(8, next.durasiMaksPompa),
          kelembapanAwal: next.kelembapanTanah,
          kelembapanAkhir: next.ambangTanahAtas,
          mode: 'Otomatis',
        );
        next = next.copyWith(
          pompaMenyala: true,
          irrigationEvents: [autoIrrEvent, ...next.irrigationEvents],
        );
      } else if (next.kelembapanTanah >= next.ambangTanahAtas && next.pompaMenyala) {
        next = next.copyWith(pompaMenyala: false);
      }
    }
    state = next;

    // Sinkronkan pembacaan sensor (debounced 1.2s) & event irigasi otomatis ke Supabase
    if (state.authEmail != null && state.activeDeviceId != null) {
      _sensorSyncTimer?.cancel();
      _sensorSyncTimer = Timer(const Duration(milliseconds: 1200), () {
        if (mounted) {
          unawaited(SupabaseSyncService.insertSensorReading(state.activeDeviceId, state));
        }
      });
      if (next.pompaMenyala != prevPump) {
        unawaited(
          SupabaseSyncService.updateDeviceSettings(
            state.activeDeviceId,
            pompaMenyala: next.pompaMenyala,
          ),
        );
      }
      if (autoIrrEvent != null) {
        unawaited(SupabaseSyncService.insertIrrigationEvent(state.activeDeviceId, autoIrrEvent));
      }
    }

    // Pemicu live alert kanan atas & teruskan ke Telegram saat sensor baru melewati ambang
    if (state.peringatanOtomatisSensor) {
      if (state.isTankCritical && !prevTankCrit) {
        const msg = 'Pompa otomatis ditahan agar tidak kering. Segera isi ulang tandon.';
        pushAlert(
          judul: 'Tandon air kritis (${state.levelTandon}%)',
          isi: msg,
          severity: AlertSeverity.danger,
          tipe: AlertType.sensor,
          actionRoute: '/sensor',
          actionLabel: 'Buka Lahan',
        );
        _forwardToTelegram(
          kind: 'alert',
          title: 'Tandon Air Kritis (${state.levelTandon}%)',
          message: msg,
        );
      }
      if (state.isSoilDry && !prevSoilDry) {
        final msg = state.pompaMenyala
            ? 'Pompa irigasi otomatis sudah dinyalakan.'
            : 'Aktifkan pompa atau cek tandon di menu Lahan.';
        pushAlert(
          judul: 'Tanah mulai kering (${state.kelembapanTanah}%)',
          isi: msg,
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          actionRoute: '/sensor',
          actionLabel: 'Cek Irigasi',
        );
        _forwardToTelegram(
          kind: 'alert',
          title: 'Tanah Kering (${state.kelembapanTanah}%)',
          message: msg,
        );
      }
      if (state.isDiseaseRisk && !prevRisk) {
        const msg = 'Udara terlalu lembap. Hindari menyiram daun dan cek bagian bawah daun.';
        pushAlert(
          judul: 'Risiko jamur meningkat (RH ${state.kelembapanUdara}%)',
          isi: msg,
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          actionRoute: '/scan',
          actionLabel: 'Scan Daun',
        );
        _forwardToTelegram(
          kind: 'alert',
          title: 'Risiko Jamur Meningkat (RH ${state.kelembapanUdara}%)',
          message: msg,
        );
      }
      if (state.isPowerSave && !prevBatLow) {
        const msg = 'Interval pengiriman ESP32 diperlambat untuk menjaga daya.';
        pushAlert(
          judul: 'Baterai surya masuk Mode Hemat (${state.bateraiPersen}%)',
          isi: msg,
          severity: AlertSeverity.warn,
          tipe: AlertType.sensor,
          actionRoute: '/solar',
          actionLabel: 'Energi Surya',
        );
        _forwardToTelegram(
          kind: 'alert',
          title: 'Baterai Surya Mode Hemat (${state.bateraiPersen}%)',
          message: msg,
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

  void setIrigasiAuto(bool auto) {
    state = state.copyWith(irigasiAuto: auto);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateDeviceSettings(state.activeDeviceId, irigasiAuto: auto));
    }
  }

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
    if (state.authEmail != null) {
      if (keyakinanRendah != null) {
        unawaited(SupabaseSyncService.updateProfileSettings(ambangKeyakinanRendah: keyakinanRendah));
      }
      unawaited(
        SupabaseSyncService.updateDeviceSettings(
          state.activeDeviceId,
          ambangTanahBawah: tanahBawah,
          ambangTanahAtas: tanahAtas,
          durasiMaksPompa: durasiMaks,
          ambangKelembapanPenyakit: kelembapanPenyakit,
          ambangTandonRendah: tandonRendah,
        ),
      );
    }
  }

  String toggleManualPump() {
    final turnOn = !state.pompaMenyala;
    if (turnOn && state.isTankCritical) {
      return 'Tandon tinggal ${state.levelTandon}%. Pompa kutahan dulu supaya tidak kering.';
    }
    final events = [...state.irrigationEvents];
    IrrigationEventModel? newEv;
    if (turnOn) {
      newEv = IrrigationEventModel(
        id: 'irr-${DateTime.now().millisecondsSinceEpoch}',
        waktu: DateTime.now(),
        durasiMenit: min(5, state.durasiMaksPompa),
        kelembapanAwal: state.kelembapanTanah,
        kelembapanAkhir: min(state.ambangTanahAtas, state.kelembapanTanah + 12),
        mode: 'Manual',
      );
      events.insert(0, newEv);
    }
    state = state.copyWith(pompaMenyala: turnOn, irrigationEvents: events);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateDeviceSettings(state.activeDeviceId, pompaMenyala: turnOn));
      if (newEv != null) {
        unawaited(SupabaseSyncService.insertIrrigationEvent(state.activeDeviceId, newEv));
      }
    }
    return turnOn
        ? 'Pompa dinyalakan manual (batas aman maks ${state.durasiMaksPompa} menit).'
        : 'Pompa dimatikan.';
  }

  Future<({bool ok, String message})> linkTelegram({String? manualChatId}) async {
    final res = await TelegramService.linkAccount(
      code: state.telegramCode,
      userName: state.userName,
      manualChatId: manualChatId,
    );
    if (!mounted) return (ok: res.ok, message: res.message);
    if (res.ok && res.chatId != null) {
      state = state.copyWith(telegramChatId: res.chatId);
      if (state.authEmail != null) {
        unawaited(SupabaseSyncService.updateTelegramFields(chatId: res.chatId));
      }
      pushAlert(
        judul: 'Bot Telegram tersambung',
        isi: res.message,
        severity: AlertSeverity.info,
        tipe: AlertType.jadwal,
        actionRoute: '/calendar',
        actionLabel: 'Kalender',
      );
    }
    return (ok: res.ok, message: res.message);
  }

  void unlinkTelegram() {
    state = state.copyWith(clearTelegram: true);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateTelegramFields(clearChatId: true));
    }
  }

  void setTelegramTime(String jam) {
    state = state.copyWith(telegramTime: jam);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateProfileSettings(telegramTime: jam));
    }
  }

  void regenerateTelegramCode() {
    final code = (100000 + Random().nextInt(900000)).toString();
    state = state.copyWith(telegramCode: code);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.updateTelegramFields(linkCode: code));
    }
  }

  Future<({bool ok, String message})> sendTestTelegram() async {
    final chatId = state.telegramChatId;
    if (chatId == null || chatId.isEmpty) {
      return (ok: false, message: 'Tautkan Bot Telegram terlebih dulu.');
    }
    final sent = await TelegramService.sendNotification(
      chatId: chatId,
      kind: 'test',
      title: 'Uji Pengingat CermatTani',
      message: 'Halo ${state.userName}! Koneksi Bot Telegram aktif (${state.telegramTime} WIB).',
      lines: [
        'Kebun aktif: ${state.activeFarm.nama}',
        'Kondisi lahan: Tanah ${state.kelembapanTanah}% · Tandon ${state.levelTandon}% · Baterai ${state.bateraiPersen}%',
      ],
    );
    if (sent.ok) {
      return (ok: true, message: 'Pesan uji terkirim ke Telegram! Cek chat bot kamu.');
    }
    return (ok: false, message: sent.error ?? 'Gagal mengirim pesan uji ke Telegram.');
  }

  Future<({bool ok, String message})> shareScanToTelegram(ScanModel scan) async {
    final chatId = state.telegramChatId;
    if (chatId == null || chatId.isEmpty) {
      return (
        ok: false,
        message: 'Telegram belum tertaut. Sambungkan dulu di menu Kalender → tab Telegram.',
      );
    }

    final plant = state.plants.where((p) => p.id == scan.plantId).firstOrNull;
    final plantLabel = plant != null ? '${plant.nama} (${plant.varietas})' : 'Tanaman Kebun';
    var title = 'Hasil Scan · $plantLabel';
    var msg = '';
    final lines = <String>[];

    if (scan.fokusOutput == ScanOutputFocus.penyakit) {
      final dis = knowledgeDiseases[scan.penyakitUtamaId] ?? knowledgeDiseases['sehat']!;
      title = 'Hasil Scan Penyakit · ${dis.penyakit}';
      msg = 'Tanaman: $plantLabel (Keyakinan ${scan.keyakinan}%). Penyebab: ${dis.penyebab}';
      for (final s in dis.solusiOrganik.take(2)) {
        lines.add('Organik dulu: $s');
      }
      if (dis.pencegahan.isNotEmpty) lines.add('Pencegahan: ${dis.pencegahan.first}');
    } else if (scan.fokusOutput == ScanOutputFocus.kematangan && scan.tahapDominan != null) {
      final rip = knowledgeRipeness[scan.tahapDominan!]!;
      title = 'Hasil Scan Panen · ${rip.label} (${scan.anjuranPanen})';
      msg = 'Tanaman: $plantLabel · ${scan.jumlahBuah} buah (~${scan.estimasiBobotGram} g, yakin ${scan.keyakinan}%).';
      lines.add(
        scan.anjuranPanen == 'Panen sekarang'
            ? 'Anjuran: Panen sekarang (pagi/sore).'
            : 'Estimasi siap petik: ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari lagi.',
      );
      lines.add('Pasca panen: ${rip.penangananPascaPanen}');
    } else if (scan.fokusOutput == ScanOutputFocus.hara) {
      final nut = knowledgeNutrients[scan.dugaanHaraId] ?? knowledgeNutrients['cukup']!;
      title = 'Hasil Scan Hara · ${nut.dugaan}';
      msg = 'Tanaman: $plantLabel (Keyakinan ${scan.keyakinan}%). ${nut.gejala}';
      lines.add('Organik dulu: ${nut.rekomendasiOrganik}');
      lines.add('Catatan: Bukan pengganti uji tanah.');
    } else {
      msg = scan.ringkasanAi.isNotEmpty ? scan.ringkasanAi : 'Objek belum terdeteksi jelas.';
    }

    final sent = await TelegramService.sendNotification(
      chatId: chatId,
      kind: 'scan',
      title: title,
      message: msg,
      lines: lines,
    );
    if (sent.ok) {
      return (ok: true, message: 'Ringkasan hasil scan berhasil dikirim ke Telegram!');
    }
    return (ok: false, message: sent.error ?? 'Gagal mengirim hasil scan ke Telegram.');
  }

  void setChatPlant(String plantId) => state = state.copyWith(
        chatPlantId: plantId,
        clearChatContextScan: state.chatContextScan != null && state.chatContextScan!.plantId != plantId,
      );

  void openChatWithScan(ScanModel scan, {String? initialQuestion}) {
    final q = initialQuestion?.trim();
    state = state.copyWith(
      chatPlantId: scan.plantId,
      chatContextScan: scan,
      pendingChatQuestion: (q != null && q.isNotEmpty) ? q : null,
      clearPendingChatQuestion: q == null || q.isEmpty,
    );
  }

  void clearPendingChatQuestion() => state = state.copyWith(clearPendingChatQuestion: true);

  void appendChatMessage(ChatMsgModel msg) {
    state = state.copyWith(chatMessages: [...state.chatMessages, msg]);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.insertChat(state.chatPlantId, msg.dariCermo, msg.isi));
    }
  }

  void clearChatMessages() {
    state = state.copyWith(chatMessages: const []);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.clearUserChats());
    }
  }

  void markAllNotifsRead() {
    state = state.copyWith(
      notifications: state.notifications.map((n) => n.copyWith(dibaca: true)).toList(),
    );
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.markAllNotificationsRead());
    }
  }

  void clearNotifications() {
    state = state.copyWith(notifications: const []);
    if (state.authEmail != null) {
      unawaited(SupabaseSyncService.clearUserNotifications());
    }
  }

  void resetDemo() => state = _seedState(onboarded: true);

  void deleteAllData() {
    state = _seedState(onboarded: false).copyWith(
      farms: const [FarmModel(id: 'farm-empty', nama: 'Kebun Baru', lokasi: 'Belum diisi', luasLabel: 'Kebun hortikultura')],
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
