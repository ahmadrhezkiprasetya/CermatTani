import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../cermat_state.dart';
import '../plant_varieties.dart';
import '../supabase_config.dart';

class SupabaseAccountData {
  const SupabaseAccountData({
    required this.userId,
    required this.email,
    required this.userName,
    required this.farms,
    required this.plants,
    required this.scans,
    required this.harvestEvents,
    required this.chatMessages,
    required this.irrigationEvents,
    required this.tasks,
    required this.reminders,
    required this.notifications,
    this.activeDeviceId,
    this.telegramChatId,
    this.telegramCode,
    this.telegramTime,
    this.themeMode,
    this.peringatanOtomatisSensor,
    this.ambangKeyakinanRendah,
    this.irigasiAuto,
    this.pompaMenyala,
    this.ambangTanahBawah,
    this.ambangTanahAtas,
    this.durasiMaksPompa,
    this.ambangKelembapanPenyakit,
    this.ambangTandonRendah,
    this.ambangBateraiHemat,
    this.kelembapanTanah,
    this.nitrogenMgKg,
    this.fosforMgKg,
    this.kaliumMgKg,
    this.suhuUdara,
    this.kelembapanUdara,
    this.cahayaLux,
    this.levelTandon,
    this.teganganVolt,
    this.arusMa,
    this.bateraiPersen,
    this.sensor24h = const [],
    this.syncError,
  });

  final String userId;
  final String email;
  final String userName;
  final List<FarmModel> farms;
  final List<PlantModel> plants;
  final List<ScanModel> scans;
  final List<HarvestEventModel> harvestEvents;
  final List<ChatMsgModel> chatMessages;
  final List<IrrigationEventModel> irrigationEvents;
  final List<FarmTaskModel> tasks;
  final List<ReminderScheduleModel> reminders;
  final List<NotifModel> notifications;
  final String? activeDeviceId;
  final String? telegramChatId;
  final String? telegramCode;
  final String? telegramTime;
  final ThemeMode? themeMode;
  final bool? peringatanOtomatisSensor;
  final int? ambangKeyakinanRendah;
  final bool? irigasiAuto;
  final bool? pompaMenyala;
  final int? ambangTanahBawah;
  final int? ambangTanahAtas;
  final int? durasiMaksPompa;
  final int? ambangKelembapanPenyakit;
  final int? ambangTandonRendah;
  final int? ambangBateraiHemat;
  final int? kelembapanTanah;
  final int? nitrogenMgKg;
  final int? fosforMgKg;
  final int? kaliumMgKg;
  final double? suhuUdara;
  final int? kelembapanUdara;
  final int? cahayaLux;
  final int? levelTandon;
  final double? teganganVolt;
  final int? arusMa;
  final int? bateraiPersen;
  final List<Sensor24hPoint> sensor24h;
  final String? syncError;
}

