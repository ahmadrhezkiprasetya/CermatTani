/* Model Data Inti sesuai PRD (1).md §9 */

export type ScreenId =
  | 'beranda'
  | 'scan'
  | 'tanaman'
  | 'kalender'
  | 'lahan'
  | 'energi'
  | 'cermo'
  | 'pengaturan';

export type PlantPart = 'buah' | 'daun' | 'batang';

export type RipenessStage = 'mentah' | 'setengah_matang' | 'matang';

export type GrowthPhase = 'Bibit' | 'Vegetatif' | 'Berbunga' | 'Berbuah' | 'Panen';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserProfile {
  id: string;
  nama: string;
  peran: string;
  telegramChatId: string | null;
  telegramLinkCode: string;
  telegramReminderTime: string;
  bahasa: 'id';
}

export interface Farm {
  id: string;
  userId: string;
  nama: string;
  lokasi: string;
  luasLabel: string;
}

export interface Plant {
  id: string;
  farmId: string;
  nama: string;
  varietas: string;
  bobotRataBuahGram: number;
  tanggalTanam: string; // YYYY-MM-DD
  fase: GrowthPhase;
}

export interface DetectionBox {
  id: string;
  x: number; // percent 0..100
  y: number;
  w: number;
  h: number;
  stage: RipenessStage;
  confidence: number; // 0..100
}

export interface DiseasePrediction {
  id: string;
  nama: string;
  confidence: number; // 0..100
}

export interface ScanRecord {
  id: string;
  plantId: string;
  waktu: string; // ISO string
  bagian: PlantPart;
  fotoUrl: string;
  fotoUkuranAsliKb?: number;
  fotoUkuranKompresKb?: number;
  // Kematangan (F1) & Estimasi hasil (F6)
  boxes: DetectionBox[];
  tahapDominan: RipenessStage | null;
  jumlahBuah: number;
  anjuranPanen: 'Panen sekarang' | 'Tunggu' | 'Perlu foto ulang' | 'Fokus daun/batang';
  estimasiHariMin: number | null;
  estimasiHariMax: number | null;
  estimasiDisesuaikanRiwayat: boolean;
  estimasiBobotGram: number;
  // Penyakit (F2)
  penyakitTop3: DiseasePrediction[];
  penyakitUtamaId: string;
  penyakitUtamaNama: string;
  keyakinan: number; // 0..100
  keyakinanRendah: boolean;
  // Pupuk / Hara (F3)
  dugaanHaraId: string;
  dugaanHaraNama: string;
  pakaiDataSensor: boolean;
  // Foto gagal deteksi buah (F1.5)
  tanpaBuahTerdeteksi?: boolean;
}

export interface KnowledgeDisease {
  id: string;
  penyakit: string;
  bagianUmum: PlantPart[];
  penyebab: string;
  gejala: string;
  solusiOrganik: string[];
  solusiKimia: string[];
  pencegahan: string[];
  sumber: string;
}

export interface KnowledgeNutrient {
  id: string;
  gejala: string;
  dugaan: string;
  rekomendasiOrganik: string;
  rekomendasiPupuk: string;
  dosisPerFase: Record<GrowthPhase, string>;
  sumber: string;
}

export interface DeviceInfo {
  id: string;
  farmId: string;
  token: string;
  tipe: string;
  status: 'aktif' | 'mode_hemat' | 'offline';
  simulasi: boolean;
}

export interface SensorPoint24h {
  jam: string;
  kelembapanTanah: number; // %
  suhuUdara: number; // °C
  kelembapanUdara: number; // %
  cahayaLux: number; // lux
}

export interface SensorSnapshot {
  deviceId: string;
  waktu: string;
  kelembapanTanah: number; // %
  nitrogenMgKg: number;
  fosforMgKg: number;
  kaliumMgKg: number;
  suhuUdara: number; // °C
  kelembapanUdara: number; // % RH (DHT22/BME280)
  durasiLembapTinggiJam: number;
  cahayaLux: number; // BH1750
  jarakUltrasonikCm: number; // F12.1
  tinggiTandonCm: number;
  levelTandonPersen: number; // F12
  kapasitasTandonLiter: number;
  // F13 INA219
  teganganVolt: number;
  arusMa: number;
  dayaWatt: number;
  bateraiPersen: number;
  simulasi: boolean;
  sensorTersedia: boolean;
}

export interface IrrigationEvent {
  id: string;
  deviceId: string;
  mulai: string;
  selesai: string;
  durasiMenit: number;
  kelembapanAwal: number;
  kelembapanAkhir: number;
  mode: 'Otomatis' | 'Manual';
}

export interface HarvestEvent {
  id: string;
  plantId: string;
  tanggal: string; // YYYY-MM-DD
  sumber: 'estimasi' | 'aktual';
  catatan: string;
  estimasiKg?: number;
}

export interface ChatMessage {
  id: string;
  plantId: string | null;
  peran: 'cermo' | 'pengguna';
  isi: string;
  waktu: string;
}

export interface FarmTask {
  id: string;
  farmId: string;
  judul: string;
  waktuLabel: string;
  kategori: 'panen' | 'siram' | 'pupuk' | 'cek';
  selesai: boolean;
  plantId?: string;
}

export interface AppSettings {
  tema: ThemePreference;
  ambangKeyakinanRendah: number; // F2.4 default 60
  irigasiOtomatis: boolean; // F10
  pompaMenyala: boolean;
  ambangTanahBawah: number; // F10.1 default 35
  ambangTanahAtas: number; // F10.1 default 65
  durasiMaksPompaMenit: number; // F10.2 default 15
  ambangKelembapanRisikoPenyakit: number; // F11.3 default 85
  ambangTandonRendah: number; // F12.2 default 20
  ambangBateraiHemat: number; // F13.2 default 20
  simulasikanOffline: boolean;
}

export interface OfflineQueueItem {
  id: string;
  plantId: string;
  bagian: PlantPart;
  fotoUrl: string;
  presetId?: string;
  waktuAntre: string;
}

export interface NotificationItem {
  id: string;
  judul: string;
  isi: string;
  waktu: string;
  tipe: 'telegram' | 'penyakit' | 'tandon' | 'panen' | 'energi';
  dibaca: boolean;
}
