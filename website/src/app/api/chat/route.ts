import { NextResponse } from 'next/server';
import { AI_BUSY_MESSAGE, callGeminiServer, logAiFailure, type GeminiContent } from '@/lib/gemini';
import {
  buildGroundedChatDatasetContext,
  DATASET_CROPS,
  DATASET_DISEASES,
  DATASET_NUTRIENTS,
  DATASET_RIPENESS,
} from '@/data/agronomyDataset';
import { fetchExternalAgronomyKnowledge } from '@/lib/externalKnowledge';

/* POST /api/chat — Chatbot Cermo 100% Gemini AI + Dataset Agronomi v2.1 + Konteks Hasil Scan Terakhir */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const plant = body.plant ?? null;
    const latestScan = body.latestScan ?? null;
    const sensor = body.sensor ?? null;
    const lowConfidenceThreshold = Number(body.lowConfidenceThreshold ?? 60);
    const tankLowThreshold = Number(body.tankLowThreshold ?? 20);
    const history: Array<{ peran: 'cermo' | 'pengguna'; isi: string }> = Array.isArray(body.history)
      ? body.history.slice(-10)
      : [];

    let scanSummary = 'Belum ada hasil scan tersimpan untuk tanaman ini.';
    if (latestScan) {
      const fokus = latestScan.fokusOutput || (latestScan.tahapDominan ? 'kematangan' : 'penyakit');
      if (fokus === 'penyakit') {
        const dis = DATASET_DISEASES[latestScan.penyakitUtamaId] || DATASET_DISEASES.sehat;
        const haraNote =
          latestScan.adaGejalaHara && latestScan.dugaanHaraId && DATASET_NUTRIENTS[latestScan.dugaanHaraId]
            ? ` Juga terindikasi ${DATASET_NUTRIENTS[latestScan.dugaanHaraId].dugaan}.`
            : '';
        scanSummary = `Hasil scan terakhir (bagian ${latestScan.bagian}): terdeteksi "${dis.penyakit}" (keyakinan ${latestScan.keyakinan}%). Penyebab: ${dis.penyebab}.${haraNote}${latestScan.ringkasanAi ? ` Catatan visual: ${latestScan.ringkasanAi}` : ''
          } PENTING: Hasil ini adalah kasus penyakit/busuk, JANGAN menyarankan panen atau membahas kematangan buah ini.`;
      } else if (fokus === 'kematangan') {
        const rip =
          latestScan.tahapDominan && DATASET_RIPENESS[latestScan.tahapDominan as keyof typeof DATASET_RIPENESS]
            ? DATASET_RIPENESS[latestScan.tahapDominan as keyof typeof DATASET_RIPENESS]
            : null;
        const minorDis =
          latestScan.penyakitRinganId && DATASET_DISEASES[latestScan.penyakitRinganId]
            ? ` Catatan penyakit ringan pada buah: ${DATASET_DISEASES[latestScan.penyakitRinganId].penyakit}.`
            : '';
        scanSummary = `Hasil scan terakhir (buah segar): tahap "${rip?.label || '-'}", jumlah ${latestScan.jumlahBuah} buah, anjuran "${latestScan.anjuranPanen}" (estimasi ${latestScan.estimasiHariMin ?? '-'}–${latestScan.estimasiHariMax ?? '-'} hari, perkiraan bobot ~${latestScan.estimasiBobotGram || 0}g, keyakinan ${latestScan.keyakinan}%).${minorDis}${latestScan.ringkasanAi ? ` Catatan visual: ${latestScan.ringkasanAi}` : ''
          }`;
      } else if (fokus === 'hara') {
        const nut = DATASET_NUTRIENTS[latestScan.dugaanHaraId] || DATASET_NUTRIENTS.cukup;
        scanSummary = `Hasil scan terakhir (bagian ${latestScan.bagian}): "${nut.dugaan}" (keyakinan ${latestScan.keyakinan}%). Gejala: ${nut.gejala}.`;
      } else {
        scanSummary = `Hasil scan terakhir belum mendeteksi objek tanaman secara jelas (${latestScan.ringkasanAi || 'perlu foto ulang'}).`;
      }
    }

    const sensorSummary = sensor
      ? `Sensor lahan (${sensor.simulasi ? 'Simulasi ESP32' : 'ESP32 nyata'}): kelembapan tanah ${sensor.kelembapanTanah
      }%, N ${sensor.nitrogenMgKg} / P ${sensor.fosforMgKg} / K ${sensor.kaliumMgKg} mg/kg, suhu udara ${sensor.suhuUdara
      }°C, kelembapan udara ${sensor.kelembapanUdara}%, level tandon ${sensor.levelTandonPersen
      }% (ambang kritis < ${tankLowThreshold}%), baterai surya ${sensor.bateraiPersen}%.`
      : 'Data sensor lahan tidak tersedia.';

    const groundedDataset = buildGroundedChatDatasetContext({
      message,
      plant,
      latestScan,
      sensor,
    });

    // Ambil referensi eksternal live (Wikipedia & GBIF Taxonomy) untuk patogen atau tanaman terkait
    const msgLower = message.toLowerCase();
    const matchedDisForExt =
      (latestScan?.penyakitUtamaId &&
        latestScan.penyakitUtamaId !== 'sehat' &&
        DATASET_DISEASES[latestScan.penyakitUtamaId]) ||
      Object.values(DATASET_DISEASES).find(
        (d) =>
          d.id !== 'sehat' &&
          (msgLower.includes(d.penyakit.toLowerCase()) ||
            d.kataKunci.some((k) => msgLower.includes(k)))
      );
    const matchedCropForExt = DATASET_CROPS.find(
      (c) =>
        c.kataKunci.some((k) => msgLower.includes(k)) ||
        `${plant?.nama || ''} ${plant?.varietas || ''}`.toLowerCase().includes(c.namaUmum.toLowerCase())
    );
    const externalKnowledge = matchedDisForExt
      ? await fetchExternalAgronomyKnowledge(
          matchedDisForExt.wikiQuery,
          matchedDisForExt.namaIlmiahPatogen,
          {
            topicId: matchedDisForExt.id,
            indonesianTitle: matchedDisForExt.penyakit,
            indonesianContext: matchedDisForExt.penyebab,
          }
        )
      : matchedCropForExt
        ? await fetchExternalAgronomyKnowledge(
            matchedCropForExt.namaUmum,
            matchedCropForExt.namaIlmiah,
            {
              topicId: matchedCropForExt.id,
              indonesianTitle: matchedCropForExt.namaUmum,
              indonesianContext: matchedCropForExt.catatanBudidaya,
            }
          )
        : null;

    const externalBlock = externalKnowledge
      ? `\n\n=== REFERENSI EKSTERNAL LIVE (${externalKnowledge.sumberLabel}${
          externalKnowledge.taksonomi?.namaIlmiah
            ? ` & GBIF: ${externalKnowledge.taksonomi.namaIlmiah}`
            : ''
        }) ===\n- Judul: ${externalKnowledge.judul}\n- Ringkasan: ${externalKnowledge.ringkasan}${
          externalKnowledge.taksonomi
            ? `\n- Taksonomi: ${[
                externalKnowledge.taksonomi.kerajaan,
                externalKnowledge.taksonomi.filum,
                externalKnowledge.taksonomi.famili,
              ]
                .filter(Boolean)
                .join(' > ')}`
            : ''
        }\n- Portal Resmi Terverifikasi: ${externalKnowledge.tautanResmi
          .map((l) => `${l.label} (${l.url})`)
          .join(' | ')}`
      : '';

    const systemInstruction = `Kamu adalah Cermo, asisten agronomi resmi di aplikasi CermatTani.
Gaya bicara: bahasa Indonesia sehari-hari yang hangat, jelas, sopan, mudah dipahami petani, menyapa dengan "kamu". JANGAN pakai istilah teknis ML/AI dan JANGAN pernah menyebut cara kerja routing konteks internal.

=== BATASAN KONTEKS KETAT ===
1. TOPIK DIIZINKAN HANYA: budidaya tanaman kebun, penjelasan lanjutan hasil scan (kematangan buah, buah busuk/penyakit/hama, hara/pupuk organik), irigasi, tandon, iklim mikro, energi surya, dan fitur CermatTani.
2. TOLAK TOPIK DI LUAR PERTANIAN/CERMATTANI dengan sopan dalam 2 kalimat:
   "Maaf ya, aku Cermo hanya bisa membantu seputar budidaya tanaman, hasil scan, pupuk, irigasi, dan fitur kebun di CermatTani. Yuk tanyakan kondisi tanaman atau hasil scan kebunmu hari ini!"
3. PATUHI DATASET KHUSUS DI BAWAH:
   - Semua diagnosa, solusi, dosis, dan langkah pencegahan WAJIB bersumber dari DATASET KHUSUS AGRONOMI CERMATTANI di bawah.
   - Selalu dahulukan solusi ORGANIK dan teknik budidaya sebelum opsi kimiawi. Setiap kali menyebut bahan kimia, WAJIB sertakan "baca label produk".
   - Setiap kali membahas pupuk/dosis hara, WAJIB ingatkan "bukan pengganti uji tanah".
   - Jika hasil scan terakhir adalah buah busuk / penyakit, fokuslah pada penanganan busuk/penyakit dan sanitasi — JANGAN membahas kematangan atau menyarankan panen buah busuk tersebut.
   - Jika keyakinan scan < ${lowConfidenceThreshold}% atau pengguna ragu, sarankan foto ulang di cahaya terang jarak 20–40 cm dan konfirmasi ke penyuluh pertanian setempat.
4. FORMAT JAWABAN:
   - Ringkas, terstruktur, maksimal 3–5 kalimat atau 3–4 poin pendek yang mudah dibaca di layar HP.
   - Jangan menulis ulang label "Saran, bukan keputusan akhir" karena UI sudah menampilkannya otomatis.

=== KONTEKS KEBUN & HASIL SCAN PENGGUNA ===
- Tanaman aktif: ${plant ? `${plant.nama} (varietas ${plant.varietas}, fase ${plant.fase})` : 'Belum dipilih'}
- ${scanSummary}
- ${sensorSummary}

=== DATASET KHUSUS AGRONOMI CERMATTANI v3.0 ===
${groundedDataset}${externalBlock}
=== AKHIR DATASET ===`;

    const contents: GeminiContent[] = [
      ...history.map((h) => ({
        role: (h.peran === 'cermo' ? 'model' : 'user') as 'user' | 'model',
        parts: [{ text: h.isi }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const aiRes = await callGeminiServer({
      mode: 'chat',
      systemInstruction,
      contents,
      responseMimeType: 'text/plain',
      temperature: 0.3,
      maxOutputTokens: 540,
    });

    if (!aiRes.ok) {
      logAiFailure('chat', aiRes.error, aiRes.statusCode);
      return NextResponse.json({ error: AI_BUSY_MESSAGE.chat }, { status: 503 });
    }

    return NextResponse.json({
      reply: aiRes.text,
      disclaimer: 'Saran, bukan keputusan akhir',
      aiProvider: aiRes.provider,
      aiModel: aiRes.model,
      datasetVersion: 'CermatTani-Agronomy-v3.0',
      externalSource: externalKnowledge
        ? {
          judul: externalKnowledge.judul,
          sumberLabel: externalKnowledge.sumberLabel,
          sumberUrl: externalKnowledge.sumberUrl,
        }
        : null,
      waktu: new Date().toISOString(),
    });
  } catch (err) {
    logAiFailure('chat', err, 500);
    return NextResponse.json({ error: AI_BUSY_MESSAGE.chat }, { status: 503 });
  }
}
