import { NextResponse } from 'next/server';
import { authenticateSupabaseRequest } from '@/lib/supabase/api-auth';
import { escapeTelegramHtml, getTelegramBotToken, sendTelegramMessage } from '@/lib/telegram';

/**
 * POST /api/telegram/send
 * Mengirim notifikasi NYATA ke akun Telegram petani:
 * - kind: 'test' | 'reminder' | 'alert' | 'scan'
 */
export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format pesan Telegram tidak valid.' }, { status: 400 });
  }

  const kind = String(body.kind || 'test');
  const allowedKinds = ['test', 'reminder', 'alert', 'scan'];
  if (!allowedKinds.includes(kind)) {
    return NextResponse.json({ error: 'Jenis pesan Telegram tidak valid.' }, { status: 400 });
  }

  const title = String(body.title || '').trim();
  const message = String(body.message || '').trim();
  const lines: string[] = Array.isArray(body.lines)
    ? body.lines.map((value: unknown) => String(value || '').trim()).filter(Boolean)
    : [];

  if (title.length > 150 || message.length > 3000 || lines.length > 10 || lines.some((line) => line.length > 250)) {
    return NextResponse.json({ error: 'Isi pesan Telegram terlalu panjang.' }, { status: 400 });
  }

  const { data: connection, error: connectionError } = await auth.admin
    .from('telegram_connections')
    .select('telegram_chat_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (connectionError) {
    console.error('Gagal membaca koneksi Telegram:', connectionError);
    return NextResponse.json(
      { error: 'Tabel Telegram belum siap. Jalankan migrasi Supabase Telegram terlebih dahulu.' },
      { status: 503 }
    );
  }
  if (!connection) {
    return NextResponse.json({ error: 'Akun Telegram belum tertaut.' }, { status: 409 });
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
    bodyParts.push(lines.map((line) => `• ${escapeTelegramHtml(line)}`).join('\n'));
  }
  bodyParts.push('<i>Dikirim otomatis oleh CermatTani</i>');

  const text = bodyParts.join('\n\n');
  if (text.length > 3900) {
    return NextResponse.json({ error: 'Isi pesan melebihi batas Telegram.' }, { status: 400 });
  }

  const sent = await sendTelegramMessage({
    chatId: String(connection.telegram_chat_id),
    text,
    parseMode: 'HTML',
  });

  if (!sent.ok) {
    return NextResponse.json({ error: sent.error || 'Gagal mengirim pesan Telegram.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: true });
}
