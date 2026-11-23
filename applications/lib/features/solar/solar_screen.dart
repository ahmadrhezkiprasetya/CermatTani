import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 8: Energi Surya — Monitor INA219 (F13) + Kalkulator Perancangan (F9)
class SolarScreen extends ConsumerStatefulWidget {
  const SolarScreen({super.key});

  @override
  ConsumerState<SolarScreen> createState() => _SolarScreenState();
}

class _SolarScreenState extends ConsumerState<SolarScreen> {
  // Default persis PRD F9.2: 1 W, 24 jam, 2 hari, DoD 0.8, η 0.85, PSH 4, f_rugi 0.7
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
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          // F13: Pemantauan Energi Surya INA219
          CermatCard(
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
                            children: [
                              CermatPill.simulasi(),
                              if (state.isPowerSave) CermatPill.warn('Mode hemat'),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text('Monitor INA219', style: context.displayStyle(size: 21)),
                          Text('Sisa baterai ${state.bateraiPersen}% · ${state.teganganVolt} V · ${state.dayaWatt} W', style: TextStyle(color: p.inkSoft)),
                        ],
                      ),
                    ),
                    CermoMascot(pose: state.isPowerSave ? CermoPose.sleep : CermoPose.happy, size: 74),
                  ],
                ),
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: state.bateraiPersen / 100,
                  minHeight: 14,
                  borderRadius: BorderRadius.circular(99),
                  color: state.isPowerSave ? AppColors.warn : AppColors.ok,
                  backgroundColor: p.surface2,
                ),
                if (state.isPowerSave) ...[
                  const SizedBox(height: 12),
                  const StatusAlertCard(
                    accent: AppColors.warn,
                    title: 'Mode hemat aktif (F13.2)',
                    body: 'Baterai rendah. ESP32 mengirim data lebih jarang (30 menit sekali) dan Cermo istirahat sementara.',
                  ),
                ],
                const SizedBox(height: 12),
                Text('Uji simulasi baterai (≤ 20% = Mode hemat): ${state.bateraiPersen}%', style: const TextStyle(fontWeight: FontWeight.w600)),
                Slider(
                  value: state.bateraiPersen.toDouble(),
                  min: 8,
                  max: 100,
                  activeColor: p.leaf600,
                  onChanged: (v) => ref.read(cermatProvider.notifier).updateSensor(bateraiPersen: v.round()),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // F9: Kalkulator Perancangan Tenaga Surya
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
                Row(
                  children: [
                    Expanded(
                      child: MetricCard3(
                        label: 'Energi harian',
                        value: '${eHarian.toStringAsFixed(0)} Wh',
                        icon: Icons.bolt_rounded,
                        variant: MetricCardVariant.lime,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: MetricCard3(
                        label: 'Baterai',
                        value: '≈${cBaterai.round()} Wh',
                        icon: Icons.battery_charging_full_rounded,
                        variant: MetricCardVariant.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: MetricCard3(
                        label: 'Panel',
                        value: '${pRounded} Wp',
                        icon: Icons.wb_sunny_rounded,
                        variant: MetricCardVariant.forest,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'Hasil hitungan tepat: E = ${eHarian.toStringAsFixed(1)} Wh · C = ${cBaterai.toStringAsFixed(1)} Wh · P_panel = ${pPanel.toStringAsFixed(1)} Wp (dibulatkan $pRounded Wp).',
                  style: TextStyle(fontSize: 13, color: p.inkSoft),
                ),
                const SizedBox(height: 14),
                _CalcSlider('Daya beban P', '${dayaW.toStringAsFixed(1)} W', dayaW, 0.5, 10, (v) => setState(() => dayaW = double.parse(v.toStringAsFixed(1)))),
                _CalcSlider('Durasi operasi t', '${jamHarian.round()} jam', jamHarian, 4, 24, (v) => setState(() => jamHarian = v.roundToDouble())),
                _CalcSlider('Hari otonomi H', '${hariOtonomi.toStringAsFixed(1)} hari', hariOtonomi, 1, 5, (v) => setState(() => hariOtonomi = double.parse(v.toStringAsFixed(1)))),
                _CalcSlider('PSH lokasi', '${psh.toStringAsFixed(1)} jam/hari', psh, 2, 6, (v) => setState(() => psh = double.parse(v.toStringAsFixed(1)))),
                const SizedBox(height: 6),
                SecondaryOutlineButton(
                  label: 'Kembalikan contoh awal PRD',
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
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            Text(display, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
        Slider(value: val.clamp(min, max), min: min, max: max, activeColor: context.ct.leaf600, onChanged: onChanged),
      ],
    );
  }
}
