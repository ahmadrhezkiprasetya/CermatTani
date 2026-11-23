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

final _routerProvider = Provider<GoRouter>((ref) {
  final onboarded = ref.read(cermatProvider).onboarded;
  return GoRouter(
    initialLocation: onboarded ? '/' : '/onboarding',
    routes: [
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
      GoRoute(path: '/scan', builder: (_, __) => const ScanScreen()),
      GoRoute(path: '/plants', builder: (_, __) => const PlantsScreen()),
      GoRoute(path: '/calendar', builder: (_, __) => const CalendarScreen()),
      GoRoute(path: '/sensor', builder: (_, __) => const SensorScreen()),
      GoRoute(path: '/solar', builder: (_, __) => const SolarScreen()),
      GoRoute(path: '/chatbot', builder: (_, __) => const ChatbotScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
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
