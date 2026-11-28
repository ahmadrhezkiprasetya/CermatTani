import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Pusat Notifikasi & Jadwal Pengingat Kanan Atas (2 Tab: Peringatan & Atur Jadwal)
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  int _tab = 0; // 0: Peringatan | 1: Atur Jadwal

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);
    final liveAlerts = state.liveSensorAlerts;

    return AppScaffold(
      location: '/notifications',
      title: 'Notifikasi & jadwal',
      showBack: true,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          // 2-Tab Bar: Peringatan & Atur Jadwal
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: p.surface2,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: p.line),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _SegmentBtn(
                    'Peringatan (${liveAlerts.length + state.notifications.length})',
                    _tab == 0,
                    () => setState(() => _tab = 0),
                  ),
                ),
                Expanded(
                  child: _SegmentBtn(
                    'Atur Jadwal (${state.jadwalPengingat.where((r) => r.aktif).length})',
                    _tab == 1,
                    () => setState(() => _tab = 1),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (_tab == 0) ...[
            // Tombol cepat Uji Alert + Tandai dibaca + Bersihkan
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Primary3DButton(
                  label: 'Uji alert kanan atas',
                  icon: Icons.notifications_active_outlined,
                  onPressed: () => notifier.triggerTestAlert(),
                ),
                if (state.notifications.isNotEmpty) ...[
                  SecondaryOutlineButton(
                    label: 'Tandai dibaca',
                    onPressed: () => notifier.markAllNotifsRead(),
                  ),
                  SecondaryOutlineButton(
                    label: 'Bersihkan',
                    onPressed: () => notifier.clearNotifications(),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 14),

            // Peringatan Sensor Real-time Aktif
            if (liveAlerts.isNotEmpty) ...[
              Text('Peringatan sensor aktif saat ini', style: context.cardTitleStyle(size: 15.5)),
              const SizedBox(height: 8),
              for (final a in liveAlerts) ...[
                StatusAlertCard(
                  accent: a.severity == AlertSeverity.danger ? AppColors.bad : AppColors.warn,
                  icon: Icons.warning_amber_rounded,
                  title: a.judul,
                  body: a.isi,
                  action: a.actionRoute != null
                      ? SecondaryOutlineButton(
                          label: a.actionLabel ?? 'Cek sekarang',
                          onPressed: () => context.go(a.actionRoute!),
                        )
                      : null,
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 6),
            ],

            // Riwayat Notifikasi
            if (state.notifications.isEmpty && liveAlerts.isEmpty)
              CermatCard(
                child: Column(
                  children: [
                    const CermoMascot(pose: CermoPose.happy, size: 96),
                    const SizedBox(height: 10),
                    Text('Semua kondisi kebun terpantau aman', style: context.displayStyle(size: 19)),
                    const SizedBox(height: 6),
                    Text(
                      'Pengingat jadwal harian dan peringatan sensor otomatis akan muncul di sudut kanan atas & tercatat di sini.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13.5, color: p.inkSoft),
                    ),
                  ],
                ),
              )
            else if (state.notifications.isNotEmpty) ...[
              Text('Riwayat notifikasi', style: context.cardTitleStyle(size: 15.5)),
              const SizedBox(height: 8),
              for (final n in state.notifications)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: CermatCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(n.judul, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                            ),
                            if (!n.dibaca)
                              Container(
                                width: 8.5,
                                height: 8.5,
                                decoration: const BoxDecoration(color: AppColors.tomatoBtn, shape: BoxShape.circle),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(n.isi, style: TextStyle(fontSize: 13.5, color: p.inkSoft)),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(n.waktu, style: TextStyle(fontSize: 12, color: p.inkSoft)),
                            if (n.actionRoute != null && n.actionLabel != null)
                              GestureDetector(
                                onTap: () => context.go(n.actionRoute!),
                                child: Text(
                                  '${n.actionLabel} →',
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: p.leaf700),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ] else ...[
            // Tab 2: Atur Jadwal Pengingat Harian + Sensor Otomatis
            CermatCard(
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: p.leaf600,
                title: const Text('Alert sensor otomatis (kanan atas)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                subtitle: Text(
                  'Muncul otomatis saat tanah kering, tandon kritis, jamur tinggi, atau baterai ≤ 20%.',
                  style: TextStyle(fontSize: 12.5, color: p.inkSoft),
                ),
                value: state.peringatanOtomatisSensor,
                onChanged: (v) => notifier.setSensorAutoAlerts(v),
              ),
            ),
            const SizedBox(height: 12),

            CermatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text('Jadwal pengingat harian', style: context.cardTitleStyle(size: 16))),
                      TextButton.icon(
                        onPressed: () => _openAddScheduleDialog(context),
                        icon: const Icon(Icons.add_rounded, size: 18),
                        label: const Text('Tambah'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  for (final r in state.jadwalPengingat)
                    Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: p.surface2,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: p.line),
                      ),
                      child: Row(
                        children: [
                          InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () => _pickScheduleTime(context, r),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: p.surfaceMilk,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(r.jam, style: TextStyle(fontWeight: FontWeight.w700, color: p.leaf700)),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(r.judul, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.8)),
                                Text(r.catatan, style: TextStyle(fontSize: 12, color: p.inkSoft)),
                              ],
                            ),
                          ),
                          Switch(
                            activeColor: p.leaf600,
                            value: r.aktif,
                            onChanged: (v) => notifier.updateReminderSchedule(r.id, aktif: v),
                          ),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            icon: Icon(Icons.delete_outline_rounded, size: 19, color: p.inkSoft),
                            onPressed: () => notifier.deleteReminderSchedule(r.id),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _pickScheduleTime(BuildContext context, ReminderScheduleModel item) async {
    final parts = item.jam.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.first) ?? 7,
      minute: int.tryParse(parts.last) ?? 0,
    );
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked == null) return;
    final formatted =
        '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    ref.read(cermatProvider.notifier).updateReminderSchedule(item.id, jam: formatted);
  }

  void _openAddScheduleDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    var kategori = ReminderCategory.siram;
    var jam = '07:30';

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Tambah jadwal pengingat'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Nama pengingat (mis. Cek tandon sore)'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<ReminderCategory>(
                value: kategori,
                decoration: const InputDecoration(labelText: 'Kategori'),
                items: const [
                  DropdownMenuItem(value: ReminderCategory.siram, child: Text('Penyiraman')),
                  DropdownMenuItem(value: ReminderCategory.cekDaun, child: Text('Cek daun & hama')),
                  DropdownMenuItem(value: ReminderCategory.pupuk, child: Text('Pemupukan')),
                  DropdownMenuItem(value: ReminderCategory.panen, child: Text('Panen')),
                ],
                onChanged: (v) => setDlg(() => kategori = v ?? ReminderCategory.siram),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Jam pengingat: $jam', style: const TextStyle(fontWeight: FontWeight.w700)),
                  TextButton(
                    onPressed: () async {
                      final picked = await showTimePicker(
                        context: ctx,
                        initialTime: const TimeOfDay(hour: 7, minute: 30),
                      );
                      if (picked != null) {
                        setDlg(() {
                          jam = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
                        });
                      }
                    },
                    child: const Text('Pilih jam'),
                  ),
                ],
              ),
              TextField(
                controller: noteCtrl,
                decoration: const InputDecoration(labelText: 'Catatan singkat (opsional)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(
              onPressed: () {
                if (titleCtrl.text.trim().isNotEmpty) {
                  ref.read(cermatProvider.notifier).addReminderSchedule(
                        judul: titleCtrl.text,
                        jam: jam,
                        kategori: kategori,
                        catatan: noteCtrl.text,
                      );
                }
                Navigator.pop(ctx);
              },
              child: const Text('Simpan'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SegmentBtn extends StatelessWidget {
  const _SegmentBtn(this.label, this.active, this.onTap);
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? p.leaf600 : Colors.transparent,
          borderRadius: BorderRadius.circular(11),
        ),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: active ? p.onLeaf : p.inkSoft),
        ),
      ),
    );
  }
}
