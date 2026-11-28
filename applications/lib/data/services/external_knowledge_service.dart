import 'dart:async';
import 'dart:convert';
import 'dart:io';

class OfficialRefLink {
  const OfficialRefLink({
    required this.label,
    required this.domain,
    required this.url,
    required this.kategori,
  });

  final String label;
  final String domain;
  final String url;
  final String kategori;
}

/// Model referensi pengetahuan eksternal multi-portal live (UC IPM, Cornell, UMD, EPPO, OpenAlex, Wikipedia, GBIF)
class ExternalKnowledgeInfo {
  const ExternalKnowledgeInfo({
    required this.judul,
    required this.ringkasan,
    required this.sumberLabel,
    required this.sumberUrl,
    this.tautanResmi = const [],
    this.namaIlmiah,
    this.kerajaan,
    this.famili,
  });

  final String judul;
  final String ringkasan;
  final String sumberLabel;
  final String sumberUrl;
  final List<OfficialRefLink> tautanResmi;
  final String? namaIlmiah;
  final String? kerajaan;
  final String? famili;
}

class _PortalCandidate {
  const _PortalCandidate({
    required this.label,
    required this.domain,
    required this.url,
    required this.kategori,
    this.expectedTitleKeyword,
  });

  final String label;
  final String domain;
  final String url;
  final String kategori;
  final String? expectedTitleKeyword;
}

/// Klien pengetahuan eksternal multi-portal dengan verifikasi live & auto-fallback antar web resmi agronomi
abstract final class ExternalKnowledgeService {
  static final Map<String, ({DateTime expiresAt, ExternalKnowledgeInfo? data})> _cache = {};

