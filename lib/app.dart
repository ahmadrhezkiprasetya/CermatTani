import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'data/cermat_state.dart';
import 'features/calendar/calendar_screen.dart';
import 'features/chatbot/chatbot_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/plants/plants_screen.dart';
import 'features/scan/scan_screen.dart';
import 'features/sensor/sensor_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/solar/solar_screen.dart';

CustomTransitionPage<void> _smoothPage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    transitionDuration: const Duration(milliseconds: 240),
    reverseTransitionDuration: const Duration(milliseconds: 190),
    child: child,
    transitionsBuilder: (_, animation, __, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.02),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        ),
      );
    },
  );
}

final _routerProvider = Provider<GoRouter>((ref) {
  final onboarded = ref.read(cermatProvider).onboarded;
  return GoRouter(
    initialLocation: onboarded ? '/' : '/onboarding',
    routes: [
      GoRoute(path: '/onboarding', pageBuilder: (_, s) => _smoothPage(s, const OnboardingScreen())),
      GoRoute(path: '/', pageBuilder: (_, s) => _smoothPage(s, const DashboardScreen())),
      GoRoute(path: '/scan', pageBuilder: (_, s) => _smoothPage(s, const ScanScreen())),
      GoRoute(path: '/plants', pageBuilder: (_, s) => _smoothPage(s, const PlantsScreen())),
      GoRoute(path: '/calendar', pageBuilder: (_, s) => _smoothPage(s, const CalendarScreen())),
      GoRoute(path: '/sensor', pageBuilder: (_, s) => _smoothPage(s, const SensorScreen())),
      GoRoute(path: '/solar', pageBuilder: (_, s) => _smoothPage(s, const SolarScreen())),
      GoRoute(path: '/chatbot', pageBuilder: (_, s) => _smoothPage(s, const ChatbotScreen())),
      GoRoute(path: '/settings', pageBuilder: (_, s) => _smoothPage(s, const SettingsScreen())),
      GoRoute(path: '/notifications', pageBuilder: (_, s) => _smoothPage(s, const NotificationsScreen())),
    ],
  );
});

class CermatTaniApp extends ConsumerWidget {
  const CermatTaniApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(cermatProvider.select((s) => s.themeMode));
    final router = ref.watch(_routerProvider);

    return MaterialApp.router(
      title: 'CermatTani',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
