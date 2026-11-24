import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/cermat_state.dart';
import '../theme/app_theme.dart';

/// Kerangka responsif CermatTani (Hijau Susu Matcha + Top-Right Live Alert Banner + Bottom Nav 5 item)
class AppScaffold extends ConsumerWidget {
  const AppScaffold({
    super.key,
    required this.body,
    required this.location,
    this.title,
    this.showBack = false,
    this.trailingActions = const [],
  });

  final Widget body;
  final String location;
  final String? title;
  final bool showBack;
  final List<Widget> trailingActions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final badgeCount = state.totalUnreadBadge;
    final activeAlerts = state.activeAlerts;

    return Scaffold(
      backgroundColor: p.bg,
      appBar: title != null
          ? AppBar(
              backgroundColor: p.bg,
              surfaceTintColor: Colors.transparent,
              leading: showBack
                  ? IconButton(
                      icon: Icon(Icons.arrow_back_rounded, color: p.ink),
                      onPressed: () => context.go('/'),
                    )
                  : null,
              title: Text(title!, style: context.displayStyle(size: 21)),
              actions: [
                ...trailingActions,
                IconButton(
                  tooltip: 'Notifikasi & jadwal pengingat',
                  onPressed: () => context.go('/notifications'),
                  icon: Badge(
                    isLabelVisible: badgeCount > 0,
                    label: Text(badgeCount > 9 ? '9+' : '$badgeCount'),
                    backgroundColor: AppColors.tomatoBtn,
                    child: Icon(Icons.notifications_none_rounded, color: p.ink),
                  ),
                ),
                IconButton(
                  tooltip: 'Menu lainnya',
                  onPressed: () => _openMoreSheet(context),
                  icon: Icon(Icons.grid_view_rounded, color: p.ink),
                ),
                const SizedBox(width: 4),
              ],
            )
          : null,
      body: SafeArea(
        top: title == null,
        child: Stack(
          children: [
            // Responsif untuk HP kecil hingga tablet lebar (maxWidth 840px terpusat)
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 840),
                child: SizedBox(width: double.infinity, height: double.infinity, child: body),
              ),
            ),

            // Overlay Live Alert Kanan Atas (Jadwal & Sensor Real-time)
            if (activeAlerts.isNotEmpty)
              Positioned(
                top: 8,
                right: 12,
                left: MediaQuery.of(context).size.width > 480 ? null : 12,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 360),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (final alert in activeAlerts)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _TopRightAlertCard(
                            alert: alert,
                            onDismiss: () => ref.read(cermatProvider.notifier).dismissAlert(alert.id),
                            onAction: alert.actionRoute != null
                                ? () {
                                    ref.read(cermatProvider.notifier).dismissAlert(alert.id);
                                    context.go(alert.actionRoute!);
                                  }
                                : null,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
      bottomNavigationBar: _BottomNav(location: location),
    );
  }

  void _openMoreSheet(BuildContext context) {
    final p = context.ct;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: p.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(color: p.line, borderRadius: BorderRadius.circular(99)),
                ),
              ),
              const SizedBox(height: 16),
              Text('Menu CermatTani', style: context.displayStyle(size: 20)),
              const SizedBox(height: 14),
              LayoutBuilder(
                builder: (_, c) {
                  final cols = c.maxWidth > 500 ? 4 : 2;
                  return GridView.count(
                    shrinkWrap: true,
                    crossAxisCount: cols,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: cols == 4 ? 1.9 : 2.35,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _MoreTile(
                        icon: Icons.calendar_month_rounded,
                        label: 'Kalender panen',
                        onTap: () {
                          Navigator.pop(context);
                          context.go('/calendar');
                        },
                      ),
                      _MoreTile(
                        icon: Icons.wb_sunny_outlined,
                        label: 'Energi surya',
                        onTap: () {
                          Navigator.pop(context);
                          context.go('/solar');
                        },
                      ),
                      _MoreTile(
                        icon: Icons.notifications_active_outlined,
                        label: 'Notif & jadwal',
                        onTap: () {
                          Navigator.pop(context);
                          context.go('/notifications');
                        },
                      ),
                      _MoreTile(
                        icon: Icons.settings_outlined,
                        label: 'Pengaturan',
                        onTap: () {
                          Navigator.pop(context);
                          context.go('/settings');
                        },
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopRightAlertCard extends StatelessWidget {
  const _TopRightAlertCard({
    required this.alert,
    required this.onDismiss,
    this.onAction,
  });

  final LiveAlertModel alert;
  final VoidCallback onDismiss;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final accent = switch (alert.severity) {
      AlertSeverity.danger => AppColors.bad,
      AlertSeverity.warn => AppColors.warn,
      AlertSeverity.info => p.leaf600,
    };
    final icon = switch (alert.severity) {
      AlertSeverity.danger => Icons.error_outline_rounded,
      AlertSeverity.warn => Icons.warning_amber_rounded,
      AlertSeverity.info => Icons.notifications_active_rounded,
    };

    return Material(
      color: p.surface,
      elevation: 10,
      shadowColor: const Color(0xFF1F392D).withAlpha(46),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: accent.withAlpha(110), width: 1.2),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: accent, width: 4.5)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(icon, color: accent, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert.judul,
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: p.ink),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        alert.isi,
                        style: TextStyle(fontSize: 12.5, height: 1.38, color: p.inkSoft),
                      ),
                      if (onAction != null && alert.actionLabel != null) ...[
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: onAction,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: p.surfaceMilk,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '${alert.actionLabel} →',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: p.leaf700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  icon: Icon(Icons.close_rounded, size: 17, color: p.inkSoft),
                  onPressed: onDismiss,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  const _MoreTile({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: p.surface2,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: p.line.withAlpha(140)),
        ),
        child: Row(
          children: [
            Icon(icon, color: p.leaf600, size: 21),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: p.ink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({required this.location});
  final String location;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(top: BorderSide(color: p.line)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF285941).withAlpha(p.isDark ? 60 : 16),
            blurRadius: 18,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: SizedBox(
              height: 74,
              child: Row(
                children: [
                  Expanded(
                    child: _NavItem(
                      icon: Icons.home_rounded,
                      label: 'Beranda',
                      selected: location == '/',
                      onTap: () => context.go('/'),
                    ),
                  ),
                  Expanded(
                    child: _NavItem(
                      icon: Icons.eco_outlined,
                      label: 'Tanaman',
                      selected: location == '/plants',
                      onTap: () => context.go('/plants'),
                    ),
                  ),
                  // Tombol Scan 62px menonjol di tengah bottom-nav
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Transform.translate(
                          offset: const Offset(0, -13),
                          child: GestureDetector(
                            onTap: () => context.go('/scan'),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 62,
                              height: 62,
                              decoration: BoxDecoration(
                                color: AppColors.tomatoBtn,
                                shape: BoxShape.circle,
                                border: Border.all(color: p.surface, width: 4),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.tomatoBtn.withAlpha(90),
                                    blurRadius: 14,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 27),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _NavItem(
                      icon: Icons.water_drop_outlined,
                      label: 'Lahan',
                      selected: location == '/sensor',
                      onTap: () => context.go('/sensor'),
                    ),
                  ),
                  Expanded(
                    child: _NavItem(
                      icon: Icons.chat_bubble_outline_rounded,
                      label: 'Cermo',
                      selected: location == '/chatbot',
                      onTap: () => context.go('/chatbot'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final color = selected ? p.leaf700 : p.inkSoft;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: selected ? p.surfaceMilk : Colors.transparent,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Icon(icon, size: 22, color: color),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
