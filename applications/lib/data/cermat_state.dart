import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

extension CermatIterableExt<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

enum PlantPart { buah, daun, batang }

enum RipenessStage { mentah, setengahMatang, matang }

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
}

class KnowledgeDisease {
  const KnowledgeDisease({
    required this.id,
    required this.penyakit,
    required this.penyebab,
    required this.gejala,
    required this.solusiOrganik,
    required this.solusiKimia,
    required this.pencegahan,
    required this.sumber,
  });

  final String id;
  final String penyakit;
  final String penyebab;
  final String gejala;
  final List<String> solusiOrganik;
  final List<String> solusiKimia;
  final List<String> pencegahan;
  final String sumber;
}

class KnowledgeNutrient {
  const KnowledgeNutrient({
    required this.id,
    required this.dugaan,
    required this.gejala,
    required this.rekomendasiOrganik,
    required this.dosisPerFase,
    required this.sumber,
  });

  final String id;
  final String dugaan;
  final String gejala;
  final String rekomendasiOrganik;
  final Map<String, String> dosisPerFase;
  final String sumber;
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
  const ChatMsgModel({required this.id, required this.dariCermo, required this.isi});
  final String id;
  final bool dariCermo;
  final String isi;
}

class NotifModel {
  const NotifModel({
    required this.id,
    required this.judul,
    required this.isi,
    required this.waktu,
    required this.dibaca,
  });

  final String id;
  final String judul;
  final String isi;
  final String waktu;
  final bool dibaca;

  NotifModel copyWith({bool? dibaca}) =>
      NotifModel(id: id, judul: judul, isi: isi, waktu: waktu, dibaca: dibaca ?? this.dibaca);
}

const knowledgeDiseases = <String, KnowledgeDisease>{
  'sehat': KnowledgeDisease(
    id: 'sehat',
    penyakit: 'Sehat',
    penyebab: 'Tidak ditemukan tanda serangan jamur, bakteri, atau virus yang mencolok.',
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
  ),
  'bercak_kering': KnowledgeDisease(
    id: 'bercak_kering',
    penyakit: 'Bercak daun kering (Early blight)',
    penyebab: 'Jamur Alternaria solani yang berkembang cepat pada daun sering basah.',
    gejala: 'Bercak cokelat tua melingkar konsentris pada daun tua dengan tepi menguning.',
    solusiOrganik: [
      'Petik dan buang daun berbercak jauh dari bedengan (jangan dijadikan kompos).',
      'Semprot fungisida nabati / agen hayati Trichoderma atau larutan baking soda 1 sdt/liter pada sore hari.',
      'Siram langsung di tanah dekat akar, hindari membasahi daun.',
    ],
    solusiKimia: [
      'Opsi terakhir bila serangan meluas (> 25% daun): fungisida kontak mankozeb/klorotalonil. Wajib baca label produk, patuhi dosis dan masa tunggu panen.',
    ],
    pencegahan: [
      'Jaga jarak tanam minimal 50 × 60 cm dan gunakan mulsa.',
      'Lakukan rotasi tanaman setelah panen.',
    ],
    sumber: 'Balitsa Kementan RI & PlantVillage Reference',
  ),
  'busuk_daun': KnowledgeDisease(
    id: 'busuk_daun',
    penyakit: 'Busuk daun (Late blight)',
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
  ),
  'layu_batang': KnowledgeDisease(
    id: 'layu_batang',
    penyakit: 'Layu fusarium / bakteri batang',
    penyebab: 'Jamur Fusarium atau bakteri Ralstonia yang menyerang pembuluh batang bawah.',
    gejala: 'Pangkal batang kecokelatan dan daun layu siang hari walau tanah lembap.',
    solusiOrganik: [
      'Cabut tanaman layu permanen agar tidak menular ke bedengan sebelah.',
      'Kocor lubang tanam sekitar dengan Trichoderma dan kompos matang.',
    ],
    solusiKimia: [
      'Semprot daun tidak efektif untuk layu pembuluh. Konsultasi penyuluh sebelum perlakuan tanah dan selalu baca label produk.',
    ],
    pencegahan: ['Buat bedengan lebih tinggi di musim hujan & pilih varietas tahan layu (Servo F1).'],
    sumber: 'Balitsa Kementan RI',
  ),
};

