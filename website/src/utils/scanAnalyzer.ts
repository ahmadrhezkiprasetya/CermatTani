import {
  DetectionBox,
  DiseasePrediction,
  Plant,
  PlantPart,
  RipenessStage,
  ScanRecord,
} from '../types/cermattani';
import { KNOWLEDGE_DISEASES, KNOWLEDGE_NUTRIENTS, RIPENESS_REFERENCE } from '../data/knowledgeBase';

export interface CompressedPhotoResult {
  dataUrl: string;
  originalKb: number;
  compressedKb: number;
  width: number;
  height: number;
}

/* F1.1: Validasi format & ukuran ≤ 10 MB, kompres di sisi klien lewat Canvas */
export async function compressImageClient(file: File): Promise<CompressedPhotoResult> {
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Ukuran foto melebihi 10 MB. Pilih foto yang lebih kecil lalu coba lagi.');
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
  const extOk = /\.(jpe?g|png|heic|heif|webp)$/i.test(file.name);
  if (!validTypes.includes(file.type.toLowerCase()) && !extOk) {
    throw new Error('Format foto belum didukung. Gunakan foto JPG, PNG, atau HEIC.');
  }

  const originalKb = Math.max(1, Math.round(file.size / 1024));

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file foto. Coba pilih ulang.'));
    reader.readAsDataURL(file);
  });

  return new Promise<CompressedPhotoResult>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 960;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, originalKb, compressedKb: originalKb, width: w, height: h });
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.78);
      const approxKb = Math.max(8, Math.round((compressed.length * 0.75) / 1024));
      resolve({
        dataUrl: compressed,
        originalKb,
        compressedKb: Math.min(approxKb, originalKb),
        width: w,
        height: h,
      });
    };
    img.onerror = () => {
      // Fallback untuk HEIC di browser yang tidak decode native
      resolve({
        dataUrl,
        originalKb,
        compressedKb: Math.max(24, Math.round(originalKb * 0.55)),
        width: 640,
        height: 420,
      });
    };
    img.src = dataUrl;
  });
}

/* Analisis warna piksel sederhana untuk foto sungguhan yang diunggah pengguna */
async function analyzeImagePixels(dataUrl: string): Promise<{
  brightness: number;
  redRatio: number;
  orangeRatio: number;
  greenRatio: number;
  yellowRatio: number;
  brownRatio: number;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = 96;
      const h = 64;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ brightness: 120, redRatio: 0.15, orangeRatio: 0.08, greenRatio: 0.35, yellowRatio: 0.05, brownRatio: 0.03 });
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let lumSum = 0;
      let red = 0;
      let orange = 0;
      let green = 0;
      let yellow = 0;
      let brown = 0;
      const total = w * h;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        lumSum += 0.299 * r + 0.587 * g + 0.114 * b;

        if (r > 150 && r > g * 1.45 && r > b * 1.6) {
          red++;
        } else if (r > 165 && g > 95 && g < 185 && b < 110) {
          orange++;
        } else if (r > 150 && g > 145 && b < 110) {
          yellow++;
        } else if (r > 70 && r < 145 && g > 40 && g < 105 && b < 75 && r > g) {
          brown++;
        } else if (g > 70 && g > r * 1.12 && g > b * 1.1) {
          green++;
        }
      }

      resolve({
        brightness: lumSum / total,
        redRatio: red / total,
        orangeRatio: orange / total,
        greenRatio: green / total,
        yellowRatio: yellow / total,
        brownRatio: brown / total,
      });
    };
    img.onerror = () => {
      resolve({ brightness: 125, redRatio: 0.14, orangeRatio: 0.1, greenRatio: 0.3, yellowRatio: 0.06, brownRatio: 0.03 });
    };
    img.src = dataUrl;
  });
}

