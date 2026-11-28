/**
 * Layanan Pengetahuan Tanaman & Patogen Eksternal Multi-Portal (v3.1)
 * -------------------------------------------------------------------
 * Menyambungkan hasil scan & chatbot langsung ke web resmi agronomi yang SE-KONTEKS / SE-TOPIK,
 * dengan mekanisme VERIFIKASI LIVE & AUTO-FALLBACK ke web resmi lain bila topik tidak tersedia:
 *
 * Urutan prioritas pencarian & fallback otomatis:
 * 1. Portal Panduan Resmi Agronomi Se-Topik (UC IPM Univ. California / Cornell Vegetables / Univ. Maryland Extension)
 * 2. EPPO Global Database (Organisasi Perlindungan Tanaman Internasional — datasheet patogen resmi)
 * 3. Pencarian Live Artikel Ilmiah Agronomi & Fitopatologi (OpenAlex API — bebas kunci, otomatis cari topik apapun)
 * 4. Wikipedia Indonesia -> Wikipedia Internasional (fallback ensiklopedia)
 * 5. GBIF Backbone Taxonomy API (verifikasi taksonomi ilmiah global)
 *
 * Setiap URL portal resmi diverifikasi secara live (anti-404 & anti-soft-404); jika situs pertama tidak
 * tersedia atau tidak memuat topik tersebut, sistem otomatis berpindah ke web resmi berikutnya yang relevan.
 */

export interface OfficialReferenceLink {
  label: string;
  domain: string;
  url: string;
  kategori: 'panduan_resmi' | 'database_patogen' | 'publikasi_ilmiah' | 'ensiklopedia' | 'taksonomi';
  terverifikasiLive: boolean;
}

export interface ExternalKnowledgeResult {
  query: string;
  judul: string;
  ringkasan: string;
  sumberLabel: string;
  sumberUrl: string;
  bahasa: 'id' | 'en';
  tautanResmi: OfficialReferenceLink[];
  taksonomi?: {
    namaIlmiah: string;
    kerajaan?: string;
    filum?: string;
    famili?: string;
    genus?: string;
    gbifUrl?: string;
  };
}

interface PortalCandidate {
  label: string;
  domain: string;
  url: string;
  kategori: OfficialReferenceLink['kategori'];
  /** Kata kunci yang diharapkan muncul pada <title> untuk menghindari soft-404 */
  expectedTitleKeyword?: string;
}

