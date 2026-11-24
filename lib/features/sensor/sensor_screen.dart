import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 7: Lahan & Irigasi — Simulator 3D Isometrik Interaktif + Grafik 24 Jam Kurva Halus (Anti-Hitam!)
class SensorScreen extends ConsumerStatefulWidget {
  const SensorScreen({super.key});

  @override
  ConsumerState<SensorScreen> createState() => _SensorScreenState();
}

class _SensorScreenState extends ConsumerState<SensorScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _anim;
  double _yaw = 0.0; // -1.0 .. 1.0 rotasi geser 3D isometrik
  int _chartTab = 0; // 0: Tanah | 1: Suhu | 2: Udara | 3: Cahaya

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);

    final chartPoints = switch (_chartTab) {
      1 => state.sensor24h.map((e) => ChartPoint(e.jam, e.suhu)).toList(),
      2 => state.sensor24h.map((e) => ChartPoint(e.jam, e.udara.toDouble())).toList(),
      3 => state.sensor24h.map((e) => ChartPoint(e.jam, e.cahayaKlux)).toList(),
      _ => state.sensor24h.map((e) => ChartPoint(e.jam, e.tanah.toDouble())).toList(),
    };
    final chartColor = switch (_chartTab) {
      1 => AppColors.tomatoBtn,
      2 => AppColors.water,
      3 => AppColors.sun400,
      _ => p.leaf600,
    };
    final chartUnit = switch (_chartTab) {
      1 => '°C',
      2 => '%',
      3 => 'k',
      _ => '%',
    };

    return AppScaffold(
      location: '/sensor',
      title: 'Lahan & irigasi 3D',
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 600;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              // 1. Simulator 3D Isometrik Lahan Interaktif (Geser untuk putar + Preset Cuaca)
              CermatCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Simulasi 3D lahan kebun', style: context.cardTitleStyle(size: 16.5)),
                              Text(
                                'Geser kiri/kanan untuk putar sudut lahan · ketuk cuaca untuk uji sensor',
                                style: TextStyle(fontSize: 12, color: p.inkSoft),
                              ),
                            ],
                          ),
                        ),
                        CermatPill.simulasi(),
                      ],
                    ),
                    const SizedBox(height: 10),
                    GestureDetector(
                      onHorizontalDragUpdate: (d) =>
                          setState(() => _yaw = (_yaw + d.delta.dx * 0.008).clamp(-1.0, 1.0)),
                      onDoubleTap: () => setState(() => _yaw = 0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          height: 210,
                          width: double.infinity,
                          child: AnimatedBuilder(
                            animation: _anim,
                            builder: (_, __) => CustomPaint(
                              painter: _FarmIso3DPainter(
                                animValue: _anim.value,
                                yaw: _yaw,
                                soilMoisture: state.kelembapanTanah,
                                tankLevel: state.levelTandon,
                                pumpOn: state.pompaMenyala,
                                weather: state.cuacaPreset,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _WeatherChip('Cerah', Icons.wb_sunny_outlined, state.cuacaPreset == 'cerah', () => notifier.applyWeatherScenario('cerah')),
                          const SizedBox(width: 8),
                          _WeatherChip('Kemarau', Icons.local_fire_department_outlined, state.cuacaPreset == 'kemarau', () => notifier.applyWeatherScenario('kemarau')),
                          const SizedBox(width: 8),
                          _WeatherChip('Hujan', Icons.grain_rounded, state.cuacaPreset == 'hujan', () => notifier.applyWeatherScenario('hujan')),
                          const SizedBox(width: 8),
                          _WeatherChip('Malam', Icons.dark_mode_outlined, state.cuacaPreset == 'malam', () => notifier.applyWeatherScenario('malam')),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 2. 4 KPI Sensor Utama
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: isWide ? 4 : 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: isWide ? 1.15 : 1.38,
                children: [
                  MetricCard3(
                    label: 'Kelembapan tanah',
                    value: '${state.kelembapanTanah}%',
                    icon: Icons.water_drop_rounded,
                    variant: MetricCardVariant.lime,
                    badge: state.isSoilDry ? 'Kering' : 'Ideal',
                  ),
                  MetricCard3(
                    label: 'Suhu udara',
                    value: '${state.suhuUdara}°C',
                    icon: Icons.thermostat_rounded,
                    variant: MetricCardVariant.forest,
                    badge: state.suhuUdara > 31 ? 'Panas' : 'Nyaman',
                  ),
                  MetricCard3(
                    label: 'Kelembapan udara',
                    value: '${state.kelembapanUdara}%',
                    icon: Icons.cloud_outlined,
                    variant: MetricCardVariant.white,
                    badge: state.isDiseaseRisk ? 'Jamur!' : 'Aman',
                  ),
                  MetricCard3(
                    label: 'Cahaya kebun',
                    value: '${(state.cahayaLux / 1000).toStringAsFixed(1)}k',
                    icon: Icons.light_mode_outlined,
                    variant: MetricCardVariant.white,
                    badge: 'Lux',
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // 3. Grafik Sensor 24 Jam (SmoothAreaChart Pastel — anti-hitam!)
              CermatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Grafik sensor 24 jam', style: context.cardTitleStyle(size: 16.5)),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _ChartMetricChip('Tanah (%)', _chartTab == 0, () => setState(() => _chartTab = 0)),
                          const SizedBox(width: 6),
                          _ChartMetricChip('Suhu (°C)', _chartTab == 1, () => setState(() => _chartTab = 1)),
                          const SizedBox(width: 6),
                          _ChartMetricChip('Udara (%)', _chartTab == 2, () => setState(() => _chartTab = 2)),
                          const SizedBox(width: 6),
                          _ChartMetricChip('Cahaya (kLux)', _chartTab == 3, () => setState(() => _chartTab = 3)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SmoothAreaChart(
                      points: chartPoints,
                      color: chartColor,
                      unit: chartUnit,
                      height: 175,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 4. Kontrol Irigasi Otomatis / Manual + Pengaman Tandon
              CermatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Kontrol irigasi & tandon', style: context.cardTitleStyle(size: 16.5))),
                        state.pompaMenyala ? CermatPill.water('Pompa MENYALA') : CermatPill.ok('Pompa Siaga'),
                      ],
                    ),
                    if (state.isTankCritical) ...[
                      const SizedBox(height: 10),
                      StatusAlertCard(
                        accent: AppColors.bad,
                        title: 'Tandon kritis (${state.levelTandon}%) — Interlock aktif',
                        body: 'Pompa ditahan otomatis agar dinamo tidak rusak karena kering. Isi tandon terlebih dahulu.',
                      ),
                    ],
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      activeColor: p.leaf600,
                      title: const Text('Mode irigasi otomatis', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                      subtitle: Text('ON < ${state.ambangTanahBawah}% · OFF ≥ ${state.ambangTanahAtas}% · Maks ${state.durasiMaksPompa} mnt'),
                      value: state.irigasiAuto,
                      onChanged: (v) => notifier.setIrigasiAuto(v),
                    ),
                    const SizedBox(height: 6),
                    SizedBox(
                      width: double.infinity,
                      child: Primary3DButton(
                        label: state.pompaMenyala ? 'Matikan pompa sekarang' : 'Nyalakan pompa manual',
                        icon: state.pompaMenyala ? Icons.stop_circle_outlined : Icons.water_drop_rounded,
                        tomato: state.pompaMenyala,
                        onPressed: () {
                          final msg = notifier.toggleManualPump();
                          ScaffoldMessenger.of(context)
                            ..hideCurrentSnackBar()
                            ..showSnackBar(SnackBar(content: Text(msg)));
                        },
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text('Uji kelembapan tanah: ${state.kelembapanTanah}%', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                    Slider(
                      value: state.kelembapanTanah.toDouble(),
                      min: 10,
                      max: 90,
                      onChanged: (v) => notifier.updateSensor(kelembapanTanah: v.round()),
                    ),
                    Text('Uji level air tandon: ${state.levelTandon}% (jarak ${state.jarakUltrasonikCm} cm)', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                    Slider(
                      value: state.levelTandon.toDouble(),
                      min: 5,
                      max: 100,
                      onChanged: (v) => notifier.updateSensor(levelTandon: v.round()),
                    ),
                    Text('Uji kelembapan udara: ${state.kelembapanUdara}% RH', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                    Slider(
                      value: state.kelembapanUdara.toDouble(),
                      min: 40,
                      max: 98,
                      onChanged: (v) => notifier.updateSensor(kelembapanUdara: v.round()),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 5. NPK Tanah & Riwayat Pompa
              CermatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Indikator hara tanah (NPK)', style: context.cardTitleStyle(size: 16.5)),
                    const SizedBox(height: 10),
                    StripedBarWidget(label: 'Nitrogen (N)', valueLabel: '${state.nitrogenMgKg} mg/kg', percent: state.nitrogenMgKg.toDouble(), color: p.leaf600),
                    const SizedBox(height: 8),
                    StripedBarWidget(label: 'Fosfor (P)', valueLabel: '${state.fosforMgKg} mg/kg', percent: state.fosforMgKg.toDouble(), color: AppColors.sun400),
                    const SizedBox(height: 8),
                    StripedBarWidget(label: 'Kalium (K)', valueLabel: '${state.kaliumMgKg} mg/kg', percent: state.kaliumMgKg.toDouble(), color: AppColors.tomato500),
                    const SizedBox(height: 14),
                    Text('Riwayat penyiraman terakhir', style: context.cardTitleStyle(size: 15)),
                    const SizedBox(height: 8),
                    for (final ev in state.irrigationEvents.take(4))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${DateFormat('d MMM · HH:mm', 'id_ID').format(ev.waktu)} (${ev.mode})',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                            Text(
                              '${ev.durasiMenit} mnt · ${ev.kelembapanAwal}%→${ev.kelembapanAkhir}%',
                              style: TextStyle(fontSize: 12.5, color: p.inkSoft),
                            ),
                          ],
                        ),
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
}

class _WeatherChip extends StatelessWidget {
  const _WeatherChip(this.label, this.icon, this.active, this.onTap);
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: active ? p.leaf600 : p.surface2,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: active ? p.leaf600 : p.line),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: active ? p.onLeaf : p.leaf700),
            const SizedBox(width: 5),
            Text(label, style: TextStyle(fontSize: 12.2, fontWeight: FontWeight.w700, color: active ? p.onLeaf : p.ink)),
          ],
        ),
      ),
    );
  }
}

class _ChartMetricChip extends StatelessWidget {
  const _ChartMetricChip(this.label, this.active, this.onTap);
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: active ? p.surfaceMilk : p.surface2,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: active ? p.leaf600 : p.line),
        ),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? p.leaf700 : p.inkSoft)),
      ),
    );
  }
}

