import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code || '').trim();
    const chatId = String(body.chatId || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Kode tautan harus 6 digit angka.' }, { status: 400 });
    }
    if (!chatId) {
      return NextResponse.json({ error: 'Masukkan Chat ID Telegram dari bot.' }, { status: 400 });
    }
    if (!/^(-?\d+|@\w{5,})$/.test(chatId)) {
      return NextResponse.json({ error: 'Format Chat ID Telegram tidak valid.' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `CermatTani berhasil tertaut. Kode: ${code}`,
        }),
      });
      if (!telegramResponse.ok) {
        return NextResponse.json(
          { error: 'Chat ID tidak dikenali oleh bot. Mulai percakapan dengan bot lalu coba lagi.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      linked: true,
      code,
      chatId,
      status: botToken ? 'Pengingat Telegram aktif.' : 'Pengingat tersimpan dalam mode demo.',
    });
  } catch {
    return NextResponse.json({ error: 'Permintaan tautan tidak valid.' }, { status: 400 });
  }
}
