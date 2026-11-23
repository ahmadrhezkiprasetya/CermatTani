import { getSupabaseBrowserClient } from './client';
import type { Farm, GrowthPhase, HarvestEvent, Plant, ScanRecord } from '@/types/cermattani';

/**
 * Repository Next.js untuk 5 kelompok database Supabase CermatTani:
 * 1. Akun (profiles)
 * 2. Kebun (farms, plants)
 * 3. Scan & AI (scans + Storage bucket 'scan-photos')
 * 4. Basis Pengetahuan (knowledge_diseases, knowledge_nutrients)
 * 5. IoT & Irigasi (devices, sensor_readings, irrigation_events)
 * 6. Jadwal & Chat (harvest_events, chat_messages)
 */
export const cermatSupabaseRepo = {
  // --- 1. AKUN ---
  async getCurrentSession() {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  },

  async signIn(email: string, password: string) {
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error('Supabase belum dikonfigurasi di website/.env.local');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, nama: string) {
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error('Supabase belum dikonfigurasi di website/.env.local');
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { nama } },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    await sb.auth.signOut();
  },

  // --- 2. KEBUN ---
  async fetchFarms(): Promise<Farm[]> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return [];
    const { data, error } = await sb.from('farms').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      nama: row.nama,
      lokasi: row.lokasi,
      luasLabel: row.luas_label,
    }));
  },

  async createFarm(input: { nama: string; lokasi: string; luasLabel: string }) {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await sb
      .from('farms')
      .insert({
        user_id: userData.user.id,
        nama: input.nama,
        lokasi: input.lokasi,
        luas_label: input.luasLabel,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createPlant(input: {
    farmId: string;
    nama: string;
    komoditas?: string;
    varietas: string;
    tanggalTanam: string;
    fase: GrowthPhase;
    bobotRataBuahGram?: number;
  }): Promise<Plant | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from('plants')
      .insert({
        farm_id: input.farmId,
        nama: input.nama,
        komoditas: input.komoditas || 'Umum',
        varietas: input.varietas,
        tanggal_tanam: input.tanggalTanam,
        fase: input.fase,
        bobot_rata_hasil_gram: input.bobotRataBuahGram ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      farmId: data.farm_id,
      nama: data.nama,
      varietas: data.varietas,
      bobotRataBuahGram: data.bobot_rata_hasil_gram ?? 85,
      tanggalTanam: data.tanggal_tanam,
      fase: data.fase as GrowthPhase,
    };
  },

  // --- 3. SCAN & AI + STORAGE ---
  async uploadScanPhotoDataUrl(plantId: string, dataUrl: string): Promise<string | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return null;

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('svg') ? 'svg' : 'jpg';
    const path = `${userData.user.id}/${plantId}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('scan-photos').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });
    if (error) return null;
    return path;
  },

  async insertScan(scan: ScanRecord, fotoPath: string | null) {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from('scans')
      .insert({
        plant_id: scan.plantId,
        waktu: scan.waktu,
        bagian: scan.bagian,
        foto_path: fotoPath,
        foto_ukuran_asli_kb: scan.fotoUkuranAsliKb ?? null,
        foto_ukuran_kompres_kb: scan.fotoUkuranKompresKb ?? null,
        boxes: scan.boxes,
        tahap_dominan: scan.tahapDominan,
        jumlah_objek: scan.jumlahBuah,
        anjuran_panen: scan.anjuranPanen,
        estimasi_hari_min: scan.estimasiHariMin,
        estimasi_hari_max: scan.estimasiHariMax,
        estimasi_disesuaikan_riwayat: scan.estimasiDisesuaikanRiwayat,
        estimasi_bobot_gram: scan.estimasiBobotGram,
        penyakit_top3: scan.penyakitTop3,
        penyakit_utama_id: scan.penyakitUtamaId,
        penyakit_utama_nama: scan.penyakitUtamaNama,
        keyakinan: scan.keyakinan,
        keyakinan_rendah: scan.keyakinanRendah,
        dugaan_hara_id: scan.dugaanHaraId,
        dugaan_hara_nama: scan.dugaanHaraNama,
        pakai_data_sensor: scan.pakaiDataSensor,
        objek_tidak_terdeteksi: Boolean(scan.tanpaBuahTerdeteksi),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- 4. BASIS PENGETAHUAN ---
  async fetchKnowledgeBase() {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const [diseases, nutrients] = await Promise.all([
      sb.from('knowledge_diseases').select('*'),
      sb.from('knowledge_nutrients').select('*'),
    ]);
    return {
      diseases: diseases.data || [],
      nutrients: nutrients.data || [],
    };
  },

  // --- 5. IOT & IRIGASI ---
  async fetchSensor24h(deviceId: string) {
    const sb = getSupabaseBrowserClient();
    if (!sb) return [];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await sb
      .from('sensor_readings')
      .select('*')
      .eq('device_id', deviceId)
      .gte('waktu', since)
      .order('waktu', { ascending: true });
    return data || [];
  },

  // --- 6. JADWAL & CHAT ---
  async insertHarvestEvent(ev: Omit<HarvestEvent, 'id'>) {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from('harvest_events')
      .insert({
        plant_id: ev.plantId,
        tanggal: ev.tanggal,
        sumber: ev.sumber,
        catatan: ev.catatan,
        estimasi_kg: ev.estimasiKg ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async insertChatMessage(plantId: string | null, peran: 'cermo' | 'pengguna', isi: string) {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await sb
      .from('chat_messages')
      .insert({
        user_id: userData.user.id,
        plant_id: plantId,
        peran,
        isi,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
