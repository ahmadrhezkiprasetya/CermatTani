import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 2: Beranda Mobile sesuai DESIGN (3).md §6 & PRD §10
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final plants = state.activePlants;
    final farmTasks = state.tasks.where((t) => t.farmId == state.activeFarm.id).toList();
    final unread = state.notifications.where((n) => !n.dibaca).length;

    final readyFruits = state.scans
        .where((s) => plants.any((pl) => pl.id == s.plantId) && s.anjuranPanen == 'Panen sekarang')
        .fold<int>(0, (sum, s) => sum + s.jumlahBuah);
    final attentionCount = state.scans
        .where((s) => plants.any((pl) => pl.id == s.plantId) && (s.penyakitUtamaId != 'sehat' || s.keyakinanRendah))
        .map((s) => s.plantId)
        .toSet()
        .length;
    final healthyPct = plants.isEmpty ? 100 : (((plants.length - attentionCount) / plants.length) * 100).round().clamp(40, 100);

    final phases = const ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];
    final phaseColors = const [AppColors.mentah, AppColors.leaf500, AppColors.sun400, AppColors.tomato500, AppColors.tomatoBtn];

    return AppScaffold(
      location: '/',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          // Header sapaan + pemilih kebun + notifikasi + tema
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${_greeting()}, ${state.userName}', style: context.displayStyle(size: 23)),
                    const SizedBox(height: 2),
                    InkWell(
                      borderRadius: BorderRadius.circular(99),
                      onTap: () => _showFarmSheet(context, ref),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.location_on_outlined, size: 15, color: p.leaf600),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              state.activeFarm.nama,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: p.inkSoft),
                            ),
                          ),
                          Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: p.inkSoft),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Ganti tema',
                onPressed: () {
                  final next = p.isDark ? ThemeMode.light : ThemeMode.dark;
                  ref.read(cermatProvider.notifier).setThemeMode(next);
                },
                icon: Icon(p.isDark ? Icons.wb_sunny_outlined : Icons.dark_mode_outlined),
              ),
              IconButton(
                tooltip: 'Notifikasi',
                onPressed: () => context.go('/notifications'),
                icon: Badge(
                  isLabelVisible: unread > 0,
                  backgroundColor: AppColors.tomatoBtn,
                  child: const Icon(Icons.notifications_none_rounded),
                ),
              ),
              IconButton(
                tooltip: 'Pengaturan',
                onPressed: () => context.go('/settings'),
                icon: const Icon(Icons.settings_outlined),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Pintasan cepat fitur sekunder (Kalender, Energi surya, Pengaturan)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _QuickChip(icon: Icons.calendar_month_rounded, label: 'Kalender panen', onTap: () => context.go('/calendar')),
                const SizedBox(width: 8),
                _QuickChip(icon: Icons.wb_sunny_outlined, label: 'Energi surya', onTap: () => context.go('/solar')),
                const SizedBox(width: 8),
                _QuickChip(icon: Icons.settings_outlined, label: 'Pengaturan', onTap: () => context.go('/settings')),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Hero Scan (Maskot Cermo + tombol Scan selalu terlihat — DESIGN.md §2)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CermoMascot(
                      pose: state.isDiseaseRisk
                          ? CermoPose.worried
                          : readyFruits > 0
                              ? CermoPose.happy
                              : CermoPose.wave,
                      size: 86,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CermatPill.ok('Foto dulu, keputusan 5 dtk'),
                          const SizedBox(height: 6),
                          Text(
                            readyFruits > 0
                                ? 'Wah, ada $readyFruits tomat siap panen!'
                                : 'Halo! Yuk, cek tomatmu hari ini.',
                            style: context.displayStyle(size: 19),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: Primary3DButton(
                    label: 'Scan tanaman',
                    icon: Icons.camera_alt_rounded,
                    onPressed: () => context.go('/scan'),
                  ),
                ),
              ],
            ),
          ),

          // Peringatan risiko penyakit F11 (HANYA tampil bila ambang terlewati!)
          if (state.isDiseaseRisk) ...[
            const SizedBox(height: 14),
            StatusAlertCard(
              accent: AppColors.warn,
              title: 'Risiko jamur daun meningkat! (Simulasi)',
              body:
                  'Kelembapan udara ${state.kelembapanUdara}% (≥ ${state.ambangKelembapanPenyakit}%). Rawan busuk daun Phytophthora infestans (Balitsa Kementan RI).',
              leading: const CermoMascot(pose: CermoPose.worried, size: 46, interactive: false),
              action: Primary3DButton(
                label: 'Scan penyakit sekarang',
                icon: Icons.camera_alt_rounded,
                tomato: true,
                onPressed: () => context.go('/scan'),
              ),
            ),
          ],

          // Peringatan tandon kritis F12.2
          if (state.isTankCritical) ...[
            const SizedBox(height: 14),
            StatusAlertCard(
              accent: AppColors.bad,
              title: 'Tandon tinggal ${state.levelTandon}% (Simulasi)',
              body: 'Pompa otomatis kutahan dulu supaya tidak kering. Isi tandon sebelum menyiram.',
              leading: const CermoMascot(pose: CermoPose.water, size: 46, interactive: false),
              action: SecondaryOutlineButton(
                label: 'Buka monitor tandon',
                icon: Icons.water_drop_outlined,
                onPressed: () => context.go('/sensor'),
              ),
            ),
          ],

          const SizedBox(height: 16),

          // 3 Kartu Metrik: Lime, Putih, Hijau tua (DESIGN.md §7)
          Row(
            children: [
              Expanded(
                child: MetricCard3(
                  label: 'Siap panen',
                  value: '$readyFruits',
                  icon: Icons.auto_awesome_rounded,
                  variant: MetricCardVariant.lime,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: MetricCard3(
                  label: 'Tanaman',
                  value: '${plants.length}',
                  icon: Icons.eco_outlined,
                  variant: MetricCardVariant.white,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: MetricCard3(
                  label: 'Perlu cek',
                  value: '$attentionCount',
                  icon: Icons.warning_amber_rounded,
                  variant: MetricCardVariant.forest,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Alur Fase Tumbuh dengan avatar bulat (Plant Monitor)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Fase tumbuh tomat', style: context.displayStyle(size: 18)),
                    TextButton(onPressed: () => context.go('/plants'), child: const Text('Lihat semua')),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(phases.length, (i) {
                    final count = plants.where((pl) => pl.fase == phases[i]).length;
                    return GestureDetector(
                      onTap: () => context.go('/plants'),
                      child: Column(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: count > 0 ? phaseColors[i] : p.surface2,
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '$count',
                              style: context.displayStyle(size: 18, color: count > 0 ? Colors.white : p.inkSoft),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(phases[i], style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Gauge statistik & cincin persentase (Forest-900 penekanan)
          CermatCard(
            color: p.forest900,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Kesehatan & kematangan', style: context.displayStyle(size: 18, color: Colors.white)),
                    CermatPill(
                      label: 'Ringkasan',
                      background: AppColors.lime300.withAlpha(42),
                      foreground: AppColors.lime300,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                HealthSemiGaugeWidget(percent: healthyPct),
                const SizedBox(height: 14),
                Divider(color: Colors.white.withAlpha(38)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    PercentageRingWidget(percent: 78, label: 'Kematangan', color: AppColors.tomato500),
                    PercentageRingWidget(percent: state.kelembapanTanah, label: 'Tanah', color: AppColors.water),
                    PercentageRingWidget(percent: state.bateraiPersen, label: 'Surya', color: AppColors.lime300),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Batang produksi pastel persik + aktif tomato-500 (Estimasi kasar F6.2)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Perkiraan hasil panen', style: context.displayStyle(size: 18))),
                    CermatPill.warn('Estimasi kasar'),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Dari jumlah buah foto scan × bobot rata-rata', style: TextStyle(fontSize: 13, color: p.inkSoft)),
                const SizedBox(height: 16),
                const _ProductionBars(),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Cuaca mikro & sensor (Simulasi)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Cuaca mikro lahan', style: context.displayStyle(size: 18)),
                    CermatPill.simulasi(),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _MiniStat(label: 'Suhu', value: '${state.suhuUdara}°C')),
                    const SizedBox(width: 8),
                    Expanded(child: _MiniStat(label: 'Udara', value: '${state.kelembapanUdara}%')),
                    const SizedBox(width: 8),
                    Expanded(child: _MiniStat(label: 'Tanah', value: '${state.kelembapanTanah}%')),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: SecondaryOutlineButton(
                    label: 'Buka sensor, irigasi & tandon',
                    icon: Icons.water_drop_outlined,
                    onPressed: () => context.go('/sensor'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Daftar tugas harian (FarmVista)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Daftar tugas kebun', style: context.displayStyle(size: 18)),
                const SizedBox(height: 10),
                for (final t in farmTasks)
                  CheckboxListTile(
                    value: t.selesai,
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    activeColor: p.leaf600,
                    title: Text(
                      t.judul,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        decoration: t.selesai ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    subtitle: Text(t.waktuLabel, style: TextStyle(fontSize: 12.5, color: p.inkSoft)),
                    onChanged: (_) => ref.read(cermatProvider.notifier).toggleTask(t.id),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Kartu Ilustrasi Kebun + Jadwal Panen Gelap
          CermatCard(
            color: p.forest900,
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const GardenLandscapeBanner(height: 140),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Jadwal panen dekat', style: context.displayStyle(size: 18, color: Colors.white)),
                    TextButton(
                      onPressed: () => context.go('/calendar'),
                      child: const Text('Kalender', style: TextStyle(color: AppColors.lime300)),
                    ),
                  ],
                ),
                for (final ev in state.harvestEvents.where((e) => e.sumber == 'estimasi').take(3))
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(22),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(color: AppColors.tomato500, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  state.plants.where((pl) => pl.id == ev.plantId).firstOrNull?.nama ?? 'Tomat',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                                ),
                                Text(ev.catatan, style: TextStyle(color: Colors.white.withAlpha(195), fontSize: 12.5)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showFarmSheet(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.read(cermatProvider);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: p.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pilih kebun aktif', style: context.displayStyle(size: 20)),
              const SizedBox(height: 12),
              for (final f in state.farms)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    f.id == state.activeFarm.id ? Icons.check_circle_rounded : Icons.eco_outlined,
                    color: p.leaf600,
                  ),
                  title: Text(f.nama, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${f.lokasi} · ${f.luasLabel}'),
                  onTap: () {
                    ref.read(cermatProvider.notifier).selectFarm(f.id);
                    Navigator.pop(context);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return InkWell(
      borderRadius: BorderRadius.circular(99),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(99),
          boxShadow: [BoxShadow(color: const Color(0xFF14302A).withAlpha(16), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            Icon(icon, size: 17, color: p.leaf600),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(14)),
      child: Column(
        children: [
          Text(value, style: context.displayStyle(size: 19)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 12, color: p.inkSoft)),
        ],
      ),
    );
  }
}

class _ProductionBars extends StatelessWidget {
  const _ProductionBars();

  @override
  Widget build(BuildContext context) {
    const labels = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
    const vals = [1.4, 2.1, 1.9, 3.2, 2.7, 2.4];
    const maxV = 3.2;

    return SizedBox(
      height: 135,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(labels.length, (i) {
          final active = i == 3;
          return Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  '${vals[i]}kg',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                    color: active ? AppColors.tomatoBtn : context.ct.inkSoft,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: 26,
                  height: (vals[i] / maxV) * 86,
                  decoration: BoxDecoration(
                    color: active ? AppColors.tomato500 : AppColors.peachBar,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(10), bottom: Radius.circular(5)),
                  ),
                ),
                const SizedBox(height: 6),
                Text(labels[i], style: TextStyle(fontSize: 11.5, color: context.ct.inkSoft)),
              ],
            ),
          );
        }),
      ),
    );
  }
}
