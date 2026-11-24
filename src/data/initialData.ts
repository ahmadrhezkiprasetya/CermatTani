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
  peran: 'Petani hortikultura 0,3 ha',
  telegramChatId: null,
  telegramLinkCode: '',
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
    nama: 'Cabai Rawit #01',
    varietas: 'Cabai Rawit',
    bobotRataBuahGram: 8,
    tanggalTanam: dateOffsetYmd(-62),
    fase: 'Panen',
  },
  {
    id: 'plant-2',
    farmId: 'farm-1',
    nama: 'Tomat Servo #01',
    varietas: 'Tomat Servo F1',
    bobotRataBuahGram: 85,
    tanggalTanam: dateOffsetYmd(-55),
    fase: 'Berbuah',
  },
  {
    id: 'plant-3',
    farmId: 'farm-1',
    nama: 'Terong Ungu #01',
    varietas: 'Terong Ungu',
    bobotRataBuahGram: 180,
    tanggalTanam: dateOffsetYmd(-44),
    fase: 'Berbunga',
  },
  {
    id: 'plant-4',
    farmId: 'farm-1',
    nama: 'Selada Keriting #01',
    varietas: 'Selada Keriting',
    bobotRataBuahGram: 150,
    tanggalTanam: dateOffsetYmd(-26),
    fase: 'Vegetatif',
  },
  {
    id: 'plant-5',
    farmId: 'farm-1',
    nama: 'Semai Pakcoy #01',
    varietas: 'Pakcoy',
    bobotRataBuahGram: 120,
    tanggalTanam: dateOffsetYmd(-11),
    fase: 'Bibit',
  },
  {
    id: 'plant-6',
    farmId: 'farm-2',
    nama: 'Stroberi Teras #01',
    varietas: 'Stroberi',
    bobotRataBuahGram: 20,
    tanggalTanam: dateOffsetYmd(-58),
    fase: 'Berbuah',
  },
  {
    id: 'plant-7',
    farmId: 'farm-2',
    nama: 'Bayam Hijau #01',
    varietas: 'Bayam Hijau',
    bobotRataBuahGram: 40,
    tanggalTanam: dateOffsetYmd(-18),
    fase: 'Vegetatif',
  },
];

/* Riwayat scan dimulai kosong — hanya berisi hasil analisis nyata dari model AI */
export const INITIAL_SCANS: ScanRecord[] = [];

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
    catatan: 'Stroberi teras mulai memerah siap panen',
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
    judul: 'Petik buah matang di Cabai Rawit #01',
    waktuLabel: 'Hari ini · Pagi',
    kategori: 'panen',
    selesai: false,
    plantId: 'plant-1',
  },
  {
    id: 'task-2',
    farmId: 'farm-1',
    judul: 'Cek kesehatan daun Terong Ungu #01',
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

/* Percakapan chatbot dimulai bersih tanpa pesan dummy */
export const INITIAL_CHAT: ChatMessage[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-siram-1',
    judul: 'Jadwal siram aktif (07:00 & 16:30)',
    isi: 'Pengingat waktu siram pagi dan sore sudah dijadwalkan. Kamu dapat mengubah jamnya kapan saja di tab Atur Jadwal.',
    waktu: 'Hari ini',
    tipe: 'siram',
    dibaca: false,
    severity: 'info',
    actionLabel: 'Buka Lahan',
    actionScreen: 'lahan',
  },
  {
    id: 'notif-1',
    judul: 'Siap memindai dengan Gemini AI',
    isi: 'Ambil foto buah, daun, atau batang di menu Scan untuk mendapatkan analisis real-time sesuai Dataset Agronomi.',
    waktu: 'Hari ini',
    tipe: 'panen',
    dibaca: false,
    severity: 'ok',
    actionLabel: 'Buka Scan',
    actionScreen: 'scan',
  },
  {
    id: 'notif-3',
    judul: 'Siklus irigasi otomatis selesai',
    isi: 'Pompa menyala 9 menit (kelembapan tanah 33% → 66%). Data simulasi ESP32.',
    waktu: 'Kemarin · 12:15',
    tipe: 'tandon',
    dibaca: true,
    severity: 'info',
    actionLabel: 'Cek Irigasi',
    actionScreen: 'lahan',
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
  peringatanOtomatisSensor: true,
  notifikasiBrowser: false,
  jadwalPengingat: [
    {
      id: 'rem-siram-pagi',
      label: 'Waktu siram pagi',
      kategori: 'siram',
      jam: '07:00',
      aktif: true,
      catatan: 'Siram langsung di pangkal batang sebelum matahari terik agar air terserap optimal.',
    },
    {
      id: 'rem-siram-sore',
      label: 'Waktu siram sore',
      kategori: 'siram',
      jam: '16:30',
      aktif: true,
      catatan: 'Periksa kelembapan tanah sore ini dan siram secukupnya bila tanah mulai kering.',
    },
    {
      id: 'rem-cek-daun',
      label: 'Cek daun & gejala penyakit',
      kategori: 'cek_daun',
      jam: '08:30',
      aktif: true,
      catatan: 'Amati bagian bawah daun dan lakukan scan foto bila muncul bercak atau menguning.',
    },
    {
      id: 'rem-pupuk',
      label: 'Jadwal pemupukan organik',
      kategori: 'pupuk',
      jam: '09:00',
      aktif: false,
      catatan: 'Tambahkan kompos matang atau POC ringan sesuai fase tumbuh tanaman.',
    },
    {
      id: 'rem-panen',
      label: 'Pengingat panen harian',
      kategori: 'panen',
      jam: '07:15',
      aktif: true,
      catatan: 'Cek buah tomat matang merah merata di kalender panen untuk dipetik pagi hari.',
    },
  ],
};
