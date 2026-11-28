import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import '../cermat_state.dart';
import 'external_knowledge_service.dart';

/// Output hasil Vision AI nyata (Gemini + Dataset Agronomi CermatTani v2.1)
class GeminiScanOutput {
  const GeminiScanOutput({
    required this.scan,
    required this.aiModel,
    required this.ringkasanSingkat,
    required this.temuanVisual,
  });

  final ScanModel scan;
  final String aiModel;
  final String ringkasanSingkat;
  final List<String> temuanVisual;
}

/// Output balasan Chat Cermo AI nyata
class GeminiChatOutput {
  const GeminiChatOutput({
    required this.reply,
    required this.aiModel,
  });

  final String reply;
  final String aiModel;
}

class GeminiException implements Exception {
  const GeminiException(this.message);
  final String message;

  @override
  String toString() => message;
}

const _fruitRotIds = <String>{
  'busuk_basah_buah',
  'busuk_jamur_buah',
  'busuk_kapang_abu',
  'busuk_ujung_buah',
  'antraknosa',
  'buah_pecah_sengatan',
};

/// Klien Gemini AI resmi untuk Flutter Mobile App (Smart Silent Context Routing + Dataset v2.1)
abstract final class GeminiService {
  static const String _apiKey = String.fromEnvironment('GEMINI_API_KEY', defaultValue: '');
  static const String _customModel = String.fromEnvironment('GEMINI_MODEL', defaultValue: '');

  // ---- KoboiLLM (utama, API kompatibel OpenAI) — sama seperti website ----
  static const String _koboiKeyRaw = String.fromEnvironment('KOBOILLM_API_KEY', defaultValue: '');
  static const String _koboiBaseUrl =
      String.fromEnvironment('KOBOILLM_BASE_URL', defaultValue: 'https://api.koboillm.com/v1');
  static const String _koboiModelVision = String.fromEnvironment('KOBOILLM_MODEL_VISION', defaultValue: '');
  static const String _koboiModelChat = String.fromEnvironment('KOBOILLM_MODEL_CHAT', defaultValue: '');

  /// Ambil kunci `sk-...` saja — toleran bila label (mis. "Koboilm:") atau kutip ikut ter-paste.
  static String get _koboiKey {
    final raw = _koboiKeyRaw.trim().replaceAll(RegExp(r'''^['"]|['"]$'''), '');
    final idx = raw.indexOf('sk-');
    return idx > 0 ? raw.substring(idx).trim() : raw;
  }

  static bool get isConfigured => _koboiKey.isNotEmpty || _apiKey.trim().isNotEmpty;

  static List<String> _modelCascade({required bool isVision}) {
    final defaults = isVision
        ? const [
            'gemini-3.5-flash-lite',
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
            'gemini-3.8-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
          ]
        : const [
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-3.8-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
          ];

    final custom = _customModel.trim();
    if (custom.isEmpty) return defaults;
    return [custom, ...defaults.where((m) => m != custom)];
  }

