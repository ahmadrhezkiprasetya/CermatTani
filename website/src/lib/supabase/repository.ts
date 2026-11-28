import { getSupabaseBrowserClient } from './client';
import type {
  AppSettings,
  ChatMessage,
  DetectionBox,
  DeviceInfo,
  DiseasePrediction,
  Farm,
  FarmTask,
  GrowthPhase,
  HarvestEvent,
  IrrigationEvent,
  NotificationItem,
  Plant,
  PlantPart,
  ReminderCategory,
  ReminderSchedule,
  RipenessStage,
  ScanOutputFocus,
  ScanRecord,
  SensorPoint24h,
  SensorSnapshot,
  ThemePreference,
  UserProfile,
} from '@/types/cermattani';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_REGEX.test(value));
}

export function formatSupabaseError(
  error: { code?: string; message?: string } | null | undefined
): string | null {
  if (!error) return null;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  if (code === '42501' || msg.toLowerCase().includes('permission denied')) {
    return 'Izin akses tabel Supabase belum aktif (42501). Jalankan file supabase/sql/08_perbaikan_izin_dan_tabel_lengkap.sql di Supabase SQL Editor lalu klik Sinkron ulang.';
  }
  if (code === 'PGRST205' || msg.toLowerCase().includes('could not find the table')) {
    return 'Sebagian tabel baru (farm_tasks / reminder_schedules / notifications) belum dibuat di Supabase. Jalankan supabase/sql/08_perbaikan_izin_dan_tabel_lengkap.sql di SQL Editor.';
  }
  if (code === '23503') {
    return 'Relasi data belum lengkap di Supabase (FK 23503). Pastikan file SQL 07 & 08 sudah dijalankan di Supabase SQL Editor.';
  }
  return msg || 'Gagal menyinkronkan data ke Supabase.';
}

export interface SupabaseAccountBundle {
  profile: UserProfile | null;
  profileSettings: {
    tema?: ThemePreference;
    ambangKeyakinanRendah?: number;
    notifikasiBrowser?: boolean;
    peringatanOtomatisSensor?: boolean;
  };
  deviceSettings: Partial<
    Pick<
      AppSettings,
      | 'irigasiOtomatis'
      | 'pompaMenyala'
      | 'ambangTanahBawah'
      | 'ambangTanahAtas'
      | 'durasiMaksPompaMenit'
      | 'ambangKelembapanRisikoPenyakit'
      | 'ambangTandonRendah'
      | 'ambangBateraiHemat'
    >
  >;
  latestSensor: Partial<SensorSnapshot> | null;
  sensor24h: SensorPoint24h[];
  farms: Farm[];
  plants: Plant[];
  scans: ScanRecord[];
  harvestEvents: HarvestEvent[];
  chatMessages: ChatMessage[];
  devices: DeviceInfo[];
  irrigationEvents: IrrigationEvent[];
  tasks: FarmTask[];
  reminderSchedules: ReminderSchedule[];
  notifications: NotificationItem[];
  syncError: string | null;
}

/**
 * Repository Next.js terpadu untuk seluruh 14 tabel Supabase CermatTani:
 * 1. Akun (`profiles`, terhubung 1:1 ke `auth.users` via trigger `handle_new_user`)
 * 2. Kebun (`farms`, `plants`, `farm_tasks`)
 * 3. Scan & AI (`scans` + Storage bucket `scan-photos`)
 * 4. Basis Pengetahuan (`knowledge_diseases`, `knowledge_nutrients`)
 * 5. IoT & Irigasi (`devices`, `sensor_readings`, `irrigation_events`)
 * 6. Jadwal, Pengingat, Notifikasi & Chat (`harvest_events`, `reminder_schedules`, `notifications`, `chat_messages`)
 */
