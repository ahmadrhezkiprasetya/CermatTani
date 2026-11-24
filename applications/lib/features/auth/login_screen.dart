import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';
import '../../data/supabase_config.dart';

/// Halaman Login & Register CermatTani Mobile — Terhubung langsung ke seluruh tabel Supabase
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _isRegister = false;
  bool _showPassword = false;
  bool _busy = false;
  String? _errorMsg;
  String? _infoMsg;

  final _namaCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _farmCtrl = TextEditingController(text: 'Kebun Utama');
  final _locCtrl = TextEditingController();

  @override
  void dispose() {
    _namaCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    _farmCtrl.dispose();
    _locCtrl.dispose();
    super.dispose();
  }

  String _translateError(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('invalid login credentials')) {
      return 'Email atau kata sandi belum cocok. Periksa kembali atau daftar akun baru.';
    }
    if (lower.contains('email not confirmed')) {
      return 'Email belum dikonfirmasi. Buka kotak masuk/spam emailmu lalu verifikasi.';
    }
    if (lower.contains('user already registered') || lower.contains('already been registered')) {
      return 'Email ini sudah terdaftar. Pindah ke tab Login ya.';
    }
    return raw.replaceFirst('Exception: ', '');
  }

  Future<void> _submit() async {
    setState(() {
      _errorMsg = null;
      _infoMsg = null;
    });

    final email = _emailCtrl.text.trim().toLowerCase();
    final pass = _passCtrl.text;

    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      setState(() => _errorMsg = 'Masukkan alamat email yang valid.');
      return;
    }
    if (pass.length < 6) {
      setState(() => _errorMsg = 'Kata sandi minimal 6 karakter.');
      return;
    }

    if (_isRegister) {
      if (_namaCtrl.text.trim().length < 2) {
        setState(() => _errorMsg = 'Masukkan nama lengkapmu (minimal 2 huruf).');
        return;
      }
      if (pass != _confirmCtrl.text) {
        setState(() => _errorMsg = 'Konfirmasi kata sandi tidak sama.');
        return;
      }
    }

    setState(() => _busy = true);
    try {
      final notifier = ref.read(cermatProvider.notifier);
      if (!_isRegister) {
        await notifier.signInWithSupabase(email, pass);
        if (mounted) context.go('/');
      } else {
        final needsConfirm = await notifier.registerWithSupabase(
          nama: _namaCtrl.text.trim(),
          email: email,
          password: pass,
          namaKebun: _farmCtrl.text.trim(),
          lokasiKebun: _locCtrl.text.trim(),
        );
        if (!mounted) return;
        if (needsConfirm) {
          setState(() {
            _isRegister = false;
            _passCtrl.clear();
            _confirmCtrl.clear();
            _infoMsg =
                'Akun dibuat! Klik tautan verifikasi di kotak masuk/spam emailmu lalu login — atau matikan "Confirm email" di Supabase → Authentication → Providers → Email agar bisa langsung masuk tanpa verifikasi.';
          });
        } else {
          context.go('/');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMsg = _translateError(e.toString()));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  InputDecoration _dec(CermatPalette p, String label, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 19, color: p.inkSoft),
      suffixIcon: suffix,
      filled: true,
      fillColor: p.surface2,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: p.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: p.line),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;

    return Scaffold(
      backgroundColor: p.bg,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 28),
              children: [
                // Header Brand + Maskot
                Row(
                  children: [
                    CermoMascot(pose: _isRegister ? CermoPose.bibit : CermoPose.happy, size: 70),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('CermatTani', style: context.displayStyle(size: 24)),
                          Text(
                            'Akun terhubung ke profil, kebun, riwayat scan & chat',
                            style: TextStyle(fontSize: 12.5, color: p.inkSoft),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                CermatCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Tab Switcher Login / Daftar
                      SegmentedButton<bool>(
                        segments: const [
                          ButtonSegment(value: false, label: Text('Login'), icon: Icon(Icons.login_rounded)),
                          ButtonSegment(value: true, label: Text('Daftar Akun'), icon: Icon(Icons.person_add_alt_1_rounded)),
                        ],
                        selected: {_isRegister},
                        onSelectionChanged: (v) => setState(() {
                          _isRegister = v.first;
                          _errorMsg = null;
                          _infoMsg = null;
                        }),
                      ),
                      const SizedBox(height: 14),

                      Text(
                        _isRegister ? 'Buat Akun Petani Baru' : 'Masuk ke Akun Kebunmu',
                        style: context.displayStyle(size: 20),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _isRegister
                            ? 'Profil, kebun awal, tanaman, riwayat scan, dan obrolan Cermo langsung terhubung ke akunmu.'
                            : 'Gunakan email dan kata sandi akun CermatTani untuk memuat seluruh data kebunmu.',
                        style: TextStyle(fontSize: 13, color: p.inkSoft, height: 1.45),
                      ),
                      const SizedBox(height: 14),

                      if (!SupabaseConfig.isConfigured) ...[
                        const StatusAlertCard(
                          accent: AppColors.warn,
                          title: 'Konfigurasi Supabase belum aktif',
                          body: 'Build APK tanpa SUPABASE_URL & SUPABASE_ANON_KEY.',
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (_errorMsg != null) ...[
                        StatusAlertCard(
                          accent: AppColors.bad,
                          title: 'Periksa kembali',
                          body: _errorMsg!,
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (_infoMsg != null) ...[
                        StatusAlertCard(
                          accent: p.leaf600,
                          title: 'Berhasil',
                          body: _infoMsg!,
                        ),
                        const SizedBox(height: 12),
                      ],

                      if (_isRegister) ...[
                        TextField(
                          controller: _namaCtrl,
                          textInputAction: TextInputAction.next,
                          decoration: _dec(p, 'Nama Lengkap', Icons.person_outline_rounded),
                        ),
                        const SizedBox(height: 10),
                      ],

                      TextField(
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        decoration: _dec(p, 'Alamat Email', Icons.email_outlined),
                      ),
                      const SizedBox(height: 10),

                      TextField(
                        controller: _passCtrl,
                        obscureText: !_showPassword,
                        textInputAction: _isRegister ? TextInputAction.next : TextInputAction.done,
                        onSubmitted: (_) {
                          if (!_isRegister) _submit();
                        },
                        decoration: _dec(
                          p,
                          'Kata Sandi (min. 6 karakter)',
                          Icons.lock_outline_rounded,
                          suffix: IconButton(
                            onPressed: () => setState(() => _showPassword = !_showPassword),
                            icon: Icon(
                              _showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              size: 19,
                            ),
                          ),
                        ),
                      ),

                      if (_isRegister) ...[
                        const SizedBox(height: 10),
                        TextField(
                          controller: _confirmCtrl,
                          obscureText: !_showPassword,
                          textInputAction: TextInputAction.next,
                          decoration: _dec(p, 'Konfirmasi Kata Sandi', Icons.lock_reset_rounded),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _farmCtrl,
                          textInputAction: TextInputAction.next,
                          decoration: _dec(p, 'Nama Kebun Awal', Icons.eco_outlined),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _locCtrl,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _submit(),
                          decoration: _dec(p, 'Lokasi Kebun (opsional)', Icons.location_on_outlined),
                        ),
                      ],

                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: Primary3DButton(
                          label: _busy
                              ? 'Menghubungkan akun...'
                              : (_isRegister ? 'Daftar & Mulai' : 'Masuk ke Dasbor'),
                          icon: _isRegister ? Icons.person_add_alt_1_rounded : Icons.login_rounded,
                          onPressed: (_busy || !SupabaseConfig.isConfigured) ? null : _submit,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),
                CermatAccentCard(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Icon(Icons.verified_user_outlined, size: 18, color: p.leaf700),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Terhubung ke tabel profiles, farms, plants, scans, harvest_events & chat_messages (RLS per akun).',
                          style: TextStyle(fontSize: 12, color: p.inkSoft, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
