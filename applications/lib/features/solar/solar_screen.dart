import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 8: Energi Surya — Hijau Susu × Krim Hangat, Monitor INA219 + Kalkulator Responsif
class SolarScreen extends ConsumerStatefulWidget {
  const SolarScreen({super.key});

  @override
  ConsumerState<SolarScreen> createState() => _SolarScreenState();
}

class _SolarScreenState extends ConsumerState<SolarScreen> {
  double dayaW = 1.0;
  double jamHarian = 24.0;
  double hariOtonomi = 2.0;
  double dod = 0.8;
  double efisiensi = 0.85;
  double psh = 4.0;
  double faktorRugi = 0.7;

  int _roundPanel(double wp) {
    const std = [10, 20, 30, 50, 80, 100, 150, 200];
    for (final s in std) {
      if (s >= wp) return s;
    }
    return ((wp / 50).ceil() * 50);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);

    final eHarian = dayaW * jamHarian;
    final cBaterai = (eHarian * hariOtonomi) / (dod * efisiensi);
    final pPanel = eHarian / (psh * faktorRugi);
    final pRounded = _roundPanel(pPanel);

    return AppScaffold(
      location: '/solar',
      title: 'Energi surya',
      showBack: true,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 390;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              // Monitor INA219 dengan Kartu Aksen Hijau Susu × Krim Hangat
              CermatAccentCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: [
                                  CermatPill.simulasi(),
                                  if (state.isPowerSave) CermatPill.warn('Mode hemat'),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text('Monitor INA219', style: context.displayStyle(size: 21)),
                              Text(
                                'Baterai ${state.bateraiPersen}% · ${state.teganganVolt} V · ${state.dayaWatt} W',
                                style: TextStyle(color: p.inkSoft, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                        CermoMascot(
                          pose: state.isPowerSave ? CermoPose.sleep : CermoPose.happy,
                          size: 80,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _SolidBatteryCard(
                      percent: state.bateraiPersen,
                      powerSave: state.isPowerSave,
                    ),
                    if (state.isPowerSave) ...[
                      const SizedBox(height: 12),
                      const StatusAlertCard(
                        accent: AppColors.warn,
                        title: 'Mode hemat aktif (≤ 20%)',
                        body: 'Baterai rendah. ESP32 memperlambat interval kirim data (30 menit sekali) agar tetap menyala.',
                      ),
                    ],
                    const SizedBox(height: 10),
                    Text('Uji simulasi baterai: ${state.bateraiPersen}%', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                    Slider(
                      value: state.bateraiPersen.toDouble(),
                      min: 8,
                      max: 100,
                      onChanged: (v) => ref.read(cermatProvider.notifier).updateSensor(bateraiPersen: v.round()),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Kalkulator Tenaga Surya Responsif (anti-overflow di HP sempit)
              CermatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Kalkulator tenaga surya', style: context.displayStyle(size: 20))),
                        CermatPill.simulasi(label: 'Rancangan'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: isNarrow ? 2 : 3,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                      childAspectRatio: isNarrow ? 1.25 : 0.96,
                      children: [
                        MetricCard3(
                          label: 'Energi harian',
                          value: '${eHarian.toStringAsFixed(0)} Wh',
                          icon: Icons.bolt_rounded,
                          variant: MetricCardVariant.lime,
                        ),
                        MetricCard3(
                          label: 'Baterai',
                          value: '≈${cBaterai.round()} Wh',
                          icon: Icons.battery_charging_full_rounded,
                          variant: MetricCardVariant.white,
                        ),
                        MetricCard3(
                          label: 'Panel surya',
                          value: '$pRounded Wp',
                          icon: Icons.wb_sunny_rounded,
                          variant: MetricCardVariant.forest,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Hasil tepat: E = ${eHarian.toStringAsFixed(1)} Wh · C = ${cBaterai.toStringAsFixed(1)} Wh · P_panel = ${pPanel.toStringAsFixed(1)} Wp (standar $pRounded Wp).',
                      style: TextStyle(fontSize: 13, color: p.inkSoft),
                    ),
                    const SizedBox(height: 14),
                    _CalcSlider('Daya beban P', '${dayaW.toStringAsFixed(1)} W', dayaW, 0.5, 10, (v) => setState(() => dayaW = double.parse(v.toStringAsFixed(1)))),
                    _CalcSlider('Durasi operasi t', '${jamHarian.round()} jam', jamHarian, 4, 24, (v) => setState(() => jamHarian = v.roundToDouble())),
                    _CalcSlider('Hari mendung (otonomi)', '${hariOtonomi.toStringAsFixed(1)} hari', hariOtonomi, 1, 5, (v) => setState(() => hariOtonomi = double.parse(v.toStringAsFixed(1)))),
                    _CalcSlider('PSH lokasi', '${psh.toStringAsFixed(1)} jam/hari', psh, 2, 6, (v) => setState(() => psh = double.parse(v.toStringAsFixed(1)))),
                    const SizedBox(height: 6),
                    SecondaryOutlineButton(
                      label: 'Kembalikan contoh awal',
                      icon: Icons.refresh_rounded,
                      onPressed: () => setState(() {
                        dayaW = 1.0;
                        jamHarian = 24.0;
                        hariOtonomi = 2.0;
                        dod = 0.8;
                        efisiensi = 0.85;
                        psh = 4.0;
                        faktorRugi = 0.7;
                      }),
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

class _SolidBatteryCard extends StatelessWidget {
  const _SolidBatteryCard({required this.percent, required this.powerSave});

  final int percent;
  final bool powerSave;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final clamped = percent.clamp(0, 100);
    final fillColor = powerSave
        ? AppColors.warn
        : clamped <= 40
            ? const Color(0xFFCA8A04)
            : p.leaf600;
    final borderColor = powerSave ? const Color(0xFFB45309) : p.forest900;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: p.line),
      ),
      child: Row(
        children: [
          // Ikon bentuk baterai solid mulus (tanpa garis-garis)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 118,
                height: 48,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: p.surface2,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 2.5),
                ),
                child: Stack(
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AnimatedFractionallySizedBox(
                        duration: const Duration(milliseconds: 260),
                        curve: Curves.easeOutCubic,
                        widthFactor: (clamped / 100).clamp(0.08, 1.0),
                        heightFactor: 1,
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(7),
                            gradient: LinearGradient(
                              colors: [fillColor.withAlpha(220), fillColor],
                            ),
                          ),
                        ),
                      ),
                    ),
                    Center(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.bolt_rounded,
                            size: 16,
                            color: clamped >= 48 ? Colors.white : borderColor,
                          ),
                          Text(
                            '$clamped%',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: clamped >= 48 ? Colors.white : borderColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 7,
                height: 20,
                margin: const EdgeInsets.only(left: 2),
                decoration: BoxDecoration(
                  color: borderColor,
                  borderRadius: const BorderRadius.horizontal(right: Radius.circular(4)),
                ),
              ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Kapasitas baterai surya',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: p.ink),
                ),
                const SizedBox(height: 3),
                Text(
                  powerSave
                      ? 'Mode hemat aktif — kurangi beban sementara.'
                      : 'Pasokan daya stabil untuk ESP32 & sensor.',
                  style: TextStyle(fontSize: 12.2, color: p.inkSoft, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CalcSlider extends StatelessWidget {
  const _CalcSlider(this.label, this.display, this.val, this.min, this.max, this.onChanged);
  final String label, display;
  final double val, min, max;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5))),
            Text(display, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
          ],
        ),
        Slider(value: val.clamp(min, max), min: min, max: max, onChanged: onChanged),
      ],
    );
  }
}
