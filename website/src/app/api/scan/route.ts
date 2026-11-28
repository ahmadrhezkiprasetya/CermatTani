
import { NextResponse } from 'next/server';
import { AI_BUSY_MESSAGE, callGeminiServer, logAiFailure } from '@/lib/gemini';
import {
  buildGroundedVisionDatasetPrompt,
  DATASET_DISEASES,
  DATASET_NUTRIENTS,
  DATASET_RIPENESS,
} from '@/data/agronomyDataset';
import type { AiTokenUsage } from '@/lib/gemini';
import type { PlantPart, RipenessStage, ScanOutputFocus } from '@/types/cermattani';

/*
 * Deteksi letak buah dipisah dari analisis utama: prompt pendek khusus kotak jauh lebih tepat
 * (uji cabai di telapak tangan: analisis gabungan menaruh kotak di jari, panggilan khusus pas di buah).
 * Berjalan paralel dengan analisis utama → tanpa tambahan waktu tunggu, hanya ±200 token.
 */
const DETECT_INSTRUCTION = `Kamu pendeteksi letak buah pada foto pertanian.
Temukan setiap BUAH yang terlihat (bukan daun, tangan, jari, wadah, atau latar).
Untuk tiap buah: "label" nama buahnya, "box_2d": [ymin, xmin, ymax, xmax] skala 0–1000 terhadap SELURUH foto (0,0 = pojok kiri atas), kotak rapat di tepi buah (tangkai boleh ikut), dan "stage" dari warna kulit: "mentah" | "setengah_matang" | "matang".
Maksimal 12 buah. Bila tidak ada buah (misal sayuran daun saja), kembalikan "boxes": [].
Balas JSON {"boxes":[{"label":string,"box_2d":[ymin,xmin,ymax,xmax],"stage":string}]}.`;
// Sengaja tanpa responseSchema: teks skema panjang terbukti membuat kotak kurang rapat (uji cabai & tomat).

function sumTokens(a?: AiTokenUsage | null, b?: AiTokenUsage | null): AiTokenUsage | null {
  if (!a && !b) return null;
  const z = { input: 0, cached: 0, output: 0, total: 0 };
  const x = a ?? z;
  const y = b ?? z;
  return {
    input: x.input + y.input,
    cached: x.cached + y.cached,
    output: x.output + y.output,
    total: x.total + y.total,
  };
}

