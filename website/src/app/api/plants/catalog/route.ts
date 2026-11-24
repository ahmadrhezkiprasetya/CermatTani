import dns from 'node:dns';
import { NextResponse } from 'next/server';
import {
  ALL_VARIETY_OPTIONS,
  estimateWeightForVariety,
  inferCommodityFromVariety,
  PlantVarietyOption,
  SATUDATA_KLATEN_API_BASE,
  SATUDATA_KLATEN_RESOURCE_ID,
} from '@/data/plantVarieties';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Abaikan pada runtime non-Node
}

interface CachedCkanData {
  items: PlantVarietyOption[];
  fetchedAt: number;
}

let ckanCache: CachedCkanData | null = null;
const CKAN_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

function normalizeCkanPlantName(raw: string): { idName: string; enName: string } | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.endsWith(':')) return null;
  const parts = trimmed.split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const idName = parts[0].replace(/\s+/g, ' ');
  const enName = parts.slice(1).join(' / ').replace(/\bMelom\b/gi, 'Melon');
  return { idName, enName };
}

async function fetchSatuDataKlatenPlants(query?: string): Promise<PlantVarietyOption[]> {
  const now = Date.now();
  if (ckanCache && now - ckanCache.fetchedAt < CKAN_CACHE_TTL_MS && ckanCache.items.length > 0) {
    if (!query) return ckanCache.items;
    const q = query.toLowerCase();
    return ckanCache.items.filter(
      (i) => i.value.toLowerCase().includes(q) || i.label.toLowerCase().includes(q)
    );
  }

  try {
    const params = new URLSearchParams({
      resource_id: SATUDATA_KLATEN_RESOURCE_ID,
      limit: '100',
    });
    const res = await fetch(`${SATUDATA_KLATEN_API_BASE}?${params.toString()}`, {
      headers: { 'User-Agent': 'CermatTani/1.0 (Open-Data-Agronomy)' },
      signal: AbortSignal.timeout(5500),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const records: Array<Record<string, unknown>> = data?.result?.records || [];

    let currentCategory = 'Komoditas Pertanian';
    const items: PlantVarietyOption[] = [];

    for (const rec of records) {
      const rawName = String(rec.jenis_tanaman_kind_of_plants || '').trim();
      if (!rawName) continue;
      if (rawName.endsWith(':')) {
        currentCategory = rawName.split('/')[0].replace(/[:–-]+$/g, '').trim() || 'Komoditas Pertanian';
        continue;
      }
      const parsed = normalizeCkanPlantName(rawName);
      if (!parsed) continue;

      const label = parsed.enName ? `${parsed.idName} (${parsed.enName})` : parsed.idName;
      items.push({
        value: parsed.idName,
        label,
        komoditas: inferCommodityFromVariety(parsed.idName),
        bobotGram: estimateWeightForVariety(parsed.idName),
        category: currentCategory,
        source: 'satudata_klaten',
        sourceLabel: 'Satu Data Klaten (CKAN)',
      });
    }

    if (items.length > 0) {
      ckanCache = { items, fetchedAt: now };
    }

    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) => i.value.toLowerCase().includes(q) || i.label.toLowerCase().includes(q)
    );
  } catch {
    return [];
  }
}

async function fetchGbifPlantSpecies(query: string): Promise<PlantVarietyOption[]> {
  if (query.trim().length < 2) return [];
  try {
    const url = `https://api.gbif.org/v1/species/suggest?q=${encodeURIComponent(query.trim())}&limit=12`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CermatTani/1.0' },
      signal: AbortSignal.timeout(3500),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const rows: Array<Record<string, unknown>> = await res.json();
    const seen = new Set<string>();
    const results: PlantVarietyOption[] = [];

    for (const row of rows) {
      if (String(row.kingdom || '') !== 'Plantae') continue;
      const canonical = String(row.canonicalName || row.scientificName || '').trim();
      if (!canonical || seen.has(canonical.toLowerCase())) continue;
      seen.add(canonical.toLowerCase());
      const family = String(row.family || 'Plantae').trim();
      results.push({
        value: canonical,
        label: canonical,
        scientificName: `${canonical} · Famili ${family}`,
        komoditas: inferCommodityFromVariety(canonical),
        bobotGram: estimateWeightForVariety(canonical),
        category: family,
        source: 'gbif',
        sourceLabel: 'GBIF Plantae',
      });
      if (results.length >= 6) break;
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchWikipediaIdPlants(query: string): Promise<PlantVarietyOption[]> {
  if (query.trim().length < 2) return [];
  try {
    const url = `https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query.trim())}&limit=6&namespace=0&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CermatTani/1.0' },
      signal: AbortSignal.timeout(3500),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const arr = await res.json();
    const titles: string[] = Array.isArray(arr?.[1]) ? arr[1] : [];
    return titles
      .filter((t) => typeof t === 'string' && t.trim().length >= 2 && !t.includes('('))
      .slice(0, 5)
      .map((title) => ({
        value: title.trim(),
        label: title.trim(),
        komoditas: inferCommodityFromVariety(title),
        bobotGram: estimateWeightForVariety(title),
        category: 'Referensi Tanaman',
        source: 'wikipedia' as const,
        sourceLabel: 'Wikipedia ID',
      }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const qLower = q.toLowerCase();

  // 1. Filter katalog lokal instan (65+ tanaman lintas 6 kategori)
  const localMatches = qLower
    ? ALL_VARIETY_OPTIONS.filter(
        (item) =>
          item.value.toLowerCase().includes(qLower) ||
          item.label.toLowerCase().includes(qLower) ||
          item.komoditas.toLowerCase().includes(qLower) ||
          (item.category || '').toLowerCase().includes(qLower)
      )
    : ALL_VARIETY_OPTIONS;

  // 2. Ambil data live dari CKAN Satu Data Klaten + GBIF Plantae + Wikipedia ID secara paralel
  const [ckanMatches, gbifMatches, wikiMatches] = await Promise.all([
    fetchSatuDataKlatenPlants(q || undefined),
    q.length >= 2 ? fetchGbifPlantSpecies(q) : Promise.resolve([]),
    q.length >= 2 ? fetchWikipediaIdPlants(q) : Promise.resolve([]),
  ]);

  // Gabungkan & deduplikasi (prioritaskan Satu Data Klaten + Katalog + GBIF + Wikipedia)
  const deduped: PlantVarietyOption[] = [];
  const seen = new Set<string>();

  const pushUnique = (list: PlantVarietyOption[]) => {
    for (const item of list) {
      const key = item.value.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
  };

  pushUnique(ckanMatches);
  pushUnique(localMatches);
  pushUnique(gbifMatches);
  pushUnique(wikiMatches);

  return NextResponse.json({
    query: q,
    sources: {
      satudataKlatenCount: ckanMatches.length,
      katalogCount: localMatches.length,
      gbifCount: gbifMatches.length,
      wikipediaCount: wikiMatches.length,
    },
    items: deduped.slice(0, 60),
  });
}
