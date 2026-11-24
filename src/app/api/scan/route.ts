
import { NextResponse } from 'next/server';
import { callGeminiServer } from '@/lib/gemini';
import {
  buildGroundedVisionDatasetPrompt,
  DATASET_DISEASES,
  DATASET_NUTRIENTS,
  DATASET_RIPENESS,
} from '@/data/agronomyDataset';
import type { PlantPart, RipenessStage, ScanOutputFocus } from '@/types/cermattani';

interface ParsedGeminiScan {
  bagianTerdeteksi?: PlantPart;
  fokusOutput?: ScanOutputFocus;
  diluarKonteksTanaman?: boolean;
  tanpaBuahTerdeteksi?: boolean;
  alasanTidakTerdeteksi?: string;
  boxes?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    stage: RipenessStage;
    confidence: number;
  }>;
  tahapDominan?: RipenessStage | null;
  anjuranPanen?:
    | 'Panen sekarang'
    | 'Tunggu'
    | 'Perlu foto ulang'
    | 'Fokus daun/batang'
    | 'Fokus penyakit';
  estimasiHariMin?: number | null;
  estimasiHariMax?: number | null;
  penyakitTop3?: Array<{ id: string; nama: string; confidence: number }>;
  penyakitUtamaId?: string;
  penyakitRinganId?: string | null;
  adaGejalaHara?: boolean;
  dugaanHaraId?: string;
  keyakinan?: number;
  ringkasanSingkat?: string;
  temuanVisual?: string[];
}

const VALID_DISEASE_IDS = Object.keys(DATASET_DISEASES);
const VALID_NUTRIENT_IDS = Object.keys(DATASET_NUTRIENTS);
const FRUIT_ROT_IDS = new Set([
  'busuk_basah_buah',
  'busuk_jamur_buah',
  'busuk_kapang_abu',
  'busuk_ujung_buah',
  'antraknosa',
  'buah_pecah_sengatan',
]);

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  return { mimeType: mime, base64: match[2] };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function extractJsonObject(raw: string): string {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return stripped.slice(start, end + 1);
  }
  return stripped;
}