interface CacheEntry {
  expiresAt: number;
  data: ExternalKnowledgeResult | null;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Peta portal resmi agronomi & fitopatologi terverifikasi per kelas penyakit/komoditas/hara.
 * Setiap entri berisi 1–3 kandidat web resmi berurutan; saat runtime diverifikasi live
 * dan jika situs pertama tidak cocok/down, otomatis fallback ke kandidat berikutnya + OpenAlex live search.
 */
const OFFICIAL_PORTALS_BY_ID: Record<string, PortalCandidate[]> = {
  sehat: [
    {
      label: 'Panduan Budidaya Tomat UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'tomato',
    },
    {
      label: 'EPPO Global Database (Tomat)',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/LYPES',
      kategori: 'database_patogen',
    },
  ],
  bercak_kering: [
    {
      label: 'Panduan Early Blight — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/early-blight/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'early blight',
    },
    {
      label: 'Datasheet EPPO — Alternaria solani',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/ALTESO',
      kategori: 'database_patogen',
    },
  ],
  busuk_daun: [
    {
      label: 'Panduan Late Blight — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/late-blight/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'late blight',
    },
    {
      label: 'Datasheet EPPO — Phytophthora infestans',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/PHYTIN',
      kategori: 'database_patogen',
    },
  ],
  kapang_daun: [
    {
      label: 'Panduan Leaf Mold — Cornell Vegetables',
      domain: 'vegetables.cornell.edu',
      url: 'https://www.vegetables.cornell.edu/pest-management/disease-factsheets/tomato-leaf-mold/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'leaf mold',
    },
    {
      label: 'Datasheet EPPO — Passalora fulva',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/FULVFU',
      kategori: 'database_patogen',
    },
  ],
  bercak_septoria: [
    {
      label: 'Panduan Septoria — Univ. Maryland Extension',
      domain: 'extension.umd.edu',
      url: 'https://extension.umd.edu/resource/septoria-leaf-spot-tomatoes/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'septoria',
    },
    {
      label: 'Datasheet EPPO — Septoria lycopersici',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/SEPTLY',
      kategori: 'database_patogen',
    },
  ],
  bercak_target: [
    {
      label: 'Datasheet EPPO — Corynespora cassiicola',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/CORMCA',
      kategori: 'database_patogen',
    },
  ],
  bercak_bakteri: [
    {
      label: 'Panduan Bacterial Spot — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/bacterial-spot/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'bacterial spot',
    },
    {
      label: 'Datasheet EPPO — Xanthomonas perforans',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/XANTPE',
      kategori: 'database_patogen',
    },
  ],
  bintik_bakteri: [
    {
      label: 'Panduan Bacterial Speck — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/bacterial-speck/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'bacterial speck',
    },
    {
      label: 'Datasheet EPPO — Pseudomonas syringae pv. tomato',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/PSDMTM',
      kategori: 'database_patogen',
    },
  ],
  kanker_bakteri: [
    {
      label: 'Panduan Bacterial Canker — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/bacterial-canker/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'bacterial canker',
    },
    {
      label: 'Datasheet EPPO — Clavibacter michiganensis',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/CORBMI',
      kategori: 'database_patogen',
    },
  ],
  embun_tepung: [
    {
      label: 'Panduan Powdery Mildew — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/powdery-mildew-on-field-grown-tomatoes/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'powdery mildew',
    },
    {
      label: 'Datasheet EPPO — Oidium neolycopersici',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/OIDINE',
      kategori: 'database_patogen',
    },
  ],
  embun_bulu: [
    {
      label: 'Panduan Downy Mildew — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/cucurbits/downy-mildew/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'downy mildew',
    },
    {
      label: 'Datasheet EPPO — Pseudoperonospora cubensis',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/PSPECU',
      kategori: 'database_patogen',
    },
  ],
  layu_batang: [
    {
      label: 'Panduan Fusarium Wilt — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/fusarium-wilt/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'fusarium',
    },
    {
      label: 'Datasheet EPPO — Fusarium oxysporum',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/FUSAOX',
      kategori: 'database_patogen',
    },
  ],
  busuk_pangkal_sklerotium: [
    {
      label: 'Panduan Southern Blight — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/southern-blight/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'southern blight',
    },
  ],
  keriting_kuning: [
    {
      label: 'Panduan TYLCV — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/tomato-yellow-leaf-curl/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'yellow leaf curl',
    },
    {
      label: 'Datasheet EPPO — TYLCV',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/TYLCV0',
      kategori: 'database_patogen',
    },
  ],
  virus_mosaik: [
    {
      label: 'Panduan Mosaic Virus — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/tobacco-mosaic/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'mosaic',
    },
    {
      label: 'Datasheet EPPO — Tomato Mosaic Virus',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/TOMV00',
      kategori: 'database_patogen',
    },
  ],
  virus_bercak_layu: [
    {
      label: 'Panduan TSWV — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/tomato-spotted-wilt/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'spotted wilt',
    },
    {
      label: 'Datasheet EPPO — TSWV',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/TSWV00',
      kategori: 'database_patogen',
    },
  ],
  tungau_laba: [
    {
      label: 'Datasheet EPPO — Tetranychus urticae',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/TETRUR',
      kategori: 'database_patogen',
    },
    {
      label: 'Panduan Hama Tomat — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'tomato',
    },
  ],
  serangan_hama_daun: [
    {
      label: 'Panduan Leafminers — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/leafminers/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'leafminer',
    },
    {
      label: 'Datasheet EPPO — Liriomyza spp.',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/1LIRIG',
      kategori: 'database_patogen',
    },
  ],
  busuk_ujung_buah: [
    {
      label: 'Panduan Blossom End Rot — Univ. Maryland Extension',
      domain: 'extension.umd.edu',
      url: 'https://extension.umd.edu/resource/blossom-end-rot-vegetables/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'blossom end rot',
    },
  ],
  antraknosa: [
    {
      label: 'Panduan Anthracnose — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/anthracnose/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'anthracnose',
    },
    {
      label: 'Datasheet EPPO — Colletotrichum coccodes',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/COLLCO',
      kategori: 'database_patogen',
    },
  ],
  busuk_basah_buah: [
    {
      label: 'Datasheet EPPO — Pectobacterium carotovorum',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/ERWICA',
      kategori: 'database_patogen',
    },
  ],
  busuk_jamur_buah: [
    {
      label: 'Datasheet EPPO — Phytophthora nicotianae',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/PHYTPN',
      kategori: 'database_patogen',
    },
    {
      label: 'Panduan Phytophthora Tomat — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/phytophthora-root-rot/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'phytophthora',
    },
  ],
  busuk_kapang_abu: [
    {
      label: 'Panduan Gray Mold (Botrytis) — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/gray-mold/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'gray mold',
    },
    {
      label: 'Datasheet EPPO — Botrytis cinerea',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/BOTRCI',
      kategori: 'database_patogen',
    },
  ],
  buah_pecah_sengatan: [
    {
      label: 'Panduan Sunscald — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/PMG/GARDEN/VEGES/ENVIRON/sunscald.html',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'sunscald',
    },
  ],
  // Komoditas utama
  tomat: [
    {
      label: 'Panduan IPM Tomat — UC IPM',
      domain: 'ipm.ucanr.edu',
      url: 'https://ipm.ucanr.edu/agriculture/tomato/',
      kategori: 'panduan_resmi',
      expectedTitleKeyword: 'tomato',
    },
    {
      label: 'EPPO Global Database — Solanum lycopersicum',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/LYPES',
      kategori: 'database_patogen',
    },
  ],
  cabai: [
    {
      label: 'EPPO Global Database — Capsicum annuum',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/CPSAN',
      kategori: 'database_patogen',
    },
  ],
  terong: [
    {
      label: 'EPPO Global Database — Solanum melongena',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/SOLME',
      kategori: 'database_patogen',
    },
  ],
  kentang: [
    {
      label: 'EPPO Global Database — Solanum tuberosum',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/SOLTU',
      kategori: 'database_patogen',
    },
  ],
  selada: [
    {
      label: 'EPPO Global Database — Lactuca sativa',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/LACSA',
      kategori: 'database_patogen',
    },
  ],
  bayam: [
    {
      label: 'EPPO Global Database — Amaranthus tricolor',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/AMATR',
      kategori: 'database_patogen',
    },
  ],
  mentimun: [
    {
      label: 'EPPO Global Database — Cucumis sativus',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/CUMSA',
      kategori: 'database_patogen',
    },
  ],
  sawi: [
    {
      label: 'EPPO Global Database — Brassica rapa',
      domain: 'gd.eppo.int',
      url: 'https://gd.eppo.int/taxon/BRSRA',
      kategori: 'database_patogen',
    },
  ],
};

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 4200): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CermatTani-Agronomy/3.1 (educational-horticulture-app)',
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifikasi live apakah URL portal resmi benar-benar aktif dan memuat topik yang sesuai (anti-404 & anti-soft-404).
 */
