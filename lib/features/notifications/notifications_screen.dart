import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);

    return AppScaffold(
      location: '/notifications',
      title: 'Notifikasi',
      showBack: true,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          if (state.notifications.isEmpty)
            CermatCard(
              child: Column(
                children: [
                  const CermoMascot(pose: CermoPose.happy, size: 84),
                  const SizedBox(height: 12),
                  Text('Belum ada notifikasi baru', style: context.displayStyle(size: 19)),
                ],
              ),
            )
          else ...[
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => ref.read(cermatProvider.notifier).markAllNotifsRead(),
                child: const Text('Tandai semua dibaca'),
              ),
            ),
            for (final n in state.notifications)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: CermatCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(n.judul, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5))),
                          if (!n.dibaca)
                            Container(width: 9, height: 9, decoration: const BoxDecoration(color: AppColors.tomatoBtn, shape: BoxShape.circle)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(n.isi, style: TextStyle(fontSize: 14, color: p.inkSoft)),
                      const SizedBox(height: 6),
                      Text(n.waktu, style: TextStyle(fontSize: 12, color: p.inkSoft)),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