/* POST /api/scan — Analisis Vision nyata lewat Gemini AI + Dataset Agronomi v2.1 (Smart Silent Context Routing) */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fotoUrl = String(body.fotoUrl || '');
    const hintBagian: PlantPart | 'auto' =
      body.bagian === 'buah' || body.bagian === 'daun' || body.bagian === 'batang'
        ? body.bagian
        : 'auto';
    const plant = body.plant || {
      nama: 'Tanaman',
      varietas: 'Servo F1',
      fase: 'Berbuah',
      bobotRataBuahGram: 85,
    };
    const sensorAvailable = Boolean(body.sensorAvailable);
    const lowConfidenceThreshold = Number(body.lowConfidenceThreshold ?? 60);

    const parsedImg = parseDataUrl(fotoUrl);
    if (!parsedImg) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Foto tidak valid atau bukan gambar JPG/PNG/WebP/HEIC. Silakan ambil foto dari kamera atau unggah foto tanaman nyata.',
        },
        { status: 400 }
      );
    }

    const datasetReference = buildGroundedVisionDatasetPrompt();

    const systemInstruction = `Kamu adalah mesin Computer Vision Agronomi resmi aplikasi CermatTani.
Semua klasifikasi WAJIB mengacu secara ketat pada DATASET KHUSUS REFERENSI VISION CERMATTANI di bawah ini.

${datasetReference}

ATURAN WAJIB & PENENTUAN FOKUS OTOMATIS (RAHASIA — JANGAN PERNAH MENYEBUT KATA "KONTEKS" ATAU "MODE" DI TEKS OUTPUT):
1. DETEKSI BAGIAN OTOMATIS ("bagianTerdeteksi"):
   - Kenali langsung dari foto apakah objek utama adalah "buah", "daun", atau "batang".
2. VALIDASI FOTO BUKAN TANAMAN:
   - Jika foto TIDAK memperlihatkan tanaman/buah/daun/batang pertanian atau terlalu gelap/buram untuk diamati:
     * "fokusOutput": "tidak_terdeteksi"
     * "diluarKonteksTanaman": true (jika bukan tanaman) atau false (jika tanaman tapi buram/gelap)
     * "tanpaBuahTerdeteksi": true, "boxes": [], "anjuranPanen": "Perlu foto ulang", "keyakinan": 15–40
     * "alasanTidakTerdeteksi": penjelasan sopan apa yang tampak & saran cara foto ulang.
3. PILIH SATU "fokusOutput" PALING TEPAT SECARA OTOMATIS:
   - KASUS A — BUAH BUSUK / BUAH BERJAMUR / BUAH SAKIT BERAT / DAUN ATAU BATANG BERPENYAKIT:
     * Jika buah terlihat busuk, berjamur, lembek berair, cekung hitam (blossom end rot), patek/antraknosa, atau berpenyakit berat — ATAU foto daun/batang menunjukkan penyakit/hama:
     * WAJIB set "fokusOutput": "penyakit".
     * WAJIB kosongkan kematangan: "boxes": [], "tahapDominan": null, "estimasiHariMin": null, "estimasiHariMax": null, "anjuranPanen": "Fokus penyakit".
     * Pilih "penyakitUtamaId" dari katalog resmi (misal busuk_basah_buah, busuk_jamur_buah, busuk_kapang_abu, busuk_ujung_buah, antraknosa, bercak_kering, busuk_daun, bercak_bakteri, layu_batang, keriting_kuning, bercak_septoria, serangan_hama_daun).
     * JANGAN membahas kematangan atau anjuran panen sama sekali pada "ringkasanSingkat"!
   - KASUS B — BUAH SEGAR (MATANG / SETENGAH MATANG / MENTAH):
     * Jika foto menampilkan buah segar yang sehat/layak konsumsi (baik mentah, setengah matang, maupun matang):
     * WAJIB set "fokusOutput": "kematangan".
     * Deteksi setiap buah segar sebagai kotak [x, y, w, h] dalam PERSEN 0–100 (x+w<=99, y+h<=99) dengan stage "mentah" | "setengah_matang" | "matang".
     * Jika pada buah segar tersebut terlihat ada bercak/penyakit KECIL atau gejala awal ringan (buah masih dominan segar), tetap set "fokusOutput": "kematangan", set "penyakitUtamaId": "sehat", dan masukkan ID penyakit ringannya ke "penyakitRinganId" (selain itu set "penyakitRinganId": null).
     * "ringkasanSingkat" fokus ke kondisi kematangan buah saja.
   - KASUS C — GEJALA KEKURANGAN HARA MURNI (misal daun menguning pucat/tepi terbakar/antar-tulang kuning tanpa penyakit jamur/bakteri dominan):
     * Set "fokusOutput": "hara", "adaGejalaHara": true, "dugaanHaraId" ke ID hara resmi (bukan "cukup"), "boxes": [], "tahapDominan": null, "anjuranPanen": "Fokus daun/batang".
4. DETEKSI GEJALA HARA ("adaGejalaHara"):
   - Set "adaGejalaHara": true HANYA jika benar-benar tampak gejala kekurangan hara (termasuk busuk_ujung_buah yang terkait kurang_kalsium) dan "dugaanHaraId" != "cukup". Jika tidak ada gejala hara, set "adaGejalaHara": false dan "dugaanHaraId": "cukup".
5. PENYAKIT TOP-3:
   - Selalu isi "penyakitTop3" tepat 3 ID berbeda dari daftar resmi [${VALID_DISEASE_IDS.join(', ')}] dengan total confidence = 100.
6. GAYA BAHASA "ringkasanSingkat" & "temuanVisual":
   - Bahasa Indonesia alami sehari-hari untuk petani, 1–2 kalimat singkat, TANPA istilah ML/AI, dan JANGAN PERNAH menyebut kalimat seperti "berdasarkan konteks foto", "pengguna ingin melihat...", atau "mode penyakit/kematangan".
7. Jawab HANYA objek JSON valid tanpa markdown fence.`;

    const userPrompt = `Analisis foto nyata ini sesuai Dataset Khusus CermatTani v2.1:
- Nama tanaman: ${plant.nama}
- Varietas: ${plant.varietas}
- Fase tumbuh: ${plant.fase}
- Petunjuk bagian (jika ada): ${hintBagian}
- Data sensor lahan tersedia: ${sensorAvailable ? 'Ya' : 'Tidak'}

Kembalikan tepat JSON sesuai skema.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        bagianTerdeteksi: { type: 'STRING', enum: ['buah', 'daun', 'batang'] },
        fokusOutput: {
          type: 'STRING',
          enum: ['kematangan', 'penyakit', 'hara', 'tidak_terdeteksi'],
        },
        diluarKonteksTanaman: { type: 'BOOLEAN' },
        tanpaBuahTerdeteksi: { type: 'BOOLEAN' },
        alasanTidakTerdeteksi: { type: 'STRING' },
        boxes: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              x: { type: 'NUMBER' },
              y: { type: 'NUMBER' },
              w: { type: 'NUMBER' },
              h: { type: 'NUMBER' },
              stage: { type: 'STRING', enum: ['mentah', 'setengah_matang', 'matang'] },
              confidence: { type: 'NUMBER' },
            },
            required: ['x', 'y', 'w', 'h', 'stage', 'confidence'],
          },
        },
        tahapDominan: {
          type: 'STRING',
          enum: ['mentah', 'setengah_matang', 'matang'],
          nullable: true,
        },
        anjuranPanen: {
          type: 'STRING',
          enum: [
            'Panen sekarang',
            'Tunggu',
            'Perlu foto ulang',
            'Fokus daun/batang',
            'Fokus penyakit',
          ],
        },
        estimasiHariMin: { type: 'NUMBER', nullable: true },
        estimasiHariMax: { type: 'NUMBER', nullable: true },
        penyakitTop3: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING', enum: VALID_DISEASE_IDS },
              nama: { type: 'STRING' },
              confidence: { type: 'NUMBER' },
            },
            required: ['id', 'nama', 'confidence'],
          },
        },
        penyakitUtamaId: { type: 'STRING', enum: VALID_DISEASE_IDS },
        penyakitRinganId: { type: 'STRING', enum: VALID_DISEASE_IDS, nullable: true },
        adaGejalaHara: { type: 'BOOLEAN' },
        dugaanHaraId: { type: 'STRING', enum: VALID_NUTRIENT_IDS },
        keyakinan: { type: 'NUMBER' },
        ringkasanSingkat: { type: 'STRING' },
        temuanVisual: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
      },
      required: [
        'bagianTerdeteksi',
        'fokusOutput',
        'diluarKonteksTanaman',
        'tanpaBuahTerdeteksi',
        'alasanTidakTerdeteksi',
        'boxes',
        'anjuranPanen',
        'penyakitTop3',
        'penyakitUtamaId',
        'adaGejalaHara',
        'dugaanHaraId',
        'keyakinan',
        'ringkasanSingkat',
        'temuanVisual',
      ],
    };

    const aiRes = await callGeminiServer({
      mode: 'vision',
      systemInstruction,
      contents: [
        {
          role: 'user',
          parts: [
            { text: userPrompt },
            { inlineData: { mimeType: parsedImg.mimeType, data: parsedImg.base64 } },
          ],
        },
      ],
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.15,
      maxOutputTokens: 4096,
    });

    if (!aiRes.ok) {
      return NextResponse.json(
        { ok: false, error: aiRes.error },
        { status: aiRes.statusCode >= 400 ? aiRes.statusCode : 503 }
      );
    }

    let parsed: ParsedGeminiScan;
    try {
      parsed = JSON.parse(extractJsonObject(aiRes.text)) as ParsedGeminiScan;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'Model AI mengembalikan format analisis yang tidak terbaca. Silakan coba pindai ulang.',
        },
        { status: 502 }
      );
    }

    const diluarKonteks = Boolean(parsed.diluarKonteksTanaman);
    const bagian: PlantPart =
      parsed.bagianTerdeteksi === 'buah' ||
      parsed.bagianTerdeteksi === 'daun' ||
      parsed.bagianTerdeteksi === 'batang'
        ? parsed.bagianTerdeteksi
        : hintBagian === 'auto'
          ? 'buah'
          : hintBagian;

    // Normalisasi penyakit top-3 agar tepat 3 item & total = 100%
    const seenDisease = new Set<string>();
    const top3Raw = Array.isArray(parsed.penyakitTop3) ? parsed.penyakitTop3 : [];
    const penyakitTop3: Array<{ id: string; nama: string; confidence: number }> = [];

    for (const item of top3Raw) {
      if (penyakitTop3.length >= 3) break;
      const safeId = VALID_DISEASE_IDS.includes(item.id) ? item.id : 'sehat';
      if (seenDisease.has(safeId)) continue;
      seenDisease.add(safeId);
      penyakitTop3.push({
        id: safeId,
        nama: DATASET_DISEASES[safeId].penyakit,
        confidence: clamp(Number(item.confidence) || 20, 1, 98),
      });
    }

    while (penyakitTop3.length < 3) {
      const nextId = VALID_DISEASE_IDS.find((id) => !seenDisease.has(id)) || 'sehat';
      seenDisease.add(nextId);
      penyakitTop3.push({
        id: nextId,
        nama: DATASET_DISEASES[nextId].penyakit,
        confidence: 5,
      });
    }

    const sumTop3 = penyakitTop3.reduce((acc, p) => acc + p.confidence, 0) || 100;
    penyakitTop3.forEach((p) => {
      p.confidence = Math.max(1, Math.round((p.confidence / sumTop3) * 100));
    });
    const diff = 100 - penyakitTop3.reduce((acc, p) => acc + p.confidence, 0);
    penyakitTop3[0].confidence = Math.max(1, penyakitTop3[0].confidence + diff);
    penyakitTop3.sort((a, b) => b.confidence - a.confidence);

    const utamaId = diluarKonteks
      ? 'sehat'
      : VALID_DISEASE_IDS.includes(parsed.penyakitUtamaId || '')
        ? parsed.penyakitUtamaId!
        : penyakitTop3[0].id;

    // Penegakan ketat Smart Context Routing di sisi server
    let fokusOutput: ScanOutputFocus =
      parsed.fokusOutput === 'kematangan' ||
      parsed.fokusOutput === 'penyakit' ||
      parsed.fokusOutput === 'hara' ||
      parsed.fokusOutput === 'tidak_terdeteksi'
        ? parsed.fokusOutput
        : 'kematangan';

    if (diluarKonteks || parsed.tanpaBuahTerdeteksi) {
      fokusOutput = 'tidak_terdeteksi';
    } else if (FRUIT_ROT_IDS.has(utamaId) || (utamaId !== 'sehat' && fokusOutput !== 'kematangan')) {
      // Buah busuk / berpenyakit berat WAJIB murni fokus penyakit — NOL kematangan!
      fokusOutput = 'penyakit';
    } else if (bagian !== 'buah' && fokusOutput === 'kematangan') {
      fokusOutput = utamaId !== 'sehat' ? 'penyakit' : 'hara';
    }

    // Kotak deteksi HANYA untuk buah segar (fokusOutput === 'kematangan')
    const safeBoxes =
      fokusOutput === 'kematangan' && Array.isArray(parsed.boxes)
        ? parsed.boxes
            .slice(0, 12)
            .map((b, i) => {
              const rawX = Number(b.x);
              const rawY = Number(b.y);
              const rawW = Number(b.w);
              const rawH = Number(b.h);
              const scaleDiv = Math.max(rawX, rawY, rawW, rawH) > 100 ? 10 : 1;
              const x = clamp(rawX / scaleDiv, 1, 90);
              const y = clamp(rawY / scaleDiv, 1, 90);
              const w = clamp(rawW / scaleDiv, 6, Math.max(6, 99 - x));
              const h = clamp(rawH / scaleDiv, 6, Math.max(6, 99 - y));
              return {
                id: `ai-bx-${i + 1}`,
                x,
                y,
                w,
                h,
                stage: (['mentah', 'setengah_matang', 'matang'].includes(b.stage)
                  ? b.stage
                  : 'setengah_matang') as RipenessStage,
                confidence: clamp(Number(b.confidence) || 75, 25, 99),
              };
            })
        : [];

    if (fokusOutput === 'kematangan' && safeBoxes.length === 0 && !parsed.tahapDominan) {
      fokusOutput = 'tidak_terdeteksi';
    }

    const tanpaObjek = fokusOutput === 'tidak_terdeteksi';

    // Penyakit ringan (hanya catatan kecil di bawah kematangan buah segar)
    const rawRingan = parsed.penyakitRinganId || '';
    const penyakitRinganId: string | null =
      fokusOutput === 'kematangan' &&
      rawRingan &&
      rawRingan !== 'sehat' &&
      VALID_DISEASE_IDS.includes(rawRingan)
        ? rawRingan
        : null;

    // Dugaan hara & visibilitas pupuk
    let haraId = diluarKonteks
      ? 'cukup'
      : VALID_NUTRIENT_IDS.includes(parsed.dugaanHaraId || '')
        ? parsed.dugaanHaraId!
        : 'cukup';
    let adaGejalaHara = Boolean(parsed.adaGejalaHara) && haraId !== 'cukup';

    if (utamaId === 'busuk_ujung_buah') {
      haraId = 'kurang_kalsium';
      adaGejalaHara = true;
    }
    if (fokusOutput === 'hara' && haraId === 'cukup') {
      fokusOutput = 'penyakit';
    }

    const tahapDominan: RipenessStage | null =
      fokusOutput === 'kematangan'
        ? parsed.tahapDominan && ['mentah', 'setengah_matang', 'matang'].includes(parsed.tahapDominan)
          ? parsed.tahapDominan
          : safeBoxes[0]?.stage || 'setengah_matang'
        : null;

    const anjuranPanen =
      fokusOutput === 'tidak_terdeteksi'
        ? 'Perlu foto ulang'
        : fokusOutput === 'penyakit'
          ? 'Fokus penyakit'
          : fokusOutput === 'hara'
            ? 'Fokus daun/batang'
            : tahapDominan === 'matang'
              ? 'Panen sekarang'
              : 'Tunggu';

    const refRipeness = tahapDominan ? DATASET_RIPENESS[tahapDominan] : null;
    const bobotRata = Number(plant.bobotRataBuahGram) || 85;
    const keyakinan = clamp(
      Number(parsed.keyakinan) ||
        (tanpaObjek
          ? 30
          : fokusOutput === 'kematangan' && safeBoxes.length > 0
            ? safeBoxes[0].confidence
            : penyakitTop3[0].confidence),
      15,
      98
    );

    const temuanVisual = Array.isArray(parsed.temuanVisual)
      ? parsed.temuanVisual
        .map((t) => String(t || '').trim())
        .filter(Boolean)
        .slice(0, 4)
      : [];

    // Ringkasan fallback selalu mengacu ke dataset resmi
    const datasetSummaryFallback =
      fokusOutput === 'kematangan' && refRipeness
        ? refRipeness.ringkasan
        : fokusOutput === 'penyakit'
          ? DATASET_DISEASES[utamaId].gejala
          : fokusOutput === 'hara'
            ? DATASET_NUTRIENTS[haraId].gejala
            : String(parsed.alasanTidakTerdeteksi || '').trim();

    const ringkasanAi =
      String(parsed.ringkasanSingkat || '').trim() || datasetSummaryFallback;

    const fruitCount = fokusOutput === 'kematangan' ? Math.max(safeBoxes.length, 1) : 0;

    return NextResponse.json({
      ok: true,
      aiProvider: 'gemini',
      aiModel: aiRes.model,
      datasetVersion: 'CermatTani-Agronomy-v3.0',
      alasanTidakTerdeteksi: String(parsed.alasanTidakTerdeteksi || '').trim(),
      ringkasanSingkat: ringkasanAi,
      temuanVisual,
      scan: {
        bagian,
        fokusOutput,
        boxes: safeBoxes,
        tahapDominan,
        jumlahBuah: fruitCount,
        anjuranPanen,
        estimasiHariMin:
          fokusOutput !== 'kematangan'
            ? null
            : anjuranPanen === 'Panen sekarang'
              ? 0
              : parsed.estimasiHariMin ?? refRipeness?.minDays ?? 2,
        estimasiHariMax:
          fokusOutput !== 'kematangan'
            ? null
            : anjuranPanen === 'Panen sekarang'
              ? 1
              : parsed.estimasiHariMax ?? refRipeness?.maxDays ?? 4,
        estimasiBobotGram: fokusOutput === 'kematangan' ? fruitCount * bobotRata : 0,
        penyakitTop3,
        penyakitUtamaId: fokusOutput === 'kematangan' ? 'sehat' : utamaId,
        penyakitUtamaNama:
          fokusOutput === 'kematangan'
            ? DATASET_DISEASES.sehat.penyakit
            : DATASET_DISEASES[utamaId].penyakit,
        penyakitRinganId,
        adaGejalaHara,
        keyakinan,
        keyakinanRendah: keyakinan < lowConfidenceThreshold,
        dugaanHaraId: haraId,
        dugaanHaraNama: DATASET_NUTRIENTS[haraId].dugaan,
        pakaiDataSensor: sensorAvailable,
        tanpaBuahTerdeteksi: tanpaObjek,
        diluarKonteksTanaman: diluarKonteks,
        aiModel: aiRes.model,
        ringkasanAi,
        temuanVisual,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? `Gagal memproses permintaan scan AI: ${err.message}`
            : 'Gagal memproses permintaan scan AI di server.',
      },
      { status: 500 }
    );
  }
}