async function verifyPortalCandidate(candidate: PortalCandidate): Promise<OfficialReferenceLink | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3600);
  try {
    const method = candidate.expectedTitleKeyword ? 'GET' : 'HEAD';
    const res = await fetch(candidate.url, {
      method,
      headers: { 'User-Agent': 'CermatTani-Agronomy/3.1' },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    if (candidate.expectedTitleKeyword) {
      const html = (await res.text()).slice(0, 6000);
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const titleText = (titleMatch?.[1] || '').toLowerCase();
      if (!titleText.includes(candidate.expectedTitleKeyword.toLowerCase())) {
        return null;
      }
    }

    return {
      label: candidate.label,
      domain: candidate.domain,
      url: candidate.url,
      kategori: candidate.kategori,
      terverifikasiLive: true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pencarian LIVE otomatis ke OpenAlex (jurnal/institusi fitopatologi & agronomi resmi)
 * sebagai fallback atau pelengkap otomatis untuk topik apapun yang tidak ada di situs utama.
 */
async function searchOpenAlexAgronomyArticle(
  topicQuery: string
): Promise<{ title: string; sourceName: string; year?: number; url: string } | null> {
  const clean = topicQuery.trim();
  if (!clean) return null;

  const url = `https://api.openalex.org/works?search=${encodeURIComponent(
    `${clean} plant disease management`
  )}&per-page=4&sort=cited_by_count:desc&select=title,doi,publication_year,primary_location`;

  const data = await fetchJsonWithTimeout<{
    results?: Array<{
      title?: string;
      doi?: string;
      publication_year?: number;
      primary_location?: {
        landing_page_url?: string;
        source?: { display_name?: string };
      };
    }>;
  }>(url, 4000);

  const match = data?.results?.find(
    (w) => w.title && (w.primary_location?.landing_page_url || w.doi)
  );
  if (!match || !match.title) return null;

  const targetUrl = match.primary_location?.landing_page_url || match.doi || '';
  if (!targetUrl.startsWith('http')) return null;

  return {
    title: match.title,
    sourceName: match.primary_location?.source?.display_name || 'Jurnal Agronomi Internasional',
    year: match.publication_year,
    url: targetUrl,
  };
}

async function fetchWikipediaSummary(
  query: string,
  lang: 'id' | 'en'
): Promise<{ title: string; extract: string; url: string } | null> {
  const clean = query.trim();
  if (!clean) return null;

  const directUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    clean.replace(/\s+/g, '_')
  )}`;
  const direct = await fetchJsonWithTimeout<{
    type?: string;
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  }>(directUrl, 3400);

  if (direct && direct.type !== 'disambiguation' && direct.extract && direct.extract.length > 45) {
    return {
      title: direct.title || clean,
      extract: direct.extract.slice(0, 420),
      url:
        direct.content_urls?.desktop?.page ||
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(clean.replace(/\s+/g, '_'))}`,
    };
  }

  const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    clean
  )}&limit=1&namespace=0&format=json`;
  const searchRes = await fetchJsonWithTimeout<[string, string[], string[], string[]]>(
    searchUrl,
    3400
  );
  const topTitle = searchRes?.[1]?.[0];
  if (!topTitle) return null;

  const fallbackDirect = await fetchJsonWithTimeout<{
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  }>(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      topTitle.replace(/\s+/g, '_')
    )}`,
    3400
  );
  if (fallbackDirect?.extract && fallbackDirect.extract.length > 45) {
    return {
      title: fallbackDirect.title || topTitle,
      extract: fallbackDirect.extract.slice(0, 420),
      url:
        fallbackDirect.content_urls?.desktop?.page ||
        searchRes?.[3]?.[0] ||
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(topTitle.replace(/\s+/g, '_'))}`,
    };
  }
  return null;
}

async function fetchGbifTaxonomy(
  scientificName: string
): Promise<ExternalKnowledgeResult['taksonomi'] | undefined> {
  const clean = scientificName.trim();
  if (!clean || clean.split(/\s+/).length > 5) return undefined;
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(clean)}`;
  const data = await fetchJsonWithTimeout<{
    matchType?: string;
    usageKey?: number;
    scientificName?: string;
    kingdom?: string;
    phylum?: string;
    family?: string;
    genus?: string;
  }>(url, 3600);

  if (!data || data.matchType === 'NONE' || !data.scientificName) return undefined;
  return {
    namaIlmiah: data.scientificName,
    kerajaan: data.kingdom,
    filum: data.phylum,
    famili: data.family,
    genus: data.genus,
    gbifUrl: data.usageKey ? `https://www.gbif.org/species/${data.usageKey}` : undefined,
  };
}

