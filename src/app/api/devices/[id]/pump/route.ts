import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

/* PRD §9: POST /api/devices/:id/pump (F10.2 & F10.3 interlock tandon kritis) */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const turnOn = Boolean(body.turnOn);
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json({
      ok: true,
      deviceId: id,
      pompaMenyala: turnOn,
      persisted: false,
    });
  }

  const { data: latest } = await admin
    .from('sensor_readings')
    .select('level_tandon_persen, kelembapan_tanah')
    .eq('device_id', id)
    .order('waktu', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: device } = await admin
    .from('devices')
    .select('ambang_tandon_rendah, durasi_maks_pompa_menit, simulasi')
    .eq('id', id)
    .maybeSingle();

  const tankMin = device?.ambang_tandon_rendah ?? 20;
  const currentTank = Number(latest?.level_tandon_persen ?? 100);
  if (turnOn && currentTank < tankMin) {
    return NextResponse.json(
      {
        ok: false,
        interlock: true,
        error: `Tandon tinggal ${currentTank}%. Pompa kutahan dulu supaya tidak kering.`,
      },
      { status: 409 }
    );
  }

  await admin.from('devices').update({ pompa_menyala: turnOn }).eq('id', id);

  if (turnOn) {
    await admin.from('irrigation_events').insert({
      device_id: id,
      durasi_menit: Math.min(5, device?.durasi_maks_pompa_menit ?? 15),
      kelembapan_awal: Math.round(Number(latest?.kelembapan_tanah ?? 40)),
      mode: 'Manual',
      simulasi: device?.simulasi ?? true,
    });
  }

  return NextResponse.json({ ok: true, persisted: true, pompaMenyala: turnOn });
}
