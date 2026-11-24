import 'dart:convert';
import 'dart:io';

import '../plant_varieties.dart';

/// Layanan pencarian semua jenis tanaman secara langsung (live):
/// 1. Satu Data Klaten CKAN Open Data API (`datastore_search`)
/// 2. GBIF Global Plantae Species Suggest API (semua spesies tumbuhan dunia)
/// 3. Wikipedia Indonesia OpenSearch API
/// 4. Katalog instan lokal (65+ komoditas Indonesia, selalu siap saat offline)
abstract final class PlantCatalogService {
  static List<PlantVarietyOption>? _ckanCache;
  static DateTime? _ckanFetchedAt;

  static Future<String?> _getText(Uri uri, {Duration timeout = const Duration(seconds: 5)}) async {
    final client = HttpClient()..connectionTimeout = timeout;
    try {
      final req = await client.getUrl(uri).timeout(timeout);
      req.headers.set(HttpHeaders.userAgentHeader, 'CermatTani/1.0 (Open-Data-Agronomy)');
      final res = await req.close().timeout(timeout);
      if (res.statusCode < 200 || res.statusCode >= 300) return null;
      return await res.transform(utf8.decoder).join().timeout(timeout);
    } catch (_) {
      return null;
    } finally {
      client.close(force: true);
    }
  }

  static Future<List<PlantVarietyOption>> fetchSatuDataKlaten({String query = ''}) async {
    final now = DateTime.now();
    List<PlantVarietyOption> cached = _ckanCache ?? const [];
    final isFresh = _ckanFetchedAt != null && now.difference(_ckanFetchedAt!).inHours < 12;

    if (!isFresh || cached.isEmpty) {
      final uri = Uri.parse(kSatuDataKlatenApiBase).replace(
        queryParameters: {
          'resource_id': kSatuDataKlatenResourceId,
          'limit': '100',
        },
      );
      final raw = await _getText(uri, timeout: const Duration(seconds: 6));
      if (raw != null) {
        try {
          final decoded = jsonDecode(raw) as Map<String, dynamic>;
          final result = decoded['result'] as Map<String, dynamic>?;
          final records = (result?['records'] as List?) ?? const [];
          var currentCat = 'Komoditas Pertanian';
          final parsed = <PlantVarietyOption>[];

          for (final rec in records) {
            if (rec is! Map) continue;
            final rawName = (rec['jenis_tanaman_kind_of_plants'] ?? '').toString().trim();
            if (rawName.isEmpty) continue;
            if (rawName.endsWith(':')) {
              currentCat = rawName.split('/').first.replaceAll(RegExp(r'[:–-]+$'), '').trim();
              if (currentCat.isEmpty) currentCat = 'Komoditas Pertanian';
              continue;
            }
            final parts = rawName.split('/').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
            if (parts.isEmpty) continue;
            final idName = parts.first;
            final enName = parts.length > 1
                ? parts.sublist(1).join(' / ').replaceAll(RegExp(r'\bMelom\b', caseSensitive: false), 'Melon')
                : '';
            parsed.add(
              PlantVarietyOption(
                value: idName,
                label: enName.isNotEmpty ? '$idName ($enName)' : idName,
                category: currentCat,
                komoditas: inferCommodityFromVariety(idName),
                bobotGram: estimateWeightForVariety(idName),
                source: 'satudata_klaten',
                sourceLabel: 'Satu Data Klaten',
              ),
            );
          }

          if (parsed.isNotEmpty) {
            _ckanCache = parsed;
            _ckanFetchedAt = now;
            cached = parsed;
          }
        } catch (_) {}
      }
    }

    final q = query.trim().toLowerCase();
    if (q.isEmpty) return cached;
    return cached
        .where((i) => i.value.toLowerCase().contains(q) || i.label.toLowerCase().contains(q))
        .toList();
  }

