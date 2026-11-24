import { NextResponse } from 'next/server';
import {
  detectTelegramChatByCode,
  escapeTelegramHtml,
  getTelegramBotInfo,
  getTelegramBotToken,
  sendTelegramMessage,
} from '@/lib/telegram';

/**
 * POST /api/telegram/link
 * Mendukung 2 mode:
 * - mode: 'auto' (atau chatId kosong): otomatis mendeteksi Chat ID dari pesan `/start KODE` / `/link KODE`
 * - mode: 'manual' (dengan chatId): memverifikasi Chat ID numerik & mengirim pesan konfirmasi nyata
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code || '').trim();
    const userName = String(body.userName || 'Petani').trim();
    const rawChatId = String(body.chatId || '').trim();
    const mode = body.mode === 'auto' || !rawChatId ? 'auto' : 'manual';

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Kode tautan harus 6 digit angka.' }, { status: 400 });
    }

    const botToken = getTelegramBotToken();
    if (!botToken) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN belum terkonfigurasi di server.' },
        { status: 500 }
      );
    }

    let resolvedChatId = rawChatId;
    let displayName = rawChatId;

    if (mode === 'auto') {
      const detected = await detectTelegramChatByCode(code);
      if (!detected.ok || !detected.chatId) {
        return NextResponse.json(
          { error: detected.error || 'Chat ID belum terdeteksi dari Telegram.' },
          { status: 404 }
        );
      }
      resolvedChatId = detected.chatId;
      displayName = detected.displayName || detected.chatId;
    } else if (!/^-?\d+$/.test(resolvedChatId)) {
      return NextResponse.json(
        {
          error:
            'Chat ID manual harus berupa angka numerik (contoh: 123456789). Untuk lebih mudah, klik "Buka Bot" lalu pakai tombol "Deteksi Otomatis".',
        },
        { status: 400 }
      );
    }

    const botInfo = await getTelegramBotInfo();
    const confirmText =
      `🌱 <b>CermatTani Berhasil Tersambung!</b>\n\n` +
      `Halo <b>${escapeTelegramHtml(userName)}</b>, akun kebunmu kini terhubung ke bot ini (kode <code>${code}</code>).\n\n` +
      `Mulai sekarang kamu akan menerima:\n` +
      `• Jadwal pengingat panen & perawatan harian\n` +
      `• Peringatan sensor kritis (tandon, tanah kering, risiko jamur, baterai)\n` +
      `• Notifikasi penyakit & ringkasan hasil Scan AI`;

    const sendRes = await sendTelegramMessage({
      chatId: resolvedChatId,
      text: confirmText,
      parseMode: 'HTML',
    });

    if (!sendRes.ok) {
      return NextResponse.json(
        { error: sendRes.error || 'Gagal mengirim pesan konfirmasi ke Telegram.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      linked: true,
      code,
      chatId: resolvedChatId,
      displayName,
      botUsername: botInfo.username || undefined,
      status: 'Bot Telegram aktif dan pesan konfirmasi sudah dikirim.',
    });
  } catch {
    return NextResponse.json({ error: 'Permintaan tautan Telegram tidak valid.' }, { status: 400 });
  }
}
