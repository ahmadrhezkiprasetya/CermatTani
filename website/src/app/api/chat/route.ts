import { NextResponse } from 'next/server';
import { generateCermoReply } from '@/utils/cermoBrain';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }
    const reply = generateCermoReply(message, {
      plant: body.plant ?? null,
      latestScan: body.latestScan ?? null,
      sensor: body.sensor,
      lowConfidenceThreshold: Number(body.lowConfidenceThreshold ?? 60),
      tankLowThreshold: Number(body.tankLowThreshold ?? 20),
    });
    return NextResponse.json({
      reply,
      disclaimer: 'Saran, bukan keputusan akhir',
      waktu: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Gagal memproses pesan ke Cermo.' }, { status: 400 });
  }
}