  static Future<List<PlantVarietyOption>> _fetchGbifPlantae(String query) async {
    final q = query.trim();
    if (q.length < 2) return const [];
    final uri = Uri.https('api.gbif.org', '/v1/species/suggest', {'q': q, 'limit': '12'});
    final raw = await _getText(uri, timeout: const Duration(seconds: 4));
    if (raw == null) return const [];
    try {
      final list = jsonDecode(raw) as List;
      final out = <PlantVarietyOption>[];
      final seen = <String>{};
      for (final item in list) {
        if (item is! Map) continue;
        if ((item['kingdom'] ?? '').toString() != 'Plantae') continue;
        final canonical = (item['canonicalName'] ?? item['scientificName'] ?? '').toString().trim();
        if (canonical.isEmpty || seen.contains(canonical.toLowerCase())) continue;
        seen.add(canonical.toLowerCase());
        final family = (item['family'] ?? 'Plantae').toString().trim();
        out.add(
          PlantVarietyOption(
            value: canonical,
            label: canonical,
            scientificName: '$canonical · Famili $family',
            category: family,
            komoditas: inferCommodityFromVariety(canonical),
            bobotGram: estimateWeightForVariety(canonical),
            source: 'gbif',
            sourceLabel: 'GBIF Plantae',
          ),
        );
        if (out.length >= 6) break;
      }
      return out;
    } catch (_) {
      return const [];
    }
  }

  static Future<List<PlantVarietyOption>> _fetchWikipediaId(String query) async {
    final q = query.trim();
    if (q.length < 2) return const [];
    final uri = Uri.https('id.wikipedia.org', '/w/api.php', {
      'action': 'opensearch',
      'search': q,
      'limit': '6',
      'namespace': '0',
      'format': 'json',
    });
    final raw = await _getText(uri, timeout: const Duration(seconds: 4));
    if (raw == null) return const [];
    try {
      final arr = jsonDecode(raw) as List;
      final titles = arr.length > 1 && arr[1] is List ? arr[1] as List : const [];
      return titles
          .map((e) => e.toString().trim())
          .where((t) => t.length >= 2 && !t.contains('('))
          .take(5)
          .map(
            (title) => PlantVarietyOption(
              value: title,
              label: title,
              category: 'Referensi Tanaman',
              komoditas: inferCommodityFromVariety(title),
              bobotGram: estimateWeightForVariety(title),
              source: 'wikipedia',
              sourceLabel: 'Wikipedia ID',
            ),
          )
          .toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<List<PlantVarietyOption>> searchPlants(String query) async {
    final q = query.trim();
    final qLower = q.toLowerCase();

    final local = qLower.isEmpty
        ? kPlantVarietyCatalog
        : kPlantVarietyCatalog
            .where(
              (item) =>
                  item.value.toLowerCase().contains(qLower) ||
                  item.label.toLowerCase().contains(qLower) ||
                  item.komoditas.toLowerCase().contains(qLower) ||
                  item.category.toLowerCase().contains(qLower),
            )
            .toList();

    final results = await Future.wait([
      fetchSatuDataKlaten(query: q),
      if (q.length >= 2) _fetchGbifPlantae(q) else Future.value(const <PlantVarietyOption>[]),
      if (q.length >= 2) _fetchWikipediaId(q) else Future.value(const <PlantVarietyOption>[]),
    ]);

    final deduped = <PlantVarietyOption>[];
    final seen = <String>{};
    void addAll(List<PlantVarietyOption> list) {
      for (final item in list) {
        final key = item.value.trim().toLowerCase();
        if (key.isEmpty || seen.contains(key)) continue;
        seen.add(key);
        deduped.add(item);
      }
    }

    addAll(results[0]); // Satu Data Klaten (CKAN)
    addAll(local); // Katalog instan
    addAll(results[1]); // GBIF Plantae
    addAll(results[2]); // Wikipedia ID
    return deduped.take(50).toList();
  }
}
