import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/cermat_state.dart';
import '../theme/app_theme.dart';

/// Kerangka mobile-first FarmVista: bottom-nav 5 item (Beranda, Tanaman, [FAB Scan 64px], Lahan, Cermo)
class AppScaffold extends ConsumerWidget {
  const AppScaffold({
    super.key,
    required this.body,
    required this.location,
    this.title,
    this.showBack = false,
  });

  final Widget body;
  final String location;
  final String? title;
  final bool showBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final unread = state.notifications.where((n) => !n.dibaca).length;

    return Scaffold(
      backgroundColor: p.bg,
      appBar: title != null
          ? AppBar(
              backgroundColor: p.bg,
              leading: showBack
                  ? IconButton(
                      icon: const Icon(Icons.arrow_back_rounded),
                      onPressed: () => context.go('/'),
                    )
                  : null,
              title: Text(title!, style: context.displayStyle(size: 21)),
              actions: [
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
                  tooltip: 'Menu lainnya',
                  onPressed: () => _openMoreSheet(context),
                  icon: const Icon(Icons.grid_view_rounded),
                ),
              ],
            )
          : null,
      body: SafeArea(
        top: title == null,
        child: body,
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
              GridView.count(
                shrinkWrap: true,
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 2.3,
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
                    icon: Icons.notifications_none_rounded,
                    label: 'Notifikasi',
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
              ),
            ],
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
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: p.surface2,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, color: p.leaf600, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
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
            color: const Color(0xFF14302A).withAlpha(22),
            blurRadius: 20,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 76,
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
              // Tombol Scan 64px menonjol di tengah bottom-nav (DESIGN.md §6 & §7)
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Transform.translate(
                      offset: const Offset(0, -14),
                      child: GestureDetector(
                        onTap: () => context.go('/scan'),
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.tomatoBtn,
                            shape: BoxShape.circle,
                            border: Border.all(color: p.surface, width: 4),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.tomatoBtn.withAlpha(95),
                                blurRadius: 14,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 28),
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
    final color = selected ? p.leaf600 : p.inkSoft;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: selected ? p.lime300.withAlpha(p.isDark ? 46 : 135) : Colors.transparent,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Icon(icon, size: 22, color: color),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
