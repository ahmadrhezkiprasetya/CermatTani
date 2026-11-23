import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

/* PRD §9: GET/PUT /api/devices/:id/thresholds (F10.1, F11.3, F12.2, F13.2) */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({
      id,
      ambang_tanah_bawah: 35,
      ambang_tanah_atas: 65,
      durasi_maks_pompa_menit: 15,
      ambang_kelembapan_penyakit: 85,
      ambang_tandon_rendah: 20,
      ambang_baterai_hemat: 20,
      simulasi: true,
    });
  }

  const { data, error } = await admin.from('devices').select('*').eq('id', id).maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: 'Perangkat tidak ditemukan.' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, id, updated: body, persisted: false });
  }

  const { data, error } = await admin
    .from('devices')
    .update({
      irigasi_otomatis: body.irigasi_otomatis,
      ambang_tanah_bawah: body.ambang_tanah_bawah,
      ambang_tanah_atas: body.ambang_tanah_atas,
      durasi_maks_pompa_menit: body.durasi_maks_pompa_menit,
      ambang_kelembapan_penyakit: body.ambang_kelembapan_penyakit,
      ambang_tandon_rendah: body.ambang_tandon_rendah,
      ambang_baterai_hemat: body.ambang_baterai_hemat,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, persisted: true, device: data });
}