interface ParsedGeminiScan {
  objekTeridentifikasi?: string;
  sesuaiTanamanDipilih?: boolean;
  penjelasanJenis?: string;
  perbandinganJenis?: Array<{ aspek?: string; diFoto?: string; tanamanTarget?: string }>;
  saranJenis?: string;
  laporanKondisi?: {
    kesiapanPanen?: { status?: string; label?: string; alasan?: string };
    risikoPenyakit?: { level?: string; label?: string; alasan?: string };
    kondisiHara?: { status?: string; label?: string; alasan?: string };
    catatanLain?: string[];
  };
  bagianTerdeteksi?: PlantPart;
  fokusOutput?: ScanOutputFocus;
  diluarKonteksTanaman?: boolean;
  tanpaBuahTerdeteksi?: boolean;
  alasanTidakTerdeteksi?: string;
  boxes?: Array<{
    box_2d?: number[];
    x?: number;
    y?: number;
    w?: number;
    h?: number;
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
    // Tanpa tanaman target (pilihan "Tanaman lain / tidak ada di kebun"): AI mengenali jenisnya sendiri
    const adaTarget = Boolean(body.plant && body.plant.nama);
    const plant = adaTarget
      ? body.plant
      : {
          nama: 'Tidak dipilih',
          varietas: 'Tidak dipilih',
          fase: 'Tidak diketahui',
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
2B. IDENTIFIKASI & VERIFIKASI JENIS TANAMAN (SELALU DIISI):
   - "objekTeridentifikasi": nama objek utama di foto dalam bahasa Indonesia, sespesifik mungkin sampai jenis/varietas umum bila cirinya jelas (misal "Buah cabai rawit merah", "Buah tomat ceri", "Sayur pakcoy", "Daun selada keriting", "Buah mangga", "Kucing", "Gambar kartun").
   - Jika pengguna memilih tanaman target, bandingkan JENIS objek di foto dengan tanaman target (lihat nama & varietas).
     * Jika jenisnya SAMA (misal target tomat, foto buah/daun/batang tomat) → "sesuaiTanamanDipilih": true, "penjelasanJenis": "".
     * Jika foto memperlihatkan TANAMAN/BUAH LAIN (misal target tomat tetapi foto buah mangga) → "sesuaiTanamanDipilih": false, dan:
       - "penjelasanJenis": TEPAT 1 kalimat jelas, format "Foto ini bukan <jenis tanaman target>, melainkan <objek>." (pakai nama jenis umum, misal "tomat", bukan kode/nomor tanaman).
       - "perbandinganJenis": 3–4 baris perbandingan ciri yang TERLIHAT, aspek dipilih dari "Bentuk", "Warna kulit", "Permukaan kulit", "Ukuran", "Tangkai / kelopak", "Daun". Tiap baris: "diFoto" = ciri objek di foto (singkat, maks 8 kata), "tanamanTarget" = ciri khas tanaman target (singkat, maks 8 kata).
       - "saranJenis": 1 kalimat saran praktis (misal pilih "Tanaman lain" lalu pindai ulang, atau foto <tanaman target> yang benar).
       - Untuk kasus ini set "fokusOutput": "tidak_terdeteksi", "diluarKonteksTanaman": false, "boxes": [].
     * Selain kasus jenis berbeda: "perbandinganJenis": [] dan "saranJenis": "".
   - Jika tanaman target "Tidak dipilih": "sesuaiTanamanDipilih": true, "penjelasanJenis": satu kalimat singkat jenis tanaman yang dikenali beserta cirinya, lalu lanjutkan analisis seperti biasa.
   - Jika foto bukan tanaman sama sekali: "sesuaiTanamanDipilih": false, "penjelasanJenis": "".
2C. CIRI PEMBEDA JENIS (periksa dulu sebelum menamai; bandingkan ukuran terhadap jari/tangan, bentuk, warna, tekstur kulit, tangkai/kelopak, susunan daun):
   - Cabai rawit: kecil 2–6 cm, ramping, ujung runcing · cabai merah besar: 8–15 cm, lurus mulus · cabai keriting: panjang, berkerut berliku · paprika: besar gemuk berlekuk 3–4, dinding tebal.
   - Tomat: bulat/lonjong, kulit licin mengkilap, kelopak hijau bintang kecil · tomat ceri: diameter <3 cm, bergerombol · terong: ungu/hijau/putih, kelopak besar menutupi pangkal · mentimun: silinder hijau berbintil/bergaris.
   - Selada: daun lebar tipis bergelombang/keriting, hijau muda, tanpa tangkai tebal · sawi hijau/caisim: daun lonjong hijau tua, tangkai hijau panjang · pakcoy: roset, tangkai putih/hijau muda tebal seperti sendok · bayam: daun kecil oval, batang tipis hijau/merah · kangkung: daun lancip seperti mata panah, batang berongga · seledri: daun bergerigi berlekuk, tangkai beralur · kubis: kepala bulat padat.
   - Bawang merah: umbi kecil ungu-merah berlapis · bawang putih: putih bersiung · bawang daun: daun pipa hijau.
   - Buah lain (mangga, jeruk, jambu, pepaya, pisang, stroberi, dll): sebut nama spesifiknya, jangan digeneralisasi.
   - Bila ciri meragukan antara 2 jenis: pilih yang paling cocok dengan ciri terlihat, "keyakinan" maks 70, dan sebut keraguannya singkat di "penjelasanJenis".
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
     * Deteksi setiap buah segar dengan "box_2d": [ymin, xmin, ymax, xmax] dinormalisasi 0–1000 terhadap SELURUH foto (0,0 = pojok kiri atas), kotak harus rapat mengelilingi tepi buah itu sendiri (tangkai boleh ikut) — BUKAN tangan, jari, daun, wadah, atau latar; bila letak buah tidak yakin, lebih baik "boxes": [] daripada kotak salah tempat. Stage "mentah" | "setengah_matang" | "matang".
     * Jika pada buah segar tersebut terlihat ada bercak/penyakit KECIL atau gejala awal ringan (buah masih dominan segar), tetap set "fokusOutput": "kematangan", set "penyakitUtamaId": "sehat", dan masukkan ID penyakit ringannya ke "penyakitRinganId" (selain itu set "penyakitRinganId": null).
     * "ringkasanSingkat" fokus ke kondisi kematangan buah saja.
   - KASUS C — GEJALA KEKURANGAN HARA MURNI (misal daun menguning pucat/tepi terbakar/antar-tulang kuning tanpa penyakit jamur/bakteri dominan):
     * Set "fokusOutput": "hara", "adaGejalaHara": true, "dugaanHaraId" ke ID hara resmi (bukan "cukup"), "boxes": [], "tahapDominan": null, "anjuranPanen": "Fokus daun/batang".
3B. SAYURAN DAUN & TANAMAN TANPA BUAH (selada, sawi, pakcoy, bayam, kangkung, seledri, dll):
   - Bagian yang dipanen adalah DAUN/BATANG. JANGAN pernah set "fokusOutput": "tidak_terdeteksi" hanya karena tidak ada buah.
   - Jika tanaman tampak jelas: pilih "penyakit" (dengan "penyakitUtamaId": "sehat" bila sehat) atau "hara" bila ada gejala kekurangan hara. "tanpaBuahTerdeteksi": false.
3C. LAPORAN KONDISI ("laporanKondisi") — WAJIB DIISI untuk setiap tanaman yang terlihat jelas, jawab sejelas mungkin untuk petani:
   - "kesiapanPanen": "status" salah satu "siap" | "hampir" | "belum" | "lewat" | "tidak_dinilai"; "label" singkat (misal "Siap panen sekarang", "Belum siap · ±7–10 hari lagi", "Lewat panen · segera petik"); "alasan" 1 kalimat dari ciri yang terlihat (untuk sayuran daun nilai dari ukuran, jumlah & kerapatan daun; untuk buah dari warna & ukuran).
   - "risikoPenyakit": "level" salah satu "rendah" | "sedang" | "tinggi"; "label" (misal "Risiko rendah · tidak tampak gejala" atau nama penyakit yang dicurigai); "alasan" 1 kalimat gejala yang terlihat atau tidak terlihat.
   - "kondisiHara": "status" "cukup" | "kurang"; "label" (misal "Hara cukup" atau "Diduga kurang nitrogen"); "alasan" 1 kalimat.
   - "catatanLain": 0–3 kalimat singkat hal penting lain yang terlihat (hama, kotoran/tanah menempel, kualitas untuk dijual, penanganan setelah panen, kualitas foto). Kosongkan bila tidak ada.
   - Jika foto bukan tanaman / jenis tidak sesuai: isi status "tidak_dinilai", level "rendah", status hara "cukup", label & alasan "" dan catatanLain [].
4. DETEKSI GEJALA HARA ("adaGejalaHara"):
   - Set "adaGejalaHara": true HANYA jika benar-benar tampak gejala kekurangan hara (termasuk busuk_ujung_buah yang terkait kurang_kalsium) dan "dugaanHaraId" != "cukup". Jika tidak ada gejala hara, set "adaGejalaHara": false dan "dugaanHaraId": "cukup".
5. PENYAKIT TOP-3:
   - Selalu isi "penyakitTop3" tepat 3 ID berbeda dari daftar resmi [${VALID_DISEASE_IDS.join(', ')}] dengan total confidence = 100.
6. GAYA BAHASA "ringkasanSingkat" & "temuanVisual":
   - Bahasa Indonesia alami sehari-hari untuk petani, 1–2 kalimat singkat, TANPA istilah ML/AI, dan JANGAN PERNAH menyebut kalimat seperti "berdasarkan konteks foto", "pengguna ingin melihat...", atau "mode penyakit/kematangan".
7. Jawab HANYA objek JSON valid tanpa markdown fence.`;

    const userPrompt = `Analisis foto nyata ini sesuai Dataset Khusus CermatTani v2.1:
- Tanaman target dipilih pengguna: ${adaTarget ? `${plant.nama} (varietas ${plant.varietas})` : 'Tidak dipilih — kenali sendiri jenis tanamannya'}
- Fase tumbuh: ${plant.fase}
- Petunjuk bagian (jika ada): ${hintBagian}
- Data sensor lahan tersedia: ${sensorAvailable ? 'Ya' : 'Tidak'}

Kembalikan tepat JSON sesuai skema.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        objekTeridentifikasi: { type: 'STRING' },
        sesuaiTanamanDipilih: { type: 'BOOLEAN' },
        penjelasanJenis: { type: 'STRING' },
        perbandinganJenis: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              aspek: { type: 'STRING' },
              diFoto: { type: 'STRING' },
              tanamanTarget: { type: 'STRING' },
            },
            required: ['aspek', 'diFoto', 'tanamanTarget'],
          },
        },
        saranJenis: { type: 'STRING' },
        laporanKondisi: {
          type: 'OBJECT',
          properties: {
            kesiapanPanen: {
              type: 'OBJECT',
              properties: {
                status: { type: 'STRING', enum: ['siap', 'hampir', 'belum', 'lewat', 'tidak_dinilai'] },
                label: { type: 'STRING' },
                alasan: { type: 'STRING' },
              },
              required: ['status', 'label', 'alasan'],
            },
            risikoPenyakit: {
              type: 'OBJECT',
              properties: {
                level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi'] },
                label: { type: 'STRING' },
                alasan: { type: 'STRING' },
              },
              required: ['level', 'label', 'alasan'],
            },
            kondisiHara: {
              type: 'OBJECT',
              properties: {
                status: { type: 'STRING', enum: ['cukup', 'kurang'] },
                label: { type: 'STRING' },
                alasan: { type: 'STRING' },
              },
              required: ['status', 'label', 'alasan'],
            },
            catatanLain: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['kesiapanPanen', 'risikoPenyakit', 'kondisiHara', 'catatanLain'],
        },
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
              box_2d: { type: 'ARRAY', items: { type: 'NUMBER' } },
              stage: { type: 'STRING', enum: ['mentah', 'setengah_matang', 'matang'] },
              confidence: { type: 'NUMBER' },
            },
            required: ['box_2d', 'stage', 'confidence'],
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
        'objekTeridentifikasi',
        'sesuaiTanamanDipilih',
        'penjelasanJenis',
        'perbandinganJenis',
        'saranJenis',
        'laporanKondisi',
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

    // Panggilan deteksi kotak (paralel). Hanya Gemini: model lain terbukti meleset menaruh kotak.
    const detectPromise = callGeminiServer({
      mode: 'vision',
      models: ['gemini/gemini-2.5-flash'],
      systemInstruction: DETECT_INSTRUCTION,
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Temukan setiap buah di foto ini.' },
            { inlineData: { mimeType: parsedImg.mimeType, data: parsedImg.base64 } },
          ],
        },
      ],
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 500,
      // Resolusi penuh untuk kotak: "low" membuat Gemini melihat gambar ±64 token → kotak meleset/rusak
      imageDetail: 'high',
    }).catch(() => null);

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
      // Jawaban nyata ±400–600 token; batas 1.500 hanya pengaman agar tidak boros
      maxOutputTokens: 1500,
    });

    if (!aiRes.ok) {
      logAiFailure('scan', aiRes.error, aiRes.statusCode);
      return NextResponse.json({ ok: false, error: AI_BUSY_MESSAGE.scan }, { status: 503 });
    }

    let parsed: ParsedGeminiScan;
    try {
      parsed = JSON.parse(extractJsonObject(aiRes.text)) as ParsedGeminiScan;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'Cermo belum bisa membaca hasil pemeriksaan foto ini. Coba pindai ulang ya.',
        },
        { status: 502 }
      );
    }

    const diluarKonteks = Boolean(parsed.diluarKonteksTanaman);
    const objekTeridentifikasi = String(parsed.objekTeridentifikasi || '').trim();
    const penjelasanJenis = String(parsed.penjelasanJenis || '').trim();
    // Jenis tanaman di foto berbeda dari tanaman yang dipilih (misal pilih tomat, foto mangga)
    const jenisTidakSesuai = adaTarget && !diluarKonteks && parsed.sesuaiTanamanDipilih === false;
    const perbandinganJenis = jenisTidakSesuai && Array.isArray(parsed.perbandinganJenis)
      ? parsed.perbandinganJenis
          .map((r) => ({
            aspek: String(r?.aspek || '').trim(),
            diFoto: String(r?.diFoto || '').trim(),
            tanamanTarget: String(r?.tanamanTarget || '').trim(),
          }))
          .filter((r) => r.aspek && (r.diFoto || r.tanamanTarget))
          .slice(0, 5)
      : [];
    const saranJenis = jenisTidakSesuai ? String(parsed.saranJenis || '').trim() : '';
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

    // Catatan: "tanpaBuahTerdeteksi" TIDAK lagi memaksa "tidak terdeteksi" — sayuran daun (selada, sawi) memang tak berbuah
    if (diluarKonteks || jenisTidakSesuai) {
      fokusOutput = 'tidak_terdeteksi';
    } else if (FRUIT_ROT_IDS.has(utamaId) || (utamaId !== 'sehat' && fokusOutput !== 'kematangan')) {
      // Buah busuk / berpenyakit berat WAJIB murni fokus penyakit — NOL kematangan!
      fokusOutput = 'penyakit';
    } else if (bagian !== 'buah' && fokusOutput === 'kematangan') {
      fokusOutput = utamaId !== 'sehat' ? 'penyakit' : 'hara';
    }

    // Kotak dari panggilan deteksi khusus (lebih tepat); bila gagal/kosong pakai kotak analisis utama.
    const detectRes = await detectPromise;
    let detectedBoxes: NonNullable<ParsedGeminiScan['boxes']> = [];
    if (detectRes?.ok) {
      try {
        const det = JSON.parse(extractJsonObject(detectRes.text)) as { boxes?: ParsedGeminiScan['boxes'] };
        const baseConf = Number(parsed.keyakinan) || 85;
        detectedBoxes = (Array.isArray(det.boxes) ? det.boxes : [])
          .filter((b) => Array.isArray(b?.box_2d) && b.box_2d.length === 4)
          .map((b) => ({ ...b, confidence: baseConf }));
      } catch {
        detectedBoxes = [];
      }
    }
    const sourceBoxes = detectedBoxes.length > 0 ? detectedBoxes : parsed.boxes;
    const tokenTotal = sumTokens(aiRes.tokens, detectRes?.ok ? detectRes.tokens : null);

    // Kotak deteksi HANYA untuk buah segar (fokusOutput === 'kematangan')
    const safeBoxes =
      fokusOutput === 'kematangan' && Array.isArray(sourceBoxes)
        ? sourceBoxes
            .slice(0, 12)
            .map((b, i) => {
              // Format utama: box_2d [ymin, xmin, ymax, xmax] skala 0–1000 (dijelaskan eksplisit di prompt).
              // Fallback: x/y/w/h persen untuk respons lama.
              let x: number;
              let y: number;
              let w: number;
              let h: number;
              if (Array.isArray(b.box_2d) && b.box_2d.length === 4 && b.box_2d.every((n) => Number.isFinite(Number(n)))) {
                const [a, c, d, e] = b.box_2d.map(Number);
                const ymin = Math.min(a, d);
                const ymax = Math.max(a, d);
                const xmin = Math.min(c, e);
                const xmax = Math.max(c, e);
                x = clamp(xmin / 10, 0, 95);
                y = clamp(ymin / 10, 0, 95);
                w = clamp((xmax - xmin) / 10, 4, 100 - x);
                h = clamp((ymax - ymin) / 10, 4, 100 - y);
              } else {
                const rawX = Number(b.x) || 0;
                const rawY = Number(b.y) || 0;
                const rawW = Number(b.w) || 0;
                const rawH = Number(b.h) || 0;
                const scaleDiv = Math.max(rawX, rawY, rawW, rawH) > 100 ? 10 : 1;
                x = clamp(rawX / scaleDiv, 0, 95);
                y = clamp(rawY / scaleDiv, 0, 95);
                w = clamp(rawW / scaleDiv, 4, 100 - x);
                h = clamp(rawH / scaleDiv, 4, 100 - y);
              }
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

    // Fokus kematangan tanpa kotak buah: tampilkan sebagai pemeriksaan kesehatan, bukan "tidak terdeteksi"
    if (fokusOutput === 'kematangan' && safeBoxes.length === 0 && !parsed.tahapDominan) {
      fokusOutput = 'penyakit';
    }

    const tanpaObjek = fokusOutput === 'tidak_terdeteksi';

    const lk = parsed.laporanKondisi || {};
    const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
      allowed.includes(v as T) ? (v as T) : fallback;
    const txt = (v: unknown) => String(v || '').trim();
    const laporanKondisi = tanpaObjek
      ? null
      : {
          kesiapanPanen: {
            status: pick(lk.kesiapanPanen?.status, ['siap', 'hampir', 'belum', 'lewat', 'tidak_dinilai'] as const, 'tidak_dinilai'),
            label: txt(lk.kesiapanPanen?.label),
            alasan: txt(lk.kesiapanPanen?.alasan),
          },
          risikoPenyakit: {
            level: pick(lk.risikoPenyakit?.level, ['rendah', 'sedang', 'tinggi'] as const, 'rendah'),
            label: txt(lk.risikoPenyakit?.label),
            alasan: txt(lk.risikoPenyakit?.alasan),
          },
          kondisiHara: {
            status: pick(lk.kondisiHara?.status, ['cukup', 'kurang'] as const, 'cukup'),
            label: txt(lk.kondisiHara?.label),
            alasan: txt(lk.kondisiHara?.alasan),
          },
          catatanLain: Array.isArray(lk.catatanLain) ? lk.catatanLain.map(txt).filter(Boolean).slice(0, 3) : [],
        };

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
      aiProvider: aiRes.provider,
      tokenUsage: tokenTotal,
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
        objekTeridentifikasi,
        jenisTidakSesuai,
        penjelasanJenis,
        perbandinganJenis,
        saranJenis,
        laporanKondisi,
        aiModel: aiRes.model,
        ringkasanAi,
        temuanVisual,
      },
    });
  } catch (err) {
    logAiFailure('scan', err, 500);
    return NextResponse.json({ ok: false, error: AI_BUSY_MESSAGE.scan }, { status: 503 });
  }
}