/* F1.3: Penyesuaian estimasi hari panen jika tanaman punya ≥ 2 scan buah sebelumnya */
function adjustHarvestRangeFromHistory(
  baseMin: number,
  baseMax: number,
  stage: RipenessStage,
  previousScans: ScanRecord[]
): { min: number; max: number; adjusted: boolean } {
  const fruitScans = previousScans.filter((s) => s.bagian === 'buah' && s.tahapDominan);
  if (fruitScans.length < 2 || stage === 'matang') {
    return { min: baseMin, max: baseMax, adjusted: fruitScans.length >= 2 };
  }
  const latest = fruitScans[0];
  const earlier = fruitScans[1];
  const stageOrder: Record<RipenessStage, number> = {
    mentah: 1,
    setengah_matang: 2,
    matang: 3,
  };
  const prog = stageOrder[stage] - stageOrder[earlier.tahapDominan || 'mentah'];
  if (prog > 0 && latest) {
    // Perubahan warna lebih cepat dari rata-rata → kurangi 1 hari
    return {
      min: Math.max(1, baseMin - 1),
      max: Math.max(2, baseMax - 1),
      adjusted: true,
    };
  }
  return { min: baseMin, max: baseMax, adjusted: true };
}

export async function runTomatoScanAnalysis(params: {
  plant: Plant;
  bagian: PlantPart;
  fotoUrl: string;
  presetId?: string;
  originalKb?: number;
  compressedKb?: number;
  sensorAvailable: boolean;
  lowConfidenceThreshold: number;
  previousPlantScans: ScanRecord[];
}): Promise<ScanRecord> {
  const {
    plant,
    bagian,
    fotoUrl,
    presetId,
    originalKb,
    compressedKb,
    sensorAvailable,
    lowConfidenceThreshold,
    previousPlantScans,
  } = params;

  const id = `scan-${Date.now()}`;
  const waktu = new Date().toISOString();

  // Skenario preset demo yang terukur & konsisten
  if (presetId === 'foto_kosong') {
    return {
      id,
      plantId: plant.id,
      waktu,
      bagian,
      fotoUrl,
      fotoUkuranAsliKb: originalKb,
      fotoUkuranKompresKb: compressedKb,
      boxes: [],
      tahapDominan: null,
      jumlahBuah: 0,
      anjuranPanen: 'Perlu foto ulang',
      estimasiHariMin: null,
      estimasiHariMax: null,
      estimasiDisesuaikanRiwayat: false,
      estimasiBobotGram: 0,
      penyakitTop3: [
        { id: 'sehat', nama: 'Sehat', confidence: 42 },
        { id: 'bercak_kering', nama: 'Bercak daun kering (Early blight)', confidence: 33 },
        { id: 'busuk_daun', nama: 'Busuk daun (Late blight)', confidence: 25 },
      ],
      penyakitUtamaId: 'sehat',
      penyakitUtamaNama: 'Sehat',
      keyakinan: 42,
      keyakinanRendah: true,
      dugaanHaraId: 'cukup',
      dugaanHaraNama: KNOWLEDGE_NUTRIENTS.cukup.dugaan,
      pakaiDataSensor: sensorAvailable,
      tanpaBuahTerdeteksi: true,
    };
  }

  if (presetId === 'buah_campur') {
    const boxes: DetectionBox[] = [
      { id: 'bx-1', x: 15, y: 40, w: 22, h: 33, stage: 'matang', confidence: 92 },
      { id: 'bx-2', x: 40, y: 38, w: 21, h: 30, stage: 'setengah_matang', confidence: 88 },
      { id: 'bx-3', x: 65, y: 43, w: 20, h: 29, stage: 'mentah', confidence: 90 },
    ];
    const ref = RIPENESS_REFERENCE.setengah_matang;
    const adj = adjustHarvestRangeFromHistory(ref.minDays, ref.maxDays, 'setengah_matang', previousPlantScans);
    return {
      id,
      plantId: plant.id,
      waktu,
      bagian: 'buah',
      fotoUrl,
      fotoUkuranAsliKb: originalKb,
      fotoUkuranKompresKb: compressedKb,
      boxes,
      tahapDominan: 'setengah_matang',
      jumlahBuah: boxes.length,
      anjuranPanen: 'Tunggu',
      estimasiHariMin: adj.min,
      estimasiHariMax: adj.max,
      estimasiDisesuaikanRiwayat: adj.adjusted,
      estimasiBobotGram: boxes.length * plant.bobotRataBuahGram,
      penyakitTop3: [
        { id: 'sehat', nama: 'Sehat', confidence: 91 },
        { id: 'bercak_bakteri', nama: 'Bercak bakteri', confidence: 6 },
        { id: 'bercak_kering', nama: 'Bercak daun kering (Early blight)', confidence: 3 },
      ],
      penyakitUtamaId: 'sehat',
      penyakitUtamaNama: 'Sehat',
      keyakinan: 90,
      keyakinanRendah: 90 < lowConfidenceThreshold,
      dugaanHaraId: 'cukup',
      dugaanHaraNama: KNOWLEDGE_NUTRIENTS.cukup.dugaan,
      pakaiDataSensor: sensorAvailable,
    };
  }

  if (presetId === 'buah_siap_panen') {
    const boxes: DetectionBox[] = [
      { id: 'bx-1', x: 14, y: 33, w: 19, h: 28, stage: 'matang', confidence: 95 },
      { id: 'bx-2', x: 34, y: 44, w: 20, h: 31, stage: 'matang', confidence: 93 },
      { id: 'bx-3', x: 55, y: 33, w: 19, h: 28, stage: 'matang', confidence: 92 },
      { id: 'bx-4', x: 72, y: 49, w: 18, h: 26, stage: 'matang', confidence: 90 },
    ];
    return {
      id,
      plantId: plant.id,
      waktu,
      bagian: 'buah',
      fotoUrl,
      fotoUkuranAsliKb: originalKb,
      fotoUkuranKompresKb: compressedKb,
      boxes,
      tahapDominan: 'matang',
      jumlahBuah: boxes.length,
      anjuranPanen: 'Panen sekarang',
      estimasiHariMin: 0,
      estimasiHariMax: 1,
      estimasiDisesuaikanRiwayat: previousPlantScans.filter((s) => s.bagian === 'buah').length >= 2,
      estimasiBobotGram: boxes.length * plant.bobotRataBuahGram,
      penyakitTop3: [
        { id: 'sehat', nama: 'Sehat', confidence: 94 },
        { id: 'bercak_bakteri', nama: 'Bercak bakteri', confidence: 4 },
        { id: 'busuk_daun', nama: 'Busuk daun (Late blight)', confidence: 2 },
      ],
      penyakitUtamaId: 'sehat',
      penyakitUtamaNama: 'Sehat',
      keyakinan: 93,
      keyakinanRendah: 93 < lowConfidenceThreshold,
      dugaanHaraId: 'cukup',
      dugaanHaraNama: KNOWLEDGE_NUTRIENTS.cukup.dugaan,
      pakaiDataSensor: sensorAvailable,
    };
  }

  if (presetId === 'daun_bercak') {
    const topConf = 86;
    return {
      id,
      plantId: plant.id,
      waktu,
      bagian: 'daun',
      fotoUrl,
      fotoUkuranAsliKb: originalKb,
      fotoUkuranKompresKb: compressedKb,
      boxes: [],
      tahapDominan: null,
      jumlahBuah: 0,
      anjuranPanen: 'Fokus daun/batang',
      estimasiHariMin: null,
      estimasiHariMax: null,
      estimasiDisesuaikanRiwayat: false,
      estimasiBobotGram: 0,
      penyakitTop3: [
        { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: topConf },
        { id: 'busuk_daun', nama: KNOWLEDGE_DISEASES.busuk_daun.penyakit, confidence: 9 },
        { id: 'sehat', nama: KNOWLEDGE_DISEASES.sehat.penyakit, confidence: 5 },
      ],
      penyakitUtamaId: 'bercak_kering',
      penyakitUtamaNama: KNOWLEDGE_DISEASES.bercak_kering.penyakit,
      keyakinan: topConf,
      keyakinanRendah: topConf < lowConfidenceThreshold,
      dugaanHaraId: 'kurang_kalium',
      dugaanHaraNama: KNOWLEDGE_NUTRIENTS.kurang_kalium.dugaan,
      pakaiDataSensor: sensorAvailable,
    };
  }

  if (presetId === 'daun_kuning_ragu') {
    const topConf = 54;
    return {
      id,
      plantId: plant.id,
      waktu,
      bagian: 'daun',
      fotoUrl,
      fotoUkuranAsliKb: originalKb,
      fotoUkuranKompresKb: compressedKb,
      boxes: [],
      tahapDominan: null,
      jumlahBuah: 0,
      anjuranPanen: 'Fokus daun/batang',
      estimasiHariMin: null,
      estimasiHariMax: null,
      estimasiDisesuaikanRiwayat: false,
      estimasiBobotGram: 0,
      penyakitTop3: [
        { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: topConf },
        { id: 'sehat', nama: KNOWLEDGE_DISEASES.sehat.penyakit, confidence: 31 },
        { id: 'busuk_daun', nama: KNOWLEDGE_DISEASES.busuk_daun.penyakit, confidence: 15 },
      ],
      penyakitUtamaId: 'bercak_kering',
      penyakitUtamaNama: KNOWLEDGE_DISEASES.bercak_kering.penyakit,
      keyakinan: topConf,
      keyakinanRendah: topConf < lowConfidenceThreshold,
      dugaanHaraId: 'kurang_nitrogen',
      dugaanHaraNama: KNOWLEDGE_NUTRIENTS.kurang_nitrogen.dugaan,
      pakaiDataSensor: sensorAvailable,
    };
  }

  // Analisis foto asli unggahan pengguna (pixel HSV analysis)
  const px = await analyzeImagePixels(fotoUrl);

  if (bagian === 'buah') {
    if (px.brightness < 38 || (px.redRatio + px.orangeRatio + px.greenRatio < 0.04)) {
      return {
        id,
        plantId: plant.id,
        waktu,
        bagian,
        fotoUrl,
        fotoUkuranAsliKb: originalKb,
        fotoUkuranKompresKb: compressedKb,
        boxes: [],
        tahapDominan: null,
        jumlahBuah: 0,
        anjuranPanen: 'Perlu foto ulang',
        estimasiHariMin: null,
        estimasiHariMax: null,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 0,
        penyakitTop3: [
          { id: 'sehat', nama: 'Sehat', confidence: 48 },
          { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: 30 },
          { id: 'busuk_daun', nama: KNOWLEDGE_DISEASES.busuk_daun.penyakit, confidence: 22 },
        ],
        penyakitUtamaId: 'sehat',
        penyakitUtamaNama: 'Sehat',
        keyakinan: 48,
        keyakinanRendah: true,
        dugaanHaraId: 'cukup',
        dugaanHaraNama: KNOWLEDGE_NUTRIENTS.cukup.dugaan,
        pakaiDataSensor: sensorAvailable,
        tanpaBuahTerdeteksi: true,
      };
    }

    const boxes: DetectionBox[] = [];
    if (px.redRatio >= 0.05) {
      boxes.push({ id: 'u-1', x: 20, y: 32, w: 26, h: 36, stage: 'matang', confidence: 88 });
    }
    if (px.orangeRatio >= 0.03) {
      boxes.push({ id: 'u-2', x: 52, y: 36, w: 24, h: 34, stage: 'setengah_matang', confidence: 82 });
    }
    if (boxes.length === 0) {
      boxes.push({ id: 'u-3', x: 34, y: 30, w: 30, h: 38, stage: 'mentah', confidence: 79 });
    }

    const dominant: RipenessStage =
      px.redRatio >= 0.08 ? 'matang' : px.orangeRatio >= 0.03 ? 'setengah_matang' : 'mentah';
    const ref = RIPENESS_REFERENCE[dominant];
    const adj = adjustHarvestRangeFromHistory(ref.minDays, ref.maxDays, dominant, previousPlantScans);
    const topConf = Math.max(...boxes.map((b) => b.confidence));

    return {
      id,
      plantId: plant.id,
      waktu,
      bagian,
      fotoUrl,
      fotoUkuranAsliKb: originalKb,
      fotoUkuranKompresKb: compressedKb,
      boxes,
      tahapDominan: dominant,
      jumlahBuah: boxes.length,
      anjuranPanen: ref.anjuran,
      estimasiHariMin: adj.min,
      estimasiHariMax: adj.max,
      estimasiDisesuaikanRiwayat: adj.adjusted,
      estimasiBobotGram: boxes.length * plant.bobotRataBuahGram,
      penyakitTop3: [
        { id: 'sehat', nama: 'Sehat', confidence: 86 },
        { id: 'bercak_bakteri', nama: KNOWLEDGE_DISEASES.bercak_bakteri.penyakit, confidence: 9 },
        { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: 5 },
      ],
      penyakitUtamaId: 'sehat',
      penyakitUtamaNama: 'Sehat',
      keyakinan: topConf,
      keyakinanRendah: topConf < lowConfidenceThreshold,
      dugaanHaraId: px.yellowRatio > 0.14 ? 'kurang_kalium' : 'cukup',
      dugaanHaraNama:
        px.yellowRatio > 0.14 ? KNOWLEDGE_NUTRIENTS.kurang_kalium.dugaan : KNOWLEDGE_NUTRIENTS.cukup.dugaan,
      pakaiDataSensor: sensorAvailable,
    };
  }

  // Analisis Daun / Batang untuk foto unggahan pengguna
  let penyakitTop3: DiseasePrediction[];
  let dugaanHaraId = 'cukup';

  if (bagian === 'batang') {
    if (px.brownRatio > 0.12) {
      penyakitTop3 = [
        { id: 'layu_batang', nama: KNOWLEDGE_DISEASES.layu_batang.penyakit, confidence: 76 },
        { id: 'busuk_daun', nama: KNOWLEDGE_DISEASES.busuk_daun.penyakit, confidence: 14 },
        { id: 'sehat', nama: 'Sehat', confidence: 10 },
      ];
    } else {
      penyakitTop3 = [
        { id: 'sehat', nama: 'Sehat', confidence: 83 },
        { id: 'layu_batang', nama: KNOWLEDGE_DISEASES.layu_batang.penyakit, confidence: 11 },
        { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: 6 },
      ];
    }
  } else {
    if (px.brownRatio > 0.08) {
      penyakitTop3 = [
        { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: 81 },
        { id: 'busuk_daun', nama: KNOWLEDGE_DISEASES.busuk_daun.penyakit, confidence: 12 },
        { id: 'sehat', nama: 'Sehat', confidence: 7 },
      ];
      dugaanHaraId = 'kurang_kalium';
    } else if (px.yellowRatio > 0.12) {
      penyakitTop3 = [
        { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: 56 },
        { id: 'sehat', nama: 'Sehat', confidence: 29 },
        { id: 'busuk_daun', nama: KNOWLEDGE_DISEASES.busuk_daun.penyakit, confidence: 15 },
      ];
      dugaanHaraId = 'kurang_nitrogen';
    } else {
      penyakitTop3 = [
        { id: 'sehat', nama: 'Sehat', confidence: 87 },
        { id: 'bercak_kering', nama: KNOWLEDGE_DISEASES.bercak_kering.penyakit, confidence: 8 },
        { id: 'bercak_bakteri', nama: KNOWLEDGE_DISEASES.bercak_bakteri.penyakit, confidence: 5 },
      ];
      dugaanHaraId = 'cukup';
    }
  }

  const top = penyakitTop3[0];
  return {
    id,
    plantId: plant.id,
    waktu,
    bagian,
    fotoUrl,
    fotoUkuranAsliKb: originalKb,
    fotoUkuranKompresKb: compressedKb,
    boxes: [],
    tahapDominan: null,
    jumlahBuah: 0,
    anjuranPanen: 'Fokus daun/batang',
    estimasiHariMin: null,
    estimasiHariMax: null,
    estimasiDisesuaikanRiwayat: false,
    estimasiBobotGram: 0,
    penyakitTop3,
    penyakitUtamaId: top.id,
    penyakitUtamaNama: top.nama,
    keyakinan: top.confidence,
    keyakinanRendah: top.confidence < lowConfidenceThreshold,
    dugaanHaraId,
    dugaanHaraNama: KNOWLEDGE_NUTRIENTS[dugaanHaraId].dugaan,
    pakaiDataSensor: sensorAvailable,
  };
}

/* Ekspor CSV (X4) */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
