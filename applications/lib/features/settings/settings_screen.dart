import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 10: Pengaturan — Sinkron Jadwal Pengingat Kanan Atas, Tema Hijau Susu, Ambang & Privasi
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _nameCtrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: ref.read(cermatProvider).userName);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);
    final activeRem = state.jadwalPengingat.where((r) => r.aktif).toList();

    return AppScaffold(
      location: '/settings',
      title: 'Pengaturan',
      showBack: true,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          // Profil pengguna + Pak Cermat tanpa frame
          CermatAccentCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CermoMascot(pose: CermoPose.happy, size: 74),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Profil petani', style: context.displayStyle(size: 19)),
                          Text(
                            '${state.activeFarm.nama} · ${state.plants.length} tanaman',
                            style: TextStyle(fontSize: 13, color: p.inkSoft),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _nameCtrl,
                  decoration: InputDecoration(
                    labelText: 'Nama panggilan',
                    filled: true,
                    fillColor: p.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
                const SizedBox(height: 10),
                Primary3DButton(
                  label: 'Simpan nama',
                  onPressed: () {
                    notifier.setUserName(_nameCtrl.text);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil disimpan')));
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Kartu Sinkron Jadwal Pengingat & Alert Kanan Atas
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Pengingat & alert kanan atas', style: context.displayStyle(size: 19))),
                    CermatPill.ok('${activeRem.length} aktif'),
                  ],
                ),
                const SizedBox(height: 6),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeColor: p.leaf600,
                  title: const Text('Alert sensor otomatis kanan atas', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text('Tanah kering, tandon kritis, jamur tinggi, baterai ≤ 20%', style: TextStyle(fontSize: 12.2, color: p.inkSoft)),
                  value: state.peringatanOtomatisSensor,
                  onChanged: (v) => notifier.setSensorAutoAlerts(v),
                ),
                if (activeRem.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final r in activeRem) CermatPill.water('${r.jam} · ${r.judul}'),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Primary3DButton(
                        label: 'Atur jadwal',
                        icon: Icons.schedule_rounded,
                        onPressed: () => context.go('/notifications'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SecondaryOutlineButton(
                      label: 'Uji alert',
                      icon: Icons.notifications_active_outlined,
                      onPressed: () => notifier.triggerTestAlert(),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Tema & Bahasa
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Tampilan & bahasa', style: context.displayStyle(size: 19)),
                const SizedBox(height: 10),
                SegmentedButton<ThemeMode>(
                  segments: const [
                    ButtonSegment(value: ThemeMode.light, label: Text('Terang'), icon: Icon(Icons.wb_sunny_outlined)),
                    ButtonSegment(value: ThemeMode.dark, label: Text('Gelap'), icon: Icon(Icons.dark_mode_outlined)),
                    ButtonSegment(value: ThemeMode.system, label: Text('Sistem'), icon: Icon(Icons.smartphone_rounded)),
                  ],
                  selected: {state.themeMode},
                  onSelectionChanged: (v) => notifier.setThemeMode(v.first),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Bahasa Indonesia (standar petani)', style: TextStyle(fontSize: 13.5)),
                    CermatPill.ok('Aktif'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Ambang peringatan
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ambang peringatan', style: context.displayStyle(size: 19)),
                const SizedBox(height: 12),
                Text('Ambang keyakinan rendah AI: ${state.ambangKeyakinanRendah}%'),
                Slider(
                  value: state.ambangKeyakinanRendah.toDouble(),
                  min: 40,
                  max: 85,
                  onChanged: (v) => notifier.updateThresholds(keyakinanRendah: v.round()),
                ),
                Text('Ambang kelembapan risiko jamur: ${state.ambangKelembapanPenyakit}%'),
                Slider(
                  value: state.ambangKelembapanPenyakit.toDouble(),
                  min: 70,
                  max: 95,
                  onChanged: (v) => notifier.updateThresholds(kelembapanPenyakit: v.round()),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeColor: p.leaf600,
                  title: const Text('Gunakan data sensor untuk pupuk', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text(state.sensorTersedia ? 'Label: Dengan data sensor' : 'Label: Dugaan visual'),
                  value: state.sensorTersedia,
                  onChanged: (v) => notifier.updateSensor(sensorTersedia: v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Privasi, Onboarding & Hapus Data
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Data, privasi & sumber', style: context.displayStyle(size: 19)),
                const SizedBox(height: 6),
                Text(
                  'Referensi dataset agronomi: Balitsa Kementan RI, FAO Tomato IPM, PlantVillage, dan LaboroTomato. Analisis foto & chat berjalan langsung lewat Gemini AI tanpa data dummy.',
                  style: TextStyle(fontSize: 13.2, color: p.inkSoft),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: SecondaryOutlineButton(
                    label: 'Ulangi onboarding (3 langkah)',
                    icon: Icons.waving_hand_outlined,
                    onPressed: () {
                      notifier.reopenOnboarding();
                      context.go('/onboarding');
                    },
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: SecondaryOutlineButton(
                    label: 'Reset data kebun awal',
                    icon: Icons.refresh_rounded,
                    onPressed: () {
                      notifier.resetDemo();
                      context.go('/');
                    },
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      foregroundColor: AppColors.bad,
                      side: const BorderSide(color: AppColors.bad),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.delete_outline_rounded),
                    label: const Text('Hapus semua data lokal'),
                    onPressed: () => _confirmDelete(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus semua data?'),
        content: const Text('Semua kebun, tanaman, riwayat scan, dan percakapan lokal akan dihapus.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.bad),
            onPressed: () {
              ref.read(cermatProvider.notifier).deleteAllData();
              Navigator.pop(ctx);
              context.go('/onboarding');
            },
            child: const Text('Ya, hapus'),
          ),
        ],
      ),
    );
  }
}
