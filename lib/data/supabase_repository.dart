import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'supabase_config.dart';

/// Repository Supabase untuk 5 kelompok database PRD:
/// 1. Akun (profiles)
/// 2. Kebun (farms, plants)
/// 3. Scan & AI (scans + Storage bucket 'scan-photos')
/// 4. Basis Pengetahuan (knowledge_diseases, knowledge_nutrients)
/// 5. IoT & Irigasi (devices, sensor_readings, irrigation_events)
/// 6. Jadwal & Chat (harvest_events, chat_messages)
class CermatSupabaseRepository {
  SupabaseClient? get _client => SupabaseConfig.isConfigured ? Supabase.instance.client : null;

  bool get isReady => _client != null;
  String? get currentUserId => _client?.auth.currentUser?.id;

  // --- 1. AKUN ---
  Future<AuthResponse?> signInWithEmail(String email, String password) async {
    final c = _client;
    if (c == null) return null;
    return c.auth.signInWithPassword(email: email, password: password);
  }

  Future<AuthResponse?> signUpWithEmail(String email, String password, String nama) async {
    final c = _client;
    if (c == null) return null;
    return c.auth.signUp(email: email, password: password, data: {'nama': nama});
  }

  Future<void> signOut() async => _client?.auth.signOut();

  Future<Map<String, dynamic>?> fetchProfile() async {
    final c = _client;
    final uid = currentUserId;
    if (c == null || uid == null) return null;
    return c.from('profiles').select().eq('id', uid).maybeSingle();
  }

  // --- 2. KEBUN ---
  Future<List<Map<String, dynamic>>> fetchFarms() async {
    final c = _client;
    if (c == null) return [];
    return List<Map<String, dynamic>>.from(
      await c.from('farms').select().order('created_at', ascending: false),
    );
  }

  Future<Map<String, dynamic>?> insertFarm({
    required String nama,
    required String lokasi,
    String luasLabel = 'Lahan budidaya',
  }) async {
    final c = _client;
    final uid = currentUserId;
    if (c == null || uid == null) return null;
    return c
        .from('farms')
        .insert({'user_id': uid, 'nama': nama, 'lokasi': lokasi, 'luas_label': luasLabel})
        .select()
        .single();
  }

  Future<List<Map<String, dynamic>>> fetchPlants(String farmId) async {
    final c = _client;
    if (c == null) return [];
    return List<Map<String, dynamic>>.from(
      await c.from('plants').select().eq('farm_id', farmId).order('created_at', ascending: false),
    );
  }

  Future<Map<String, dynamic>?> insertPlant({
    required String farmId,
    required String nama,
    String komoditas = 'Umum',
    required String varietas,
    required String tanggalTanamYmd,
    required String fase,
    int? bobotRataHasilGram,
  }) async {
    final c = _client;
    if (c == null) return null;
    return c
        .from('plants')
        .insert({
          'farm_id': farmId,
          'nama': nama,
          'komoditas': komoditas,
          'varietas': varietas,
          'tanggal_tanam': tanggalTanamYmd,
          'fase': fase,
          'bobot_rata_hasil_gram': bobotRataHasilGram,
        })
        .select()
        .single();
  }

  // --- 3. SCAN & AI + STORAGE ---
  Future<String?> uploadScanPhoto({
    required String plantId,
    required Uint8List bytes,
    String ext = 'jpg',
  }) async {
    final c = _client;
    final uid = currentUserId;
    if (c == null || uid == null) return null;
    final path = '$uid/$plantId/${DateTime.now().millisecondsSinceEpoch}.$ext';
    await c.storage.from('scan-photos').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: false),
        );
    return path;
  }

  Future<Map<String, dynamic>?> insertScan(Map<String, dynamic> payload) async {
    final c = _client;
    if (c == null) return null;
    return c.from('scans').insert(payload).select().single();
  }

  Future<List<Map<String, dynamic>>> fetchPlantScans(String plantId) async {
    final c = _client;
    if (c == null) return [];
    return List<Map<String, dynamic>>.from(
      await c.from('scans').select().eq('plant_id', plantId).order('waktu', ascending: false),
    );
  }

  // --- 4. BASIS PENGETAHUAN ---
  Future<List<Map<String, dynamic>>> fetchKnowledgeDiseases() async {
    final c = _client;
    if (c == null) return [];
    return List<Map<String, dynamic>>.from(await c.from('knowledge_diseases').select());
  }

  Future<List<Map<String, dynamic>>> fetchKnowledgeNutrients() async {
    final c = _client;
    if (c == null) return [];
    return List<Map<String, dynamic>>.from(await c.from('knowledge_nutrients').select());
  }

  // --- 5. IOT & IRIGASI ---
  Future<List<Map<String, dynamic>>> fetchSensorReadings24h(String deviceId) async {
    final c = _client;
    if (c == null) return [];
    final since = DateTime.now().subtract(const Duration(hours: 24)).toIso8601String();
    return List<Map<String, dynamic>>.from(
      await c
          .from('sensor_readings')
          .select()
          .eq('device_id', deviceId)
          .gte('waktu', since)
          .order('waktu', ascending: true),
    );
  }

  Future<void> updateDeviceThresholds(String deviceId, Map<String, dynamic> patch) async {
    final c = _client;
    if (c == null) return;
    await c.from('devices').update(patch).eq('id', deviceId);
  }

  Future<void> insertIrrigationEvent(Map<String, dynamic> payload) async {
    final c = _client;
    if (c == null) return;
    await c.from('irrigation_events').insert(payload);
  }

  // --- 6. JADWAL & CHAT ---
  Future<List<Map<String, dynamic>>> fetchHarvestEvents() async {
    final c = _client;
    if (c == null) return [];
    return List<Map<String, dynamic>>.from(
      await c.from('harvest_events').select().order('tanggal', ascending: true),
    );
  }

  Future<void> insertHarvestEvent(Map<String, dynamic> payload) async {
    final c = _client;
    if (c == null) return;
    await c.from('harvest_events').insert(payload);
  }

  Future<void> insertChatMessage({
    required String? plantId,
    required String peran,
    required String isi,
  }) async {
    final c = _client;
    final uid = currentUserId;
    if (c == null || uid == null) return;
    await c.from('chat_messages').insert({
      'user_id': uid,
      'plant_id': plantId,
      'peran': peran,
      'isi': isi,
    });
  }
}
