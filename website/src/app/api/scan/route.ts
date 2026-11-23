import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      receivedAt: new Date().toISOString(),
      plantId: body.plantId || null,
      bagian: body.bagian || 'buah',
      note: 'Scan tervalidasi oleh Next.js API CermatTani.',
    });
  } catch {
    return NextResponse.json({ error: 'Payload scan tidak valid.' }, { status: 400 });
  }
}
