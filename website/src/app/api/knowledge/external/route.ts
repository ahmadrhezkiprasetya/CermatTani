import { NextResponse } from 'next/server';
import { DATASET_CROPS, DATASET_DISEASES, DATASET_NUTRIENTS } from '@/data/agronomyDataset';
import { fetchExternalAgronomyKnowledge } from '@/lib/externalKnowledge';

/**
 * GET /api/knowledge/external?diseaseId=...&nutrientId=...&crop=...&q=...
 * Menyambungkan hasil scan & pengetahuan tanaman ke portal agronomi resmi yang se-topik
 * (UC IPM, Cornell Vegetables, UMD Extension, EPPO Global Database, OpenAlex, Wikipedia, GBIF)
 * dengan verifikasi live dan fallback otomatis antar web resmi.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const diseaseId = searchParams.get('diseaseId')?.trim() || '';
    const nutrientId = searchParams.get('nutrientId')?.trim() || '';
    const cropQuery = searchParams.get('crop')?.trim() || '';
    const freeQuery = searchParams.get('q')?.trim() || '';

    let primaryQuery = freeQuery;
    let scientificHint = '';
    let topicId = '';
    let indonesianTitle = '';
    let indonesianContext = '';

    if (diseaseId && DATASET_DISEASES[diseaseId]) {
      const d = DATASET_DISEASES[diseaseId];
      topicId = d.id;
      primaryQuery = d.wikiQuery || d.penyakit;
      scientificHint = d.namaIlmiahPatogen;
      indonesianTitle = d.penyakit;
      indonesianContext = d.penyebab;
    } else if (nutrientId && DATASET_NUTRIENTS[nutrientId]) {
      const n = DATASET_NUTRIENTS[nutrientId];
      topicId = n.id;
      primaryQuery = `${n.unsurSimbol} plant nutrient deficiency`;
      scientificHint = `${n.unsurSimbol} deficiency tomato`;
      indonesianTitle = n.dugaan;
      indonesianContext = n.gejala;
    } else if (cropQuery) {
      const matched = DATASET_CROPS.find(
        (c) =>
          c.id === cropQuery.toLowerCase() ||
          c.namaUmum.toLowerCase().includes(cropQuery.toLowerCase()) ||
          c.kataKunci.some((k) => cropQuery.toLowerCase().includes(k))
      );
      topicId = matched?.id || '';
      primaryQuery = matched ? matched.namaUmum : cropQuery;
      scientificHint = matched ? matched.namaIlmiah : '';
      indonesianTitle = matched ? `${matched.namaUmum} (${matched.namaIlmiah})` : cropQuery;
      indonesianContext = matched ? matched.catatanBudidaya : '';
    }

    if (!primaryQuery) {
      return NextResponse.json(
        { ok: false, error: 'Parameter diseaseId, nutrientId, crop, atau q diperlukan.' },
        { status: 400 }
      );
    }

    const external = await fetchExternalAgronomyKnowledge(primaryQuery, scientificHint, {
      topicId,
      indonesianTitle,
      indonesianContext,
    });
    return NextResponse.json({
      ok: true,
      external,
      datasetVersion: 'CermatTani-Agronomy-v3.1',
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Gagal mengambil referensi eksternal.',
      },
      { status: 500 }
    );
  }
}