export interface FetchExternalOptions {
  topicId?: string;
  indonesianTitle?: string;
  indonesianContext?: string;
}

/**
 * Ambil referensi eksternal resmi multi-portal (UC IPM / Cornell / UMD / EPPO / OpenAlex / Wikipedia / GBIF)
 * dengan verifikasi live dan fallback otomatis ke web resmi lain yang se-topik bila situs utama tidak tersedia.
 */
export async function fetchExternalAgronomyKnowledge(
  query: string,
  scientificNameHint?: string,
  options?: FetchExternalOptions
): Promise<ExternalKnowledgeResult | null> {
  const topicId = options?.topicId?.trim().toLowerCase() || '';
  const key = `${topicId}|${query.trim().toLowerCase()}|${(scientificNameHint || '').trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const taxTarget = scientificNameHint?.trim() || query.trim();
  const candidates = topicId ? OFFICIAL_PORTALS_BY_ID[topicId] || [] : [];

  // Jalankan verifikasi portal resmi + pencarian live alternatif (OpenAlex, Wikipedia ID/EN, GBIF) secara paralel
  const [verifiedPortalsRaw, openAlexArticle, wikiId, wikiEn, taxonomy] = await Promise.all([
    Promise.all(candidates.map((c) => verifyPortalCandidate(c))),
    searchOpenAlexAgronomyArticle(scientificNameHint || query),
    fetchWikipediaSummary(query, 'id'),
    fetchWikipediaSummary(scientificNameHint || query, 'en'),
    fetchGbifTaxonomy(taxTarget),
  ]);

  const tautanResmi: OfficialReferenceLink[] = [];
  const seenUrls = new Set<string>();
  const pushLink = (link: OfficialReferenceLink) => {
    if (!link.url || seenUrls.has(link.url)) return;
    seenUrls.add(link.url);
    tautanResmi.push(link);
  };

  // 1. Portal resmi agronomi se-topik yang lolos verifikasi live
  for (const vp of verifiedPortalsRaw) {
    if (vp) pushLink(vp);
  }

  // 2. Artikel publikasi fitopatologi/agronomi live dari OpenAlex (auto-fallback lintas web resmi)
  if (openAlexArticle) {
    let domain = 'doi.org';
    try {
      domain = new URL(openAlexArticle.url).hostname.replace(/^www\./, '');
    } catch {
      // tetap pakai doi.org
    }
    pushLink({
      label: `Riset ${openAlexArticle.sourceName}${openAlexArticle.year ? ` (${openAlexArticle.year})` : ''}`,
      domain,
      url: openAlexArticle.url,
      kategori: 'publikasi_ilmiah',
      terverifikasiLive: true,
    });
  }

  // 3. Taksonomi resmi GBIF
  if (taxonomy?.gbifUrl) {
    pushLink({
      label: 'Taksonomi GBIF',
      domain: 'gbif.org',
      url: taxonomy.gbifUrl,
      kategori: 'taksonomi',
      terverifikasiLive: true,
    });
  }

  // 4. Wikipedia Indonesia (atau Internasional sebagai cadangan jika portal lain sedikit)
  if (wikiId) {
    pushLink({
      label: 'Wikipedia Indonesia',
      domain: 'id.wikipedia.org',
      url: wikiId.url,
      kategori: 'ensiklopedia',
      terverifikasiLive: true,
    });
  } else if (wikiEn && tautanResmi.length < 3) {
    pushLink({
      label: 'Wikipedia Internasional',
      domain: 'en.wikipedia.org',
      url: wikiEn.url,
      kategori: 'ensiklopedia',
      terverifikasiLive: true,
    });
  }

  if (tautanResmi.length === 0 && !taxonomy && !wikiId && !wikiEn) {
    cache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, data: null });
    return null;
  }

  const primaryLink = tautanResmi[0];
  const displayTitle = options?.indonesianTitle || wikiId?.title || taxonomy?.namaIlmiah || wikiEn?.title || query;

  // Bangun ringkasan Bahasa Indonesia yang jelas & kontekstual (tidak membuang teks Inggris mentah ke petani)
  let ringkasanId = '';
  if (wikiId?.extract) {
    ringkasanId = wikiId.extract;
  } else {
    const parts: string[] = [];
    if (options?.indonesianContext) {
      parts.push(options.indonesianContext);
    }
    if (taxonomy?.namaIlmiah) {
      const taxMeta = [taxonomy.kerajaan, taxonomy.famili ? `Famili ${taxonomy.famili}` : '']
        .filter(Boolean)
        .join(' · ');
      parts.push(
        `Terverifikasi pada basis ilmiah internasional sebagai ${taxonomy.namaIlmiah}${taxMeta ? ` (${taxMeta})` : ''}.`
      );
    }
    if (openAlexArticle) {
      parts.push(
        `Referensi riset terkait: "${openAlexArticle.title}" — ${openAlexArticle.sourceName}${openAlexArticle.year ? ` (${openAlexArticle.year})` : ''}.`
      );
    } else if (wikiEn?.extract && parts.length === 0) {
      parts.push(wikiEn.extract);
    }
    ringkasanId = parts.join(' ').trim();
  }

  const badgeLabel =
    primaryLink?.kategori === 'panduan_resmi'
      ? 'Portal Agronomi Resmi'
      : primaryLink?.kategori === 'database_patogen'
        ? 'Database Patogen EPPO'
        : primaryLink?.kategori === 'publikasi_ilmiah'
          ? 'Publikasi Fitopatologi Resmi'
          : wikiId
            ? 'Wikipedia Indonesia'
            : 'Referensi Ilmiah Global';

  const result: ExternalKnowledgeResult = {
    query,
    judul: displayTitle,
    ringkasan: ringkasanId,
    sumberLabel: badgeLabel,
    sumberUrl: primaryLink?.url || 'https://gd.eppo.int',
    bahasa: wikiId || options?.indonesianContext ? 'id' : 'en',
    tautanResmi: tautanResmi.slice(0, 3),
    taksonomi: taxonomy,
  };

  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}
