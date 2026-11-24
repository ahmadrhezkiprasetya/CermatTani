import { NextResponse } from 'next/server';
import { escapeTelegramHtml, getTelegramBotToken, sendTelegramMessage } from '@/lib/telegram';

/**
 * POST /api/telegram/send
 * Mengirim notifikasi NYATA ke akun Telegram petani:
 * - kind: 'test' | 'reminder' | 'alert' | 'scan'
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chatId = String(body.chatId || '').trim();
    const kind = String(body.kind || 'test');
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const lines: string[] = Array.isArray(body.lines)
      ? body.lines.map((x: unknown) => String(x || '').trim()).filter(Boolean)
      : [];

    if (!chatId || !/^-?\d+$/.test(chatId)) {
      return NextResponse.json(
        { error: 'Akun Telegram belum tertaut dengan Chat ID yang valid.' },
        { status: 400 }
      );
    }

    if (!getTelegramBotToken()) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN belum diatur di server.' },
        { status: 500 }
      );
    }

    const prefixIcon =
      kind === 'alert'
        ? '⚠️'
        : kind === 'scan'
          ? '📸'
          : kind === 'reminder'
            ? '⏰'
            : '🌱';

    const header = title ? `${prefixIcon} <b>${escapeTelegramHtml(title)}</b>` : `${prefixIcon} <b>CermatTani</b>`;
    const bodyParts = [header];
    if (message) bodyParts.push(escapeTelegramHtml(message));
    if (lines.length > 0) {
      bodyParts.push(lines.map((l) => `• ${escapeTelegramHtml(l)}`).join('\n'));
    }
    bodyParts.push('<i>Dikirim otomatis oleh CermatTani</i>');

    const sent = await sendTelegramMessage({
      chatId,
      text: bodyParts.join('\n\n'),
      parseMode: 'HTML',
    });

    if (!sent.ok) {
      return NextResponse.json({ error: sent.error || 'Gagal mengirim pesan Telegram.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch {
    return NextResponse.json({ error: 'Format pesan Telegram tidak valid.' }, { status: 400 });
  }
}