/// Sinkronisasi penuh Flutter Mobile ke seluruh 14 tabel Supabase berelasi:
/// `auth.users` -> `profiles` -> `farms` -> `plants`, `farm_tasks`, `devices`
/// -> `scans` (+ Storage `scan-photos`), `harvest_events`, `sensor_readings`,
/// `irrigation_events`, `reminder_schedules`, `notifications`, dan `chat_messages`.
abstract final class SupabaseSyncService {
  static final RegExp _uuidRe = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    caseSensitive: false,
  );

  static bool isUuid(String? id) => id != null && _uuidRe.hasMatch(id);

  static String formatError(Object err) {
    final s = err.toString();
    final lower = s.toLowerCase();
    if (lower.contains('42501') || lower.contains('permission denied')) {
      return 'Izin akses tabel Supabase belum aktif (42501). Jalankan file supabase/sql/08_perbaikan_izin_dan_tabel_lengkap.sql di Supabase SQL Editor.';
    }
    if (lower.contains('pgrst205') || lower.contains('could not find the table')) {
      return 'Sebagian tabel baru belum dibuat di Supabase. Jalankan supabase/sql/08_perbaikan_izin_dan_tabel_lengkap.sql di SQL Editor.';
    }
    return s.replaceFirst('Exception: ', '');
  }

  static SupabaseClient? get _client {
    if (!SupabaseConfig.isConfigured) return null;
    try {
      return Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  static User? get currentUser => _client?.auth.currentUser;

  static Future<AuthResponse> signIn(String email, String password) async {
    final sb = _client;
    if (sb == null) throw Exception('Supabase belum dikonfigurasi pada build aplikasi ini.');
    return sb.auth.signInWithPassword(email: email.trim(), password: password);
  }

  static Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String nama,
  }) async {
    final sb = _client;
    if (sb == null) throw Exception('Supabase belum dikonfigurasi pada build aplikasi ini.');
    return sb.auth.signUp(
      email: email.trim(),
      password: password,
      data: {'nama': nama.trim()},
    );
  }

  static Future<void> signOut() async {
    final sb = _client;
    if (sb == null) return;
    await sb.auth.signOut();
  }

  static Future<String?> ensureStarterWorkspace({
    String? nama,
    String? namaKebun,
    String? lokasiKebun,
  }) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return null;

    String? firstError;
    void capture(Object e) {
      firstError ??= formatError(e);
    }

    final fallbackName = (nama?.trim().isNotEmpty == true)
        ? nama!.trim()
        : (user.userMetadata?['nama']?.toString().trim().isNotEmpty == true)
            ? user.userMetadata!['nama'].toString().trim()
            : (user.email?.split('@').first ?? 'Petani CermatTani');

    try {
      final existingProf = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle();
      if (existingProf == null) {
        await sb.from('profiles').upsert({
          'id': user.id,
          'nama': fallbackName,
          'peran': 'Petani',
        });
      } else if (nama?.trim().isNotEmpty == true) {
        await sb.from('profiles').update({
          'nama': nama!.trim(),
          'updated_at': DateTime.now().toIso8601String(),
        }).eq('id', user.id);
      }
    } catch (e) {
      capture(e);
    }

    String? firstFarmId;
    try {
      final existingFarms = await sb.from('farms').select('id').eq('user_id', user.id).limit(1);
      if (existingFarms.isNotEmpty) {
        firstFarmId = existingFarms.first['id']?.toString();
      } else {
        final createdFarm = await sb
            .from('farms')
            .insert({
              'user_id': user.id,
              'nama': (namaKebun?.trim().isNotEmpty == true) ? namaKebun!.trim() : 'Kebun Utama',
              'lokasi': (lokasiKebun?.trim().isNotEmpty == true) ? lokasiKebun!.trim() : 'Lahan Budidaya',
              'luas_label': 'Kebun hortikultura',
            })
            .select('id')
            .single();
        firstFarmId = createdFarm['id']?.toString();
      }
    } catch (e) {
      capture(e);
    }

    if (firstFarmId != null) {
      try {
        final existingPlants = await sb.from('plants').select('id').eq('farm_id', firstFarmId).limit(1);
        if (existingPlants.isEmpty) {
          final d45 = DateTime.now().subtract(const Duration(days: 45));
          final d35 = DateTime.now().subtract(const Duration(days: 35));
          final d22 = DateTime.now().subtract(const Duration(days: 22));
          await sb.from('plants').insert([
            {
              'farm_id': firstFarmId,
              'nama': 'Cabai Rawit #01',
              'komoditas': 'Cabai',
              'varietas': 'Cabai Rawit',
              'bobot_rata_hasil_gram': 8,
              'tanggal_tanam': d45.toIso8601String().substring(0, 10),
              'fase': 'Berbuah',
            },
            {
              'farm_id': firstFarmId,
              'nama': 'Tomat Servo #01',
              'komoditas': 'Tomat',
              'varietas': 'Tomat Servo F1',
              'bobot_rata_hasil_gram': 85,
              'tanggal_tanam': d35.toIso8601String().substring(0, 10),
              'fase': 'Berbunga',
            },
            {
              'farm_id': firstFarmId,
              'nama': 'Selada Keriting #01',
              'komoditas': 'Selada',
              'varietas': 'Selada Keriting',
              'bobot_rata_hasil_gram': 150,
              'tanggal_tanam': d22.toIso8601String().substring(0, 10),
              'fase': 'Vegetatif',
            },
          ]);
        }
      } catch (e) {
        capture(e);
      }

      try {
        final existingDevices = await sb.from('devices').select('id').eq('farm_id', firstFarmId).limit(1);
        if (existingDevices.isEmpty) {
          final tokenHash =
              'ESP32-CT-${user.id.substring(0, 8)}-${firstFarmId.substring(0, 4)}'.toUpperCase();
          final createdDev = await sb
              .from('devices')
              .insert({
                'farm_id': firstFarmId,
                'nama_perangkat': 'ESP32 Lahan Utama',
                'token_hash': tokenHash,
                'tipe': 'ESP32 + Sensor Tanah + DHT22/BME280 + BH1750 + Ultrasonik + INA219',
                'status': 'aktif',
                'simulasi': true,
              })
              .select('id')
              .single();
          final devId = createdDev['id']?.toString();
          if (devId != null) {
            await sb.from('sensor_readings').insert({
              'device_id': devId,
              'kelembapan_tanah': 48,
              'ph_tanah': 6.4,
              'nitrogen_mg_kg': 64,
              'fosfor_mg_kg': 52,
              'kalium_mg_kg': 71,
              'suhu_udara': 26.5,
              'kelembapan_udara': 74,
              'cahaya_lux': 28400,
              'jarak_ultrasonik_cm': 36,
              'level_tandon_persen': 64,
              'tegangan_volt': 12.6,
              'arus_ma': 88,
              'daya_watt': 1.11,
              'baterai_persen': 84,
              'simulasi': true,
            });
          }
        }
      } catch (e) {
        capture(e);
      }

      try {
        final existingTasks = await sb.from('farm_tasks').select('id').eq('farm_id', firstFarmId).limit(1);
        if (existingTasks.isEmpty) {
          await sb.from('farm_tasks').insert([
            {
              'farm_id': firstFarmId,
              'judul': 'Scan kematangan & kesehatan tanaman pagi ini',
              'kategori': 'panen',
              'waktu_label': 'Hari ini · Pagi',
              'selesai': false,
            },
            {
              'farm_id': firstFarmId,
              'judul': 'Periksa bagian bawah daun dari bercak jamur',
              'kategori': 'cek',
              'waktu_label': 'Hari ini · Sore',
              'selesai': false,
            },
            {
              'farm_id': firstFarmId,
              'judul': 'Cek level air tandon & panel surya',
              'kategori': 'siram',
              'waktu_label': 'Besok · 07:00',
              'selesai': false,
            },
          ]);
        }
      } catch (e) {
        capture(e);
      }
    }

    try {
      final existingRems = await sb.from('reminder_schedules').select('id').eq('user_id', user.id).limit(1);
      if (existingRems.isEmpty) {
        await sb.from('reminder_schedules').insert([
          {
            'user_id': user.id,
            'label': 'Siram Pagi Kebun',
            'kategori': 'siram',
            'jam': '07:00',
            'aktif': true,
            'catatan': 'Siram pangkal batang sebelum matahari terik.',
          },
          {
            'user_id': user.id,
            'label': 'Cek Bercak Daun & Hama',
            'kategori': 'cek_daun',
            'jam': '08:30',
            'aktif': true,
            'catatan': 'Periksa bagian bawah daun dan pindai bila ada bercak.',
          },
          {
            'user_id': user.id,
            'label': 'Siram Sore & Cek Tandon',
            'kategori': 'siram',
            'jam': '16:30',
            'aktif': true,
            'catatan': 'Pastikan kelembapan tanah ideal 45–65% dan tandon aman.',
          },
        ]);
      }
    } catch (e) {
      capture(e);
    }

    return firstError;
  }

  static Future<SupabaseAccountData?> fetchAccountBundle() async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return null;

    String? syncError;
    void capture(Object e) {
      syncError ??= formatError(e);
    }

    Map<String, dynamic>? prof;
    List<dynamic> farmRows = const [];
    List<dynamic> chatRows = const [];
    List<dynamic> remRows = const [];
    List<dynamic> notifRows = const [];

    try {
      prof = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    } catch (e) {
      capture(e);
    }
    try {
      farmRows = await sb.from('farms').select('*').eq('user_id', user.id).order('created_at', ascending: true);
    } catch (e) {
      capture(e);
    }
    try {
      chatRows = await sb
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('waktu', ascending: true)
          .limit(80);
    } catch (e) {
      capture(e);
    }
    try {
      remRows = await sb
          .from('reminder_schedules')
          .select('*')
          .eq('user_id', user.id)
          .order('jam', ascending: true);
    } catch (e) {
      capture(e);
    }
    try {
      notifRows = await sb
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', ascending: false)
          .limit(40);
    } catch (e) {
      capture(e);
    }

    final farms = farmRows
        .whereType<Map>()
        .map(
          (r) => FarmModel(
            id: r['id'].toString(),
            nama: r['nama']?.toString() ?? 'Kebun Utama',
            lokasi: r['lokasi']?.toString() ?? 'Lahan budidaya',
            luasLabel: r['luas_label']?.toString() ?? 'Kebun',
          ),
        )
        .toList();

    final farmIds = farms.map((f) => f.id).toList();
    final plants = <PlantModel>[];
    final scans = <ScanModel>[];
    final harvests = <HarvestEventModel>[];
    final tasks = <FarmTaskModel>[];
    final irrigationEvents = <IrrigationEventModel>[];
    final sensor24h = <Sensor24hPoint>[];

    String? activeDeviceId;
    bool? irigasiAuto;
    bool? pompaMenyala;
    int? ambangTanahBawah;
    int? ambangTanahAtas;
    int? durasiMaksPompa;
    int? ambangKelembapanPenyakit;
    int? ambangTandonRendah;
    int? ambangBateraiHemat;

    int? kelembapanTanah;
    int? nitrogenMgKg;
    int? fosforMgKg;
    int? kaliumMgKg;
    double? suhuUdara;
    int? kelembapanUdara;
    int? cahayaLux;
    int? levelTandon;
    double? teganganVolt;
    int? arusMa;
    int? bateraiPersen;

    if (farmIds.isNotEmpty) {
      try {
        final plantRows = await sb
            .from('plants')
            .select('*')
            .inFilter('farm_id', farmIds)
            .order('created_at', ascending: false);
        for (final r in plantRows) {
          plants.add(
            PlantModel(
              id: r['id'].toString(),
              farmId: r['farm_id'].toString(),
              nama: r['nama']?.toString() ?? 'Tanaman',
              varietas: r['varietas']?.toString() ?? 'Servo F1',
              tanggalTanam: DateTime.tryParse(r['tanggal_tanam']?.toString() ?? '') ?? DateTime.now(),
              fase: r['fase']?.toString() ?? 'Berbuah',
              bobotRataBuahGram: (r['bobot_rata_hasil_gram'] as num?)?.toInt() ?? 85,
            ),
          );
        }
      } catch (e) {
        capture(e);
      }

      try {
        final taskRows = await sb
            .from('farm_tasks')
            .select('*')
            .inFilter('farm_id', farmIds)
            .order('created_at', ascending: false)
            .limit(50);
        for (final r in taskRows) {
          tasks.add(
            FarmTaskModel(
              id: r['id'].toString(),
              farmId: r['farm_id'].toString(),
              judul: r['judul']?.toString() ?? 'Tugas kebun',
              waktuLabel: r['waktu_label']?.toString() ?? 'Hari ini',
              selesai: r['selesai'] == true,
            ),
          );
        }
      } catch (e) {
        capture(e);
      }

      try {
        final devRows = await sb
            .from('devices')
            .select('*')
            .inFilter('farm_id', farmIds)
            .order('created_at', ascending: true);
        if (devRows.isNotEmpty) {
          final d0 = devRows.first;
          activeDeviceId = d0['id']?.toString();
          irigasiAuto = d0['irigasi_otomatis'] is bool ? d0['irigasi_otomatis'] as bool : null;
          pompaMenyala = d0['pompa_menyala'] is bool ? d0['pompa_menyala'] as bool : null;
          ambangTanahBawah = (d0['ambang_tanah_bawah'] as num?)?.toInt();
          ambangTanahAtas = (d0['ambang_tanah_atas'] as num?)?.toInt();
          durasiMaksPompa = (d0['durasi_maks_pompa_menit'] as num?)?.toInt();
          ambangKelembapanPenyakit = (d0['ambang_kelembapan_penyakit'] as num?)?.toInt();
          ambangTandonRendah = (d0['ambang_tandon_rendah'] as num?)?.toInt();
          ambangBateraiHemat = (d0['ambang_baterai_hemat'] as num?)?.toInt();

          final devIds = devRows.map((d) => d['id'].toString()).toList();
          try {
            final irrRows = await sb
                .from('irrigation_events')
                .select('*')
                .inFilter('device_id', devIds)
                .order('mulai', ascending: false)
                .limit(15);
            for (final r in irrRows) {
              irrigationEvents.add(
                IrrigationEventModel(
                  id: r['id'].toString(),
                  waktu: DateTime.tryParse(r['mulai']?.toString() ?? '') ?? DateTime.now(),
                  durasiMenit: (r['durasi_menit'] as num?)?.toInt() ?? 5,
                  kelembapanAwal: (r['kelembapan_awal'] as num?)?.toInt() ?? 40,
                  kelembapanAkhir: (r['kelembapan_akhir'] as num?)?.toInt() ?? 65,
                  mode: r['mode']?.toString() == 'Manual' ? 'Manual' : 'Otomatis',
                ),
              );
            }
          } catch (e) {
            capture(e);
          }

          if (activeDeviceId != null) {
            try {
              final readingRows = await sb
                  .from('sensor_readings')
                  .select('*')
                  .eq('device_id', activeDeviceId)
                  .order('waktu', ascending: false)
                  .limit(24);
              if (readingRows.isNotEmpty) {
                final r0 = readingRows.first;
                kelembapanTanah = (r0['kelembapan_tanah'] as num?)?.round();
                nitrogenMgKg = (r0['nitrogen_mg_kg'] as num?)?.round();
                fosforMgKg = (r0['fosfor_mg_kg'] as num?)?.round();
                kaliumMgKg = (r0['kalium_mg_kg'] as num?)?.round();
                suhuUdara = (r0['suhu_udara'] as num?)?.toDouble();
                kelembapanUdara = (r0['kelembapan_udara'] as num?)?.round();
                cahayaLux = (r0['cahaya_lux'] as num?)?.round();
                levelTandon = (r0['level_tandon_persen'] as num?)?.round();
                teganganVolt = (r0['tegangan_volt'] as num?)?.toDouble();
                arusMa = (r0['arus_ma'] as num?)?.round();
                bateraiPersen = (r0['baterai_persen'] as num?)?.round();

                if (readingRows.length >= 2) {
                  for (final r in readingRows.reversed) {
                    final dt = DateTime.tryParse(r['waktu']?.toString() ?? '') ?? DateTime.now();
                    final hh = dt.hour.toString().padLeft(2, '0');
                    final mm = dt.minute.toString().padLeft(2, '0');
                    sensor24h.add(
                      Sensor24hPoint(
                        jam: '$hh:$mm',
                        tanah: (r['kelembapan_tanah'] as num?)?.round() ?? 48,
                        suhu: (r['suhu_udara'] as num?)?.toDouble() ?? 26.5,
                        udara: (r['kelembapan_udara'] as num?)?.round() ?? 74,
                        cahayaKlux: double.parse((((r['cahaya_lux'] as num?)?.toDouble() ?? 25000) / 1000).toStringAsFixed(1)),
                      ),
                    );
                  }
                }
              }
            } catch (e) {
              capture(e);
            }
          }
        }
      } catch (e) {
        capture(e);
      }
    }

    final plantIds = plants.map((p) => p.id).toList();
    if (plantIds.isNotEmpty) {
      try {
        final scanRows = await sb
            .from('scans')
            .select('*')
            .inFilter('plant_id', plantIds)
            .order('waktu', ascending: false)
            .limit(50);

        for (final r in scanRows) {
          final meta = r['metadata'] is Map ? Map<String, dynamic>.from(r['metadata'] as Map) : <String, dynamic>{};
          final bagianStr = r['bagian']?.toString() ?? 'buah';
          final bagian = bagianStr == 'daun'
              ? PlantPart.daun
              : bagianStr == 'batang'
                  ? PlantPart.batang
                  : PlantPart.buah;
          final stageStr = r['tahap_dominan']?.toString();
          final stage = stageStr == 'matang'
              ? RipenessStage.matang
              : stageStr == 'setengah_matang'
                  ? RipenessStage.setengahMatang
                  : stageStr == 'mentah'
                      ? RipenessStage.mentah
                      : null;
          final fokusStr = meta['fokusOutput']?.toString() ?? (stage != null ? 'kematangan' : 'penyakit');
          final fokus = switch (fokusStr) {
            'penyakit' => ScanOutputFocus.penyakit,
            'hara' => ScanOutputFocus.hara,
            'tidak_terdeteksi' => ScanOutputFocus.tidakTerdeteksi,
            _ => ScanOutputFocus.kematangan,
          };
          final rawTop3 = r['penyakit_top3'] is List ? r['penyakit_top3'] as List : const [];
          final top3 = rawTop3
              .whereType<Map>()
              .map(
                (m) => DiseasePred(
                  m['id']?.toString() ?? 'sehat',
                  m['nama']?.toString() ?? 'Sehat',
                  (m['confidence'] as num?)?.toInt() ?? 0,
                ),
              )
              .toList();

          scans.add(
            ScanModel(
              id: r['id'].toString(),
              plantId: r['plant_id'].toString(),
              waktu: DateTime.tryParse(r['waktu']?.toString() ?? '') ?? DateTime.now(),
              bagian: bagian,
              fokusOutput: fokus,
              boxes: const [],
              tahapDominan: stage,
              jumlahBuah: (r['jumlah_objek'] as num?)?.toInt() ?? 0,
              anjuranPanen: r['anjuran_panen']?.toString() ?? 'Tunggu',
              estimasiHariMin: (r['estimasi_hari_min'] as num?)?.toInt(),
              estimasiHariMax: (r['estimasi_hari_max'] as num?)?.toInt(),
              estimasiDisesuaikanRiwayat: r['estimasi_disesuaikan_riwayat'] == true,
              estimasiBobotGram: (r['estimasi_bobot_gram'] as num?)?.toInt() ?? 0,
              penyakitTop3: top3.isNotEmpty
                  ? top3
                  : [
                      DiseasePred(
                        r['penyakit_utama_id']?.toString() ?? 'sehat',
                        r['penyakit_utama_nama']?.toString() ?? 'Sehat',
                        100,
                      )
                    ],
              penyakitUtamaId: r['penyakit_utama_id']?.toString() ?? 'sehat',
              penyakitUtamaNama: r['penyakit_utama_nama']?.toString() ?? 'Sehat',
              penyakitRinganId: meta['penyakitRinganId']?.toString(),
              adaGejalaHara: meta['adaGejalaHara'] == true,
              keyakinan: (r['keyakinan'] as num?)?.toInt() ?? 70,
              keyakinanRendah: r['keyakinan_rendah'] == true,
              dugaanHaraId: r['dugaan_hara_id']?.toString() ?? 'cukup',
              dugaanHaraNama: r['dugaan_hara_nama']?.toString() ?? 'Hara terlihat seimbang',
              pakaiDataSensor: r['pakai_data_sensor'] == true,
              tanpaBuahTerdeteksi: r['objek_tidak_terdeteksi'] == true,
              aiModel: meta['aiModel']?.toString(),
              ringkasanAi: meta['ringkasanAi']?.toString() ?? '',
              temuanVisual: meta['temuanVisual'] is List
                  ? (meta['temuanVisual'] as List).map((e) => e.toString()).toList()
                  : const [],
            ),
          );
        }
      } catch (e) {
        capture(e);
      }

      try {
        final harvRows = await sb
            .from('harvest_events')
            .select('*')
            .inFilter('plant_id', plantIds)
            .order('tanggal', ascending: true)
            .limit(50);
        for (final r in harvRows) {
          harvests.add(
            HarvestEventModel(
              id: r['id'].toString(),
              plantId: r['plant_id'].toString(),
              tanggal: DateTime.tryParse(r['tanggal']?.toString() ?? '') ?? DateTime.now(),
              sumber: r['sumber']?.toString() == 'aktual' ? 'aktual' : 'estimasi',
              catatan: r['catatan']?.toString() ?? '',
            ),
          );
        }
      } catch (e) {
        capture(e);
      }
    }

    final chats = chatRows
        .whereType<Map>()
        .map(
          (r) => ChatMsgModel(
            id: r['id'].toString(),
            dariCermo: r['peran']?.toString() != 'pengguna',
            isi: r['isi']?.toString() ?? '',
          ),
        )
        .toList();

    final reminders = remRows
        .whereType<Map>()
        .map(
          (r) => ReminderScheduleModel(
            id: r['id'].toString(),
            judul: r['label']?.toString() ?? 'Pengingat',
            jam: r['jam']?.toString() ?? '07:00',
            kategori: switch (r['kategori']?.toString()) {
              'cek_daun' => ReminderCategory.cekDaun,
              'pupuk' => ReminderCategory.pupuk,
              'panen' => ReminderCategory.panen,
              _ => ReminderCategory.siram,
            },
            aktif: r['aktif'] != false,
            catatan: r['catatan']?.toString() ?? '',
          ),
        )
        .toList();

    final notifications = notifRows
        .whereType<Map>()
        .map(
          (r) => NotifModel(
            id: r['id'].toString(),
            judul: r['judul']?.toString() ?? 'Notifikasi',
            isi: r['isi']?.toString() ?? '',
            waktu: r['waktu_label']?.toString() ?? 'Baru saja',
            dibaca: r['dibaca'] == true,
            severity: switch (r['severity']?.toString()) {
              'bad' => AlertSeverity.danger,
              'warn' => AlertSeverity.warn,
              _ => AlertSeverity.info,
            },
            tipe: switch (r['tipe']?.toString()) {
              'panen' => AlertType.panen,
              'penyakit' => AlertType.scan,
              'tandon' || 'energi' || 'siram' => AlertType.sensor,
              'telegram' || 'pupuk' => AlertType.jadwal,
              _ => AlertType.sistem,
            },
            actionLabel: r['action_label']?.toString(),
            actionRoute: r['action_screen']?.toString(),
          ),
        )
        .toList();

    final temaStr = prof?['tema']?.toString();
    final themeMode = temaStr == 'dark'
        ? ThemeMode.dark
        : temaStr == 'system'
            ? ThemeMode.system
            : temaStr == 'light'
                ? ThemeMode.light
                : null;

    return SupabaseAccountData(
      userId: user.id,
      email: user.email ?? '',
      userName: prof?['nama']?.toString() ??
          user.userMetadata?['nama']?.toString() ??
          (user.email?.split('@').first ?? 'Petani'),
      farms: farms,
      plants: plants,
      scans: scans,
      harvestEvents: harvests,
      chatMessages: chats,
      irrigationEvents: irrigationEvents,
      tasks: tasks,
      reminders: reminders,
      notifications: notifications,
      activeDeviceId: activeDeviceId,
      telegramChatId: prof?['telegram_chat_id']?.toString(),
      telegramCode: prof?['telegram_link_code']?.toString(),
      telegramTime: prof?['telegram_reminder_time']?.toString(),
      themeMode: themeMode,
      peringatanOtomatisSensor: prof?['peringatan_otomatis_sensor'] is bool
          ? prof!['peringatan_otomatis_sensor'] as bool
          : null,
      ambangKeyakinanRendah: (prof?['ambang_keyakinan_rendah'] as num?)?.toInt(),
      irigasiAuto: irigasiAuto,
      pompaMenyala: pompaMenyala,
      ambangTanahBawah: ambangTanahBawah,
      ambangTanahAtas: ambangTanahAtas,
      durasiMaksPompa: durasiMaksPompa,
      ambangKelembapanPenyakit: ambangKelembapanPenyakit,
      ambangTandonRendah: ambangTandonRendah,
      ambangBateraiHemat: ambangBateraiHemat,
      kelembapanTanah: kelembapanTanah,
      nitrogenMgKg: nitrogenMgKg,
      fosforMgKg: fosforMgKg,
      kaliumMgKg: kaliumMgKg,
      suhuUdara: suhuUdara,
      kelembapanUdara: kelembapanUdara,
      cahayaLux: cahayaLux,
      levelTandon: levelTandon,
      teganganVolt: teganganVolt,
      arusMa: arusMa,
      bateraiPersen: bateraiPersen,
      sensor24h: sensor24h,
      syncError: syncError,
    );
  }

  static Future<FarmModel?> insertFarm(String nama, String lokasi) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return null;
    try {
      final row = await sb
          .from('farms')
          .insert({
            'user_id': user.id,
            'nama': nama.trim(),
            'lokasi': lokasi.trim().isEmpty ? 'Lahan budidaya' : lokasi.trim(),
            'luas_label': 'Kebun hortikultura',
          })
          .select()
          .single();
      return FarmModel(
        id: row['id'].toString(),
        nama: row['nama'].toString(),
        lokasi: row['lokasi'].toString(),
        luasLabel: row['luas_label'].toString(),
      );
    } catch (_) {
      return null;
    }
  }

  static Future<PlantModel?> insertPlant(
    String farmId,
    String nama,
    String varietas,
    String fase,
    DateTime tanggalTanam,
  ) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(farmId)) return null;
    try {
      final bobot = estimateWeightForVariety(varietas);
      final komoditas = inferCommodityFromVariety(varietas);
      final row = await sb
          .from('plants')
          .insert({
            'farm_id': farmId,
            'nama': nama.trim(),
            'komoditas': komoditas,
            'varietas': varietas,
            'bobot_rata_hasil_gram': bobot,
            'tanggal_tanam': tanggalTanam.toIso8601String().substring(0, 10),
            'fase': fase,
          })
          .select()
          .single();
      return PlantModel(
        id: row['id'].toString(),
        farmId: row['farm_id'].toString(),
        nama: row['nama'].toString(),
        varietas: row['varietas'].toString(),
        tanggalTanam: tanggalTanam,
        fase: row['fase'].toString(),
        bobotRataBuahGram: bobot,
      );
    } catch (_) {
      return null;
    }
  }

  static Future<FarmTaskModel?> insertFarmTask(String farmId, String judul, String waktuLabel) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(farmId)) return null;
    try {
      final row = await sb
          .from('farm_tasks')
          .insert({
            'farm_id': farmId,
            'judul': judul.trim(),
            'kategori': 'cek',
            'waktu_label': waktuLabel.trim().isEmpty ? 'Hari ini' : waktuLabel.trim(),
            'selesai': false,
          })
          .select()
          .single();
      return FarmTaskModel(
        id: row['id'].toString(),
        farmId: row['farm_id'].toString(),
        judul: row['judul'].toString(),
        waktuLabel: row['waktu_label'].toString(),
        selesai: row['selesai'] == true,
      );
    } catch (_) {
      return null;
    }
  }

  static Future<void> toggleFarmTask(String id, bool selesai) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(id)) return;
    try {
      await sb.from('farm_tasks').update({'selesai': selesai}).eq('id', id);
    } catch (_) {}
  }

  static Future<void> insertScan(ScanModel scan) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null || !isUuid(scan.plantId)) return;
    try {
      String? fotoPath;
      final Uint8List? bytes = scan.photoBytes;
      if (bytes != null && bytes.isNotEmpty) {
        final path = '${user.id}/${scan.plantId}/${DateTime.now().millisecondsSinceEpoch}.jpg';
        await sb.storage.from('scan-photos').uploadBinary(
              path,
              bytes,
              fileOptions: const FileOptions(contentType: 'image/jpeg'),
            );
        fotoPath = path;
      }

      final fokusStr = switch (scan.fokusOutput) {
        ScanOutputFocus.penyakit => 'penyakit',
        ScanOutputFocus.hara => 'hara',
        ScanOutputFocus.tidakTerdeteksi => 'tidak_terdeteksi',
        ScanOutputFocus.kematangan => 'kematangan',
      };
      final stageStr = switch (scan.tahapDominan) {
        RipenessStage.matang => 'matang',
        RipenessStage.setengahMatang => 'setengah_matang',
        RipenessStage.mentah => 'mentah',
        null => null,
      };

      await sb.from('scans').insert({
        'plant_id': scan.plantId,
        'waktu': scan.waktu.toIso8601String(),
        'bagian': scan.bagian.name,
        'foto_path': fotoPath,
        'boxes': [
          for (final b in scan.boxes)
            {
              'x': (b.leftFrac * 100).round(),
              'y': (b.topFrac * 100).round(),
              'w': (b.widthFrac * 100).round(),
              'h': (b.heightFrac * 100).round(),
              'stage': b.stage.name,
              'confidence': b.confidence,
            },
        ],
        'tahap_dominan': stageStr,
        'jumlah_objek': scan.jumlahBuah,
        'anjuran_panen': scan.anjuranPanen,
        'estimasi_hari_min': scan.estimasiHariMin,
        'estimasi_hari_max': scan.estimasiHariMax,
        'estimasi_disesuaikan_riwayat': scan.estimasiDisesuaikanRiwayat,
        'estimasi_bobot_gram': scan.estimasiBobotGram,
        'penyakit_top3': [
          for (final d in scan.penyakitTop3) {'id': d.id, 'nama': d.nama, 'confidence': d.confidence},
        ],
        'penyakit_utama_id': scan.penyakitUtamaId,
        'penyakit_utama_nama': scan.penyakitUtamaNama,
        'keyakinan': scan.keyakinan,
        'keyakinan_rendah': scan.keyakinanRendah,
        'dugaan_hara_id': scan.dugaanHaraId,
        'dugaan_hara_nama': scan.dugaanHaraNama,
        'pakai_data_sensor': scan.pakaiDataSensor,
        'objek_tidak_terdeteksi': scan.tanpaBuahTerdeteksi,
        'metadata': {
          'fokusOutput': fokusStr,
          'penyakitRinganId': scan.penyakitRinganId,
          'adaGejalaHara': scan.adaGejalaHara,
          'aiModel': scan.aiModel,
          'ringkasanAi': scan.ringkasanAi,
          'temuanVisual': scan.temuanVisual,
        },
      });
    } catch (_) {
      // Tetap aman lokal
    }
  }

  static Future<void> insertHarvest(String plantId, DateTime tanggal, String catatan) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(plantId)) return;
    try {
      await sb.from('harvest_events').insert({
        'plant_id': plantId,
        'tanggal': tanggal.toIso8601String().substring(0, 10),
        'sumber': 'estimasi',
        'catatan': catatan,
      });
    } catch (_) {}
  }

  static Future<void> markHarvestActual(String id) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(id)) return;
    try {
      await sb.from('harvest_events').update({'sumber': 'aktual'}).eq('id', id);
    } catch (_) {}
  }

  static Future<void> insertChat(String? plantId, bool dariCermo, String isi) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return;
    try {
      await sb.from('chat_messages').insert({
        'user_id': user.id,
        'plant_id': isUuid(plantId) ? plantId : null,
        'peran': dariCermo ? 'cermo' : 'pengguna',
        'isi': isi,
      });
    } catch (_) {}
  }

  static Future<void> clearUserChats() async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return;
    try {
      await sb.from('chat_messages').delete().eq('user_id', user.id);
    } catch (_) {}
  }

  static Future<ReminderScheduleModel?> insertReminderSchedule({
    required String judul,
    required String jam,
    required ReminderCategory kategori,
    required String catatan,
  }) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return null;
    try {
      final katStr = switch (kategori) {
        ReminderCategory.cekDaun => 'cek_daun',
        ReminderCategory.pupuk => 'pupuk',
        ReminderCategory.panen => 'panen',
        ReminderCategory.siram => 'siram',
      };
      final row = await sb
          .from('reminder_schedules')
          .insert({
            'user_id': user.id,
            'label': judul,
            'kategori': katStr,
            'jam': jam,
            'aktif': true,
            'catatan': catatan,
          })
          .select()
          .single();
      return ReminderScheduleModel(
        id: row['id'].toString(),
        judul: row['label'].toString(),
        jam: row['jam'].toString(),
        kategori: kategori,
        aktif: row['aktif'] != false,
        catatan: row['catatan']?.toString() ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  static Future<void> updateReminderSchedule(
    String id, {
    String? jam,
    bool? aktif,
    String? judul,
    String? catatan,
  }) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(id)) return;
    try {
      final payload = <String, dynamic>{};
      if (jam != null) payload['jam'] = jam;
      if (aktif != null) payload['aktif'] = aktif;
      if (judul != null) payload['label'] = judul;
      if (catatan != null) payload['catatan'] = catatan;
      if (payload.isEmpty) return;
      await sb.from('reminder_schedules').update(payload).eq('id', id);
    } catch (_) {}
  }

  static Future<void> deleteReminderSchedule(String id) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(id)) return;
    try {
      await sb.from('reminder_schedules').delete().eq('id', id);
    } catch (_) {}
  }

  static Future<void> insertNotification(NotifModel n) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return;
    try {
      final tipeStr = switch (n.tipe) {
        AlertType.panen => 'panen',
        AlertType.scan => 'penyakit',
        AlertType.sensor => 'tandon',
        AlertType.jadwal => 'telegram',
        AlertType.sistem => 'telegram',
      };
      final sevStr = switch (n.severity) {
        AlertSeverity.danger => 'bad',
        AlertSeverity.warn => 'warn',
        AlertSeverity.info => 'info',
      };
      await sb.from('notifications').insert({
        'user_id': user.id,
        'judul': n.judul,
        'isi': n.isi,
        'waktu_label': n.waktu,
        'tipe': tipeStr,
        'severity': sevStr,
        'dibaca': n.dibaca,
        'action_label': n.actionLabel,
        'action_screen': n.actionRoute,
      });
    } catch (_) {}
  }

  static Future<void> markAllNotificationsRead() async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return;
    try {
      await sb
          .from('notifications')
          .update({'dibaca': true})
          .eq('user_id', user.id)
          .eq('dibaca', false);
    } catch (_) {}
  }

  static Future<void> clearUserNotifications() async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return;
    try {
      await sb.from('notifications').delete().eq('user_id', user.id);
    } catch (_) {}
  }

  static Future<void> updateDeviceSettings(
    String? deviceId, {
    bool? irigasiAuto,
    bool? pompaMenyala,
    int? ambangTanahBawah,
    int? ambangTanahAtas,
    int? durasiMaksPompa,
    int? ambangKelembapanPenyakit,
    int? ambangTandonRendah,
    int? ambangBateraiHemat,
  }) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(deviceId)) return;
    try {
      final payload = <String, dynamic>{'last_seen_at': DateTime.now().toIso8601String()};
      if (irigasiAuto != null) payload['irigasi_otomatis'] = irigasiAuto;
      if (pompaMenyala != null) payload['pompa_menyala'] = pompaMenyala;
      if (ambangTanahBawah != null) payload['ambang_tanah_bawah'] = ambangTanahBawah;
      if (ambangTanahAtas != null) payload['ambang_tanah_atas'] = ambangTanahAtas;
      if (durasiMaksPompa != null) payload['durasi_maks_pompa_menit'] = durasiMaksPompa;
      if (ambangKelembapanPenyakit != null) payload['ambang_kelembapan_penyakit'] = ambangKelembapanPenyakit;
      if (ambangTandonRendah != null) payload['ambang_tandon_rendah'] = ambangTandonRendah;
      if (ambangBateraiHemat != null) payload['ambang_baterai_hemat'] = ambangBateraiHemat;
      await sb.from('devices').update(payload).eq('id', deviceId!);
    } catch (_) {}
  }

  static Future<void> insertSensorReading(String? deviceId, CermatState st) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(deviceId)) return;
    try {
      await sb.from('sensor_readings').insert({
        'device_id': deviceId,
        'waktu': DateTime.now().toIso8601String(),
        'kelembapan_tanah': st.kelembapanTanah,
        'nitrogen_mg_kg': st.nitrogenMgKg,
        'fosfor_mg_kg': st.fosforMgKg,
        'kalium_mg_kg': st.kaliumMgKg,
        'suhu_udara': st.suhuUdara,
        'kelembapan_udara': st.kelembapanUdara,
        'cahaya_lux': st.cahayaLux,
        'jarak_ultrasonik_cm': st.jarakUltrasonikCm,
        'level_tandon_persen': st.levelTandon,
        'tegangan_volt': st.teganganVolt,
        'arus_ma': st.arusMa,
        'daya_watt': st.dayaWatt,
        'baterai_persen': st.bateraiPersen,
        'simulasi': true,
      });
    } catch (_) {}
  }

  static Future<void> insertIrrigationEvent(String? deviceId, IrrigationEventModel ev) async {
    final sb = _client;
    if (sb == null || sb.auth.currentUser == null || !isUuid(deviceId)) return;
    try {
      await sb.from('irrigation_events').insert({
        'device_id': deviceId,
        'mulai': ev.waktu.toIso8601String(),
        'selesai': ev.waktu.toIso8601String(),
        'durasi_menit': ev.durasiMenit,
        'kelembapan_awal': ev.kelembapanAwal,
        'kelembapan_akhir': ev.kelembapanAkhir,
        'mode': ev.mode,
        'simulasi': true,
      });
    } catch (_) {}
  }

  static Future<void> updateUserName(String nama) async {
    await updateProfileSettings(nama: nama);
  }

  static Future<void> updateProfileSettings({
    String? nama,
    ThemeMode? themeMode,
    bool? peringatanOtomatisSensor,
    int? ambangKeyakinanRendah,
    String? telegramTime,
  }) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return;
    try {
      final payload = <String, dynamic>{'updated_at': DateTime.now().toIso8601String()};
      if (nama != null && nama.trim().isNotEmpty) payload['nama'] = nama.trim();
      if (themeMode != null) {
        payload['tema'] = themeMode == ThemeMode.dark
            ? 'dark'
            : themeMode == ThemeMode.system
                ? 'system'
                : 'light';
      }
      if (peringatanOtomatisSensor != null) {
        payload['peringatan_otomatis_sensor'] = peringatanOtomatisSensor;
      }
      if (ambangKeyakinanRendah != null) {
        payload['ambang_keyakinan_rendah'] = ambangKeyakinanRendah;
      }
      if (telegramTime != null) payload['telegram_reminder_time'] = telegramTime;
      await sb.from('profiles').update(payload).eq('id', user.id);
    } catch (_) {}
  }

  static Future<void> updateTelegramFields({
    String? chatId,
    bool clearChatId = false,
    String? linkCode,
  }) async {
    final sb = _client;
    final user = sb?.auth.currentUser;
    if (sb == null || user == null) return;
    try {
      final payload = <String, dynamic>{'updated_at': DateTime.now().toIso8601String()};
      if (clearChatId) {
        payload['telegram_chat_id'] = null;
      } else if (chatId != null) {
        payload['telegram_chat_id'] = chatId;
      }
      if (linkCode != null) payload['telegram_link_code'] = linkCode;
      await sb.from('profiles').update(payload).eq('id', user.id);
    } catch (_) {}
  }
}
