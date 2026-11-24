import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Layanan Bot Telegram Nyata untuk Flutter Mobile CermatTani.
/// Token disuntikkan lewat `--dart-define-from-file=.env.json` (`TELEGRAM_BOT_TOKEN`).
abstract final class TelegramService {
  static const String _token = String.fromEnvironment('TELEGRAM_BOT_TOKEN', defaultValue: '');

  static bool get isConfigured => _token.trim().isNotEmpty;

  static ({DateTime expiresAt, String username, String botUrl})? _botCache;

  static String _escapeHtml(String text) => text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

  static String _translateErr(String? desc) {
    final lower = (desc ?? '').toLowerCase();
    if (lower.contains('chat not found')) {
      return 'Chat ID belum dikenali bot. Buka bot Telegram lalu tekan Start (/start) terlebih dulu.';
    }
    if (lower.contains('blocked by the user')) {
      return 'Bot diblokir di Telegram kamu. Buka blokir bot lalu coba lagi.';
    }
    if (lower.contains('too many requests')) {
      return 'Telegram sedang membatasi permintaan sementara. Tunggu beberapa detik lalu coba lagi.';
    }
    if (lower.contains('unauthorized')) {
      return 'Token Bot Telegram ditolak. Periksa TELEGRAM_BOT_TOKEN saat build.';
    }
    return desc?.isNotEmpty == true ? desc! : 'Gagal terhubung ke server Telegram.';
  }