  static const Map<String, List<_PortalCandidate>> _officialPortals = {
    'sehat': [
      _PortalCandidate(
        label: 'Panduan Tomat UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'tomato',
      ),
      _PortalCandidate(
        label: 'EPPO Global Database (Tomat)',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/LYPES',
        kategori: 'database_patogen',
      ),
    ],
    'bercak_kering': [
      _PortalCandidate(
        label: 'Panduan Early Blight — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/early-blight/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'early blight',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Alternaria solani',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/ALTESO',
        kategori: 'database_patogen',
      ),
    ],
    'busuk_daun': [
      _PortalCandidate(
        label: 'Panduan Late Blight — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/late-blight/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'late blight',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Phytophthora infestans',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/PHYTIN',
        kategori: 'database_patogen',
      ),
    ],
    'kapang_daun': [
      _PortalCandidate(
        label: 'Panduan Leaf Mold — Cornell Vegetables',
        domain: 'vegetables.cornell.edu',
        url: 'https://www.vegetables.cornell.edu/pest-management/disease-factsheets/tomato-leaf-mold/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'leaf mold',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Passalora fulva',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/FULVFU',
        kategori: 'database_patogen',
      ),
    ],
    'bercak_septoria': [
      _PortalCandidate(
        label: 'Panduan Septoria — Univ. Maryland',
        domain: 'extension.umd.edu',
        url: 'https://extension.umd.edu/resource/septoria-leaf-spot-tomatoes/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'septoria',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Septoria lycopersici',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/SEPTLY',
        kategori: 'database_patogen',
      ),
    ],
    'bercak_target': [
      _PortalCandidate(
        label: 'Datasheet EPPO — Corynespora cassiicola',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/CORMCA',
        kategori: 'database_patogen',
      ),
    ],
    'bercak_bakteri': [
      _PortalCandidate(
        label: 'Panduan Bacterial Spot — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/bacterial-spot/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'bacterial spot',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Xanthomonas perforans',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/XANTPE',
        kategori: 'database_patogen',
      ),
    ],
    'bintik_bakteri': [
      _PortalCandidate(
        label: 'Panduan Bacterial Speck — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/bacterial-speck/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'bacterial speck',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — P. syringae pv. tomato',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/PSDMTM',
        kategori: 'database_patogen',
      ),
    ],
    'kanker_bakteri': [
      _PortalCandidate(
        label: 'Panduan Bacterial Canker — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/bacterial-canker/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'bacterial canker',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Clavibacter michiganensis',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/CORBMI',
        kategori: 'database_patogen',
      ),
    ],
    'embun_tepung': [
      _PortalCandidate(
        label: 'Panduan Powdery Mildew — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/powdery-mildew-on-field-grown-tomatoes/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'powdery mildew',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Oidium neolycopersici',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/OIDINE',
        kategori: 'database_patogen',
      ),
    ],
    'embun_bulu': [
      _PortalCandidate(
        label: 'Panduan Downy Mildew — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/cucurbits/downy-mildew/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'downy mildew',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Pseudoperonospora cubensis',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/PSPECU',
        kategori: 'database_patogen',
      ),
    ],
    'layu_batang': [
      _PortalCandidate(
        label: 'Panduan Fusarium Wilt — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/fusarium-wilt/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'fusarium',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Fusarium oxysporum',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/FUSAOX',
        kategori: 'database_patogen',
      ),
    ],
    'busuk_pangkal_sklerotium': [
      _PortalCandidate(
        label: 'Panduan Southern Blight — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/southern-blight/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'southern blight',
      ),
    ],
    'keriting_kuning': [
      _PortalCandidate(
        label: 'Panduan TYLCV — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/tomato-yellow-leaf-curl/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'yellow leaf curl',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — TYLCV',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/TYLCV0',
        kategori: 'database_patogen',
      ),
    ],
    'virus_mosaik': [
      _PortalCandidate(
        label: 'Panduan Mosaic Virus — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/tobacco-mosaic/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'mosaic',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — ToMV',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/TOMV00',
        kategori: 'database_patogen',
      ),
    ],
    'virus_bercak_layu': [
      _PortalCandidate(
        label: 'Panduan TSWV — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/tomato-spotted-wilt/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'spotted wilt',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — TSWV',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/TSWV00',
        kategori: 'database_patogen',
      ),
    ],
    'tungau_laba': [
      _PortalCandidate(
        label: 'Datasheet EPPO — Tetranychus urticae',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/TETRUR',
        kategori: 'database_patogen',
      ),
    ],
    'serangan_hama_daun': [
      _PortalCandidate(
        label: 'Panduan Leafminers — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/leafminers/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'leafminer',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Liriomyza spp.',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/1LIRIG',
        kategori: 'database_patogen',
      ),
    ],
    'busuk_ujung_buah': [
      _PortalCandidate(
        label: 'Panduan Blossom End Rot — Univ. Maryland',
        domain: 'extension.umd.edu',
        url: 'https://extension.umd.edu/resource/blossom-end-rot-vegetables/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'blossom end rot',
      ),
    ],
    'antraknosa': [
      _PortalCandidate(
        label: 'Panduan Anthracnose — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/anthracnose/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'anthracnose',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Colletotrichum coccodes',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/COLLCO',
        kategori: 'database_patogen',
      ),
    ],
    'busuk_basah_buah': [
      _PortalCandidate(
        label: 'Datasheet EPPO — Pectobacterium carotovorum',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/ERWICA',
        kategori: 'database_patogen',
      ),
    ],
    'busuk_jamur_buah': [
      _PortalCandidate(
        label: 'Datasheet EPPO — Phytophthora nicotianae',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/PHYTPN',
        kategori: 'database_patogen',
      ),
      _PortalCandidate(
        label: 'Panduan Phytophthora — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/phytophthora-root-rot/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'phytophthora',
      ),
    ],
    'busuk_kapang_abu': [
      _PortalCandidate(
        label: 'Panduan Gray Mold — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/agriculture/tomato/gray-mold/',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'gray mold',
      ),
      _PortalCandidate(
        label: 'Datasheet EPPO — Botrytis cinerea',
        domain: 'gd.eppo.int',
        url: 'https://gd.eppo.int/taxon/BOTRCI',
        kategori: 'database_patogen',
      ),
    ],
    'buah_pecah_sengatan': [
      _PortalCandidate(
        label: 'Panduan Sunscald — UC IPM',
        domain: 'ipm.ucanr.edu',
        url: 'https://ipm.ucanr.edu/PMG/GARDEN/VEGES/ENVIRON/sunscald.html',
        kategori: 'panduan_resmi',
        expectedTitleKeyword: 'sunscald',
      ),
    ],
  };

  static Future<dynamic> _getJson(String url, {int timeoutSec = 4}) async {
    final client = HttpClient()..connectionTimeout = Duration(seconds: timeoutSec);
    try {
      final req = await client.getUrl(Uri.parse(url)).timeout(Duration(seconds: timeoutSec));
      req.headers.set(HttpHeaders.acceptHeader, 'application/json');
      req.headers.set(HttpHeaders.userAgentHeader, 'CermatTani-Agronomy/3.1');
      final res = await req.close().timeout(Duration(seconds: timeoutSec));
      if (res.statusCode < 200 || res.statusCode >= 300) return null;
      final body = await res.transform(utf8.decoder).join().timeout(Duration(seconds: timeoutSec));
      return jsonDecode(body);
    } catch (_) {
      return null;
    } finally {
      client.close(force: true);
    }
  }

