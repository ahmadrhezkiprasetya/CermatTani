import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 2: Beranda CermatTani — Ringan, Cerah Hijau Susu × Krim Hangat, Responsif HP & Tablet
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);
    final farm = state.activeFarm;
    final activePlants = state.activePlants;
    final farmTasks = state.tasks.where((t) => t.farmId == farm.id).toList();
    final upcomingHarvests = state.harvestEvents
        .where((h) => h.sumber == 'estimasi')
        .toList()
      ..sort((a, b) => a.tanggal.compareTo(b.tanggal));
    final liveAlerts = state.liveSensorAlerts;
    final activeRemCount = state.jadwalPengingat.where((r) => r.aktif).length;

    return AppScaffold(
      location: '/',
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 600;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 30),
            children: [
              // Header ringkas: Kebun aktif + Bell badge + Pengaturan
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => _openFarmPicker(context, ref),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: p.surfaceMilk,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(Icons.eco_rounded, color: p.leaf700, size: 22),
                            ),
                            const SizedBox(width: 10),
                            Flexible(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Flexible(
                                        child: Text(
                                          farm.nama,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: context.cardTitleStyle(size: 15.5),
                                        ),
                                      ),
                                      Icon(Icons.keyboard_arrow_down_rounded, size: 19, color: p.inkSoft),
                                    ],
                                  ),
                                  Text(
                                    '${farm.lokasi} · ${activePlants.length} petak',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 12, color: p.inkSoft),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Notifikasi & jadwal pengingat',
                    onPressed: () => context.go('/notifications'),
                    icon: Badge(
                      isLabelVisible: state.totalUnreadBadge > 0,
                      label: Text(state.totalUnreadBadge > 9 ? '9+' : '${state.totalUnreadBadge}'),
                      backgroundColor: AppColors.tomatoBtn,
                      child: Icon(Icons.notifications_none_rounded, color: p.ink),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Pengaturan',
                    onPressed: () => context.go('/settings'),
                    icon: Icon(Icons.settings_outlined, color: p.ink),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Hero Kartu Aksen Hijau Susu × Krim Hangat dengan Pak Cermat Transparan (Tanpa Frame!)
              CermatAccentCard(
                padding: const EdgeInsets.fromLTRB(18, 16, 14, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: [
                                  CermatPill.ok('${activePlants.length} tanaman aktif'),
                                  CermatPill.water('$activeRemCount pengingat aktif'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text('Halo, ${state.userName}!', style: context.displayStyle(size: 24)),
                              const SizedBox(height: 4),
                              Text(
                                liveAlerts.isNotEmpty
                                    ? 'Ada ${liveAlerts.length} kondisi lahan yang perlu dicek sekarang.'
                                    : state.scans.isEmpty
                                        ? 'Siap pindai foto buah atau daun dengan Gemini AI hari ini?'
                                        : 'Terakhir scan: ${state.scans.first.penyakitUtamaNama} (${state.scans.first.keyakinan}%).',
                                style: TextStyle(fontSize: 13.5, color: p.inkSoft, height: 1.42),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        CermoMascot(
                          pose: liveAlerts.isNotEmpty ? CermoPose.worried : CermoPose.happy,
                          size: isWide ? 104 : 88,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Primary3DButton(
                            label: 'Scan Foto AI',
                            icon: Icons.camera_alt_rounded,
                            tomato: true,
                            onPressed: () => context.go('/scan'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: SecondaryOutlineButton(
                            label: 'Tanya Cermo',
                            icon: Icons.chat_bubble_outline_rounded,
                            onPressed: () => context.go('/chatbot'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Alert kondisi sensor aktif (bila ada)
              if (liveAlerts.isNotEmpty) ...[
                const SizedBox(height: 12),
                StatusAlertCard(
                  accent: liveAlerts.first.severity == AlertSeverity.danger ? AppColors.bad : AppColors.warn,
                  icon: Icons.warning_amber_rounded,
                  title: liveAlerts.first.judul,
                  body: liveAlerts.first.isi,
                  action: liveAlerts.first.actionRoute != null
                      ? SecondaryOutlineButton(
                          label: liveAlerts.first.actionLabel ?? 'Lihat detail',
                          onPressed: () => context.go(liveAlerts.first.actionRoute!),
                        )
                      : null,
                ),
              ],
              const SizedBox(height: 14),

              // 4 KPI Seragam (2×2 di HP, 4 kolom di Tablet)
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: isWide ? 4 : 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: isWide ? 1.12 : 1.32,
                children: [
                  MetricCard3(
                    label: 'Kelembapan tanah',
                    value: '${state.kelembapanTanah}%',
                    icon: Icons.water_drop_rounded,
                    variant: MetricCardVariant.lime,
                    badge: state.isSoilDry ? 'Kering' : 'Ideal',
                  ),
                  MetricCard3(
                    label: 'Level air tandon',
                    value: '${state.levelTandon}%',
                    icon: Icons.waves_rounded,
                    variant: MetricCardVariant.white,
                    badge: state.isTankCritical ? 'Kritis' : 'Aman',
                  ),
                  MetricCard3(
                    label: 'Baterai surya',
                    value: '${state.bateraiPersen}%',
                    icon: Icons.wb_sunny_rounded,
                    variant: MetricCardVariant.forest,
                    badge: state.isPowerSave ? 'Hemat' : '${state.teganganVolt}V',
                  ),
                  MetricCard3(
                    label: 'Jadwal panen',
                    value: '${upcomingHarvests.length}',
                    icon: Icons.calendar_month_rounded,
                    variant: MetricCardVariant.white,
                    badge: state.pompaMenyala ? 'Pompa ON' : 'Siaga',
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Ringkasan Sensor & Pintu ke Simulasi 3D Lahan (ringan di Beranda!)
              CermatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text('Kondisi lahan saat ini', style: context.cardTitleStyle(size: 16.5)),
                        ),
                        CermatPill.simulasi(),
                      ],
                    ),
                    const SizedBox(height: 12),
                    StripedBarWidget(
                      label: 'Kelembapan tanah (ideal 45–65%)',
                      valueLabel: '${state.kelembapanTanah}%',
                      percent: state.kelembapanTanah.toDouble(),
                      color: state.isSoilDry ? AppColors.warn : p.leaf600,
                    ),
                    const SizedBox(height: 10),
                    StripedBarWidget(
                      label: 'Kelembapan udara (risiko jamur ≥ ${state.ambangKelembapanPenyakit}%)',
                      valueLabel: '${state.kelembapanUdara}% RH · ${state.suhuUdara}°C',
                      percent: state.kelembapanUdara.toDouble(),
                      color: state.isDiseaseRisk ? AppColors.bad : AppColors.water,
                    ),
                    const SizedBox(height: 10),
                    StripedBarWidget(
                      label: 'Cadangan air tandon',
                      valueLabel: '${state.levelTandon}%',
                      percent: state.levelTandon.toDouble(),
                      color: state.isTankCritical ? AppColors.bad : AppColors.water,
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Primary3DButton(
                            label: 'Buka Simulasi 3D Lahan',
                            icon: Icons.view_in_ar_rounded,
                            onPressed: () => context.go('/sensor'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        SecondaryOutlineButton(
                          label: 'Surya',
                          icon: Icons.bolt_rounded,
                          onPressed: () => context.go('/solar'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Jadwal Panen Terdekat
              CermatCard(
                color: p.creamWarm,
                borderColor: p.creamBorder,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Jadwal panen terdekat', style: context.cardTitleStyle(size: 16.5))),
                        TextButton(
                          onPressed: () => context.go('/calendar'),
                          child: Text('Kalender →', style: TextStyle(fontWeight: FontWeight.w700, color: p.leaf700)),
                        ),
                      ],
                    ),
                    if (upcomingHarvests.isEmpty)
                      Text(
                        'Belum ada jadwal estimasi panen. Lakukan scan buah untuk menjadwalkan otomatis.',
                        style: TextStyle(fontSize: 13.5, color: p.inkSoft),
                      )
                    else
                      for (final h in upcomingHarvests.take(2)) ...[
                        const SizedBox(height: 8),
                        _HarvestQuickRow(
                          event: h,
                          plantName: state.plants.where((pl) => pl.id == h.plantId).firstOrNull?.nama ?? 'Tanaman',
                          onHarvestNow: () => notifier.markHarvestActual(h.id),
                        ),
                      ],
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Checklist Tugas Harian Kebun
              CermatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Tugas kebun hari ini', style: context.cardTitleStyle(size: 16.5))),
                        TextButton.icon(
                          onPressed: () => _openAddTaskDialog(context, ref),
                          icon: const Icon(Icons.add_rounded, size: 18),
                          label: const Text('Tambah'),
                        ),
                      ],
                    ),
                    if (farmTasks.isEmpty)
                      Text('Semua tugas selesai. Selamat beristirahat!', style: TextStyle(color: p.inkSoft))
                    else
                      for (final t in farmTasks)
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          activeColor: p.leaf600,
                          checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          value: t.selesai,
                          onChanged: (_) => notifier.toggleTask(t.id),
                          title: Text(
                            t.judul,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              decoration: t.selesai ? TextDecoration.lineThrough : null,
                              color: t.selesai ? p.inkSoft : p.ink,
                            ),
                          ),
                          subtitle: Text(t.waktuLabel, style: TextStyle(fontSize: 12, color: p.inkSoft)),
                        ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _openFarmPicker(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.read(cermatProvider);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: p.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
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
                    f.id == state.activeFarmId ? Icons.check_circle_rounded : Icons.eco_outlined,
                    color: p.leaf600,
                  ),
                  title: Text(f.nama, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${f.lokasi} · ${f.luasLabel}'),
                  onTap: () {
                    ref.read(cermatProvider.notifier).selectFarm(f.id);
                    Navigator.pop(ctx);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _openAddTaskDialog(BuildContext context, WidgetRef ref) {
    final ctrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tambah tugas kebun'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Contoh: Semprot POC sore hari'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              if (ctrl.text.trim().isNotEmpty) {
                ref.read(cermatProvider.notifier).addTask(ctrl.text, 'Hari ini');
              }
              Navigator.pop(ctx);
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }
}

class _HarvestQuickRow extends StatelessWidget {
  const _HarvestQuickRow({
    required this.event,
    required this.plantName,
    required this.onHarvestNow,
  });

  final HarvestEventModel event;
  final String plantName;
  final VoidCallback onHarvestNow;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final today = DateTime.now();
    final diff = DateTime(event.tanggal.year, event.tanggal.month, event.tanggal.day)
        .difference(DateTime(today.year, today.month, today.day))
        .inDays;
    final badge = diff <= 0 ? 'Hari ini' : '$diff hari lagi';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: p.line),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(plantName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    diff <= 0 ? CermatPill.bad(badge) : CermatPill.ok(badge),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  '${DateFormat('d MMM', 'id_ID').format(event.tanggal)} · ${event.catatan}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12.5, color: p.inkSoft),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: p.leaf600,
              foregroundColor: p.onLeaf,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: onHarvestNow,
            child: const Text('Panen', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
          ),
        ],
      ),
    );
  }
}
