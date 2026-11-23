import { NextResponse } from 'next/server';
import { callGeminiServer } from '@/lib/gemini';
import {
  buildGroundedVisionDatasetPrompt,
  DATASET_DISEASES,
  DATASET_NUTRIENTS,
  DATASET_RIPENESS,
} from '@/data/agronomyDataset';

interface ParsedGeminiScan {
  diluarKonteksTanaman?: boolean;
  tanpaBuahTerdeteksi?: boolean;
  alasanTidakTerdeteksi?: string;
  boxes?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    stage: 'mentah' | 'setengah_matang' | 'matang';
    confidence: number;
  }>;
  tahapDominan?: 'mentah' | 'setengah_matang' | 'matang' | null;
  anjuranPanen?: 'Panen sekarang' | 'Tunggu' | 'Perlu foto ulang' | 'Fokus daun/batang';
  estimasiHariMin?: number | null;
  estimasiHariMax?: number | null;
  penyakitTop3?: Array<{ id: string; nama: string; confidence: number }>;
  penyakitUtamaId?: string;
  dugaanHaraId?: string;
  keyakinan?: number;
  ringkasanSingkat?: string;
  temuanVisual?: string[];
}

const VALID_DISEASE_IDS = Object.keys(DATASET_DISEASES);
const VALID_NUTRIENT_IDS = Object.keys(DATASET_NUTRIENTS);

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

/* PRD §9: POST /api/scan — Analisis Vision nyata lewat Gemini AI + Dataset Agronomi Khusus CermatTani */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fotoUrl = String(body.fotoUrl || '');
    const bagian = (['buah', 'daun', 'batang'].includes(body.bagian) ? body.bagian : 'buah') as
      | 'buah'
      | 'daun'
      | 'batang';
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
Semua klasifikasi WAJIB mengacu secara ketat pada DATASET KHUSUS REFERENSI VISION CERMATTANI di bawah ini agar tidak keluar konteks atau mengarang kategori.

${datasetReference}

ATURAN WAJIB DAN BATASAN KONTEKS:
1. VALIDASI KONTEKS FOTO: Jika foto TIDAK memperlihatkan tanaman, buah, daun, atau batang pertanian (misalnya foto wajah manusia, ruangan, meja, kendaraan, teks/dokumen, layar komputer, hewan, atau foto terlalu gelap/buram sehingga bagian "${bagian}" tidak bisa diamati), WAJIB set:
   - "diluarKonteksTanaman": true (jika bukan tanaman) atau false (jika tanaman tapi buram/gelap)
   - "tanpaBuahTerdeteksi": true
   - "boxes": []
   - "anjuranPanen": "Perlu foto ulang"
   - "keyakinan": angka jujur 15–40
   - "alasanTidakTerdeteksi": penjelasan sopan & spesifik tentang apa yang sebenarnya terlihat di foto dan saran cara memfoto bagian "${bagian}".
   JANGAN PERNAH mengarang buah atau penyakit pada foto yang bukan tanaman!
2. DETEKSI BUAH (bila bagian = "buah" dan buah terlihat):
   - Deteksi setiap buah yang tampak nyata sebagai kotak [x, y, w, h] dalam PERSEN 0–100 dari kiri-atas gambar (x + w <= 99, y + h <= 99).
   - Klasifikasikan "stage" HANYA ke: "mentah", "setengah_matang", atau "matang" berdasarkan kriteria warna pada DATASET A.
   - Jika bagian = "daun" atau "batang", biarkan "boxes": [] dan "anjuranPanen": "Fokus daun/batang".
3. KLASIFIKASI PENYAKIT (GROUNDED KE DATASET B):
   - Petakan "id" HANYA ke salah satu ID resmi ini: ${VALID_DISEASE_IDS.join(', ')}.
   - Sertakan "penyakitTop3" berisi TEPAT 3 ID berbeda dari daftar resmi tersebut dengan total persentase confidence = 100 (urutan dari tertinggi ke terendah, selalu menyertakan "sehat" jika layak).
   - "penyakitUtamaId" harus sama dengan item pertama di "penyakitTop3".
4. DUGAAN HARA (GROUNDED KE DATASET C):
   - Petakan "dugaanHaraId" HANYA ke salah satu ID resmi ini: ${VALID_NUTRIENT_IDS.join(', ')}.
5. TEMUAN VISUAL NYATA:
   - Isi "temuanVisual" dengan 2–3 poin singkat tentang ciri nyata yang benar-benar kamu lihat pada foto ini (warna kulit/daun, ada tidaknya bercak/cincin/lubang, kondisi cahaya).
   - Isi "ringkasanSingkat" dalam 1–2 kalimat bahasa Indonesia petani sehari-hari tanpa istilah ML/AI.
6. KEJUJURAN KEYAKINAN:
   - Jika pencahayaan kurang, foto buram, atau gejala meragukan, beri "keyakinan" < ${lowConfidenceThreshold}.
7. Jawab HANYA objek JSON valid tanpa markdown fence atau teks tambahan.`;

    const userPrompt = `Analisis foto nyata ini sesuai Dataset Khusus CermatTani:
- Nama tanaman: ${plant.nama}
- Varietas: ${plant.varietas}
- Fase tumbuh: ${plant.fase}
- Bagian yang dipindai: ${bagian}
- Data sensor lahan tersedia: ${sensorAvailable ? 'Ya' : 'Tidak'}