  static Future<({String text, String model})> _callGemini({
    required bool isVision,
    required String systemInstruction,
    required List<Map<String, dynamic>> contents,
    String? responseMimeType,
    Map<String, dynamic>? responseSchema,
    double? temperature,
    int? maxOutputTokens,
  }) async {
    // KoboiLLM dipakai lebih dulu bila kuncinya tertanam; Gemini langsung hanya cadangan.
    if (_koboiKey.isNotEmpty) {
      return _callKoboi(
        isVision: isVision,
        systemInstruction: systemInstruction,
        contents: contents,
        responseMimeType: responseMimeType,
        responseSchema: responseSchema,
        temperature: temperature,
        maxOutputTokens: maxOutputTokens,
      );
    }

    final apiKey = _apiKey.trim();
    if (apiKey.isEmpty) {
      throw const GeminiException(
        'KOBOILLM_API_KEY belum tertanam pada build aplikasi ini. Bangun ulang dengan --dart-define-from-file=.env.json.',
      );
    }

    final models = _modelCascade(isVision: isVision);
    final timeout = Duration(seconds: isVision ? 32 : 22);

    final generationConfig = <String, dynamic>{
      'temperature': temperature ?? (isVision ? 0.15 : 0.3),
      'maxOutputTokens': maxOutputTokens ?? (isVision ? 4096 : 640),
      if (responseMimeType != null) 'responseMimeType': responseMimeType,
      if (responseSchema != null) 'responseSchema': responseSchema,
    };

    final payload = jsonEncode({
      'systemInstruction': {
        'parts': [
          {'text': systemInstruction},
        ],
      },
      'contents': contents,
      'generationConfig': generationConfig,
    });

    String lastError = 'Layanan AI Gemini sedang sibuk. Silakan coba lagi beberapa saat.';

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 15);
    try {
      for (final model in models) {
        final uri = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/${Uri.encodeComponent(model)}:generateContent',
        );
        try {
          final req = await client.postUrl(uri).timeout(timeout);
          req.headers.set(HttpHeaders.contentTypeHeader, 'application/json; charset=utf-8');
          req.headers.set('x-goog-api-key', apiKey);
          req.add(utf8.encode(payload));

          final res = await req.close().timeout(timeout);
          final bodyStr = await res.transform(utf8.decoder).join().timeout(timeout);

          if (res.statusCode < 200 || res.statusCode >= 300) {
            try {
              final errObj = jsonDecode(bodyStr);
              final errSection = errObj is Map ? errObj['error'] : null;
              final msg = errSection is Map ? errSection['message'] : null;
              if (msg is String && msg.isNotEmpty) lastError = msg;
            } catch (_) {}
            if (res.statusCode == 401 || res.statusCode == 403) {
              throw GeminiException('Kunci API Gemini ditolak (${res.statusCode}): $lastError');
            }
            continue;
          }

          final parsed = jsonDecode(bodyStr);
          final candidates = parsed is Map ? parsed['candidates'] : null;
          final firstCand = (candidates is List && candidates.isNotEmpty) ? candidates.first : null;
          final contentObj = firstCand is Map ? firstCand['content'] : null;
          final parts = contentObj is Map ? contentObj['parts'] : null;

          if (parts is List) {
            final text = parts
                .whereType<Map>()
                .where((p) => p['thought'] != true && p['text'] is String)
                .map((p) => p['text'] as String)
                .join('')
                .trim();
            if (text.isNotEmpty) {
              return (text: text, model: model);
            }
          }
          lastError = 'Model $model mengembalikan respons kosong.';
        } on GeminiException {
          rethrow;
        } on TimeoutException {
          lastError = 'Permintaan ke AI Gemini melebihi batas waktu. Cek kestabilan sinyal internet.';
        } on SocketException {
          lastError = 'Tidak dapat terhubung ke server AI Gemini. Pastikan koneksi internet HP aktif.';
        } catch (e) {
          lastError = 'Kendala koneksi AI Gemini: $e';
        }
      }
    } finally {
      client.close(force: true);
    }

    throw GeminiException(lastError);
  }

  /* ==================== KoboiLLM (OpenAI Chat Completions) ==================== */

  static List<String> _koboiModels({required bool isVision}) {
    final list = isVision
        ? [_koboiModelVision, 'openai/gpt-4o-mini', 'gemini/gemini-2.5-flash', 'openai/gpt-4o']
        : [_koboiModelChat, _koboiModelVision, 'openai/gpt-4o-mini', 'gemini/gemini-2.5-flash'];
    final seen = <String>{};
    return [
      for (final m in list.map((e) => e.trim()))
        if (m.isNotEmpty && seen.add(m)) m,
    ];
  }

  /// Ubah skema gaya Gemini (type 'OBJECT', nullable) menjadi JSON Schema standar (ringkas, hemat token).
  static dynamic _toJsonSchema(dynamic schema) {
    if (schema is List) return schema.map(_toJsonSchema).toList();
    if (schema is! Map) return schema;
    final out = <String, dynamic>{};
    final nullable = schema['nullable'] == true;
    schema.forEach((key, value) {
      final k = key.toString();
      if (k == 'nullable') return;
      if (k == 'type' && value is String) {
        final t = value.toLowerCase();
        out['type'] = nullable ? [t, 'null'] : t;
      } else if (k == 'properties' && value is Map) {
        out['properties'] = value.map((pk, pv) => MapEntry(pk.toString(), _toJsonSchema(pv)));
      } else if (k == 'items') {
        out['items'] = _toJsonSchema(value);
      } else if (k == 'enum' && value is List && value.length > 12) {
        // Hemat token: daftar ID panjang sudah dicantumkan sekali di aturan prompt
        out['description'] = 'ID dari daftar resmi di aturan';
      } else {
        out[k] = value;
      }
    });
    return out;
  }

  static List<Map<String, dynamic>> _toOpenAiMessages(String systemPrompt, List<Map<String, dynamic>> contents) {
    final messages = <Map<String, dynamic>>[
      {'role': 'system', 'content': systemPrompt},
    ];
    for (final c in contents) {
      final role = c['role'] == 'model' ? 'assistant' : 'user';
      final parts = (c['parts'] as List?)?.whereType<Map>().toList() ?? const <Map>[];
      final hasImage = parts.any((p) => p['inlineData'] != null);
      if (!hasImage) {
        messages.add({'role': role, 'content': parts.map((p) => (p['text'] ?? '').toString()).join('\n')});
        continue;
      }
      final out = <Map<String, dynamic>>[];
      for (final p in parts) {
        if (p['text'] is String) out.add({'type': 'text', 'text': p['text']});
        final inl = p['inlineData'];
        if (inl is Map) {
          out.add({
            'type': 'image_url',
            // detail "low": hemat token gambar sampai ±78% dengan hasil yang sama
            'image_url': {'url': 'data:${inl['mimeType']};base64,${inl['data']}', 'detail': 'low'},
          });
        }
      }
      messages.add({'role': role, 'content': out});
    }
    return messages;
  }

  static String _extractOpenAiText(dynamic data) {
    final choices = data is Map ? data['choices'] : null;
    final first = (choices is List && choices.isNotEmpty) ? choices.first : null;
    final msg = first is Map ? first['message'] : null;
    final content = msg is Map ? msg['content'] : null;
    var text = '';
    if (content is String) {
      text = content;
    } else if (content is List) {
      text = content.whereType<Map>().map((p) => (p['text'] ?? '').toString()).join('');
    }
    return text.replaceAll(RegExp(r'<think>[\s\S]*?</think>', caseSensitive: false), '').trim();
  }

  static Future<({String text, String model})> _callKoboi({
    required bool isVision,
    required String systemInstruction,
    required List<Map<String, dynamic>> contents,
    String? responseMimeType,
    Map<String, dynamic>? responseSchema,
    double? temperature,
    int? maxOutputTokens,
  }) async {
    final apiKey = _koboiKey;
    final baseUrl = _koboiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final wantJson = responseMimeType == 'application/json';
    final systemPrompt = wantJson && responseSchema != null
        ? '$systemInstruction\n\nFORMAT JAWABAN WAJIB: kembalikan HANYA satu objek JSON valid (tanpa markdown, tanpa teks lain) '
            'yang mengikuti JSON Schema berikut. Semua field "required" wajib ada.\n${jsonEncode(_toJsonSchema(responseSchema))}'
        : systemInstruction;
    final messages = _toOpenAiMessages(systemPrompt, contents);
    final timeout = Duration(seconds: isVision ? 40 : 25);
    final maxTokens = isVision ? math.min(maxOutputTokens ?? 1500, 1500) : (maxOutputTokens ?? 640);

    String lastError = 'Layanan AI sedang sibuk. Silakan coba lagi beberapa saat.';
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 15);
    try {
      for (final model in _koboiModels(isVision: isVision)) {
        for (final useJson in wantJson ? const [true, false] : const [false]) {
          final payload = jsonEncode({
            'model': model,
            'messages': messages,
            'temperature': temperature ?? (isVision ? 0.15 : 0.3),
            'max_tokens': maxTokens,
            if (useJson) 'response_format': {'type': 'json_object'},
          });
          try {
            final req = await client.postUrl(Uri.parse('$baseUrl/chat/completions')).timeout(timeout);
            req.headers.set(HttpHeaders.contentTypeHeader, 'application/json; charset=utf-8');
            req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $apiKey');
            req.add(utf8.encode(payload));
            final res = await req.close().timeout(timeout);
            final bodyStr = await res.transform(utf8.decoder).join().timeout(timeout);

            if (res.statusCode < 200 || res.statusCode >= 300) {
              var detail = '';
              try {
                final errObj = jsonDecode(bodyStr);
                final e = errObj is Map ? errObj['error'] : null;
                detail = e is String ? e : (e is Map ? (e['message'] ?? '').toString() : '');
              } catch (_) {}
              if (detail.isNotEmpty) lastError = detail;
              if (res.statusCode == 401 || res.statusCode == 403) {
                throw GeminiException('Kunci API KoboiLLM ditolak (${res.statusCode}). Periksa KOBOILLM_API_KEY.');
              }
              if (res.statusCode == 402) {
                throw const GeminiException('Saldo KoboiLLM habis. Isi ulang di dashboard.koboillm.com lalu coba lagi.');
              }
              // Model menolak response_format → ulangi model yang sama tanpa mode JSON
              if (useJson && res.statusCode == 400 && RegExp('response_format|json', caseSensitive: false).hasMatch(detail)) {
                continue;
              }
              break; // model tidak tersedia/sibuk → coba model berikutnya
            }

            final data = jsonDecode(bodyStr);
            final text = _extractOpenAiText(data);
            if (text.isNotEmpty) {
              final served = (data is Map && data['model'] is String) ? data['model'] as String : model;
              return (text: text, model: served);
            }
            lastError = 'Model $model mengembalikan respons kosong.';
            break;
          } on GeminiException {
            rethrow;
          } on TimeoutException {
            lastError = 'Permintaan ke AI melebihi batas waktu. Cek kestabilan sinyal internet.';
            break;
          } on SocketException {
            lastError = 'Tidak dapat terhubung ke server AI. Pastikan koneksi internet HP aktif.';
            break;
          } catch (e) {
            lastError = 'Kendala koneksi AI: $e';
            break;
          }
        }
      }
    } finally {
      client.close(force: true);
    }
    throw GeminiException(lastError);
  }

  static String _buildVisionDatasetPrompt() {
    final diseaseLines = knowledgeDiseases.values
        .map((d) => '- "${d.id}" (${d.penyakit}): ${d.ciriVisualSpesifik}')
        .join('\n');
    final nutrientLines = knowledgeNutrients.values
        .map((n) => '- "${n.id}" (${n.dugaan}): ${n.ciriVisualSpesifik}')
        .join('\n');

    return '''=== DATASET KHUSUS REFERENSI VISION CERMATTANI v2.1 (WAJIB DIPATUHI) ===
[A. KEMATANGAN BUAH (USDA Stage 1-6 & Balitsa Kementan RI)]
- "mentah" (Mentah): Kulit hijau penuh/hijau muda merata (Stage 1-2), belum ada semburat kuning/jingga/merah. Estimasi 7-10 hari | Anjuran: "Tunggu"
- "setengah_matang" (Setengah matang): Muncul warna kuning, jingga, atau merah muda 10%-60% dari ujung buah (Stage 3-4). Estimasi 2-4 hari | Anjuran: "Tunggu"
- "matang" (Matang): Warna merah cerah/tua merata > 85%-90% permukaan buah (Stage 5-6), kulit mengilap. Estimasi 0-1 hari | Anjuran: "Panen sekarang"

[B. KATALOG PENYAKIT, BUSUK BUAH & HAMA RESMI — HANYA GUNAKAN ID INI]
$diseaseLines

[C. KATALOG DUGAAN HARA RESMI — HANYA GUNAKAN ID INI]
$nutrientLines
=== AKHIR DATASET ===''';
  }

  static String _extractJsonObject(String raw) {
    var cleaned = raw.trim();
    cleaned = cleaned.replaceFirst(RegExp(r'^```(?:json)?\s*', caseSensitive: false), '');
    cleaned = cleaned.replaceFirst(RegExp(r'```$'), '').trim();
    final start = cleaned.indexOf('{');
    final end = cleaned.lastIndexOf('}');
    if (start != -1 && end > start) {
      return cleaned.substring(start, end + 1);
    }
    return cleaned;
  }

  static int _clampInt(num? v, int minVal, int maxVal, int fallback) {
    if (v == null || v.isNaN || v.isInfinite) return fallback;
    return v.round().clamp(minVal, maxVal);
  }

  static RipenessStage _parseStage(dynamic raw) {
    return switch (raw?.toString()) {
      'mentah' => RipenessStage.mentah,
      'matang' => RipenessStage.matang,
      _ => RipenessStage.setengahMatang,
    };
  }

  static PlantPart _parsePart(dynamic raw) {
    return switch (raw?.toString()) {
      'daun' => PlantPart.daun,
      'batang' => PlantPart.batang,
      _ => PlantPart.buah,
    };
  }

  static ScanOutputFocus _parseFocus(dynamic raw) {
    return switch (raw?.toString()) {
      'penyakit' => ScanOutputFocus.penyakit,
      'hara' => ScanOutputFocus.hara,
      'tidak_terdeteksi' => ScanOutputFocus.tidakTerdeteksi,
      _ => ScanOutputFocus.kematangan,
    };
  }

  /// Analisis Vision nyata otomatis — deteksi bagian & konteks diam-diam (100% dataset v2.1)
  static Future<GeminiScanOutput> analyzePlantPhoto({
    required Uint8List imageBytes,
    required String mimeType,
    required PlantModel plant,
    required bool sensorAvailable,
    required int lowConfidenceThreshold,
    required int prevFruitScans,
  }) async {
    final validDiseaseIds = knowledgeDiseases.keys.toList();
    final validNutrientIds = knowledgeNutrients.keys.toList();

    final systemInstruction = '''Kamu adalah mesin Computer Vision Agronomi resmi aplikasi CermatTani.
Semua klasifikasi WAJIB mengacu secara ketat pada DATASET KHUSUS REFERENSI VISION CERMATTANI di bawah ini.

${_buildVisionDatasetPrompt()}

ATURAN WAJIB & PENENTUAN FOKUS OTOMATIS (RAHASIA — JANGAN PERNAH MENYEBUT KATA "KONTEKS" ATAU "MODE" DI TEKS OUTPUT):
1. DETEKSI BAGIAN OTOMATIS ("bagianTerdeteksi"):
   - Kenali langsung dari foto apakah objek utama adalah "buah", "daun", atau "batang".
2. VALIDASI FOTO BUKAN TANAMAN:
   - Jika foto TIDAK memperlihatkan tanaman/buah/daun/batang pertanian atau terlalu gelap/buram:
     * "fokusOutput": "tidak_terdeteksi", "diluarKonteksTanaman": true/false, "tanpaBuahTerdeteksi": true, "boxes": [], "anjuranPanen": "Perlu foto ulang", "keyakinan": 15-40.
3. PILIH SATU "fokusOutput" PALING TEPAT SECARA OTOMATIS:
   - KASUS A — BUAH BUSUK / BUAH BERJAMUR / BUAH SAKIT BERAT / DAUN ATAU BATANG BERPENYAKIT:
     * Jika buah terlihat busuk, berjamur, lembek berair, cekung hitam (busuk_ujung_buah), patek/antraknosa, atau sakit berat — ATAU daun/batang sakit:
     * WAJIB set "fokusOutput": "penyakit".
     * WAJIB kosongkan kematangan: "boxes": [], "tahapDominan": null, "estimasiHariMin": null, "estimasiHariMax": null, "anjuranPanen": "Fokus penyakit".
     * JANGAN membahas kematangan atau anjuran panen sama sekali!
   - KASUS B — BUAH SEGAR (MATANG / SETENGAH MATANG / MENTAH):
     * Jika buah dominan segar dan layak panen/tunggu:
     * WAJIB set "fokusOutput": "kematangan".
     * Deteksi buah segar sebagai kotak [x, y, w, h] PERSEN 0-100 dengan stage "mentah"|"setengah_matang"|"matang".
     * Jika pada buah segar ada bercak/penyakit KECIL atau gejala awal ringan, tetap set "fokusOutput": "kematangan", set "penyakitUtamaId": "sehat", dan isi "penyakitRinganId" dengan ID penyakit ringannya (selain itu null).
   - KASUS C — GEJALA KEKURANGAN HARA MURNI (misal daun menguning pucat/tepi terbakar tanpa penyakit jamur/bakteri dominan):
     * Set "fokusOutput": "hara", "adaGejalaHara": true, "dugaanHaraId" bukan "cukup", "boxes": [], "tahapDominan": null, "anjuranPanen": "Fokus daun/batang".
3B. SAYURAN DAUN & TANAMAN TANPA BUAH (selada, sawi, pakcoy, bayam, kangkung, seledri, dll):
   - Bagian yang dipanen adalah DAUN/BATANG. JANGAN pernah set "fokusOutput": "tidak_terdeteksi" hanya karena tidak ada buah.
   - Jika tanaman tampak jelas: pilih "penyakit" (dengan "penyakitUtamaId": "sehat" bila sehat) atau "hara" bila ada gejala kekurangan hara. "tanpaBuahTerdeteksi": false.
4. DETEKSI GEJALA HARA ("adaGejalaHara"):
   - Set true HANYA jika tampak gejala kekurangan hara nyata (termasuk busuk_ujung_buah -> kurang_kalsium) dan "dugaanHaraId" != "cukup". Selain itu false & "cukup".
5. PENYAKIT TOP-3:
   - Isi tepat 3 ID berbeda dari [${validDiseaseIds.join(', ')}] dengan total confidence = 100.
6. GAYA BAHASA "ringkasanSingkat" & "temuanVisual":
   - Bahasa Indonesia petani sehari-hari, 1-2 kalimat singkat, TANPA istilah ML/AI, dan JANGAN pernah menyebut "konteks", "mode", atau "AI memilih kategori".
7. Jawab HANYA objek JSON valid tanpa markdown fence.''';

    final userPrompt = '''Analisis foto nyata ini sesuai Dataset Khusus CermatTani v2.1:
- Nama tanaman: ${plant.nama}
- Varietas: ${plant.varietas}
- Fase tumbuh: ${plant.fase}
- Data sensor lahan tersedia: ${sensorAvailable ? 'Ya' : 'Tidak'}

Kembalikan tepat JSON sesuai skema.''';

    final responseSchema = <String, dynamic>{
      'type': 'OBJECT',
      'properties': {
        'bagianTerdeteksi': {'type': 'STRING', 'enum': ['buah', 'daun', 'batang']},
        'fokusOutput': {
          'type': 'STRING',
          'enum': ['kematangan', 'penyakit', 'hara', 'tidak_terdeteksi'],
        },
        'diluarKonteksTanaman': {'type': 'BOOLEAN'},
        'tanpaBuahTerdeteksi': {'type': 'BOOLEAN'},
        'alasanTidakTerdeteksi': {'type': 'STRING'},
        'boxes': {
          'type': 'ARRAY',
          'items': {
            'type': 'OBJECT',
            'properties': {
              'x': {'type': 'NUMBER'},
              'y': {'type': 'NUMBER'},
              'w': {'type': 'NUMBER'},
              'h': {'type': 'NUMBER'},
              'stage': {
                'type': 'STRING',
                'enum': ['mentah', 'setengah_matang', 'matang'],
              },
              'confidence': {'type': 'NUMBER'},
            },
            'required': ['x', 'y', 'w', 'h', 'stage', 'confidence'],
          },
        },
        'tahapDominan': {
          'type': 'STRING',
          'enum': ['mentah', 'setengah_matang', 'matang'],
          'nullable': true,
        },
        'anjuranPanen': {
          'type': 'STRING',
          'enum': ['Panen sekarang', 'Tunggu', 'Perlu foto ulang', 'Fokus daun/batang', 'Fokus penyakit'],
        },
        'estimasiHariMin': {'type': 'NUMBER', 'nullable': true},
        'estimasiHariMax': {'type': 'NUMBER', 'nullable': true},
        'penyakitTop3': {
          'type': 'ARRAY',
          'items': {
            'type': 'OBJECT',
            'properties': {
              'id': {'type': 'STRING', 'enum': validDiseaseIds},
              'nama': {'type': 'STRING'},
              'confidence': {'type': 'NUMBER'},
            },
            'required': ['id', 'nama', 'confidence'],
          },
        },
        'penyakitUtamaId': {'type': 'STRING', 'enum': validDiseaseIds},
        'penyakitRinganId': {'type': 'STRING', 'enum': validDiseaseIds, 'nullable': true},
        'adaGejalaHara': {'type': 'BOOLEAN'},
        'dugaanHaraId': {'type': 'STRING', 'enum': validNutrientIds},
        'keyakinan': {'type': 'NUMBER'},
        'ringkasanSingkat': {'type': 'STRING'},
        'temuanVisual': {
          'type': 'ARRAY',
          'items': {'type': 'STRING'},
        },
      },
      'required': [
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

    final b64 = base64Encode(imageBytes);
    final res = await _callGemini(
      isVision: true,
      systemInstruction: systemInstruction,
      contents: [
        {
          'role': 'user',
          'parts': [
            {'text': userPrompt},
            {
              'inlineData': {
                'mimeType': mimeType,
                'data': b64,
              },
            },
          ],
        },
      ],
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      temperature: 0.15,
      maxOutputTokens: 4096,
    );

    late final Map<String, dynamic> parsed;
    try {
      final decoded = jsonDecode(_extractJsonObject(res.text));
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Root JSON bukan objek');
      }
      parsed = decoded;
    } catch (_) {
      throw const GeminiException(
        'Model AI mengembalikan format analisis yang tidak terbaca. Silakan coba pindai ulang.',
      );
    }

    final diluarKonteks = parsed['diluarKonteksTanaman'] == true;
    final detectedPart = _parsePart(parsed['bagianTerdeteksi']);

    // Normalisasi penyakit top-3 = 100%
    final seenIds = <String>{};
    final top3 = <DiseasePred>[];
    final rawTop3 = parsed['penyakitTop3'];
    if (rawTop3 is List) {
      for (final item in rawTop3) {
        if (top3.length >= 3) break;
        if (item is! Map) continue;
        final rawId = item['id']?.toString() ?? 'sehat';
        final safeId = knowledgeDiseases.containsKey(rawId) ? rawId : 'sehat';
        if (seenIds.contains(safeId)) continue;
        seenIds.add(safeId);
        top3.add(
          DiseasePred(
            safeId,
            knowledgeDiseases[safeId]!.penyakit,
            _clampInt(item['confidence'] as num?, 1, 98, 20),
          ),
        );
      }
    }
    while (top3.length < 3) {
      final nextId = validDiseaseIds.firstWhere((id) => !seenIds.contains(id), orElse: () => 'sehat');
      seenIds.add(nextId);
      top3.add(DiseasePred(nextId, knowledgeDiseases[nextId]!.penyakit, 5));
    }

    final totalConf = top3.fold<int>(0, (acc, e) => acc + e.confidence);
    final normalized = top3
        .map((e) => DiseasePred(e.id, e.nama, math.max(1, ((e.confidence / math.max(1, totalConf)) * 100).round())))
        .toList()
      ..sort((a, b) => b.confidence.compareTo(a.confidence));
    final diff = 100 - normalized.fold<int>(0, (acc, e) => acc + e.confidence);
    normalized[0] = DiseasePred(
      normalized[0].id,
      normalized[0].nama,
      math.max(1, normalized[0].confidence + diff),
    );

    final rawUtama = parsed['penyakitUtamaId']?.toString() ?? '';
    final utamaId = diluarKonteks
        ? 'sehat'
        : (knowledgeDiseases.containsKey(rawUtama) ? rawUtama : normalized.first.id);

    // Penegakan ketat Smart Context Routing di sisi klien Dart
    var fokus = _parseFocus(parsed['fokusOutput']);
    // Catatan: 'tanpaBuahTerdeteksi' TIDAK lagi memaksa tidak terdeteksi — sayuran daun (selada, sawi) memang tak berbuah
    if (diluarKonteks) {
      fokus = ScanOutputFocus.tidakTerdeteksi;
    } else if (_fruitRotIds.contains(utamaId) ||
        (utamaId != 'sehat' && fokus != ScanOutputFocus.kematangan)) {
      fokus = ScanOutputFocus.penyakit;
    } else if (detectedPart != PlantPart.buah && fokus == ScanOutputFocus.kematangan) {
      fokus = utamaId != 'sehat' ? ScanOutputFocus.penyakit : ScanOutputFocus.hara;
    }

    final safeBoxes = <DetectionBoxModel>[];
    if (fokus == ScanOutputFocus.kematangan && parsed['boxes'] is List) {
      for (final rawBox in (parsed['boxes'] as List).take(12)) {
        if (rawBox is! Map) continue;
        final rx = (rawBox['x'] as num?)?.toDouble() ?? 15;
        final ry = (rawBox['y'] as num?)?.toDouble() ?? 20;
        final rw = (rawBox['w'] as num?)?.toDouble() ?? 24;
        final rh = (rawBox['h'] as num?)?.toDouble() ?? 28;
        final scaleDiv = math.max(math.max(rx, ry), math.max(rw, rh)) > 100 ? 10.0 : 1.0;
        final xPct = (rx / scaleDiv).clamp(1.0, 90.0);
        final yPct = (ry / scaleDiv).clamp(1.0, 90.0);
        final wPct = (rw / scaleDiv).clamp(6.0, math.max(6.0, 99.0 - xPct));
        final hPct = (rh / scaleDiv).clamp(6.0, math.max(6.0, 99.0 - yPct));
        safeBoxes.add(
          DetectionBoxModel(
            leftFrac: xPct / 100.0,
            topFrac: yPct / 100.0,
            widthFrac: wPct / 100.0,
            heightFrac: hPct / 100.0,
            stage: _parseStage(rawBox['stage']),
            confidence: _clampInt(rawBox['confidence'] as num?, 25, 99, 75),
          ),
        );
      }
    }

    // Fokus kematangan tanpa kotak buah: tampilkan sebagai pemeriksaan kesehatan, bukan "tidak terdeteksi"
    if (fokus == ScanOutputFocus.kematangan &&
        safeBoxes.isEmpty &&
        parsed['tahapDominan'] == null) {
      fokus = ScanOutputFocus.penyakit;
    }

    final tanpaObjek = fokus == ScanOutputFocus.tidakTerdeteksi;

    final rawRingan = parsed['penyakitRinganId']?.toString() ?? '';
    final String? penyakitRinganId = (fokus == ScanOutputFocus.kematangan &&
            rawRingan.isNotEmpty &&
            rawRingan != 'sehat' &&
            knowledgeDiseases.containsKey(rawRingan))
        ? rawRingan
        : null;

    final rawHara = parsed['dugaanHaraId']?.toString() ?? '';
    var haraId = diluarKonteks
        ? 'cukup'
        : (knowledgeNutrients.containsKey(rawHara) ? rawHara : 'cukup');
    var adaGejalaHara = parsed['adaGejalaHara'] == true && haraId != 'cukup';
    if (utamaId == 'busuk_ujung_buah') {
      haraId = 'kurang_kalsium';
      adaGejalaHara = true;
    }
    if (fokus == ScanOutputFocus.hara && haraId == 'cukup') {
      fokus = ScanOutputFocus.penyakit;
    }

    RipenessStage? tahapDominan;
    if (fokus == ScanOutputFocus.kematangan) {
      final td = parsed['tahapDominan']?.toString();
      if (td == 'mentah' || td == 'setengah_matang' || td == 'matang') {
        tahapDominan = _parseStage(td);
      } else {
        tahapDominan = safeBoxes.isNotEmpty ? safeBoxes.first.stage : RipenessStage.setengahMatang;
      }
    }

    final anjuranPanen = switch (fokus) {
      ScanOutputFocus.tidakTerdeteksi => 'Perlu foto ulang',
      ScanOutputFocus.penyakit => 'Fokus penyakit',
      ScanOutputFocus.hara => 'Fokus daun/batang',
      ScanOutputFocus.kematangan =>
        tahapDominan == RipenessStage.matang ? 'Panen sekarang' : 'Tunggu',
    };

    int? estMin;
    int? estMax;
    if (fokus == ScanOutputFocus.kematangan) {
      if (anjuranPanen == 'Panen sekarang') {
        estMin = 0;
        estMax = 1;
      } else {
        final refRip = knowledgeRipeness[tahapDominan ?? RipenessStage.setengahMatang]!;
        estMin = (parsed['estimasiHariMin'] as num?)?.round() ?? refRip.minDays;
        estMax = (parsed['estimasiHariMax'] as num?)?.round() ?? refRip.maxDays;
        if (prevFruitScans >= 2 && estMin > 1) {
          estMin = math.max(1, estMin - 1);
          estMax = math.max(estMin + 1, estMax - 1);
        }
      }
    }

    final keyakinan = _clampInt(
      parsed['keyakinan'] as num?,
      15,
      98,
      tanpaObjek
          ? 30
          : (fokus == ScanOutputFocus.kematangan && safeBoxes.isNotEmpty
              ? safeBoxes.first.confidence
              : normalized.first.confidence),
    );

    final temuanVisual = <String>[];
    if (parsed['temuanVisual'] is List) {
      for (final t in (parsed['temuanVisual'] as List).take(4)) {
        final s = t?.toString().trim() ?? '';
        if (s.isNotEmpty) temuanVisual.add(s);
      }
    }

    final fallbackSummary = switch (fokus) {
      ScanOutputFocus.kematangan =>
        knowledgeRipeness[tahapDominan ?? RipenessStage.setengahMatang]!.ringkasan,
      ScanOutputFocus.penyakit => knowledgeDiseases[utamaId]!.gejala,
      ScanOutputFocus.hara => knowledgeNutrients[haraId]!.gejala,
      ScanOutputFocus.tidakTerdeteksi => parsed['alasanTidakTerdeteksi']?.toString().trim() ?? '',
    };

    final ringkasan = (parsed['ringkasanSingkat']?.toString().trim().isNotEmpty == true)
        ? parsed['ringkasanSingkat'].toString().trim()
        : fallbackSummary;

    final fruitCount = fokus == ScanOutputFocus.kematangan ? math.max(safeBoxes.length, 1) : 0;
    final finalDiseaseId = fokus == ScanOutputFocus.kematangan ? 'sehat' : utamaId;

    final now = DateTime.now();
    final scan = ScanModel(
      id: 'scan-${now.millisecondsSinceEpoch}',
      plantId: plant.id,
      waktu: now,
      bagian: detectedPart,
      fokusOutput: fokus,
      boxes: safeBoxes,
      tahapDominan: tahapDominan,
      jumlahBuah: fruitCount,
      anjuranPanen: anjuranPanen,
      estimasiHariMin: estMin,
      estimasiHariMax: estMax,
      estimasiDisesuaikanRiwayat: fokus == ScanOutputFocus.kematangan && prevFruitScans >= 2,
      estimasiBobotGram: fruitCount * plant.bobotRataBuahGram,
      penyakitTop3: normalized,
      penyakitUtamaId: finalDiseaseId,
      penyakitUtamaNama: knowledgeDiseases[finalDiseaseId]!.penyakit,
      penyakitRinganId: penyakitRinganId,
      adaGejalaHara: adaGejalaHara,
      keyakinan: keyakinan,
      keyakinanRendah: keyakinan < lowConfidenceThreshold,
      dugaanHaraId: haraId,
      dugaanHaraNama: knowledgeNutrients[haraId]!.dugaan,
      pakaiDataSensor: sensorAvailable,
      tanpaBuahTerdeteksi: tanpaObjek,
      diluarKonteksTanaman: diluarKonteks,
      photoBytes: imageBytes,
      aiModel: res.model,
      ringkasanAi: ringkasan,
      temuanVisual: temuanVisual,
    );

    return GeminiScanOutput(
      scan: scan,
      aiModel: res.model,
      ringkasanSingkat: ringkasan,
      temuanVisual: temuanVisual,
    );
  }

  static String _buildChatGrounding({
    required String message,
    required PlantModel? plant,
    required ScanModel? latestScan,
  }) {
    final q = message.toLowerCase();
    final sections = <String>[];

    sections.add(
      '[DATASET TANAMAN]\n'
      '- Tomat (Servo F1, Gustavi, Rampai, Ceri): Suhu 20-28°C, Tanah 45-65%, Udara 60-75% RH, Panen 60-75 HST, Bobot ~85g.\n'
      '- Cabai (Rawit, Keriting, Besar): Suhu 22-30°C, Tanah 45-60%, Udara 60-75% RH, Panen 75-90 HST.',
    );

    final isDiseaseOrHaraScan = latestScan != null &&
        (latestScan.fokusOutput == ScanOutputFocus.penyakit ||
            latestScan.fokusOutput == ScanOutputFocus.hara);

    if ((!isDiseaseOrHaraScan && latestScan?.fokusOutput == ScanOutputFocus.kematangan) ||
        RegExp(r'panen|matang|mentah|petik|warna|simpan|berapa hari').hasMatch(q)) {
      final ripLines = knowledgeRipeness.values
          .map((r) => '- ${r.label}: ${r.ringkasan} Pasca panen: ${r.penangananPascaPanen}')
          .join('\n');
      sections.add('[DATASET KEMATANGAN BUAH]\n$ripLines');
    }

    final disIds = <String>{};
    if (latestScan != null && knowledgeDiseases.containsKey(latestScan.penyakitUtamaId)) {
      disIds.add(latestScan.penyakitUtamaId);
    }
    if (latestScan?.penyakitRinganId != null &&
        knowledgeDiseases.containsKey(latestScan!.penyakitRinganId!)) {
      disIds.add(latestScan.penyakitRinganId!);
    }
    for (final d in knowledgeDiseases.values) {
      if (q.contains(d.penyakit.toLowerCase()) || d.kataKunci.any((k) => q.contains(k))) {
        disIds.add(d.id);
      }
    }
    if (RegExp(r'penyakit|busuk|sakit|bercak|layu|jamur|hama|obat|semprot|organik|kompos').hasMatch(q) &&
        disIds.length < 2) {
      disIds.addAll(['busuk_basah_buah', 'bercak_kering']);
    }
    if (disIds.isNotEmpty) {
      final rows = disIds.take(3).map((id) {
        final d = knowledgeDiseases[id]!;
        return '- ${d.penyakit}: Penyebab: ${d.penyebab} | Organik dulu: ${d.solusiOrganik.join('; ')} | Kimia terakhir: ${d.solusiKimia.join(' ')} | Pencegahan: ${d.pencegahan.join('; ')} | Sumber: ${d.sumber}';
      }).join('\n');
      sections.add('[DATASET PENYAKIT & SOLUSI TERKURASI]\n$rows');
    }

    final nutIds = <String>{};
    if (latestScan != null &&
        latestScan.adaGejalaHara &&
        knowledgeNutrients.containsKey(latestScan.dugaanHaraId)) {
      nutIds.add(latestScan.dugaanHaraId);
    }
    for (final n in knowledgeNutrients.values) {
      if (n.kataKunci.any((k) => q.contains(k))) nutIds.add(n.id);
    }
    if (RegExp(r'pupuk|hara|nutrisi|npk|kompos|kuning|dosis|takaran').hasMatch(q) && nutIds.isEmpty) {
      nutIds.addAll(['cukup', 'kurang_nitrogen', 'kurang_kalium']);
    }
    if (nutIds.isNotEmpty) {
      final fase = plant?.fase ?? 'Berbuah';
      final rows = nutIds.take(3).map((id) {
        final n = knowledgeNutrients[id]!;
        return '- ${n.dugaan}: Organik: ${n.rekomendasiOrganik} | Dosis fase $fase: ${n.dosisPerFase[fase] ?? ''} | Sumber: ${n.sumber}';
      }).join('\n');
      sections.add('[DATASET HARA & PUPUK FASE ${fase.toUpperCase()}]\n$rows');
    }

    sections.add(
      '[PROTOKOL LAHAN CERMATTANI]\n'
      '- Irigasi: ideal tanah 45-65%; pompa otomatis ON < 35%, OFF >= 65%, maks 15 menit.\n'
      '- Tandon kritis < 20% menahan pompa. Jamur iklim mikro: RH >= 85%.',
    );

    return sections.join('\n\n');
  }

  /// Chatbot Cermo 100% Gemini AI + Dataset Agronomi v2.1 + Konteks Hasil Scan Terakhir
  static Future<GeminiChatOutput> chatWithCermo({
    required String message,
    required List<ChatMsgModel> history,
    required PlantModel? plant,
    required ScanModel? latestScan,
    required CermatState state,
  }) async {
    String scanSummary = 'Belum ada hasil scan tersimpan untuk tanaman ini.';
    if (latestScan != null) {
      if (latestScan.fokusOutput == ScanOutputFocus.penyakit) {
        final dis = knowledgeDiseases[latestScan.penyakitUtamaId] ?? knowledgeDiseases['sehat']!;
        final haraNote = latestScan.adaGejalaHara
            ? ' Juga terindikasi ${latestScan.dugaanHaraNama}.'
            : '';
        scanSummary =
            'Hasil scan terakhir (bagian ${latestScan.bagian.name}): terdeteksi "${dis.penyakit}" '
            '(keyakinan ${latestScan.keyakinan}%). Penyebab: ${dis.penyebab}.$haraNote '
            'PENTING: Ini kasus penyakit/busuk, JANGAN menyarankan panen atau membahas kematangan buah ini.';
      } else if (latestScan.fokusOutput == ScanOutputFocus.kematangan) {
        final rip = knowledgeRipeness[latestScan.tahapDominan ?? RipenessStage.setengahMatang]!;
        final minor = latestScan.penyakitRinganId != null &&
                knowledgeDiseases.containsKey(latestScan.penyakitRinganId!)
            ? ' Catatan penyakit ringan pada buah: ${knowledgeDiseases[latestScan.penyakitRinganId!]!.penyakit}.'
            : '';
        scanSummary =
            'Hasil scan terakhir (buah segar): tahap "${rip.label}", ${latestScan.jumlahBuah} buah, '
            'anjuran "${latestScan.anjuranPanen}" (estimasi ${latestScan.estimasiHariMin ?? '-'}-${latestScan.estimasiHariMax ?? '-'} hari, '
            'bobot ~${latestScan.estimasiBobotGram}g, yakin ${latestScan.keyakinan}%).$minor';
      } else if (latestScan.fokusOutput == ScanOutputFocus.hara) {
        scanSummary =
            'Hasil scan terakhir (bagian ${latestScan.bagian.name}): "${latestScan.dugaanHaraNama}" '
            '(keyakinan ${latestScan.keyakinan}%).';
      } else {
        scanSummary = 'Hasil scan terakhir belum mendeteksi objek tanaman dengan jelas.';
      }
    }

    final sensorSummary =
        'Sensor lahan (Simulasi ESP32): tanah ${state.kelembapanTanah}%, '
        'N ${state.nitrogenMgKg}/P ${state.fosforMgKg}/K ${state.kaliumMgKg} mg/kg, '
        'suhu ${state.suhuUdara}°C, udara ${state.kelembapanUdara}%, '
        'tandon ${state.levelTandon}%, baterai ${state.bateraiPersen}%.';

    final grounded = _buildChatGrounding(
      message: message,
      plant: plant,
      latestScan: latestScan,
    );

    // Ambil referensi eksternal live (Wikipedia & GBIF) untuk memperkaya jawaban Cermo
    final qLower = message.toLowerCase();
    KnowledgeDisease? extDisease;
    if (latestScan != null &&
        latestScan.penyakitUtamaId != 'sehat' &&
        knowledgeDiseases.containsKey(latestScan.penyakitUtamaId)) {
      extDisease = knowledgeDiseases[latestScan.penyakitUtamaId];
    } else {
      for (final d in knowledgeDiseases.values) {
        if (d.id != 'sehat' &&
            (qLower.contains(d.penyakit.toLowerCase()) ||
                d.kataKunci.any((k) => qLower.contains(k)))) {
          extDisease = d;
          break;
        }
      }
    }
    final extInfo = await ExternalKnowledgeService.fetch(
      query: (extDisease != null && extDisease.wikiQuery.isNotEmpty)
          ? extDisease.wikiQuery
          : (extDisease?.penyakit ?? (plant?.varietas ?? 'Tomat')),
      scientificNameHint: (extDisease != null && extDisease.namaIlmiahPatogen.isNotEmpty)
          ? extDisease.namaIlmiahPatogen
          : 'Solanum lycopersicum',
      topicId: extDisease?.id ?? 'tomat',
      indonesianTitle: extDisease?.penyakit,
      indonesianContext: extDisease?.penyebab,
    );
    final extBlock = extInfo != null
        ? '\n\n=== REFERENSI EKSTERNAL LIVE (${extInfo.sumberLabel}) ===\n'
            '- Judul: ${extInfo.judul}${extInfo.namaIlmiah != null ? ' (${extInfo.namaIlmiah})' : ''}\n'
            '- Ringkasan: ${extInfo.ringkasan}${extInfo.tautanResmi.isNotEmpty ? '\n- Portal Resmi: ${extInfo.tautanResmi.map((l) => '${l.label} (${l.url})').join(' | ')}' : ''}'
        : '';

    final systemInstruction = '''Kamu adalah Cermo, asisten agronomi resmi aplikasi CermatTani.
Gaya bicara: bahasa Indonesia sehari-hari yang hangat, jelas, sopan, menyapa dengan "kamu". JANGAN pakai istilah ML/AI dan JANGAN pernah menyebut cara kerja routing konteks internal.

=== BATASAN KETAT ===
1. TOPIK DIIZINKAN HANYA: budidaya tanaman, penjelasan lanjutan hasil scan (buah busuk/penyakit, kematangan buah, pupuk organik), irigasi, tandon, iklim mikro, surya, dan fitur CermatTani.
2. TOLAK TOPIK DI LUAR PERTANIAN/CERMATTANI dengan sopan:
   "Maaf ya, aku Cermo hanya bisa membantu seputar budidaya tanaman, hasil scan, pupuk, irigasi, dan fitur kebun di CermatTani. Yuk tanyakan kondisi tanaman atau hasil scan kebunmu hari ini!"
3. PATUHI DATASET KHUSUS DI BAWAH:
   - Semua solusi, dosis, dan pencegahan WAJIB bersumber dari DATASET KHUSUS AGRONOMI CERMATTANI di bawah.
   - Dahulukan solusi ORGANIK sebelum kimiawi. Bila menyebut kimia wajib sertakan "baca label produk".
   - Bila membahas pupuk/hara wajib sertakan "bukan pengganti uji tanah".
   - Jika hasil scan terakhir adalah buah busuk/penyakit, fokus penuh pada penanganan busuk/penyakit & sanitasi — JANGAN menyarankan panen buah busuk tersebut.
4. FORMAT: ringkas 3-5 kalimat atau 3-4 poin pendek, tanpa menulis ulang label "Saran, bukan keputusan akhir".

=== KONTEKS KEBUN & HASIL SCAN PENGGUNA ===
- Tanaman aktif: ${plant != null ? '${plant.nama} (varietas ${plant.varietas}, fase ${plant.fase})' : 'Belum dipilih'}
- $scanSummary
- $sensorSummary

=== DATASET KHUSUS AGRONOMI CERMATTANI v3.0 ===
$grounded$extBlock''';

    final recentHistory = history.length > 10 ? history.sublist(history.length - 10) : history;
    final contents = <Map<String, dynamic>>[
      for (final h in recentHistory)
        {
          'role': h.dariCermo ? 'model' : 'user',
          'parts': [
            {'text': h.isi},
          ],
        },
      {
        'role': 'user',
        'parts': [
          {'text': message},
        ],
      },
    ];

    final res = await _callGemini(
      isVision: false,
      systemInstruction: systemInstruction,
      contents: contents,
      responseMimeType: 'text/plain',
      temperature: 0.3,
      maxOutputTokens: 560,
    );

    return GeminiChatOutput(reply: res.text, aiModel: res.model);
  }
}