export const cermatSupabaseRepo = {
  // --- 1. AKUN & AUTENTIKASI ---
  async getCurrentSession() {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  },

  async signIn(email: string, password: string) {
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error('Supabase belum dikonfigurasi pada file .env website.');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if ((error.message || '').toLowerCase().includes('email not confirmed')) {
        try {
          const confirmRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, confirmOnly: true }),
          });
          const confirmJson = (await confirmRes.json().catch(() => null)) as {
            ok?: boolean;
          } | null;
          if (confirmJson?.ok) {
            const retry = await sb.auth.signInWithPassword({ email, password });
            if (!retry.error) return retry.data;
          }
        } catch {
          // Lanjut lempar error asli bila fallback gagal
        }
      }
      throw error;
    }
    return data;
  },

  async signUp(email: string, password: string, nama: string) {
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error('Supabase belum dikonfigurasi pada file .env website.');

    // Gunakan endpoint server-side (Service Role) terlebih dahulu agar bebas dari
    // limit pengiriman email Supabase (HTTP 429) dan akun langsung aktif tanpa verifikasi email.
    try {
      const serverRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nama }),
      });
      const serverJson = (await serverRes.json().catch(() => null)) as {
        ok?: boolean;
        fallbackToClient?: boolean;
        error?: string;
      } | null;

      if (!serverRes.ok && serverJson?.error) {
        throw new Error(serverJson.error);
      }

      if (serverJson?.ok) {
        const { data: signInData, error: signInErr } = await sb.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) {
          throw new Error(
            'Email ini sudah terdaftar dengan kata sandi berbeda. Silakan masuk melalui tab Login.'
          );
        }
        return signInData;
      }
    } catch (err) {
      if (err instanceof Error && !err.message.toLowerCase().includes('fetch')) {
        throw err;
      }
    }

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

  async updateProfile(patch: {
    nama?: string;
    peran?: string;
    telegramChatId?: string | null;
    telegramLinkCode?: string;
    telegramReminderTime?: string;
    tema?: ThemePreference;
    ambangKeyakinanRendah?: number;
    notifikasiBrowser?: boolean;
    peringatanOtomatisSensor?: boolean;
  }): Promise<{ ok: boolean; error: string | null }> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return { ok: false, error: null };
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return { ok: false, error: null };

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.nama !== undefined) payload.nama = patch.nama;
    if (patch.peran !== undefined) payload.peran = patch.peran;
    if (patch.telegramChatId !== undefined) payload.telegram_chat_id = patch.telegramChatId;
    if (patch.telegramLinkCode !== undefined) payload.telegram_link_code = patch.telegramLinkCode;
    if (patch.telegramReminderTime !== undefined) payload.telegram_reminder_time = patch.telegramReminderTime;
    if (patch.tema !== undefined) payload.tema = patch.tema;
    if (patch.ambangKeyakinanRendah !== undefined) {
      payload.ambang_keyakinan_rendah = patch.ambangKeyakinanRendah;
    }
    if (patch.notifikasiBrowser !== undefined) {
      payload.notifikasi_browser = patch.notifikasiBrowser;
    }
    if (patch.peringatanOtomatisSensor !== undefined) {
      payload.peringatan_otomatis_sensor = patch.peringatanOtomatisSensor;
    }

    const { error } = await sb
      .from('profiles')
      .update(payload)
      .eq('id', userData.user.id);
    return { ok: !error, error: formatSupabaseError(error) };
  },

  /**
   * Pastikan akun baru langsung punya data awal di tabel berelasi:
   * `profiles`, `farms`, `plants`, `devices`, `sensor_readings`, `farm_tasks`, dan `reminder_schedules`.
   */
  async ensureStarterWorkspace(input?: {
    nama?: string;
    namaKebun?: string;
    lokasiKebun?: string;
  }): Promise<{ userId: string | null; error: string | null }> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return { userId: null, error: null };
    const { data: userData } = await sb.auth.getUser();
    const user = userData.user;
    if (!user) return { userId: null, error: null };

    let firstError: string | null = null;
    const captureErr = (err: { code?: string; message?: string } | null) => {
      if (!err) return;
      const msg = formatSupabaseError(err);
      if (msg && !firstError) firstError = msg;
    };

    // 1. Pastikan baris profiles tersedia
    const fallbackName =
      input?.nama?.trim() ||
      (typeof user.user_metadata?.nama === 'string' && user.user_metadata.nama.trim()) ||
      (user.email ? user.email.split('@')[0] : 'Petani CermatTani');

    const { data: existingProfile, error: profSelectErr } = await sb
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    captureErr(profSelectErr);

    if (!profSelectErr) {
      if (!existingProfile) {
        const { error: upsertErr } = await sb.from('profiles').upsert({
          id: user.id,
          nama: fallbackName,
          peran: 'Petani',
        });
        captureErr(upsertErr);
      } else if (input?.nama?.trim()) {
        const { error: updErr } = await sb
          .from('profiles')
          .update({ nama: input.nama.trim(), updated_at: new Date().toISOString() })
          .eq('id', user.id);
        captureErr(updErr);
      }
    }

    // 2. Pastikan minimal ada 1 kebun (`farms`)
    const { data: farms, error: farmSelErr } = await sb
      .from('farms')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    captureErr(farmSelErr);

    let firstFarmId = farms?.[0]?.id as string | undefined;
    if (!farmSelErr && !firstFarmId) {
      const { data: createdFarm, error: farmInsErr } = await sb
        .from('farms')
        .insert({
          user_id: user.id,
          nama: input?.namaKebun?.trim() || 'Kebun Utama',
          lokasi: input?.lokasiKebun?.trim() || 'Lahan Budidaya',
          luas_label: 'Kebun hortikultura',
        })
        .select('id')
        .single();
      captureErr(farmInsErr);
      firstFarmId = createdFarm?.id;
    }

    // 3. Pastikan minimal ada 1 tanaman (`plants`), 1 perangkat (`devices`), & tugas awal (`farm_tasks`)
    if (firstFarmId) {
      const [plantsRes, devicesRes, tasksRes] = await Promise.all([
        sb.from('plants').select('id').eq('farm_id', firstFarmId).limit(1),
        sb.from('devices').select('id').eq('farm_id', firstFarmId).limit(1),
        sb.from('farm_tasks').select('id').eq('farm_id', firstFarmId).limit(1),
      ]);
      captureErr(plantsRes.error);
      captureErr(devicesRes.error);
      captureErr(tasksRes.error);

      if (!plantsRes.error && (!plantsRes.data || plantsRes.data.length === 0)) {
        const d45 = new Date();
        d45.setDate(d45.getDate() - 45);
        const d35 = new Date();
        d35.setDate(d35.getDate() - 35);
        const d22 = new Date();
        d22.setDate(d22.getDate() - 22);
        const { error: pInsErr } = await sb.from('plants').insert([
          {
            farm_id: firstFarmId,
            nama: 'Cabai Rawit #01',
            komoditas: 'Cabai',
            varietas: 'Cabai Rawit',
            bobot_rata_hasil_gram: 8,
            tanggal_tanam: d45.toISOString().slice(0, 10),
            fase: 'Berbuah',
          },
          {
            farm_id: firstFarmId,
            nama: 'Tomat Servo #01',
            komoditas: 'Tomat',
            varietas: 'Tomat Servo F1',
            bobot_rata_hasil_gram: 85,
            tanggal_tanam: d35.toISOString().slice(0, 10),
            fase: 'Berbunga',
          },
          {
            farm_id: firstFarmId,
            nama: 'Selada Keriting #01',
            komoditas: 'Selada',
            varietas: 'Selada Keriting',
            bobot_rata_hasil_gram: 150,
            tanggal_tanam: d22.toISOString().slice(0, 10),
            fase: 'Vegetatif',
          },
        ]);
        captureErr(pInsErr);
      }

      if (!devicesRes.error && (!devicesRes.data || devicesRes.data.length === 0)) {
        const tokenHash = `ESP32-CT-${user.id.slice(0, 8)}-${firstFarmId.slice(0, 4)}`.toUpperCase();
        const { data: createdDevice, error: dInsErr } = await sb
          .from('devices')
          .insert({
            farm_id: firstFarmId,
            nama_perangkat: 'ESP32 Lahan Utama',
            token_hash: tokenHash,
            tipe: 'ESP32 + Sensor Tanah + DHT22/BME280 + BH1750 + Ultrasonik + INA219',
            status: 'aktif',
            simulasi: true,
          })
          .select('id')
          .single();
        captureErr(dInsErr);

        if (createdDevice?.id) {
          await sb.from('sensor_readings').insert({
            device_id: createdDevice.id,
            kelembapan_tanah: 48,
            ph_tanah: 6.4,
            nitrogen_mg_kg: 64,
            fosfor_mg_kg: 52,
            kalium_mg_kg: 71,
            suhu_udara: 26.5,
            kelembapan_udara: 74,
            cahaya_lux: 28400,
            jarak_ultrasonik_cm: 36,
            level_tandon_persen: 64,
            tegangan_volt: 12.6,
            arus_ma: 88,
            daya_watt: 1.11,
            baterai_persen: 84,
            simulasi: true,
          });
        }
      }

      if (!tasksRes.error && (!tasksRes.data || tasksRes.data.length === 0)) {
        await sb.from('farm_tasks').insert([
          {
            farm_id: firstFarmId,
            judul: 'Scan kematangan & kesehatan tanaman pagi ini',
            kategori: 'panen',
            waktu_label: 'Hari ini · Pagi',
            selesai: false,
          },
          {
            farm_id: firstFarmId,
            judul: 'Periksa bagian bawah daun dari bercak jamur',
            kategori: 'cek',
            waktu_label: 'Hari ini · Sore',
            selesai: false,
          },
          {
            farm_id: firstFarmId,
            judul: 'Cek level air tandon & panel surya',
            kategori: 'siram',
            waktu_label: 'Besok · 07:00',
            selesai: false,
          },
        ]);
      }
    }

    // 4. Pastikan jadwal pengingat awal tersedia di `reminder_schedules`
    const { data: remRows, error: remSelErr } = await sb
      .from('reminder_schedules')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    captureErr(remSelErr);

    if (!remSelErr && (!remRows || remRows.length === 0)) {
      await sb.from('reminder_schedules').insert([
        {
          user_id: user.id,
          label: 'Siram Pagi Kebun',
          kategori: 'siram',
          jam: '07:00',
          aktif: true,
          catatan: 'Siram pangkal batang sebelum matahari terik.',
        },
        {
          user_id: user.id,
          label: 'Cek Bercak Daun & Hama',
          kategori: 'cek_daun',
          jam: '08:30',
          aktif: true,
          catatan: 'Periksa sisi bawah daun dan pindai bila ada bercak.',
        },
        {
          user_id: user.id,
          label: 'Siram Sore & Cek Tandon',
          kategori: 'siram',
          jam: '16:30',
          aktif: true,
          catatan: 'Pastikan kelembapan tanah ideal 45–65% dan tandon aman.',
        },
      ]);
    }

    return { userId: user.id, error: firstError };
  },

  /**
   * Muat seluruh data akun dari 14 tabel Supabase berelasi milik akun aktif.
   */
  async fetchAccountBundle(): Promise<SupabaseAccountBundle | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data: userData } = await sb.auth.getUser();
    const user = userData.user;
    if (!user) return null;

    let syncError: string | null = null;
    const captureErr = (err: { code?: string; message?: string } | null) => {
      if (!err) return;
      const msg = formatSupabaseError(err);
      if (msg && !syncError) syncError = msg;
    };

    const [profileRes, farmsRes, chatsRes, remRes, notifRes] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('farms').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      sb.from('chat_messages').select('*').eq('user_id', user.id).order('waktu', { ascending: true }).limit(80),
      sb.from('reminder_schedules').select('*').eq('user_id', user.id).order('jam', { ascending: true }),
      sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(35),
    ]);

    captureErr(profileRes.error);
    captureErr(farmsRes.error);
    captureErr(chatsRes.error);
    captureErr(remRes.error);
    captureErr(notifRes.error);

    const farms: Farm[] = (farmsRes.data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      nama: row.nama,
      lokasi: row.lokasi,
      luasLabel: row.luas_label,
    }));

    const farmIds = farms.map((f) => f.id);
    let plants: Plant[] = [];
    let devices: DeviceInfo[] = [];
    let tasks: FarmTask[] = [];
    let deviceSettings: SupabaseAccountBundle['deviceSettings'] = {};

    if (farmIds.length > 0) {
      const [plantsRes, devicesRes, tasksRes] = await Promise.all([
        sb.from('plants').select('*').in('farm_id', farmIds).order('created_at', { ascending: false }),
        sb.from('devices').select('*').in('farm_id', farmIds).order('created_at', { ascending: true }),
        sb.from('farm_tasks').select('*').in('farm_id', farmIds).order('created_at', { ascending: false }).limit(50),
      ]);

      captureErr(plantsRes.error);
      captureErr(devicesRes.error);
      captureErr(tasksRes.error);

      plants = (plantsRes.data || []).map((row) => ({
        id: row.id,
        farmId: row.farm_id,
        nama: row.nama,
        varietas: row.varietas || 'Servo F1',
        bobotRataBuahGram: row.bobot_rata_hasil_gram ?? 85,
        tanggalTanam: row.tanggal_tanam,
        fase: (row.fase || 'Vegetatif') as GrowthPhase,
      }));

      const rawDevices = devicesRes.data || [];
      devices = rawDevices.map((row) => ({
        id: row.id,
        farmId: row.farm_id,
        token: row.token_hash || 'ESP32-CERMAT',
        tipe: row.tipe || 'ESP32 Surya',
        status: (row.status || 'aktif') as DeviceInfo['status'],
        simulasi: Boolean(row.simulasi),
      }));

      if (rawDevices[0]) {
        const d0 = rawDevices[0];
        deviceSettings = {
          irigasiOtomatis: typeof d0.irigasi_otomatis === 'boolean' ? d0.irigasi_otomatis : undefined,
          pompaMenyala: typeof d0.pompa_menyala === 'boolean' ? d0.pompa_menyala : undefined,
          ambangTanahBawah: typeof d0.ambang_tanah_bawah === 'number' ? d0.ambang_tanah_bawah : undefined,
          ambangTanahAtas: typeof d0.ambang_tanah_atas === 'number' ? d0.ambang_tanah_atas : undefined,
          durasiMaksPompaMenit:
            typeof d0.durasi_maks_pompa_menit === 'number' ? d0.durasi_maks_pompa_menit : undefined,
          ambangKelembapanRisikoPenyakit:
            typeof d0.ambang_kelembapan_penyakit === 'number' ? d0.ambang_kelembapan_penyakit : undefined,
          ambangTandonRendah: typeof d0.ambang_tandon_rendah === 'number' ? d0.ambang_tandon_rendah : undefined,
          ambangBateraiHemat: typeof d0.ambang_baterai_hemat === 'number' ? d0.ambang_baterai_hemat : undefined,
        };
      }

      tasks = (tasksRes.data || []).map((row) => ({
        id: row.id,
        farmId: row.farm_id,
        plantId: row.plant_id || undefined,
        judul: row.judul,
        kategori: (['siram', 'cek', 'panen', 'pupuk'].includes(row.kategori)
          ? row.kategori
          : 'cek') as FarmTask['kategori'],
        waktuLabel: row.waktu_label || 'Hari ini',
        selesai: Boolean(row.selesai),
      }));
    }

    const plantIds = plants.map((p) => p.id);
    const deviceIds = devices.map((d) => d.id);
    let scans: ScanRecord[] = [];
    let harvestEvents: HarvestEvent[] = [];
    let irrigationEvents: IrrigationEvent[] = [];
    let latestSensor: Partial<SensorSnapshot> | null = null;
    let sensor24h: SensorPoint24h[] = [];

    if (plantIds.length > 0) {
      const [scansRes, harvestsRes] = await Promise.all([
        sb.from('scans').select('*').in('plant_id', plantIds).order('waktu', { ascending: false }).limit(60),
        sb.from('harvest_events').select('*').in('plant_id', plantIds).order('tanggal', { ascending: true }).limit(60),
      ]);

      captureErr(scansRes.error);
      captureErr(harvestsRes.error);

      const rawScans = scansRes.data || [];
      scans = await Promise.all(
        rawScans.map(async (row) => {
          let fotoUrl = '';
          if (typeof row.foto_path === 'string' && row.foto_path.trim()) {
            const signed = await sb.storage.from('scan-photos').createSignedUrl(row.foto_path, 3600);
            if (signed.data?.signedUrl) fotoUrl = signed.data.signedUrl;
          }
          const meta = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<
            string,
            unknown
          >;
          return {
            id: row.id,
            plantId: row.plant_id,
            waktu: row.waktu,
            bagian: (row.bagian === 'daun' || row.bagian === 'batang' ? row.bagian : 'buah') as PlantPart,
            fotoUrl,
            fotoUkuranAsliKb: row.foto_ukuran_asli_kb ?? undefined,
            fotoUkuranKompresKb: row.foto_ukuran_kompres_kb ?? undefined,
            boxes: Array.isArray(row.boxes) ? (row.boxes as DetectionBox[]) : [],
            tahapDominan: (row.tahap_dominan || null) as RipenessStage | null,
            jumlahBuah: Number(row.jumlah_objek ?? 0),
            anjuranPanen: (row.anjuran_panen || 'Tunggu') as ScanRecord['anjuranPanen'],
            estimasiHariMin: row.estimasi_hari_min ?? null,
            estimasiHariMax: row.estimasi_hari_max ?? null,
            estimasiDisesuaikanRiwayat: Boolean(row.estimasi_disesuaikan_riwayat),
            estimasiBobotGram: Number(row.estimasi_bobot_gram ?? 0),
            fokusOutput:
              (meta.fokusOutput as ScanOutputFocus | undefined) ||
              (row.tahap_dominan ? 'kematangan' : 'penyakit'),
            penyakitRinganId: (meta.penyakitRinganId as string | null | undefined) ?? null,
            adaGejalaHara: Boolean(meta.adaGejalaHara),
            penyakitTop3: Array.isArray(row.penyakit_top3) ? (row.penyakit_top3 as DiseasePrediction[]) : [],
            penyakitUtamaId: row.penyakit_utama_id || 'sehat',
            penyakitUtamaNama: row.penyakit_utama_nama || 'Sehat',
            keyakinan: Number(row.keyakinan ?? 70),
            keyakinanRendah: Boolean(row.keyakinan_rendah),
            dugaanHaraId: row.dugaan_hara_id || 'cukup',
            dugaanHaraNama: row.dugaan_hara_nama || 'Hara terlihat seimbang',
            pakaiDataSensor: Boolean(row.pakai_data_sensor),
            tanpaBuahTerdeteksi: Boolean(row.objek_tidak_terdeteksi),
            aiModel: typeof meta.aiModel === 'string' ? meta.aiModel : undefined,
            ringkasanAi: typeof meta.ringkasanAi === 'string' ? meta.ringkasanAi : undefined,
            temuanVisual: Array.isArray(meta.temuanVisual) ? (meta.temuanVisual as string[]) : undefined,
          };
        })
      );

      harvestEvents = (harvestsRes.data || []).map((row) => ({
        id: row.id,
        plantId: row.plant_id,
        tanggal: row.tanggal,
        sumber: (row.sumber === 'aktual' ? 'aktual' : 'estimasi') as 'estimasi' | 'aktual',
        catatan: row.catatan || '',
        estimasiKg: row.estimasi_kg != null ? Number(row.estimasi_kg) : undefined,
      }));
    }

    if (deviceIds.length > 0) {
      const [irrRes, readingsRes] = await Promise.all([
        sb
          .from('irrigation_events')
          .select('*')
          .in('device_id', deviceIds)
          .order('mulai', { ascending: false })
          .limit(15),
        sb
          .from('sensor_readings')
          .select('*')
          .eq('device_id', deviceIds[0])
          .order('waktu', { ascending: false })
          .limit(24),
      ]);

      captureErr(irrRes.error);
      captureErr(readingsRes.error);

      irrigationEvents = (irrRes.data || []).map((row) => ({
        id: row.id,
        deviceId: row.device_id,
        mulai: row.mulai,
        selesai: row.selesai || row.mulai,
        durasiMenit: Number(row.durasi_menit ?? 5),
        kelembapanAwal: Number(row.kelembapan_awal ?? 40),
        kelembapanAkhir: Number(row.kelembapan_akhir ?? 65),
        mode: (row.mode === 'Manual' ? 'Manual' : 'Otomatis') as 'Otomatis' | 'Manual',
      }));

      const rawReadings = readingsRes.data || [];
      if (rawReadings[0]) {
        const r0 = rawReadings[0];
        latestSensor = {
          deviceId: r0.device_id,
          waktu: r0.waktu,
          kelembapanTanah: r0.kelembapan_tanah != null ? Math.round(Number(r0.kelembapan_tanah)) : undefined,
          nitrogenMgKg: r0.nitrogen_mg_kg != null ? Math.round(Number(r0.nitrogen_mg_kg)) : undefined,
          fosforMgKg: r0.fosfor_mg_kg != null ? Math.round(Number(r0.fosfor_mg_kg)) : undefined,
          kaliumMgKg: r0.kalium_mg_kg != null ? Math.round(Number(r0.kalium_mg_kg)) : undefined,
          suhuUdara: r0.suhu_udara != null ? Number(r0.suhu_udara) : undefined,
          kelembapanUdara: r0.kelembapan_udara != null ? Math.round(Number(r0.kelembapan_udara)) : undefined,
          cahayaLux: r0.cahaya_lux != null ? Math.round(Number(r0.cahaya_lux)) : undefined,
          jarakUltrasonikCm:
            r0.jarak_ultrasonik_cm != null ? Math.round(Number(r0.jarak_ultrasonik_cm)) : undefined,
          levelTandonPersen:
            r0.level_tandon_persen != null ? Math.round(Number(r0.level_tandon_persen)) : undefined,
          teganganVolt: r0.tegangan_volt != null ? Number(r0.tegangan_volt) : undefined,
          arusMa: r0.arus_ma != null ? Math.round(Number(r0.arus_ma)) : undefined,
          dayaWatt: r0.daya_watt != null ? Number(r0.daya_watt) : undefined,
          bateraiPersen: r0.baterai_persen != null ? Math.round(Number(r0.baterai_persen)) : undefined,
          simulasi: Boolean(r0.simulasi),
        };
      }
      if (rawReadings.length >= 2) {
        sensor24h = [...rawReadings].reverse().map((r) => {
          const d = new Date(r.waktu);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          return {
            jam: `${hh}:${mm}`,
            kelembapanTanah: Math.round(Number(r.kelembapan_tanah ?? 48)),
            suhuUdara: Number(r.suhu_udara ?? 26.5),
            kelembapanUdara: Math.round(Number(r.kelembapan_udara ?? 74)),
            cahayaLux: Math.round(Number(r.cahaya_lux ?? 25000)),
          };
        });
      }
    }

    const pRow = profileRes.data;
    const profile: UserProfile = {
      id: user.id,
      nama:
        pRow?.nama ||
        (user.user_metadata?.nama as string) ||
        (user.email ? user.email.split('@')[0] : 'Petani'),
      email: user.email || undefined,
      peran: pRow?.peran || 'Petani',
      telegramChatId: pRow?.telegram_chat_id ?? null,
      telegramLinkCode: pRow?.telegram_link_code || '',
      telegramReminderTime: pRow?.telegram_reminder_time || '07:00',
      bahasa: 'id',
    };

    const chatMessages: ChatMessage[] = (chatsRes.data || []).map((row) => ({
      id: row.id,
      plantId: row.plant_id ?? null,
      peran: (row.peran === 'pengguna' ? 'pengguna' : 'cermo') as 'cermo' | 'pengguna',
      isi: row.isi,
      waktu: row.waktu,
    }));

    const reminderSchedules: ReminderSchedule[] = (remRes.data || []).map((row) => ({
      id: row.id,
      label: row.label,
      kategori: (['siram', 'cek_daun', 'pupuk', 'panen'].includes(row.kategori)
        ? row.kategori
        : 'siram') as ReminderCategory,
      jam: row.jam || '07:00',
      aktif: Boolean(row.aktif),
      catatan: row.catatan || '',
    }));

    const notifications: NotificationItem[] = (notifRes.data || []).map((row) => ({
      id: row.id,
      judul: row.judul,
      isi: row.isi,
      waktu: row.waktu_label || 'Baru saja',
      tipe: (['panen', 'penyakit', 'tandon', 'energi', 'telegram', 'siram', 'pupuk'].includes(row.tipe)
        ? row.tipe
        : 'telegram') as NotificationItem['tipe'],
      dibaca: Boolean(row.dibaca),
      severity: (['info', 'warn', 'bad', 'ok'].includes(row.severity)
        ? row.severity
        : 'info') as NotificationItem['severity'],
      actionLabel: row.action_label || undefined,
      actionScreen: (row.action_screen as NotificationItem['actionScreen']) || undefined,
    }));

    return {
      profile,
      profileSettings: {
        tema: (pRow?.tema as ThemePreference | undefined) || undefined,
        ambangKeyakinanRendah:
          typeof pRow?.ambang_keyakinan_rendah === 'number' ? pRow.ambang_keyakinan_rendah : undefined,
        notifikasiBrowser:
          typeof pRow?.notifikasi_browser === 'boolean' ? pRow.notifikasi_browser : undefined,
        peringatanOtomatisSensor:
          typeof pRow?.peringatan_otomatis_sensor === 'boolean'
            ? pRow.peringatan_otomatis_sensor
            : undefined,
      },
      deviceSettings,
      latestSensor,
      sensor24h,
      farms,
      plants,
      scans,
      harvestEvents,
      chatMessages,
      devices,
      irrigationEvents,
      tasks,
      reminderSchedules,
      notifications,
      syncError,
    };
  },

  // --- 2. KEBUN & TUGAS ---
  async createFarm(input: { nama: string; lokasi: string; luasLabel: string }): Promise<Farm | null> {
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
    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      nama: data.nama,
      lokasi: data.lokasi,
      luasLabel: data.luas_label,
    };
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
    if (!sb || !isUuid(input.farmId)) return null;
    const { data, error } = await sb
      .from('plants')
      .insert({
        farm_id: input.farmId,
        nama: input.nama,
        komoditas: input.komoditas || 'Umum',
        varietas: input.varietas,
        tanggal_tanam: input.tanggalTanam,
        fase: input.fase,
        bobot_rata_hasil_gram: input.bobotRataBuahGram ?? 85,
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

  async createFarmTask(
    farmId: string,
    input: { judul: string; kategori: FarmTask['kategori']; waktuLabel: string; plantId?: string }
  ): Promise<FarmTask | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(farmId)) return null;
    const { data, error } = await sb
      .from('farm_tasks')
      .insert({
        farm_id: farmId,
        plant_id: isUuid(input.plantId) ? input.plantId : null,
        judul: input.judul,
        kategori: input.kategori,
        waktu_label: input.waktuLabel,
        selesai: false,
      })
      .select()
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      farmId: data.farm_id,
      plantId: data.plant_id || undefined,
      judul: data.judul,
      kategori: data.kategori as FarmTask['kategori'],
      waktuLabel: data.waktu_label,
      selesai: Boolean(data.selesai),
    };
  },

  async toggleFarmTask(id: string, selesai: boolean): Promise<boolean> {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(id)) return false;
    const { error } = await sb.from('farm_tasks').update({ selesai }).eq('id', id);
    return !error;
  },

  // --- 3. SCAN & AI + STORAGE ---
  async uploadScanPhotoDataUrl(plantId: string, dataUrl: string): Promise<string | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb || !dataUrl.startsWith('data:')) return null;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return null;

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
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
    if (!sb || !isUuid(scan.plantId)) return null;
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
        penyakit_utama_id: scan.penyakitUtamaId || 'sehat',
        penyakit_utama_nama: scan.penyakitUtamaNama,
        keyakinan: scan.keyakinan,
        keyakinan_rendah: scan.keyakinanRendah,
        dugaan_hara_id: scan.dugaanHaraId || 'cukup',
        dugaan_hara_nama: scan.dugaanHaraNama,
        pakai_data_sensor: scan.pakaiDataSensor,
        objek_tidak_terdeteksi: Boolean(scan.tanpaBuahTerdeteksi),
        metadata: {
          fokusOutput: scan.fokusOutput || 'kematangan',
          penyakitRinganId: scan.penyakitRinganId ?? null,
          adaGejalaHara: Boolean(scan.adaGejalaHara),
          aiModel: scan.aiModel ?? null,
          ringkasanAi: scan.ringkasanAi ?? '',
          temuanVisual: scan.temuanVisual ?? [],
        },
      })
      .select()
      .single();
    if (error) return null;
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

  // --- 5. IOT & IRIGASI (devices, sensor_readings, irrigation_events) ---
  async updateDeviceSettings(
    deviceId: string,
    patch: Partial<
      Pick<
        AppSettings,
        | 'irigasiOtomatis'
        | 'pompaMenyala'
        | 'ambangTanahBawah'
        | 'ambangTanahAtas'
        | 'durasiMaksPompaMenit'
        | 'ambangKelembapanRisikoPenyakit'
        | 'ambangTandonRendah'
        | 'ambangBateraiHemat'
      >
    > & { status?: DeviceInfo['status'] }
  ): Promise<boolean> {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(deviceId)) return false;
    const payload: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
    if (patch.irigasiOtomatis !== undefined) payload.irigasi_otomatis = patch.irigasiOtomatis;
    if (patch.pompaMenyala !== undefined) payload.pompa_menyala = patch.pompaMenyala;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.ambangTanahBawah !== undefined) payload.ambang_tanah_bawah = patch.ambangTanahBawah;
    if (patch.ambangTanahAtas !== undefined) payload.ambang_tanah_atas = patch.ambangTanahAtas;
    if (patch.durasiMaksPompaMenit !== undefined) payload.durasi_maks_pompa_menit = patch.durasiMaksPompaMenit;
    if (patch.ambangKelembapanRisikoPenyakit !== undefined) {
      payload.ambang_kelembapan_penyakit = patch.ambangKelembapanRisikoPenyakit;
    }
    if (patch.ambangTandonRendah !== undefined) payload.ambang_tandon_rendah = patch.ambangTandonRendah;
    if (patch.ambangBateraiHemat !== undefined) payload.ambang_baterai_hemat = patch.ambangBateraiHemat;

    const { error } = await sb.from('devices').update(payload).eq('id', deviceId);
    return !error;
  },

  async insertSensorReading(deviceId: string, sensor: SensorSnapshot): Promise<boolean> {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(deviceId)) return false;
    const { error } = await sb.from('sensor_readings').insert({
      device_id: deviceId,
      waktu: sensor.waktu || new Date().toISOString(),
      kelembapan_tanah: sensor.kelembapanTanah,
      nitrogen_mg_kg: sensor.nitrogenMgKg,
      fosfor_mg_kg: sensor.fosforMgKg,
      kalium_mg_kg: sensor.kaliumMgKg,
      suhu_udara: sensor.suhuUdara,
      kelembapan_udara: sensor.kelembapanUdara,
      cahaya_lux: sensor.cahayaLux,
      jarak_ultrasonik_cm: sensor.jarakUltrasonikCm,
      level_tandon_persen: sensor.levelTandonPersen,
      tegangan_volt: sensor.teganganVolt,
      arus_ma: sensor.arusMa,
      daya_watt: sensor.dayaWatt,
      baterai_persen: sensor.bateraiPersen,
      simulasi: sensor.simulasi,
    });
    return !error;
  },

  async insertIrrigationEvent(
    deviceId: string,
    ev: Omit<IrrigationEvent, 'id' | 'deviceId'> & { simulasi?: boolean }
  ) {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(deviceId)) return null;
    const { data, error } = await sb
      .from('irrigation_events')
      .insert({
        device_id: deviceId,
        mulai: ev.mulai,
        selesai: ev.selesai,
        durasi_menit: ev.durasiMenit,
        kelembapan_awal: ev.kelembapanAwal,
        kelembapan_akhir: ev.kelembapanAkhir,
        mode: ev.mode,
        simulasi: ev.simulasi ?? true,
      })
      .select()
      .single();
    if (error) return null;
    return data;
  },

  // --- 6. JADWAL PANEN, PENGINGAT, NOTIFIKASI & CHAT ---
  async insertHarvestEvent(ev: Omit<HarvestEvent, 'id'>) {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(ev.plantId)) return null;
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
    if (error) return null;
    return data;
  },

  async markHarvestActual(id: string) {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(id)) return null;
    const { data, error } = await sb
      .from('harvest_events')
      .update({ sumber: 'aktual' })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data;
  },

  async createReminderSchedule(input: {
    label: string;
    kategori: ReminderCategory;
    jam: string;
    aktif?: boolean;
    catatan: string;
  }): Promise<ReminderSchedule | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await sb
      .from('reminder_schedules')
      .insert({
        user_id: userData.user.id,
        label: input.label,
        kategori: input.kategori,
        jam: input.jam,
        aktif: input.aktif ?? true,
        catatan: input.catatan,
      })
      .select()
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      label: data.label,
      kategori: data.kategori as ReminderCategory,
      jam: data.jam,
      aktif: Boolean(data.aktif),
      catatan: data.catatan || '',
    };
  },

  async updateReminderSchedule(id: string, patch: Partial<ReminderSchedule>): Promise<boolean> {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(id)) return false;
    const payload: Record<string, unknown> = {};
    if (patch.label !== undefined) payload.label = patch.label;
    if (patch.kategori !== undefined) payload.kategori = patch.kategori;
    if (patch.jam !== undefined) payload.jam = patch.jam;
    if (patch.aktif !== undefined) payload.aktif = patch.aktif;
    if (patch.catatan !== undefined) payload.catatan = patch.catatan;
    const { error } = await sb.from('reminder_schedules').update(payload).eq('id', id);
    return !error;
  },

  async deleteReminderSchedule(id: string): Promise<boolean> {
    const sb = getSupabaseBrowserClient();
    if (!sb || !isUuid(id)) return false;
    const { error } = await sb.from('reminder_schedules').delete().eq('id', id);
    return !error;
  },

  async insertNotification(notif: Omit<NotificationItem, 'id'>): Promise<string | null> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return null;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await sb
      .from('notifications')
      .insert({
        user_id: userData.user.id,
        judul: notif.judul,
        isi: notif.isi,
        waktu_label: notif.waktu,
        tipe: notif.tipe,
        severity: notif.severity || 'info',
        dibaca: Boolean(notif.dibaca),
        action_label: notif.actionLabel ?? null,
        action_screen: notif.actionScreen ?? null,
      })
      .select('id')
      .single();
    if (error || !data) return null;
    return data.id;
  },

  async markAllNotificationsRead(): Promise<boolean> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return false;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return false;
    const { error } = await sb
      .from('notifications')
      .update({ dibaca: true })
      .eq('user_id', userData.user.id)
      .eq('dibaca', false);
    return !error;
  },

  async clearUserNotifications(): Promise<boolean> {
    const sb = getSupabaseBrowserClient();
    if (!sb) return false;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return false;
    const { error } = await sb.from('notifications').delete().eq('user_id', userData.user.id);
    return !error;
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
        plant_id: isUuid(plantId) ? plantId : null,
        peran,
        isi,
      })
      .select()
      .single();
    if (error) return null;
    return data;
  },

  async clearUserChats() {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return;
    await sb.from('chat_messages').delete().eq('user_id', userData.user.id);
  },
};
