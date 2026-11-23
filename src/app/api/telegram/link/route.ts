import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Kode tautan harus 6 digit angka.' }, { status: 400 });
    }
    return NextResponse.json({
      linked: true,
      code,
      chatId: body.chatId || '@petani_cermattani',
      status: 'Pengingat Telegram aktif sesuai jadwal.',
    });
  } catch {
    return NextResponse.json({ error: 'Permintaan tautan tidak valid.' }, { status: 400 });
  }
}
