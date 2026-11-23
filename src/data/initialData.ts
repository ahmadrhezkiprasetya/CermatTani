import {
  AppSettings,
  ChatMessage,
  DeviceInfo,
  Farm,
  FarmTask,
  HarvestEvent,
  IrrigationEvent,
  NotificationItem,
  Plant,
  ScanRecord,
  SensorPoint24h,
  SensorSnapshot,
  UserProfile,
} from '../types/cermattani';
import { DEMO_PHOTO_PRESETS } from './knowledgeBase';

function daysAgoIso(days: number, hour = 8): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function dateOffsetYmd(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const INITIAL_USER: UserProfile = {
  id: 'usr-1',
  nama: 'Pak Joko',
  peran: 'Petani tomat 0,3 ha',
  telegramChatId: null,
  telegramLinkCode: '482916',
  telegramReminderTime: '07:00',
  bahasa: 'id',
};

export const INITIAL_FARMS: Farm[] = [
  {
    id: 'farm-1',
    userId: 'usr-1',
    nama: 'Kebun Blok A — Ciawi',
    lokasi: 'Ciawi, Bogor',
    luasLabel: '0,3 ha · Bedengan terbuka',
  },
  {
    id: 'farm-2',
    userId: 'usr-1',
    nama: 'Polybag Atap — Rumah',
    lokasi: 'Teras atas',
    luasLabel: '24 polybag · Urban farming',
  },
];

export const INITIAL_PLANTS: Plant[] = [
  {
    id: 'plant-1',
    farmId: 'farm-1',
    nama: 'Tomat Servo #01',
    varietas: 'Servo F1',
    bobotRataBuahGram: 85,
    tanggalTanam: dateOffsetYmd(-62),
    fase: 'Panen',
  },
  {
    id: 'plant-2',
    farmId: 'farm-1',
    nama: 'Tomat Servo #02',
    varietas: 'Servo F1',
    bobotRataBuahGram: 85,
    tanggalTanam: dateOffsetYmd(-55),
    fase: 'Berbuah',
  },
  {
    id: 'plant-3',
    farmId: 'farm-1',
    nama: 'Tomat Gustavi #03',
    varietas: 'Gustavi',
    bobotRataBuahGram: 95,
    tanggalTanam: dateOffsetYmd(-44),
    fase: 'Berbunga',
  },
  {
    id: 'plant-4',
    farmId: 'farm-1',
    nama: 'Tomat Rampai #04',
    varietas: 'Rampai',
    bobotRataBuahGram: 30,
    tanggalTanam: dateOffsetYmd(-26),
    fase: 'Vegetatif',
  },
  {
    id: 'plant-5',
    farmId: 'farm-1',
    nama: 'Semai Tomat #05',
    varietas: 'Servo F1',
    bobotRataBuahGram: 85,
    tanggalTanam: dateOffsetYmd(-11),
    fase: 'Bibit',
  },
  {
    id: 'plant-6',
    farmId: 'farm-2',
    nama: 'Tomat Ceri Atap #01',
    varietas: 'Tomat Ceri',
    bobotRataBuahGram: 25,
    tanggalTanam: dateOffsetYmd(-58),
    fase: 'Berbuah',
  },
  {
    id: 'plant-7',
    farmId: 'farm-1',
    nama: 'Cabai Rawit #01',
    varietas: 'Cabai Rawit',
    bobotRataBuahGram: 8,
    tanggalTanam: dateOffsetYmd(-38),
    fase: 'Berbuah',
  },
  {
    id: 'plant-8',
    farmId: 'farm-1',
    nama: 'Selada Hijau #01',
    varietas: 'Selada Keriting',
    bobotRataBuahGram: 150,
    tanggalTanam: dateOffsetYmd(-24),
    fase: 'Vegetatif',
  },
  {
    id: 'plant-9',
    farmId: 'farm-2',
    nama: 'Bayam Hijau #01',
    varietas: 'Bayam Hijau',
    bobotRataBuahGram: 40,
    tanggalTanam: dateOffsetYmd(-18),
    fase: 'Vegetatif',
  },
];

const presetCampur = DEMO_PHOTO_PRESETS[0].fotoUrl;
const presetSiap = DEMO_PHOTO_PRESETS[1].fotoUrl;
const presetBercak = DEMO_PHOTO_PRESETS[2].fotoUrl;
const presetKuning = DEMO_PHOTO_PRESETS[3].fotoUrl;

export const INITIAL_SCANS: ScanRecord[] = [
  {
    id: 'scan-1',
    plantId: 'plant-1',
    waktu: daysAgoIso(9, 7),
    bagian: 'buah',
    fotoUrl: presetCampur,
    boxes: [
      { id: 'b1', x: 16, y: 40, w: 20, h: 32, stage: 'mentah', confidence: 89 },
      { id: 'b2', x: 42, y: 38, w: 19, h: 30, stage: 'mentah', confidence: 86 },
      { id: 'b3', x: 66, y: 42, w: 19, h: 28, stage: 'setengah_matang', confidence: 84 },
    ],
    tahapDominan: 'mentah',
    jumlahBuah: 3,
    anjuranPanen: 'Tunggu',
    estimasiHariMin: 6,
    estimasiHariMax: 9,
    estimasiDisesuaikanRiwayat: false,
    estimasiBobotGram: 255,
    penyakitTop3: [
      { id: 'sehat', nama: 'Sehat', confidence: 92 },
      { id: 'bercak_kering', nama: 'Bercak daun kering (Early blight)', confidence: 5 },
      { id: 'bercak_bakteri', nama: 'Bercak bakteri', confidence: 3 },
    ],
    penyakitUtamaId: 'sehat',
    penyakitUtamaNama: 'Sehat',
    keyakinan: 89,
    keyakinanRendah: false,
    dugaanHaraId: 'cukup',
    dugaanHaraNama: 'Hara terlihat seimbang',
    pakaiDataSensor: true,
  },
  {
    id: 'scan-2',
    plantId: 'plant-1',
    waktu: daysAgoIso(4, 8),
    bagian: 'daun',
    fotoUrl: presetBercak,
    boxes: [],
    tahapDominan: null,
    jumlahBuah: 0,
    anjuranPanen: 'Fokus daun/batang',
    estimasiHariMin: null,
    estimasiHariMax: null,
    estimasiDisesuaikanRiwayat: false,
    estimasiBobotGram: 0,
    penyakitTop3: [
      { id: 'bercak_kering', nama: 'Bercak daun kering (Early blight)', confidence: 84 },
      { id: 'busuk_daun', nama: 'Busuk daun (Late blight)', confidence: 10 },
      { id: 'sehat', nama: 'Sehat', confidence: 6 },
    ],
    penyakitUtamaId: 'bercak_kering',
    penyakitUtamaNama: 'Bercak daun kering (Early blight)',
    keyakinan: 84,
    keyakinanRendah: false,
    dugaanHaraId: 'kurang_kalium',
    dugaanHaraNama: 'Dugaan kekurangan Kalium (K)',
    pakaiDataSensor: true,
  },
  {
    id: 'scan-3',
    plantId: 'plant-1',
    waktu: daysAgoIso(1, 7),
    bagian: 'buah',
    fotoUrl: presetSiap,
    boxes: [
      { id: 'b4', x: 14, y: 34, w: 18, h: 28, stage: 'matang', confidence: 94 },
      { id: 'b5', x: 35, y: 45, w: 20, h: 30, stage: 'matang', confidence: 92 },
      { id: 'b6', x: 56, y: 33, w: 18, h: 28, stage: 'matang', confidence: 91 },
      { id: 'b7', x: 73, y: 50, w: 17, h: 26, stage: 'matang', confidence: 89 },
    ],
    tahapDominan: 'matang',
    jumlahBuah: 4,
    anjuranPanen: 'Panen sekarang',
    estimasiHariMin: 0,
    estimasiHariMax: 1,
    estimasiDisesuaikanRiwayat: true,
    estimasiBobotGram: 340,
    penyakitTop3: [
      { id: 'sehat', nama: 'Sehat', confidence: 91 },
      { id: 'bercak_bakteri', nama: 'Bercak bakteri', confidence: 6 },
      { id: 'bercak_kering', nama: 'Bercak daun kering (Early blight)', confidence: 3 },
    ],
    penyakitUtamaId: 'sehat',
    penyakitUtamaNama: 'Sehat',
    keyakinan: 92,
    keyakinanRendah: false,
    dugaanHaraId: 'cukup',
    dugaanHaraNama: 'Hara terlihat seimbang',
    pakaiDataSensor: true,
  },
  {
    id: 'scan-4',
    plantId: 'plant-2',
    waktu: daysAgoIso(2, 9),
    bagian: 'buah',
    fotoUrl: presetCampur,
    boxes: [
      { id: 'b8', x: 16, y: 40, w: 21, h: 32, stage: 'matang', confidence: 91 },
      { id: 'b9', x: 41, y: 38, w: 20, h: 29, stage: 'setengah_matang', confidence: 88 },
      { id: 'b10', x: 66, y: 43, w: 19, h: 28, stage: 'mentah', confidence: 90 },
    ],
    tahapDominan: 'setengah_matang',
    jumlahBuah: 3,
    anjuranPanen: 'Tunggu',
    estimasiHariMin: 2,
    estimasiHariMax: 4,
    estimasiDisesuaikanRiwayat: false,
    estimasiBobotGram: 255,
    penyakitTop3: [
      { id: 'sehat', nama: 'Sehat', confidence: 90 },
      { id: 'bercak_kering', nama: 'Bercak daun kering (Early blight)', confidence: 7 },
      { id: 'bercak_bakteri', nama: 'Bercak bakteri', confidence: 3 },
    ],
    penyakitUtamaId: 'sehat',
    penyakitUtamaNama: 'Sehat',
    keyakinan: 90,
    keyakinanRendah: false,
    dugaanHaraId: 'cukup',
    dugaanHaraNama: 'Hara terlihat seimbang',
    pakaiDataSensor: true,
  },
  {
    id: 'scan-5',
    plantId: 'plant-3',
    waktu: daysAgoIso(1, 16),
    bagian: 'daun',
    fotoUrl: presetKuning,
    boxes: [],
    tahapDominan: null,
    jumlahBuah: 0,
    anjuranPanen: 'Fokus daun/batang',
    estimasiHariMin: null,
    estimasiHariMax: null,
    estimasiDisesuaikanRiwayat: false,
    estimasiBobotGram: 0,
    penyakitTop3: [
      { id: 'bercak_kering', nama: 'Bercak daun kering (Early blight)', confidence: 54 },
      { id: 'sehat', nama: 'Sehat', confidence: 31 },
      { id: 'busuk_daun', nama: 'Busuk daun (Late blight)', confidence: 15 },
    ],
    penyakitUtamaId: 'bercak_kering',
    penyakitUtamaNama: 'Bercak daun kering (Early blight)',
    keyakinan: 54,
    keyakinanRendah: true,
    dugaanHaraId: 'kurang_nitrogen',
    dugaanHaraNama: 'Dugaan kekurangan Nitrogen (N)',
    pakaiDataSensor: true,
  },
];

export const INITIAL_DEVICES: DeviceInfo[] = [
  {
    id: 'esp32-blok-a',
    farmId: 'farm-1',
    token: 'CT-ESP32-A91F',
    tipe: 'ESP32 + Tanah + DHT22 + BH1750 + Ultrasonik + INA219',
    status: 'aktif',
    simulasi: true,
  },
];

export const INITIAL_SENSOR_SNAPSHOT: SensorSnapshot = {
  deviceId: 'esp32-blok-a',
  waktu: new Date().toISOString(),
  kelembapanTanah: 48,
  nitrogenMgKg: 42,
  fosforMgKg: 28,
  kaliumMgKg: 54,
  suhuUdara: 26.5,
  kelembapanUdara: 76,
  durasiLembapTinggiJam: 2,
  cahayaLux: 28400,
  jarakUltrasonikCm: 38,
  tinggiTandonCm: 100,
  levelTandonPersen: 62,
  kapasitasTandonLiter: 500,
  teganganVolt: 12.6,
  arusMa: 88,
  dayaWatt: 1.11,
  bateraiPersen: 78,
  simulasi: true,
  sensorTersedia: true,
};

export const INITIAL_SENSOR_24H: SensorPoint24h[] = [
  { jam: '00:00', kelembapanTanah: 56, suhuUdara: 22, kelembapanUdara: 82, cahayaLux: 0 },
  { jam: '03:00', kelembapanTanah: 55, suhuUdara: 21, kelembapanUdara: 84, cahayaLux: 0 },
  { jam: '06:00', kelembapanTanah: 52, suhuUdara: 23, kelembapanUdara: 81, cahayaLux: 6200 },
  { jam: '09:00', kelembapanTanah: 44, suhuUdara: 27, kelembapanUdara: 74, cahayaLux: 29500 },
  { jam: '12:00', kelembapanTanah: 34, suhuUdara: 30, kelembapanUdara: 66, cahayaLux: 46800 },
  { jam: '15:00', kelembapanTanah: 58, suhuUdara: 28, kelembapanUdara: 71, cahayaLux: 31200 },
  { jam: '18:00', kelembapanTanah: 53, suhuUdara: 25, kelembapanUdara: 78, cahayaLux: 4100 },
  { jam: '21:00', kelembapanTanah: 48, suhuUdara: 24, kelembapanUdara: 76, cahayaLux: 0 },
];

export const INITIAL_IRRIGATION_EVENTS: IrrigationEvent[] = [
  {
    id: 'irr-1',
    deviceId: 'esp32-blok-a',
    mulai: daysAgoIso(0, 12),
    selesai: daysAgoIso(0, 12),
    durasiMenit: 9,
    kelembapanAwal: 33,
    kelembapanAkhir: 66,
    mode: 'Otomatis',
  },
  {
    id: 'irr-2',
    deviceId: 'esp32-blok-a',
    mulai: daysAgoIso(1, 7),
    selesai: daysAgoIso(1, 7),
    durasiMenit: 8,
    kelembapanAwal: 34,
    kelembapanAkhir: 65,
    mode: 'Otomatis',
  },
  {
    id: 'irr-3',
    deviceId: 'esp32-blok-a',
    mulai: daysAgoIso(2, 16),
    selesai: daysAgoIso(2, 16),
    durasiMenit: 6,
    kelembapanAwal: 41,
    kelembapanAkhir: 62,
    mode: 'Manual',
  },
];

export const INITIAL_HARVEST_EVENTS: HarvestEvent[] = [
  {
    id: 'harv-1',
    plantId: 'plant-1',
    tanggal: dateOffsetYmd(0),
    sumber: 'estimasi',
    catatan: '4 buah merah siap petik pagi hari',
    estimasiKg: 0.34,
  },
  {
    id: 'harv-2',
    plantId: 'plant-2',
    tanggal: dateOffsetYmd(3),
    sumber: 'estimasi',
    catatan: 'Setengah matang → perkiraan panen 2–4 hari',
    estimasiKg: 0.26,
  },
  {
    id: 'harv-3',
    plantId: 'plant-6',
    tanggal: dateOffsetYmd(5),
    sumber: 'estimasi',
    catatan: 'Tomat ceri atap mulai memerah',
    estimasiKg: 0.18,
  },
  {
    id: 'harv-4',
    plantId: 'plant-1',
    tanggal: dateOffsetYmd(-6),
    sumber: 'aktual',
    catatan: 'Panen gelombang 1 berjalan lancar',
    estimasiKg: 0.42,
  },
];

export const INITIAL_TASKS: FarmTask[] = [
  {
    id: 'task-1',
    farmId: 'farm-1',
    judul: 'Petik 4 buah matang di Tomat Servo #01',
    waktuLabel: 'Hari ini · Pagi',
    kategori: 'panen',
    selesai: false,
    plantId: 'plant-1',
  },
  {
    id: 'task-2',
    farmId: 'farm-1',
    judul: 'Foto ulang daun kuning Tomat Gustavi #03',
    waktuLabel: 'Hari ini · Siang',
    kategori: 'cek',
    selesai: false,
    plantId: 'plant-3',
  },
  {
    id: 'task-3',
    farmId: 'farm-1',
    judul: 'Tambah POC / kompos ringan ke bedengan Blok A',
    waktuLabel: 'Besok · 07:00',
    kategori: 'pupuk',
    selesai: false,
    plantId: 'plant-2',
  },
  {
    id: 'task-4',
    farmId: 'farm-1',
    judul: 'Cek pipa tetes & level tandon air',
    waktuLabel: 'Selesai kemarin',
    kategori: 'siram',
    selesai: true,
  },
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'chat-1',
    plantId: 'plant-1',
    peran: 'cermo',
    isi: 'Halo! Aku Cermo si Tomat. Aku sudah baca hasil scan terbaru kebunmu: Tomat Servo #01 punya 4 buah merah yang siap dipanen hari ini, sedangkan daun Tomat Gustavi #03 kemarin agak kuning dengan keyakinan rendah (54%). Mau tanya soal panen, penyakit, atau pupuk?',
    waktu: daysAgoIso(0, 7),
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    judul: 'Jadwal panen hari ini',
    isi: 'Tomat Servo #01 sudah matang. Cocok dipetik pagi ini.',
    waktu: 'Hari ini · 07:00',
    tipe: 'panen',
    dibaca: false,
  },
  {
    id: 'notif-2',
    judul: 'Scan daun perlu konfirmasi',
    isi: 'Hasil daun Tomat Gustavi #03 keyakinannya 54% (< 60%). Coba foto ulang di tempat terang atau tanya penyuluh.',
    waktu: 'Kemarin · 16:20',
    tipe: 'penyakit',
    dibaca: false,
  },
  {
    id: 'notif-3',
    judul: 'Siklus irigasi otomatis selesai',
    isi: 'Pompa menyala 9 menit (kelembapan tanah 33% → 66%). Data simulasi ESP32.',
    waktu: 'Kemarin · 12:15',
    tipe: 'tandon',
    dibaca: true,
  },
];

export const INITIAL_SETTINGS: AppSettings = {
  tema: 'light',
  ambangKeyakinanRendah: 60,
  irigasiOtomatis: true,
  pompaMenyala: false,
  ambangTanahBawah: 35,
  ambangTanahAtas: 65,
  durasiMaksPompaMenit: 15,
  ambangKelembapanRisikoPenyakit: 85,
  ambangTandonRendah: 20,
  ambangBateraiHemat: 20,
  simulasikanOffline: false,
};
