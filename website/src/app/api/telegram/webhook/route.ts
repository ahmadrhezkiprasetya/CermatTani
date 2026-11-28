import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { getTelegramBotToken, sendTelegramMessage } from '@/lib/telegram';

interface TelegramCommand {
  chatId: number;
  chatType?: string;
  text: string;
  username?: string;
}

function parseTelegramCommand(update: unknown): TelegramCommand | null {
  if (!update || typeof update !== 'object' || Array.isArray(update)) return null;
  const message = (update as Record<string, unknown>).message;
  if (!message || typeof message !== 'object' || Array.isArray(message)) return null;

  const rawMessage = message as Record<string, unknown>;
  const chat = rawMessage.chat;
  if (!chat || typeof chat !== 'object' || Array.isArray(chat)) return null;

  const rawChat = chat as Record<string, unknown>;
  const id = rawChat.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return null;

  const from = rawMessage.from;
  const fromUsername =
    from && typeof from === 'object' && !Array.isArray(from)
      ? (from as Record<string, unknown>).username
      : null;

  return {
    chatId: id,
    chatType: typeof rawChat.type === 'string' ? rawChat.type : undefined,
    text: typeof rawMessage.text === 'string' ? rawMessage.text.trim() : '',
    username:
      typeof fromUsername === 'string'
        ? fromUsername
        : typeof rawChat.username === 'string'
          ? rawChat.username
          : undefined,
  };
}

function hasValidWebhookSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  const received = request.headers.get('x-telegram-bot-api-secret-token') || '';
  if (
    expected.length < 32 ||
    !/^[A-Za-z0-9_-]+$/.test(expected) ||
    !received ||
    received.length > 256
  ) {
    return false;
  }

  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

async function reply(chatId: number, text: string): Promise<boolean> {
  const result = await sendTelegramMessage({ chatId: String(chatId), text });
  if (!result.ok) console.error('Gagal membalas pesan bot Telegram:', result.error);
  return result.ok;
}

export async function POST(request: Request) {
  if (!hasValidWebhookSecret(request)) {
    return NextResponse.json({ error: 'Webhook Telegram tidak terverifikasi.' }, { status: 401 });
  }
  if (!getTelegramBotToken()) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi.' }, { status: 503 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase server belum dikonfigurasi.' }, { status: 503 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload webhook tidak valid.' }, { status: 400 });
  }

  const incoming = parseTelegramCommand(update);
  if (!incoming || incoming.chatType !== 'private' || !incoming.text.startsWith('/')) {
    return NextResponse.json({ ok: true });
  }

  const commandMatch = incoming.text.match(/^\/([a-z0-9_]+)(?:@[\w]+)?(?:\s+([\s\S]*))?$/i);
  if (!commandMatch) {
    await reply(incoming.chatId, 'Perintah tidak dikenali. Kirim /help untuk melihat bantuan.');
    return NextResponse.json({ ok: true });
  }

  const command = commandMatch[1].toLowerCase();
  const argument = (commandMatch[2] || '').trim();
  if (command === 'start' || command === 'link') {
    if (!/^\d{6}$/.test(argument)) {
      await reply(
        incoming.chatId,
        'Untuk menghubungkan akun, buat kode dari menu Pengaturan → Pengingat Telegram di website CermatTani, lalu buka tautan bot yang tersedia.'
      );
      return NextResponse.json({ ok: true });
    }

    const { data: attemptAllowed, error: attemptError } = await admin.rpc(
      'allow_telegram_link_attempt',
      { p_chat_id: incoming.chatId }
    );
    if (attemptError) {
      console.error('Webhook gagal membatasi percobaan tautan Telegram:', attemptError);
      return NextResponse.json({ error: 'Gagal memproses tautan Telegram.' }, { status: 503 });
    }
    if (!attemptAllowed) {
      await reply(incoming.chatId, 'Terlalu banyak percobaan kode. Tunggu 10 menit lalu coba kembali.');
      return NextResponse.json({ ok: true });
    }

    const { data: userId, error } = await admin.rpc('complete_telegram_link', {
      p_code: argument,
      p_chat_id: incoming.chatId,
      p_username: incoming.username || null,
    });

    if (error?.code === '23505') {
      await reply(incoming.chatId, 'Akun Telegram ini sudah tertaut ke akun CermatTani lain.');
      return NextResponse.json({ ok: true });
    }
    if (error) {
      console.error('Webhook gagal memvalidasi kode Telegram:', error);
      return NextResponse.json({ error: 'Gagal memproses tautan Telegram.' }, { status: 503 });
    }
    if (!userId) {
      await reply(incoming.chatId, 'Kode tidak valid atau sudah kedaluwarsa. Buat kode baru dari website CermatTani.');
      return NextResponse.json({ ok: true });
    }

    await reply(
      incoming.chatId,
      '🌱 Akun CermatTani berhasil terhubung! Pengingat dan notifikasi kebun akan dikirim ke chat ini.'
    );
    return NextResponse.json({ ok: true });
  }

  if (command === 'help') {
    await reply(
      incoming.chatId,
      'Bantuan CermatTani:\n/start KODE — hubungkan akun dengan kode dari website\n/status — cek koneksi akun\n/unlink — putuskan koneksi akun'
    );
    return NextResponse.json({ ok: true });
  }

  if (command === 'status') {
    const { data, error } = await admin
      .from('telegram_connections')
      .select('telegram_username')
      .eq('telegram_chat_id', incoming.chatId)
      .maybeSingle();

    if (error) {
      console.error('Webhook gagal membaca status koneksi Telegram:', error);
      return NextResponse.json({ error: 'Gagal membaca status Telegram.' }, { status: 503 });
    }

    await reply(
      incoming.chatId,
      data
        ? `Akun Telegram sudah terhubung ke CermatTani${data.telegram_username ? ` sebagai @${data.telegram_username}` : ''}.`
        : 'Chat ini belum terhubung. Buat kode tautan dari menu Pengaturan → Pengingat Telegram di website CermatTani.'
    );
    return NextResponse.json({ ok: true });
  }

  if (command === 'unlink') {
    const { data: userId, error } = await admin.rpc('unlink_telegram_by_chat_id', {
      p_chat_id: incoming.chatId,
    });

    if (error) {
      console.error('Webhook gagal memutus koneksi Telegram:', error);
      return NextResponse.json({ error: 'Gagal memutus koneksi Telegram.' }, { status: 503 });
    }

    await reply(
      incoming.chatId,
      userId
        ? 'Koneksi Telegram ke akun CermatTani sudah diputus.'
        : 'Chat ini belum memiliki koneksi akun CermatTani.'
    );
    return NextResponse.json({ ok: true });
  }

  await reply(incoming.chatId, 'Perintah tidak dikenali. Kirim /help untuk melihat bantuan.');
  return NextResponse.json({ ok: true });
}