const knowledgeNutrients = <String, KnowledgeNutrient>{
  'cukup': KnowledgeNutrient(
    id: 'cukup',
    dugaan: 'Hara terlihat seimbang',
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
  ),
  'kurang_nitrogen': KnowledgeNutrient(
    id: 'kurang_nitrogen',
    dugaan: 'Dugaan kekurangan Nitrogen (N)',
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
  ),
  'kurang_kalium': KnowledgeNutrient(
    id: 'kurang_kalium',
    dugaan: 'Dugaan kekurangan Kalium (K)',
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
    required this.chatPlantId,
    required this.telegramChatId,
    required this.telegramCode,
    required this.telegramTime,
    required this.kelembapanTanah,
    required this.suhuUdara,
    required this.kelembapanUdara,
    required this.cahayaLux,
    required this.levelTandon,
    required this.teganganVolt,
    required this.arusMa,
    required this.bateraiPersen,
    required this.sensorTersedia,
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
  final String? chatPlantId;
  final String? telegramChatId;
  final String telegramCode;
  final String telegramTime;

  // Sensor simulasi ESP32 (F8, F11, F12, F13)
  final int kelembapanTanah;
  final double suhuUdara;
  final int kelembapanUdara;
  final int cahayaLux;
  final int levelTandon;
  final double teganganVolt;
  final int arusMa;
  final int bateraiPersen;
  final bool sensorTersedia;

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
  bool get isDiseaseRisk => kelembapanUdara >= ambangKelembapanPenyakit;
  bool get isPowerSave => bateraiPersen <= ambangBateraiHemat;
  double get dayaWatt => double.parse(((teganganVolt * arusMa) / 1000).toStringAsFixed(2));
  int get jarakUltrasonikCm => (100 - levelTandon).clamp(0, 100);

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
    String? chatPlantId,
    String? telegramChatId,
    bool clearTelegram = false,
    String? telegramCode,
    String? telegramTime,
    int? kelembapanTanah,
    double? suhuUdara,
    int? kelembapanUdara,
    int? cahayaLux,
    int? levelTandon,
    double? teganganVolt,
    int? arusMa,
    int? bateraiPersen,
    bool? sensorTersedia,
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
      chatPlantId: chatPlantId ?? this.chatPlantId,
      telegramChatId: clearTelegram ? null : (telegramChatId ?? this.telegramChatId),
      telegramCode: telegramCode ?? this.telegramCode,
      telegramTime: telegramTime ?? this.telegramTime,
      kelembapanTanah: kelembapanTanah ?? this.kelembapanTanah,
      suhuUdara: suhuUdara ?? this.suhuUdara,
      kelembapanUdara: kelembapanUdara ?? this.kelembapanUdara,
      cahayaLux: cahayaLux ?? this.cahayaLux,
      levelTandon: levelTandon ?? this.levelTandon,
      teganganVolt: teganganVolt ?? this.teganganVolt,
      arusMa: arusMa ?? this.arusMa,
      bateraiPersen: bateraiPersen ?? this.bateraiPersen,
      sensorTersedia: sensorTersedia ?? this.sensorTersedia,
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
    scans: [
      ScanModel(
        id: 'scan-3',
        plantId: 'plant-1',
        waktu: now.subtract(const Duration(days: 1)),
        bagian: PlantPart.buah,
        boxes: const [
          DetectionBoxModel(leftFrac: 0.12, topFrac: 0.28, widthFrac: 0.22, heightFrac: 0.30, stage: RipenessStage.matang, confidence: 94),
          DetectionBoxModel(leftFrac: 0.42, topFrac: 0.36, widthFrac: 0.22, heightFrac: 0.30, stage: RipenessStage.matang, confidence: 92),
          DetectionBoxModel(leftFrac: 0.68, topFrac: 0.26, widthFrac: 0.20, heightFrac: 0.28, stage: RipenessStage.matang, confidence: 90),
        ],
        tahapDominan: RipenessStage.matang,
        jumlahBuah: 3,
        anjuranPanen: 'Panen sekarang',
        estimasiHariMin: 0,
        estimasiHariMax: 1,
        estimasiDisesuaikanRiwayat: true,
        estimasiBobotGram: 255,
        penyakitTop3: const [
          DiseasePred('sehat', 'Sehat', 92),
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 5),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 3),
        ],
        penyakitUtamaId: 'sehat',
        penyakitUtamaNama: 'Sehat',
        keyakinan: 92,
        keyakinanRendah: false,
        dugaanHaraId: 'cukup',
        dugaanHaraNama: 'Hara terlihat seimbang',
        pakaiDataSensor: true,
      ),
      ScanModel(
        id: 'scan-2',
        plantId: 'plant-1',
        waktu: now.subtract(const Duration(days: 4)),
        bagian: PlantPart.daun,
        boxes: const [],
        tahapDominan: null,
        jumlahBuah: 0,
        anjuranPanen: 'Fokus daun/batang',
        estimasiHariMin: null,
        estimasiHariMax: null,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 0,
        penyakitTop3: const [
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 84),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 10),
          DiseasePred('sehat', 'Sehat', 6),
        ],
        penyakitUtamaId: 'bercak_kering',
        penyakitUtamaNama: 'Bercak daun kering (Early blight)',
        keyakinan: 84,
        keyakinanRendah: false,
        dugaanHaraId: 'kurang_kalium',
        dugaanHaraNama: 'Dugaan kekurangan Kalium (K)',
        pakaiDataSensor: true,
      ),
      ScanModel(
        id: 'scan-1',
        plantId: 'plant-1',
        waktu: now.subtract(const Duration(days: 9)),
        bagian: PlantPart.buah,
        boxes: const [
          DetectionBoxModel(leftFrac: 0.22, topFrac: 0.34, widthFrac: 0.22, heightFrac: 0.30, stage: RipenessStage.mentah, confidence: 88),
          DetectionBoxModel(leftFrac: 0.56, topFrac: 0.38, widthFrac: 0.22, heightFrac: 0.30, stage: RipenessStage.setengahMatang, confidence: 85),
        ],
        tahapDominan: RipenessStage.mentah,
        jumlahBuah: 2,
        anjuranPanen: 'Tunggu',
        estimasiHariMin: 7,
        estimasiHariMax: 10,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 170,
        penyakitTop3: const [
          DiseasePred('sehat', 'Sehat', 91),
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 6),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 3),
        ],
        penyakitUtamaId: 'sehat',
        penyakitUtamaNama: 'Sehat',
        keyakinan: 88,
        keyakinanRendah: false,
        dugaanHaraId: 'cukup',
        dugaanHaraNama: 'Hara terlihat seimbang',
        pakaiDataSensor: true,
      ),
      ScanModel(
        id: 'scan-4',
        plantId: 'plant-3',
        waktu: now.subtract(const Duration(days: 1)),
        bagian: PlantPart.daun,
        boxes: const [],
        tahapDominan: null,
        jumlahBuah: 0,
        anjuranPanen: 'Fokus daun/batang',
        estimasiHariMin: null,
        estimasiHariMax: null,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 0,
        penyakitTop3: const [
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 54),
          DiseasePred('sehat', 'Sehat', 31),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 15),
        ],
        penyakitUtamaId: 'bercak_kering',
        penyakitUtamaNama: 'Bercak daun kering (Early blight)',
        keyakinan: 54,
        keyakinanRendah: true,
        dugaanHaraId: 'kurang_nitrogen',
        dugaanHaraNama: 'Dugaan kekurangan Nitrogen (N)',
        pakaiDataSensor: true,
      ),
    ],
    harvestEvents: [
      HarvestEventModel(
        id: 'harv-1',
        plantId: 'plant-1',
        tanggal: now,
        sumber: 'estimasi',
        catatan: '3 buah merah siap petik pagi ini',
      ),
      HarvestEventModel(
        id: 'harv-2',
        plantId: 'plant-2',
        tanggal: now.add(const Duration(days: 3)),
        sumber: 'estimasi',
        catatan: 'Setengah matang → tunggu 2–4 hari',
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
      FarmTaskModel(id: 't1', farmId: 'farm-1', judul: 'Petik 3 tomat matang Servo #01', waktuLabel: 'Hari ini · Pagi', selesai: false),
      FarmTaskModel(id: 't2', farmId: 'farm-1', judul: 'Foto ulang daun kuning Gustavi #03', waktuLabel: 'Hari ini · Siang', selesai: false),
      FarmTaskModel(id: 't3', farmId: 'farm-1', judul: 'Beri kompos/POC ringan bedengan A', waktuLabel: 'Besok · 07:00', selesai: false),
      FarmTaskModel(id: 't4', farmId: 'farm-1', judul: 'Cek pipa tetes & level tandon', waktuLabel: 'Kemarin', selesai: true),
    ],
    chatMessages: const [
      ChatMsgModel(
        id: 'c1',
        dariCermo: true,
        isi: 'Halo! Aku Cermo si Tomat. Aku sudah baca hasil scan terbarumu: Tomat Servo #01 punya 3 buah merah siap panen hari ini, sedangkan daun Gustavi #03 kemarin keyakinannya rendah (54%). Mau tanya soal panen, penyakit, atau pupuk?',
      ),
    ],
    notifications: const [
      NotifModel(
        id: 'n1',
        judul: 'Jadwal panen hari ini',
        isi: 'Tomat Servo #01 sudah matang dan siap dipetik pagi ini.',
        waktu: 'Hari ini · 07:00',
        dibaca: false,
      ),
      NotifModel(
        id: 'n2',
        judul: 'Scan daun perlu konfirmasi',
        isi: 'Keyakinan daun Gustavi #03 adalah 54% (< 60%). Konfirmasi ke penyuluh bila ragu.',
        waktu: 'Kemarin · 16:20',
        dibaca: false,
      ),
    ],
    chatPlantId: 'plant-1',
    telegramChatId: null,
    telegramCode: '482916',
    telegramTime: '07:00',
    kelembapanTanah: 48,
    suhuUdara: 26.5,
    kelembapanUdara: 76,
    cahayaLux: 28400,
    levelTandon: 62,
    teganganVolt: 12.6,
    arusMa: 88,
    bateraiPersen: 78,
    sensorTersedia: true,
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
  CermatNotifier() : super(_seedState(onboarded: false));

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
  void setUserName(String nama) => state = state.copyWith(userName: nama.trim().isEmpty ? state.userName : nama.trim());
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
  }

  void toggleTask(String id) {
    state = state.copyWith(
      tasks: state.tasks.map((t) => t.id == id ? t.copyWith(selesai: !t.selesai) : t).toList(),
    );
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
    int? kelembapanUdara,
    int? levelTandon,
    int? bateraiPersen,
    bool? sensorTersedia,
  }) {
    var next = state.copyWith(
      kelembapanTanah: kelembapanTanah,
      kelembapanUdara: kelembapanUdara,
      levelTandon: levelTandon,
      bateraiPersen: bateraiPersen,
      teganganVolt: bateraiPersen != null
          ? double.parse((11.1 + (bateraiPersen / 100) * 1.9).toStringAsFixed(1))
          : null,
      sensorTersedia: sensorTersedia,
    );

    // Evaluasi interlock F10.3 & F10.1
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

  /// F10.2 & F10.3: Tombol manual pompa + pengaman tandon kritis
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
      notifications: [
        NotifModel(
          id: 'n-tg-${DateTime.now().millisecondsSinceEpoch}',
          judul: 'Bot Telegram tertaut',
          isi: 'Pengingat panen aktif pukul ${state.telegramTime} WIB.',
          waktu: 'Baru saja',
          dibaca: false,
        ),
        ...state.notifications,
      ],
    );
  }

  void unlinkTelegram() => state = state.copyWith(clearTelegram: true);

  void regenerateTelegramCode() {
    final code = (100000 + Random().nextInt(900000)).toString();
    state = state.copyWith(telegramCode: code);
  }

  void sendTestTelegram() {
    state = state.copyWith(
      notifications: [
        NotifModel(
          id: 'n-tg-test-${DateTime.now().millisecondsSinceEpoch}',
          judul: 'Pesan Telegram terkirim (Uji)',
          isi: 'Halo ${state.userName}! Pengingat panen CermatTani (${state.telegramTime} WIB): Tomat Servo #01 siap dipanen.',
          waktu: 'Baru saja',
          dibaca: false,
        ),
        ...state.notifications,
      ],
    );
  }

  void setChatPlant(String plantId) => state = state.copyWith(chatPlantId: plantId);

  /// F5.1–F5.4: Mesin jawaban Cermo khusus budidaya tomat + tolak topik luar sopan
  void sendChat(String text) {
    final clean = text.trim();
    if (clean.isEmpty) return;

    final userMsg = ChatMsgModel(
      id: 'u-${DateTime.now().millisecondsSinceEpoch}',
      dariCermo: false,
      isi: clean,
    );
    final replyText = _buildCermoReply(clean);
    final botMsg = ChatMsgModel(
      id: 'b-${DateTime.now().millisecondsSinceEpoch + 1}',
      dariCermo: true,
      isi: replyText,
    );

    state = state.copyWith(chatMessages: [...state.chatMessages, userMsg, botMsg]);
  }

  String _buildCermoReply(String input) {
    final q = input.toLowerCase();
    const offTopic = ['politik', 'presiden', 'saham', 'kripto', 'bola', 'sepakbola', 'film', 'padi', 'jagung', 'durian', 'matematika'];
    const onTopic = ['tomat', 'panen', 'matang', 'scan', 'hasil', 'daun', 'buah', 'batang', 'penyakit', 'bercak', 'pupuk', 'hara', 'organik', 'siram', 'irigasi', 'tandon', 'surya', 'baterai'];

    if (offTopic.any(q.contains) && !onTopic.any(q.contains)) {
      return 'Maaf ya, aku Cermo cuma fokus bantu budidaya tomat, hasil scan, dan sensor kebunmu. Di luar topik itu aku belum bisa menjawab. Yuk tanya soal tomatmu!';
    }

    final plant = state.plants.where((p) => p.id == state.chatPlantId).firstOrNull ?? state.plants.firstOrNull;
    final scan = plant == null ? null : state.scans.where((s) => s.plantId == plant.id).firstOrNull;

    if (q.contains('arti hasil') || q.contains('maksud')) {
      if (scan == null || plant == null) {
        return 'Belum ada hasil scan pada tanaman ini. Foto tomatmu dulu lewat tombol Scan di bawah ya.';
      }
      if (scan.bagian == PlantPart.buah && scan.tahapDominan != null) {
        return 'Di ${plant.nama}, terdeteksi ${scan.jumlahBuah} buah dengan anjuran "${scan.anjuranPanen}" (seberapa yakin Cermo: ${scan.keyakinan}%). Estimasi kasar bobot sekitar ${scan.estimasiBobotGram} gram.';
      }
      return 'Hasil scan ${plant.nama} mengarah ke "${scan.penyakitUtamaNama}" (keyakinan ${scan.keyakinan}%).${scan.keyakinanRendah ? ' Karena di bawah ${state.ambangKeyakinanRendah}%, sebaiknya foto ulang di cahaya terang dan tanya penyuluh juga.' : ''}';
    }

    if (q.contains('panen') || q.contains('matang')) {
      if (scan != null && scan.anjuranPanen == 'Panen sekarang') {
        return '${plant?.nama ?? 'Tanamanmu'} sudah matang (${scan.jumlahBuah} buah terdeteksi). Kamu bisa panen sekarang pada pagi atau sore hari ya!';
      }
      return 'Untuk ${plant?.nama ?? 'tomatmu'}, tunggu 2–4 hari saat warna berubah jingga-merah, lalu cek ulang lewat Scan.';
    }

    if (q.contains('pupuk') || q.contains('hara')) {
      final nut = knowledgeNutrients[scan?.dugaanHaraId ?? 'cukup'] ?? knowledgeNutrients['cukup']!;
      final label = state.sensorTersedia ? 'dengan data sensor (Simulasi)' : 'dugaan visual';
      return 'Berdasarkan $label, statusnya "${nut.dugaan}". Organik dulu: ${nut.rekomendasiOrganik} Acuan fase ${plant?.fase ?? 'Berbuah'}: ${nut.dosisPerFase[plant?.fase ?? 'Berbuah'] ?? ''} Ingat, ini bukan pengganti uji tanah.';
    }

    if (q.contains('penyakit') || q.contains('organik') || q.contains('bercak')) {
      final dis = knowledgeDiseases[scan?.penyakitUtamaId ?? 'sehat'] ?? knowledgeDiseases['sehat']!;
      return 'Untuk "${dis.penyakit}", mulai cara organik dulu: ${dis.solusiOrganik.first} Opsi kimiawi hanya bila meluas dan wajib baca label produk serta konfirmasi ke penyuluh bila ragu.';
    }

    if (q.contains('tandon') || q.contains('siram') || q.contains('irigasi')) {
      if (state.isTankCritical) {
        return 'Tandon tinggal ${state.levelTandon}% (kritis). Pompa kutahan dulu supaya tidak kering.';
      }
      return 'Tandon aman (${state.levelTandon}%) dan kelembapan tanah ${state.kelembapanTanah}% (Simulasi ESP32). Siram di pangkal batang pada pagi/sore hari.';
    }

    return 'Aku siap bantu jelaskan hasil scan, jadwal panen, cara organik atasi penyakit, atau takaran pupuk untuk ${plant?.nama ?? 'tomatmu'}. Pilih pertanyaan cepat di bawah ya!';
  }

  void markAllNotifsRead() {
    state = state.copyWith(
      notifications: state.notifications.map((n) => n.copyWith(dibaca: true)).toList(),
    );
  }

  void resetDemo() => state = _seedState(onboarded: true);

  void deleteAllData() {
    state = _seedState(onboarded: false).copyWith(
      farms: const [FarmModel(id: 'farm-empty', nama: 'Kebun Baru', lokasi: 'Belum diisi', luasLabel: 'Kebun tomat')],
      activeFarmId: 'farm-empty',
      plants: const [],
      scans: const [],
      harvestEvents: const [],
      tasks: const [],
      notifications: const [],
    );
  }
}

final cermatProvider = StateNotifierProvider<CermatNotifier, CermatState>((ref) => CermatNotifier());
