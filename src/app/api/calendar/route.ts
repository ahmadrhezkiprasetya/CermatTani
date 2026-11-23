import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

/* PRD §9: GET/POST /api/calendar (F7.1) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get('plantId');
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ events: [], persisted: false });
  }

  let query = admin.from('harvest_events').select('*').order('tanggal', { ascending: true });
  if (plantId) query = query.eq('plant_id', plantId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data || [], persisted: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: true, persisted: false, event: body });
    }
    const { data, error } = await admin
      .from('harvest_events')
      .insert({
        plant_id: body.plantId,
        tanggal: body.tanggal,
        sumber: body.sumber || 'estimasi',
        catatan: body.catatan || '',
        estimasi_kg: body.estimasiKg ?? null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, persisted: true, event: data });
  } catch {
    return NextResponse.json({ error: 'Payload jadwal panen tidak valid.' }, { status: 400 });
  }
}