Kembalikan tepat JSON berikut:
{
  "diluarKonteksTanaman": boolean,
  "tanpaBuahTerdeteksi": boolean,
  "alasanTidakTerdeteksi": string,
  "boxes": [{"x": number, "y": number, "w": number, "h": number, "stage": "mentah"|"setengah_matang"|"matang", "confidence": number}],
  "tahapDominan": "mentah"|"setengah_matang"|"matang"|null,
  "anjuranPanen": "Panen sekarang"|"Tunggu"|"Perlu foto ulang"|"Fokus daun/batang",
  "estimasiHariMin": number|null,
  "estimasiHariMax": number|null,
  "penyakitTop3": [{"id": string, "nama": string, "confidence": number}],
  "penyakitUtamaId": string,
  "dugaanHaraId": string,
  "keyakinan": number,
  "ringkasanSingkat": string,
  "temuanVisual": [string]
}`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
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
          enum: ['Panen sekarang', 'Tunggu', 'Perlu foto ulang', 'Fokus daun/batang'],
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
        dugaanHaraId: { type: 'STRING', enum: VALID_NUTRIENT_IDS },
        keyakinan: { type: 'NUMBER' },
        ringkasanSingkat: { type: 'STRING' },
        temuanVisual: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
      },
      required: [
        'diluarKonteksTanaman',
        'tanpaBuahTerdeteksi',
        'alasanTidakTerdeteksi',
        'boxes',
        'anjuranPanen',
        'penyakitTop3',
        'penyakitUtamaId',
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
        {
          ok: false,
          error: aiRes.error,
        },
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

    const safeBoxes =
      !diluarKonteks && bagian === 'buah' && Array.isArray(parsed.boxes)
        ? parsed.boxes
            .slice(0, 12)
            .map((b, i) => {
              const rawX = Number(b.x);
              const rawY = Number(b.y);
              const rawW = Number(b.w);
              const rawH = Number(b.h);
              // Jika model mengembalikan skala 0..1000, konversi otomatis ke persen 0..100
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
                  : 'setengah_matang') as 'mentah' | 'setengah_matang' | 'matang',
                confidence: clamp(Number(b.confidence) || 75, 25, 99),
              };
            })
        : [];

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

    // Normalisasi agar jumlah top-3 = 100%
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

    const haraId = diluarKonteks
      ? 'cukup'
      : VALID_NUTRIENT_IDS.includes(parsed.dugaanHaraId || '')
        ? parsed.dugaanHaraId!
        : 'cukup';

    const tanpaObjek =
      diluarKonteks ||
      Boolean(parsed.tanpaBuahTerdeteksi) ||
      (bagian === 'buah' && safeBoxes.length === 0);

    const keyakinan = clamp(
      Number(parsed.keyakinan) ||
        (tanpaObjek
          ? 30
          : bagian === 'buah' && safeBoxes.length > 0
            ? safeBoxes[0].confidence
            : penyakitTop3[0].confidence),
      15,
      98
    );

    const tahapDominan =
      !tanpaObjek && bagian === 'buah'
        ? parsed.tahapDominan && ['mentah', 'setengah_matang', 'matang'].includes(parsed.tahapDominan)
          ? parsed.tahapDominan
          : safeBoxes[0]?.stage || null
        : null;

    const anjuranPanen = tanpaObjek
      ? 'Perlu foto ulang'
      : bagian !== 'buah'
        ? 'Fokus daun/batang'
        : tahapDominan === 'matang'
          ? 'Panen sekarang'
          : 'Tunggu';

    const refRipeness = tahapDominan ? DATASET_RIPENESS[tahapDominan] : null;
    const bobotRata = Number(plant.bobotRataBuahGram) || 85;
    const temuanVisual = Array.isArray(parsed.temuanVisual)
      ? parsed.temuanVisual
          .map((t) => String(t || '').trim())
          .filter(Boolean)
          .slice(0, 4)
      : [];

    const ringkasanAi =
      String(parsed.ringkasanSingkat || '').trim() ||
      String(parsed.alasanTidakTerdeteksi || '').trim();

    return NextResponse.json({
      ok: true,
      aiProvider: 'gemini',
      aiModel: aiRes.model,
      datasetVersion: 'CermatTani-Agronomy-v2.0',
      alasanTidakTerdeteksi: String(parsed.alasanTidakTerdeteksi || '').trim(),
      ringkasanSingkat: ringkasanAi,
      temuanVisual,
      scan: {
        boxes: safeBoxes,
        tahapDominan,
        jumlahBuah: safeBoxes.length,
        anjuranPanen,
        estimasiHariMin:
          anjuranPanen === 'Panen sekarang'
            ? 0
            : anjuranPanen === 'Tunggu'
              ? parsed.estimasiHariMin ?? refRipeness?.minDays ?? 2
              : null,
        estimasiHariMax:
          anjuranPanen === 'Panen sekarang'
            ? 1
            : anjuranPanen === 'Tunggu'
              ? parsed.estimasiHariMax ?? refRipeness?.maxDays ?? 4
              : null,
        estimasiBobotGram: safeBoxes.length * bobotRata,
        penyakitTop3,
        penyakitUtamaId: utamaId,
        penyakitUtamaNama: DATASET_DISEASES[utamaId].penyakit,
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
