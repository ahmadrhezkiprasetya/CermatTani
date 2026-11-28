import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateSupabaseRequest } from '@/lib/supabase/api-auth';
import { getTelegramBotInfo } from '@/lib/telegram';

const CODE_TTL_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [connection, linkCode, botInfo] = await Promise.all([
    auth.admin
      .from('telegram_connections')
      .select('telegram_chat_id, telegram_username, connected_at')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
    auth.admin
      .from('telegram_link_codes')
      .select('code, expires_at')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
    getTelegramBotInfo(),
  ]);

  if (connection.error || linkCode.error) {
    console.error('Gagal membaca status Telegram:', connection.error || linkCode.error);
    return NextResponse.json(
      { error: 'Tabel Telegram belum siap. Jalankan migrasi Supabase Telegram terlebih dahulu.' },
      { status: 503 }
    );
  }

  const codeIsValid = linkCode.data
    ? new Date(linkCode.data.expires_at).getTime() > Date.now()
    : false;

  return NextResponse.json({
    configured: botInfo.configured && botInfo.ok,
    botUsername: botInfo.username,
    botUrl: botInfo.botUrl,
    connected: Boolean(connection.data),
    chatId: connection.data ? String(connection.data.telegram_chat_id) : null,
    username: connection.data?.telegram_username || null,
    connectedAt: connection.data?.connected_at || null,
    code: codeIsValid ? linkCode.data?.code : null,
    expiresAt: codeIsValid ? linkCode.data?.expires_at : null,
  });
}

/**
 * POST /api/telegram/link
 * Mendukung 2 mode:
 * - mode: 'auto' (atau chatId kosong): otomatis mendeteksi Chat ID dari pesan `/start KODE` / `/link KODE`
 * - mode: 'manual' (dengan chatId): memverifikasi Chat ID numerik & mengirim pesan konfirmasi nyata
 */
export async function POST(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const botInfo = await getTelegramBotInfo();
  if (!botInfo.configured || !botInfo.ok || !botInfo.username) {
    return NextResponse.json(
      { error: botInfo.error || 'Bot Telegram belum dikonfigurasi di server.' },
      { status: 503 }
    );
  }

  const { data: existingConnection, error: connectionError } = await auth.admin
    .from('telegram_connections')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (connectionError) {
    console.error('Gagal memeriksa koneksi Telegram:', connectionError);
    return NextResponse.json(
      { error: 'Tabel Telegram belum siap. Jalankan migrasi Supabase Telegram terlebih dahulu.' },
      { status: 503 }
    );
  }
  if (existingConnection) {
    return NextResponse.json({ error: 'Akun Telegram sudah terhubung.' }, { status: 409 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    const { error } = await auth.admin.rpc('create_telegram_link_code', {
      p_user_id: auth.user.id,
      p_code: code,
      p_expires_at: expiresAt,
    });

    if (!error) {
      return NextResponse.json({
        code,
        expiresAt,
        botUsername: botInfo.username,
        botUrl: botInfo.botUrl,
      });
    }

    if (error.code !== '23505') {
      console.error('Gagal membuat kode tautan Telegram:', error);
      return NextResponse.json(
        { error: 'Gagal membuat kode Telegram. Pastikan migrasi Supabase Telegram sudah dijalankan.' },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Tidak berhasil membuat kode unik. Coba lagi sebentar.' },
    { status: 503 }
  );
}

export async function DELETE(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.admin.rpc('unlink_telegram_account', {
    p_user_id: auth.user.id,
  });

  if (error) {
    console.error('Gagal memutus koneksi Telegram:', error);
    return NextResponse.json(
      { error: 'Gagal memutus koneksi Telegram. Pastikan migrasi Supabase Telegram sudah dijalankan.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ unlinked: data !== null });
}