/// CustomPainter 3D Isometrik Lahan Ringan & Interaktif (60fps native)
class _FarmIso3DPainter extends CustomPainter {
  const _FarmIso3DPainter({
    required this.animValue,
    required this.yaw,
    required this.soilMoisture,
    required this.tankLevel,
    required this.pumpOn,
    required this.weather,
  });

  final double animValue;
  final double yaw;
  final int soilMoisture;
  final int tankLevel;
  final bool pumpOn;
  final String weather;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Langit sesuai preset cuaca (tetap cerah nyaman kecuali malam lembut)
    final skyColors = switch (weather) {
      'kemarau' => const [Color(0xFFFDF2D9), Color(0xFFF5E6C8)],
      'hujan' => const [Color(0xFFD8E7EE), Color(0xFFE6EFEA)],
      'malam' => const [Color(0xFF28423A), Color(0xFF3E6155)],
      _ => const [Color(0xFFF6F2E4), Color(0xFFDCEEE0)],
    };
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: skyColors,
        ).createShader(Offset.zero & size),
    );

    // Matahari / Bulan
    final orbX = w * 0.82 - yaw * 14;
    if (weather == 'malam') {
      canvas.drawCircle(Offset(orbX, 34), 14, Paint()..color = const Color(0xFFF6E7B4));
    } else if (weather != 'hujan') {
      canvas.drawCircle(Offset(orbX, 34), 22, Paint()..color = const Color(0xFFF8D680).withAlpha(90));
      canvas.drawCircle(Offset(orbX, 34), 13, Paint()..color = const Color(0xFFF2BC52));
    }

    // 2. Platform Lahan 3D Isometrik
    final cx = w * 0.5 + yaw * 16;
    final cy = h * 0.62;
    final rx = math.min(w * 0.36, 138.0);
    const ry = 46.0;
    final tiltShift = yaw * 16;

    final top = Offset(cx + tiltShift * 0.4, cy - ry);
    final right = Offset(cx + rx, cy);
    final bottom = Offset(cx - tiltShift * 0.4, cy + ry);
    final left = Offset(cx - rx, cy);

    // Tebal tanah 3D sisi bawah
    const depth = 22.0;
    final leftSide = Path()
      ..moveTo(left.dx, left.dy)
      ..lineTo(bottom.dx, bottom.dy)
      ..lineTo(bottom.dx, bottom.dy + depth)
      ..lineTo(left.dx, left.dy + depth)
      ..close();
    canvas.drawPath(leftSide, Paint()..color = const Color(0xFF9C7B5C));

    final rightSide = Path()
      ..moveTo(bottom.dx, bottom.dy)
      ..lineTo(right.dx, right.dy)
      ..lineTo(right.dx, right.dy + depth)
      ..lineTo(bottom.dx, bottom.dy + depth)
      ..close();
    canvas.drawPath(rightSide, Paint()..color = const Color(0xFF816347));

    // Permukaan lahan berubah warna sesuai kelembapan tanah
    final turfColor = soilMoisture < 35
        ? const Color(0xFFB5C78E)
        : soilMoisture > 70
            ? const Color(0xFF69AE7D)
            : const Color(0xFF83C28E);
    final deck = Path()
      ..moveTo(top.dx, top.dy)
      ..lineTo(right.dx, right.dy)
      ..lineTo(bottom.dx, bottom.dy)
      ..lineTo(left.dx, left.dy)
      ..close();
    canvas.drawPath(deck, Paint()..color = turfColor);

    // 3. Bedengan tomat + titik buah koral + pipa tetes
    for (var row = 0; row < 3; row++) {
      final t = (row + 1) / 4.0;
      final pStart = Offset.lerp(top, left, t)!;
      final pEnd = Offset.lerp(right, bottom, t)!;
      final bedStart = Offset.lerp(pStart, pEnd, 0.16)!;
      final bedEnd = Offset.lerp(pStart, pEnd, 0.84)!;

      canvas.drawLine(
        bedStart,
        bedEnd,
        Paint()
          ..color = const Color(0xFF6D513B)
          ..strokeWidth = 9
          ..strokeCap = StrokeCap.round,
      );

      if (pumpOn) {
        final dripPos = Offset.lerp(bedStart, bedEnd, animValue)!;
        canvas.drawLine(
          bedStart,
          bedEnd,
          Paint()
            ..color = const Color(0xFF4CA4DF).withAlpha(170)
            ..strokeWidth = 2.4,
        );
        canvas.drawCircle(dripPos, 4, Paint()..color = const Color(0xFF56B7F5));
      }

      for (var k = 0; k < 4; k++) {
        final plantPos = Offset.lerp(bedStart, bedEnd, (k + 0.5) / 4.0)!;
        final sway = math.sin(animValue * math.pi * 2 + row + k) * 1.4;
        canvas.drawCircle(
          Offset(plantPos.dx + sway, plantPos.dy - 9),
          8.5,
          Paint()..color = soilMoisture < 35 ? const Color(0xFF7CA462) : const Color(0xFF3E8F5F),
        );
        if ((row + k).isEven) {
          canvas.drawCircle(
            Offset(plantPos.dx + 2.5 + sway, plantPos.dy - 7),
            2.6,
            Paint()..color = AppColors.tomatoBtn,
          );
        }
      }
    }

    // 4. Tandon Air Silinder 3D di pojok kiri atas lahan
    final tankBase = Offset(top.dx - 44, top.dy + 14);
    const tankW = 28.0;
    const tankH = 42.0;
    final waterH = tankH * (tankLevel / 100.0).clamp(0.08, 1.0);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(tankBase.dx, tankBase.dy - tankH, tankW, tankH), const Radius.circular(8)),
      Paint()..color = const Color(0xFFE4F0F7),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(tankBase.dx + 2, tankBase.dy - waterH + 2, tankW - 4, math.max(4, waterH - 4)),
        const Radius.circular(6),
      ),
      Paint()..color = tankLevel < 20 ? AppColors.bad : AppColors.water,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(tankBase.dx, tankBase.dy - tankH, tankW, tankH), const Radius.circular(8)),
      Paint()
        ..color = const Color(0xFF6B8A9E)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6,
    );

    // 5. Panel Surya Mini di pojok kanan atas lahan
    final solarPos = Offset(top.dx + 28, top.dy - 14);
    canvas.drawLine(
      Offset(solarPos.dx + 14, solarPos.dy + 16),
      Offset(solarPos.dx + 14, solarPos.dy + 30),
      Paint()
        ..color = const Color(0xFF5D7268)
        ..strokeWidth = 3,
    );
    final panel = Path()
      ..moveTo(solarPos.dx, solarPos.dy + 6)
      ..lineTo(solarPos.dx + 28, solarPos.dy)
      ..lineTo(solarPos.dx + 34, solarPos.dy + 16)
      ..lineTo(solarPos.dx + 6, solarPos.dy + 22)
      ..close();
    canvas.drawPath(panel, Paint()..color = const Color(0xFF2B5D7A));
    canvas.drawPath(
      panel,
      Paint()
        ..color = Colors.white.withAlpha(150)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.3,
    );

    // 6. Tetesan hujan bila preset Hujan
    if (weather == 'hujan') {
      final rainPaint = Paint()
        ..color = const Color(0xFF5B99C2).withAlpha(140)
        ..strokeWidth = 1.6
        ..strokeCap = StrokeCap.round;
      for (var i = 0; i < 16; i++) {
        final rxDrop = ((i * 37.0 + animValue * 45) % w);
        final ryDrop = ((i * 29.0 + animValue * h) % h);
        canvas.drawLine(Offset(rxDrop, ryDrop), Offset(rxDrop - 4, ryDrop + 11), rainPaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _FarmIso3DPainter old) => true;
}