  static Future<Map<String, dynamic>?> _callApi(
    String method, {
    Map<String, dynamic>? payload,
    int timeoutSec = 22,
  }) async {
    if (!isConfigured) return {'ok': false, 'description': 'TELEGRAM_BOT_TOKEN belum dikonfigurasi.'};
    final client = HttpClient()..connectionTimeout = Duration(seconds: timeoutSec);
    try {
      final uri = Uri.parse('https://api.telegram.org/bot${_token.trim()}/$method');
      final req = payload != null
          ? await client.postUrl(uri).timeout(Duration(seconds: timeoutSec))
          : await client.getUrl(uri).timeout(Duration(seconds: timeoutSec));
      if (payload != null) {
        req.headers.contentType = ContentType.json;
        req.write(jsonEncode(payload));
      }
      final res = await req.close().timeout(Duration(seconds: timeoutSec));
      final body = await res.transform(utf8.decoder).join().timeout(Duration(seconds: timeoutSec));
      final decoded = jsonDecode(body);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (_) {
      return {'ok': false, 'description': 'Gagal menghubungi API Telegram. Periksa internet HP kamu.'};
    } finally {
      client.close(force: true);
    }
  }

  static Future<({String username, String botUrl})?> getBotInfo() async {
    if (!isConfigured) return null;
    if (_botCache != null && _botCache!.expiresAt.isAfter(DateTime.now())) {
      return (username: _botCache!.username, botUrl: _botCache!.botUrl);
    }
    final res = await _callApi('getMe');
    final result = res?['result'];
    if (res?['ok'] == true && result is Map && result['username'] is String) {
      final uname = result['username'].toString();
      final url = 'https://t.me/$uname';
      _botCache = (
        expiresAt: DateTime.now().add(const Duration(hours: 6)),
        username: uname,
        botUrl: url,
      );
      return (username: uname, botUrl: url);
    }
    return null;
  }

  static Future<({bool ok, String? error})> sendNotification({
    required String chatId,
    required String kind,
    required String title,
    required String message,
    List<String> lines = const [],
  }) async {
    final cleanId = chatId.trim();
    if (!RegExp(r'^-?\d+$').hasMatch(cleanId)) {
      return (ok: false, error: 'Chat ID Telegram harus berupa angka numerik yang valid.');
    }
    final icon = switch (kind) {
      'alert' => '⚠️',
      'scan' => '📸',
      'reminder' => '⏰',
      _ => '🌱',
    };
    final parts = <String>[
      '$icon <b>${_escapeHtml(title)}</b>',
      if (message.trim().isNotEmpty) _escapeHtml(message.trim()),
      if (lines.isNotEmpty) lines.map((l) => '• ${_escapeHtml(l)}').join('\n'),
      '<i>Dikirim otomatis oleh CermatTani Mobile</i>',
    ];
    final res = await _callApi(
      'sendMessage',
      payload: {
        'chat_id': cleanId,
        'text': parts.join('\n\n'),
        'parse_mode': 'HTML',
        'disable_web_page_preview': true,
      },
    );
    if (res?['ok'] == true) return (ok: true, error: null);
    return (ok: false, error: _translateErr(res?['description']?.toString()));
  }

  static Future<({bool ok, String? chatId, String? displayName, String message})> linkAccount({
    required String code,
    required String userName,
    String? manualChatId,
  }) async {
    final cleanManual = (manualChatId ?? '').trim();
    String? resolvedId;
    String display = '';

    if (cleanManual.isNotEmpty) {
      if (!RegExp(r'^-?\d+$').hasMatch(cleanManual)) {
        return (
          ok: false,
          chatId: null,
          displayName: null,
          message: 'Chat ID manual harus berupa angka numerik (mis. 123456789). Atau tekan "Deteksi Otomatis".',
        );
      }
      resolvedId = cleanManual;
      display = cleanManual;
    } else {
      final res = await _callApi(
        'getUpdates',
        payload: {
          'limit': 50,
          'allowed_updates': ['message'],
        },
      );
      if (res?['ok'] != true || res?['result'] is! List) {
        return (
          ok: false,
          chatId: null,
          displayName: null,
          message: _translateErr(res?['description']?.toString()),
        );
      }

      final updates = (res!['result'] as List).reversed.whereType<Map>().toList();
      Map? matched;

      // 1. Cari pesan mengandung kode tautan 6 digit
      for (final u in updates) {
        final msg = u['message'];
        if (msg is! Map) continue;
        final chat = msg['chat'];
        final txt = msg['text']?.toString() ?? '';
        if (chat is Map && chat['id'] != null && txt.contains(code)) {
          matched = msg;
          break;
        }
      }

      // 2. Fallback: pesan /start atau /link terbaru dalam 15 menit
      if (matched == null) {
        final cutoff = DateTime.now().millisecondsSinceEpoch ~/ 1000 - 15 * 60;
        for (final u in updates) {
          final msg = u['message'];
          if (msg is! Map) continue;
          final chat = msg['chat'];
          final txt = (msg['text']?.toString() ?? '').trim().toLowerCase();
          final dt = (msg['date'] as num?)?.toInt() ?? 0;
          if (chat is Map &&
              chat['id'] != null &&
              chat['type'] == 'private' &&
              (txt.startsWith('/start') || txt.startsWith('/link')) &&
              dt >= cutoff) {
            matched = msg;
            break;
          }
        }
      }

      // 3. Fallback terakhir: chat pribadi paling baru yang pernah chat ke bot
      if (matched == null) {
        for (final u in updates) {
          final msg = u['message'];
          if (msg is Map && msg['chat'] is Map && msg['chat']['type'] == 'private') {
            matched = msg;
            break;
          }
        }
      }

      if (matched == null) {
        return (
          ok: false,
          chatId: null,
          displayName: null,
          message:
              'Belum ada pesan masuk di bot. Buka bot Telegram lalu tekan Start atau kirim /link $code, kemudian tekan Deteksi Otomatis lagi.',
        );
      }

      final chat = matched['chat'] as Map;
      resolvedId = chat['id'].toString();
      final uname = chat['username']?.toString();
      final fname = [chat['first_name']?.toString(), chat['last_name']?.toString()]
          .whereType<String>()
          .join(' ')
          .trim();
      display = uname != null && uname.isNotEmpty ? '@$uname' : (fname.isNotEmpty ? fname : resolvedId);
    }

    final sent = await sendNotification(
      chatId: resolvedId,
      kind: 'test',
      title: 'CermatTani Berhasil Tersambung!',
      message: 'Halo $userName, akun kebunmu kini terhubung ke bot Telegram (kode $code).',
      lines: const [
        'Jadwal pengingat panen & perawatan harian aktif',
        'Peringatan sensor kritis (tandon, tanah kering, jamur, baterai) aktif',
        'Notifikasi penyakit & tombol kirim hasil Scan AI siap digunakan',
      ],
    );

    if (!sent.ok) {
      return (
        ok: false,
        chatId: null,
        displayName: null,
        message: sent.error ?? 'Gagal mengirim pesan konfirmasi ke Telegram.',
      );
    }

    return (
      ok: true,
      chatId: resolvedId,
      displayName: display,
      message: 'Tersambung ke $display! Pesan konfirmasi sudah masuk di Telegram kamu.',
    );
  }
}
