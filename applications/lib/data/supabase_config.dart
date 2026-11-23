/// Konfigurasi Supabase untuk Flutter Mobile App.
/// Jalankan dengan:
/// flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co --dart-define=SUPABASE_ANON_KEY=eyJ...
abstract final class SupabaseConfig {
  static const url = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const anonKey = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  static bool get isConfigured => url.isNotEmpty && anonKey.isNotEmpty;
}