  static Future<OfficialRefLink?> _verifyPortal(_PortalCandidate c) async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 4);
    try {
      final req = c.expectedTitleKeyword != null
          ? await client.getUrl(Uri.parse(c.url)).timeout(const Duration(seconds: 4))
          : await client.headUrl(Uri.parse(c.url)).timeout(const Duration(seconds: 4));
      req.headers.set(HttpHeaders.userAgentHeader, 'CermatTani-Agronomy/3.1');
      final res = await req.close().timeout(const Duration(seconds: 4));
      if (res.statusCode < 200 || res.statusCode >= 400) return null;
      if (c.expectedTitleKeyword != null) {
        final html = await res.transform(utf8.decoder).take(12).join().timeout(const Duration(seconds: 4));
        final match = RegExp(r'<title[^>]*>([^<]+)</title>', caseSensitive: false).firstMatch(html);
        final title = (match?.group(1) ?? '').toLowerCase();
        if (!title.contains(c.expectedTitleKeyword!.toLowerCase())) return null;
      }
      return OfficialRefLink(label: c.label, domain: c.domain, url: c.url, kategori: c.kategori);
    } catch (_) {
      return null;
    } finally {
      client.close(force: true);
    }
  }

  static Future<({String title, String source, int? year, String url})?> _searchOpenAlex(String q) async {
    final clean = q.trim();
    if (clean.isEmpty) return null;
    final url =
        'https://api.openalex.org/works?search=${Uri.encodeComponent('$clean plant disease management')}&per-page=3&sort=cited_by_count:desc&select=title,doi,publication_year,primary_location';
    final data = await _getJson(url);
    if (data is Map && data['results'] is List) {
      for (final raw in data['results'] as List) {
        if (raw is! Map) continue;
        final title = raw['title']?.toString().trim() ?? '';
        final primary = raw['primary_location'];
        final landing = primary is Map ? primary['landing_page_url']?.toString() : null;
        final srcMap = primary is Map ? primary['source'] : null;
        final source = srcMap is Map ? srcMap['display_name']?.toString() : null;
        final targetUrl = (landing != null && landing.startsWith('http'))
            ? landing
            : (raw['doi']?.toString() ?? '');
        if (title.isNotEmpty && targetUrl.startsWith('http')) {
          return (
            title: title,
            source: source ?? 'Jurnal Fitopatologi',
            year: raw['publication_year'] is num ? (raw['publication_year'] as num).toInt() : null,
            url: targetUrl,
          );
        }
      }
    }
    return null;
  }

  static Future<({String title, String extract, String url})?> _fetchWiki(
    String query,
    String lang,
  ) async {
    final clean = query.trim();
    if (clean.isEmpty) return null;
    final slug = Uri.encodeComponent(clean.replaceAll(RegExp(r'\s+'), '_'));
    final direct = await _getJson('https://$lang.wikipedia.org/api/rest_v1/page/summary/$slug');
    if (direct is Map) {
      final extract = direct['extract']?.toString().trim() ?? '';
      if (direct['type'] != 'disambiguation' && extract.length > 45) {
        final contentUrls = direct['content_urls'];
        final desktop = contentUrls is Map ? contentUrls['desktop'] : null;
        final pageUrl = desktop is Map ? desktop['page']?.toString() : null;
        return (
          title: direct['title']?.toString() ?? clean,
          extract: extract.length > 400 ? '${extract.substring(0, 400)}...' : extract,
          url: pageUrl ?? 'https://$lang.wikipedia.org/wiki/$slug',
        );
      }
    }
    return null;
  }

  static Future<({String namaIlmiah, String? kerajaan, String? famili, String? gbifUrl})?> _fetchGbif(
    String scientificName,
  ) async {
    final clean = scientificName.trim();
    if (clean.isEmpty || clean.split(RegExp(r'\s+')).length > 5) return null;
    final url = 'https://api.gbif.org/v1/species/match?name=${Uri.encodeComponent(clean)}';
    final data = await _getJson(url);
    if (data is Map && data['matchType'] != 'NONE' && data['scientificName'] is String) {
      final usageKey = data['usageKey'];
      return (
        namaIlmiah: data['scientificName'].toString(),
        kerajaan: data['kingdom']?.toString(),
        famili: data['family']?.toString(),
        gbifUrl: usageKey != null ? 'https://www.gbif.org/species/$usageKey' : null,
      );
    }
    return null;
  }

  static Future<ExternalKnowledgeInfo?> fetch({
    required String query,
    String? scientificNameHint,
    String? topicId,
    String? indonesianTitle,
    String? indonesianContext,
  }) async {
    final cleanTopic = (topicId ?? '').trim().toLowerCase();
    final key = '$cleanTopic|${query.trim().toLowerCase()}|${(scientificNameHint ?? '').trim().toLowerCase()}';
    final cached = _cache[key];
    if (cached != null && cached.expiresAt.isAfter(DateTime.now())) {
      return cached.data;
    }

    final sciTarget = (scientificNameHint?.trim().isNotEmpty == true)
        ? scientificNameHint!.trim()
        : query.trim();
    final candidates = cleanTopic.isNotEmpty ? (_officialPortals[cleanTopic] ?? const []) : const <_PortalCandidate>[];

    final results = await Future.wait<dynamic>([
      Future.wait(candidates.map(_verifyPortal)),
      _searchOpenAlex(sciTarget),
      _fetchWiki(query, 'id'),
      _fetchGbif(sciTarget),
    ]);

    final verifiedPortals = (results[0] as List<OfficialRefLink?>).whereType<OfficialRefLink>().toList();
    final openAlex = results[1] as ({String title, String source, int? year, String url})?;
    final wikiId = results[2] as ({String title, String extract, String url})?;
    final gbif = results[3] as ({String namaIlmiah, String? kerajaan, String? famili, String? gbifUrl})?;

    final links = <OfficialRefLink>[];
    final seen = <String>{};
    void addLink(OfficialRefLink l) {
      if (l.url.isEmpty || seen.contains(l.url)) return;
      seen.add(l.url);
      links.add(l);
    }

    for (final p in verifiedPortals) {
      addLink(p);
    }
    if (openAlex != null) {
      final dom = Uri.tryParse(openAlex.url)?.host.replaceFirst('www.', '') ?? 'doi.org';
      addLink(
        OfficialRefLink(
          label: 'Riset ${openAlex.source}${openAlex.year != null ? ' (${openAlex.year})' : ''}',
          domain: dom,
          url: openAlex.url,
          kategori: 'publikasi_ilmiah',
        ),
      );
    }
    if (gbif?.gbifUrl != null) {
      addLink(
        OfficialRefLink(
          label: 'Taksonomi GBIF',
          domain: 'gbif.org',
          url: gbif!.gbifUrl!,
          kategori: 'taksonomi',
        ),
      );
    }
    if (wikiId != null) {
      addLink(
        OfficialRefLink(
          label: 'Wikipedia Indonesia',
          domain: 'id.wikipedia.org',
          url: wikiId.url,
          kategori: 'ensiklopedia',
        ),
      );
    }

    if (links.isEmpty && gbif == null && wikiId == null) {
      _cache[key] = (expiresAt: DateTime.now().add(const Duration(minutes: 5)), data: null);
      return null;
    }

    final parts = <String>[];
    if (wikiId != null) {
      parts.add(wikiId.extract);
    } else {
      if (indonesianContext != null && indonesianContext.trim().isNotEmpty) {
        parts.add(indonesianContext.trim());
      }
      if (gbif != null) {
        final tax = [gbif.kerajaan, if (gbif.famili != null) 'Famili ${gbif.famili}']
            .whereType<String>()
            .join(' · ');
        parts.add(
          'Terverifikasi pada basis ilmiah global sebagai ${gbif.namaIlmiah}${tax.isNotEmpty ? ' ($tax)' : ''}.',
        );
      }
      if (openAlex != null) {
        parts.add(
          'Referensi riset terkait: "${openAlex.title}" — ${openAlex.source}${openAlex.year != null ? ' (${openAlex.year})' : ''}.',
        );
      }
    }

    final primary = links.isNotEmpty ? links.first : null;
    final badge = switch (primary?.kategori) {
      'panduan_resmi' => 'Portal Agronomi Resmi',
      'database_patogen' => 'Database Patogen EPPO',
      'publikasi_ilmiah' => 'Publikasi Fitopatologi',
      'ensiklopedia' => 'Wikipedia Indonesia',
      _ => 'Referensi Ilmiah Global',
    };

    final info = ExternalKnowledgeInfo(
      judul: (indonesianTitle?.trim().isNotEmpty == true)
          ? indonesianTitle!.trim()
          : (wikiId?.title ?? gbif?.namaIlmiah ?? query),
      ringkasan: parts.join(' ').trim(),
      sumberLabel: badge,
      sumberUrl: primary?.url ?? 'https://gd.eppo.int',
      tautanResmi: links.take(3).toList(),
      namaIlmiah: gbif?.namaIlmiah,
      kerajaan: gbif?.kerajaan,
      famili: gbif?.famili,
    );

    _cache[key] = (expiresAt: DateTime.now().add(const Duration(minutes: 30)), data: info);
    return info;
  }
}
