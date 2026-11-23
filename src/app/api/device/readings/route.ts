import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * PRD §9: POST /api/device/readings (F8, F10, F11, F12, F13)
 * Menerima pembacaan sensor dari perangkat ESP32 dengan otentikasi header `x-device-token`.
 */
export async function POST(request: Request) {
  try {
    const deviceToken = request.headers.get('x-device-token')?.trim();
    const body = await request.json();

    const kelembapanTanah = Number(body.kelembapan_tanah ?? body.kelembapanTanah ?? 48);
    const levelTandon = Number(body.level_tandon_persen ?? body.levelTandonPersen ?? 60);
    const baterai = Number(body.baterai_persen ?? body.bateraiPersen ?? 80);
    const simulasi = Boolean(body.simulasi ?? true);

    const admin = getSupabaseAdminClient();
    if (!admin) {
      // Fallback bila Supabase belum dihubungkan
      const powerSave = baterai <= 20;
      const tankCritical = levelTandon < 20;
      return NextResponse.json({
        persisted: false,
        mode: 'demo-tanpa-supabase',
        pumpCommand: !tankCritical && kelembapanTanah < 35,
        tankInterlock: tankCritical,
        powerSaveMode: powerSave,
        sendIntervalMinutes: powerSave ? 30 : 5,
      });
    }

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Header x-device-token wajib diisi untuk perangkat ESP32.' },
        { status: 401 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(deviceToken).digest('hex');
    const { data: device, error: devErr } = await admin
      .from('devices')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (devErr || !device) {
      return NextResponse.json({ error: 'Token perangkat tidak dikenali.' }, { status: 403 });
    }

    // Simpan ke tabel sensor_readings
    const { error: insErr } = await admin.from('sensor_readings').insert({
      device_id: device.id,
      kelembapan_tanah: kelembapanTanah,
      nitrogen_mg_kg: body.nitrogen_mg_kg ?? null,
      fosfor_mg_kg: body.fosfor_mg_kg ?? null,
      kalium_mg_kg: body.kalium_mg_kg ?? null,
      suhu_udara: body.suhu_udara ?? null,
      kelembapan_udara: body.kelembapan_udara ?? null,
      cahaya_lux: body.cahaya_lux ?? null,
      jarak_ultrasonik_cm: body.jarak_ultrasonik_cm ?? null,
      level_tandon_persen: levelTandon,
      tegangan_volt: body.tegangan_volt ?? null,
      arus_ma: body.arus_ma ?? null,
      daya_watt: body.daya_watt ?? null,
      baterai_persen: baterai,
      simulasi,
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Evaluasi interlock tandon F10.3, irigasi F10.1, dan mode hemat F13.2
    const tankCritical = levelTandon < device.ambang_tandon_rendah;
    const powerSave = baterai <= device.ambang_baterai_hemat;
    let nextPump = Boolean(device.pompa_menyala);

    if (tankCritical) {
      nextPump = false;
    } else if (device.irigasi_otomatis) {
      if (kelembapanTanah < device.ambang_tanah_bawah) nextPump = true;
      else if (kelembapanTanah >= device.ambang_tanah_atas) nextPump = false;
    }

    await admin
      .from('devices')
      .update({
        status: powerSave ? 'mode_hemat' : 'aktif',
        pompa_menyala: nextPump,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    return NextResponse.json({
      persisted: true,
      deviceId: device.id,
      pumpCommand: nextPump,
      tankInterlock: tankCritical,
      powerSaveMode: powerSave,
      sendIntervalMinutes: powerSave ? 30 : 5,
    });
  } catch {
    return NextResponse.json({ error: 'Format payload pembacaan sensor tidak valid.' }, { status: 400 });
  }
}
