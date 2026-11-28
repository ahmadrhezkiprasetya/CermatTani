import {
  Plant,
  PlantPart,
  RipenessStage,
  ScanRecord,
} from '../types/cermattani';

export interface CompressedPhotoResult {
  dataUrl: string;
  originalKb: number;
  compressedKb: number;
  width: number;
  height: number;
}

export interface ScanAnalysisOutput {
  record: ScanRecord;
  aiProvider: 'koboillm' | 'gemini';
  aiModel: string;
  aiNote?: string;
  temuanVisual?: string[];
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
    throw new Error('Format foto belum didukung. Gunakan foto JPG, PNG, WebP, atau HEIC.');
  }

  const originalKb = Math.max(1, Math.round(file.size / 1024));

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file foto. Coba pilih ulang.'));
    reader.readAsDataURL(file);
  });

  return compressDataUrlClient(dataUrl, originalKb);
}

/* Kompresi Data URL (dipakai baik oleh file upload maupun jepretan kamera langsung) */
export async function compressDataUrlClient(
  dataUrl: string,
  originalKbHint?: number
): Promise<CompressedPhotoResult> {
  const originalKb =
    originalKbHint ?? Math.max(1, Math.round((dataUrl.length * 0.75) / 1024));

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
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
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
      resolve({
        dataUrl,
        originalKb,
        compressedKb: Math.max(24, Math.round(originalKb * 0.6)),
        width: 640,
        height: 420,
      });
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
    return {
      min: Math.max(1, baseMin - 1),
      max: Math.max(2, baseMax - 1),
      adjusted: true,
    };
  }
  return { min: baseMin, max: baseMax, adjusted: true };
}

export async function runTomatoScanAnalysis(params: {
  plant: Plant | null;
  bagian?: PlantPart | 'auto';
  fotoUrl: string;
  originalKb?: number;
  compressedKb?: number;
  sensorAvailable: boolean;
  lowConfidenceThreshold: number;
  previousPlantScans: ScanRecord[];
}): Promise<ScanRecord> {
  const out = await runSmartPlantScan(params);
  return out.record;
}

/* Cache hasil scan di memori sesi: foto yang sama + tanaman target yang sama → 0 token (tidak memanggil AI lagi) */
const SCAN_CACHE_LIMIT = 20;
const scanResultCache = new Map<string, unknown>();

/** Hash FNV-1a 32-bit dari data foto (cukup untuk mengenali foto yang identik). */
function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + ':' + input.length.toString(36);
}

/* Analisis Vision 100% nyata lewat /api/scan (Gemini AI + Dataset Agronomi v2.1, auto-deteksi konteks) */
export async function runSmartPlantScan(params: {
  plant: Plant | null;
  bagian?: PlantPart | 'auto';
  fotoUrl: string;
  originalKb?: number;
  compressedKb?: number;
  sensorAvailable: boolean;
  lowConfidenceThreshold: number;
  previousPlantScans: ScanRecord[];
}): Promise<ScanAnalysisOutput> {
  const {
    plant,
    bagian = 'auto',
    fotoUrl,
    originalKb,
    compressedKb,
    sensorAvailable,
    lowConfidenceThreshold,
    previousPlantScans,
  } = params;

  if (!fotoUrl.startsWith('data:image/') || fotoUrl.startsWith('data:image/svg')) {
    throw new Error('Gunakan foto tanaman asli dari kamera atau unggah gambar JPG/PNG/WebP/HEIC.');
  }

  const cacheKey = `${hashString(fotoUrl)}|${plant?.id ?? ''}|${bagian}`;
  const cached = scanResultCache.get(cacheKey);
  let data = cached as Record<string, any> | null | undefined;
  const fromCache = Boolean(cached);

  if (!data) {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fotoUrl,
        bagian,
        plant,
        sensorAvailable,
        lowConfidenceThreshold,
      }),
    });

    data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok || !data.scan) {
      throw new Error(
        data?.error ||
          'Cermo sedang sibuk memeriksa banyak foto. Coba pindai ulang dalam beberapa saat ya.'
      );
    }
    scanResultCache.set(cacheKey, data);
    if (scanResultCache.size > SCAN_CACHE_LIMIT) {
      const oldest = scanResultCache.keys().next().value;
      if (oldest !== undefined) scanResultCache.delete(oldest);
    }
  }

  const s = data.scan;
  const detectedPart: PlantPart =
    s.bagian === 'buah' || s.bagian === 'daun' || s.bagian === 'batang' ? s.bagian : 'buah';
  let minDays = s.estimasiHariMin as number | null;
  let maxDays = s.estimasiHariMax as number | null;
  let adjusted = false;
  if (s.fokusOutput === 'kematangan' && s.tahapDominan && minDays !== null && maxDays !== null) {
    const adj = adjustHarvestRangeFromHistory(minDays, maxDays, s.tahapDominan, previousPlantScans);
    minDays = adj.min;
    maxDays = adj.max;
    adjusted = adj.adjusted;
  }

  const id = `scan-${Date.now()}`;
  const waktu = new Date().toISOString();
  const aiModel = String(data.aiModel || s.aiModel || 'AI');

  return {
    aiProvider: data.aiProvider === 'gemini' ? 'gemini' : 'koboillm',
    aiModel,
    aiNote: data.ringkasanSingkat || data.alasanTidakTerdeteksi || undefined,
    temuanVisual: Array.isArray(data.temuanVisual) ? data.temuanVisual : [],
    record: {
      id,
      plantId: plant?.id ?? '',
      waktu,
      bagian: detectedPart,
      fokusOutput: s.fokusOutput,
      penyakitRinganId: s.penyakitRinganId ?? null,
      adaGejalaHara: Boolean(s.adaGejalaHara),
      fotoUrl,
      fotoUkuranAsliKb: originalKb,
      fotoUkuranKompresKb: compressedKb,
      boxes: s.boxes,
      tahapDominan: s.tahapDominan,
      jumlahBuah: s.jumlahBuah,
      anjuranPanen: s.anjuranPanen,
      estimasiHariMin: minDays,
      estimasiHariMax: maxDays,
      estimasiDisesuaikanRiwayat: adjusted,
      estimasiBobotGram: s.estimasiBobotGram,
      penyakitTop3: s.penyakitTop3,
      penyakitUtamaId: s.penyakitUtamaId,
      penyakitUtamaNama: s.penyakitUtamaNama,
      keyakinan: s.keyakinan,
      keyakinanRendah: s.keyakinanRendah,
      dugaanHaraId: s.dugaanHaraId,
      dugaanHaraNama: s.dugaanHaraNama,
      pakaiDataSensor: sensorAvailable,
      tanpaBuahTerdeteksi: s.tanpaBuahTerdeteksi,
      diluarKonteksTanaman: s.diluarKonteksTanaman,
      objekTeridentifikasi: s.objekTeridentifikasi || undefined,
      jenisTidakSesuai: Boolean(s.jenisTidakSesuai),
      penjelasanJenis: s.penjelasanJenis || undefined,
      perbandinganJenis: Array.isArray(s.perbandinganJenis) ? s.perbandinganJenis : undefined,
      saranJenis: s.saranJenis || undefined,
      laporanKondisi: s.laporanKondisi || null,
      tokenAi: fromCache ? 0 : Number(data.tokenUsage?.total) || undefined,
      dariCache: fromCache,
      aiModel,
      ringkasanAi: data.ringkasanSingkat || data.alasanTidakTerdeteksi || undefined,
      temuanVisual: Array.isArray(data.temuanVisual) ? data.temuanVisual : undefined,
    },
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
