import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 6: Kalender Panen & Notifikasi Bot Telegram (F7.1–F7.3)
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  final _tgCtrl = TextEditingController();
  bool _testSent = false;

  @override
  void dispose() {
    _tgCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);

    return AppScaffold(
      location: '/calendar',
      title: 'Kalender panen',
      showBack: true,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Jadwal panen tanaman', style: context.displayStyle(size: 20)),
                const SizedBox(height: 4),
                Text('Hari panen ditandai warna tomat merah-oranye.', style: TextStyle(fontSize: 13.5, color: p.inkSoft)),
                const SizedBox(height: 14),
                if (state.harvestEvents.isEmpty)
                  Text('Belum ada jadwal panen. Scan buah tomat untuk menjadwalkan otomatis.', style: TextStyle(color: p.inkSoft))
                else
                  for (final ev in state.harvestEvents)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: ev.sumber == 'aktual' ? AppColors.ok.withAlpha(24) : AppColors.tomato500.withAlpha(26),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: ev.sumber == 'aktual' ? AppColors.ok : AppColors.tomato500,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${state.plants.where((pl) => pl.id == ev.plantId).firstOrNull?.nama ?? 'Tomat'} · ${ev.tanggal.day}/${ev.tanggal.month}/${ev.tanggal.year}',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
                                  ),
                                  Text(ev.catatan, style: TextStyle(fontSize: 13, color: p.inkSoft)),
                                ],
                              ),
                            ),
                            if (ev.sumber == 'estimasi')
                              TextButton(
                                onPressed: () => ref.read(cermatProvider.notifier).markHarvestActual(ev.id),
                                child: const Text('Sudah panen'),
                              )
                            else
                              CermatPill.ok('Aktual'),
                          ],
                        ),
                      ),
                    ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Notifikasi Bot Telegram 6 digit (F7.2, F7.3)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Pengingat Telegram', style: context.displayStyle(size: 20))),
                    state.telegramChatId != null ? CermatPill.ok('Tertaut') : CermatPill.warn('Belum tertaut'),
                  ],
                ),
                const SizedBox(height: 12),
                if (state.telegramChatId == null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(color: p.forest900, borderRadius: BorderRadius.circular(18)),
                    child: Column(
                      children: [
                        Text('Kode tautan 6 digit', style: TextStyle(color: Colors.white.withAlpha(200), fontSize: 12.5)),
                        const SizedBox(height: 6),
                        Text(
                          state.telegramCode,
                          style: context.displayStyle(size: 32, color: AppColors.lime300),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Kirim "/link ${state.telegramCode}" ke @CermatTaniBot',
                          style: TextStyle(color: Colors.white.withAlpha(215), fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _tgCtrl,
                    decoration: InputDecoration(
                      labelText: 'Username Telegram (opsional)',
                      filled: true,
                      fillColor: p.surface2,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Primary3DButton(
                          label: 'Konfirmasi tautan',
                          icon: Icons.send_rounded,
                          onPressed: () => ref.read(cermatProvider.notifier).linkTelegram(_tgCtrl.text),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        tooltip: 'Kode baru',
                        onPressed: () => ref.read(cermatProvider.notifier).regenerateTelegramCode(),
                        icon: const Icon(Icons.refresh_rounded),
                      ),
                    ],
                  ),
                ] else ...[
                  StatusAlertCard(
                    accent: AppColors.ok,
                    title: 'Tersambung ke ${state.telegramChatId}',
                    body: 'Pengingat panen dikirim otomatis setiap hari pukul ${state.telegramTime} WIB.',
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Primary3DButton(
                          label: 'Uji pengingat',
                          icon: Icons.notifications_active_outlined,
                          onPressed: () {
                            ref.read(cermatProvider.notifier).sendTestTelegram();
                            setState(() => _testSent = true);
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      SecondaryOutlineButton(
                        label: 'Putuskan',
                        onPressed: () => ref.read(cermatProvider.notifier).unlinkTelegram(),
                      ),
                    ],
                  ),
                  if (_testSent) ...[
                    const SizedBox(height: 10),
                    Text('Pesan uji berhasil dikirim ke ${state.telegramChatId} dan dicatat di Notifikasi.', style: TextStyle(fontSize: 13, color: p.leaf600, fontWeight: FontWeight.w600)),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
