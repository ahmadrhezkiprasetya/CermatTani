import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 7: Lahan — Sensor IoT (F8), Irigasi Otomatis (F10), Risiko Penyakit (F11), Tandon (F12)
class SensorScreen extends ConsumerWidget {
  const SensorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);

    return AppScaffold(
      location: '/sensor',
      title: 'Lahan, irigasi & tandon',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          Row(
            children: [
              CermatPill.simulasi(),
              const SizedBox(width: 8),
              Expanded(
                child: Text('ESP32 · DHT22 · BH1750 · Ultrasonik', style: TextStyle(fontSize: 13, color: p.inkSoft)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // F11.3: Peringatan risiko penyakit HANYA muncul bila ambang kelembapan udara terlewati
          if (state.isDiseaseRisk) ...[
            StatusAlertCard(
              accent: AppColors.warn,
              title: 'Peringatan dini risiko penyakit daun! (Simulasi)',
              body:
                  'Kelembapan udara ${state.kelembapanUdara}% (≥ ${state.ambangKelembapanPenyakit}%). Rawan busuk daun Phytophthora infestans (sumber: Balitsa Kementan RI).',
              leading: const CermoMascot(pose: CermoPose.worried, size: 46, interactive: false),
              action: Primary3DButton(
                label: 'Scan penyakit sekarang',
                icon: Icons.camera_alt_rounded,
                tomato: true,
                onPressed: () => context.go('/scan'),
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Grid 4 nilai sensor utama
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.5,
            children: [
              _SensorTile('Kelembapan tanah', '${state.kelembapanTanah}%', Icons.water_drop_outlined, AppColors.water),
              _SensorTile('Suhu udara', '${state.suhuUdara} °C', Icons.thermostat_outlined, AppColors.tomato500),
              _SensorTile('Kelembapan udara', '${state.kelembapanUdara}%', Icons.air_rounded, state.isDiseaseRisk ? AppColors.bad : AppColors.ok),
              _SensorTile('Cahaya (BH1750)', '${(state.cahayaLux / 1000).toStringAsFixed(1)}k lux', Icons.wb_sunny_outlined, AppColors.sun400),
            ],
          ),
          const SizedBox(height: 16),

          // F10: Irigasi Otomatis & Pengaman
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
                          Text('Irigasi otomatis', style: context.displayStyle(size: 20)),
                          Text('Nyala < ${state.ambangTanahBawah}% · Mati ≥ ${state.ambangTanahAtas}%', style: TextStyle(fontSize: 13, color: p.inkSoft)),
                        ],
                      ),
                    ),
                    Switch(
                      value: state.irigasiAuto,
                      activeColor: p.leaf600,
                      onChanged: notifier.setIrigasiAuto,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    CermatPill(
                      label: state.pompaMenyala ? 'Pompa: Menyala' : 'Pompa: Mati',
                      background: state.pompaMenyala ? AppColors.water.withAlpha(42) : p.surface2,
                      foreground: state.pompaMenyala ? AppColors.water : p.inkSoft,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Batas maks ${state.durasiMaksPompa} menit/siklus', style: TextStyle(fontSize: 12.5, color: p.inkSoft)),
                    ),
                  ],
                ),
                if (state.isTankCritical) ...[
                  const SizedBox(height: 10),
                  StatusAlertCard(
                    accent: AppColors.bad,
                    title: 'Interlock tandon aktif (F10.3)',
                    body: 'Tandon tinggal ${state.levelTandon}%. Pompa ditahan agar tidak berjalan kering.',
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: Primary3DButton(
                    label: state.pompaMenyala ? 'Matikan pompa manual' : 'Nyalakan pompa manual',
                    icon: Icons.power_settings_new_rounded,
                    tomato: state.pompaMenyala,
                    onPressed: (state.isTankCritical && !state.pompaMenyala)
                        ? null
                        : () {
                            final msg = notifier.toggleManualPump();
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
                          },
                  ),
                ),
                const SizedBox(height: 14),
                Text('Ambang bawah: ${state.ambangTanahBawah}%', style: const TextStyle(fontWeight: FontWeight.w600)),
                Slider(
                  value: state.ambangTanahBawah.toDouble(),
                  min: 15,
                  max: 55,
                  activeColor: p.leaf600,
                  onChanged: (v) => notifier.updateThresholds(
                    tanahBawah: v.round(),
                    tanahAtas: state.ambangTanahAtas < v.round() + 10 ? v.round() + 10 : state.ambangTanahAtas,
                  ),
                ),
                Text('Ambang atas: ${state.ambangTanahAtas}%', style: const TextStyle(fontWeight: FontWeight.w600)),
                Slider(
                  value: state.ambangTanahAtas.toDouble(),
                  min: 45,
                  max: 85,
                  activeColor: p.leaf600,
                  onChanged: (v) => notifier.updateThresholds(
                    tanahAtas: v.round(),
                    tanahBawah: state.ambangTanahBawah > v.round() - 10 ? v.round() - 10 : state.ambangTanahBawah,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // F12: Level Air Tandon (Ultrasonik)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Level air tandon', style: context.displayStyle(size: 20))),
                    state.isTankCritical ? CermatPill.bad('Kritis (< 20%)') : CermatPill.simulasi(),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      width: 64,
                      height: 92,
                      decoration: BoxDecoration(
                        color: p.surface2,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: p.line, width: 2),
                      ),
                      alignment: Alignment.bottomCenter,
                      child: FractionallySizedBox(
                        heightFactor: (state.levelTandon / 100).clamp(0.05, 1.0),
                        widthFactor: 1,
                        child: Container(
                          decoration: BoxDecoration(
                            color: state.isTankCritical ? AppColors.bad : AppColors.water,
                            borderRadius: BorderRadius.circular(11),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${state.levelTandon}%', style: context.displayStyle(size: 30)),
                          Text('Jarak ultrasonik: ${state.jarakUltrasonikCm} cm · ≈ ${state.levelTandon * 5} L', style: TextStyle(color: p.inkSoft)),
                          if (state.isTankCritical) ...[
                            const SizedBox(height: 6),
                            Text('Tandon tinggal ${state.levelTandon}%. Pompa kutahan dulu.', style: const TextStyle(color: AppColors.bad, fontWeight: FontWeight.w700)),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Kontrol Uji Simulasi ESP32
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Kontrol uji simulasi ESP32', style: context.displayStyle(size: 18))),
                    CermatPill.simulasi(),
                  ],
                ),
                const SizedBox(height: 10),
                Text('Simulasi kelembapan tanah: ${state.kelembapanTanah}%'),
                Slider(
                  value: state.kelembapanTanah.toDouble(),
                  min: 10,
                  max: 90,
                  onChanged: (v) => notifier.updateSensor(kelembapanTanah: v.round()),
                ),
                Text('Simulasi kelembapan udara: ${state.kelembapanUdara}%'),
                Slider(
                  value: state.kelembapanUdara.toDouble(),
                  min: 45,
                  max: 98,
                  onChanged: (v) => notifier.updateSensor(kelembapanUdara: v.round()),
                ),
                Text('Simulasi level tandon: ${state.levelTandon}%'),
                Slider(
                  value: state.levelTandon.toDouble(),
                  min: 5,
                  max: 100,
                  onChanged: (v) => notifier.updateSensor(levelTandon: v.round()),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // F10.4: Riwayat Siklus Pompa
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Riwayat siklus pompa', style: context.displayStyle(size: 18)),
                const SizedBox(height: 10),
                for (final ev in state.irrigationEvents.take(5))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: p.surface2,
                      child: Icon(Icons.water_drop_rounded, color: p.leaf600, size: 18),
                    ),
                    title: Text('${ev.mode} · ${ev.durasiMenit} menit', style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text('Tanah ${ev.kelembapanAwal}% → ${ev.kelembapanAkhir}%'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SensorTile extends StatelessWidget {
  const _SensorTile(this.label, this.value, this.icon, this.color);
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return CermatCard(
      radius: 20,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 22),
              CermatPill.simulasi(),
            ],
          ),
          const Spacer(),
          Text(value, style: context.displayStyle(size: 22)),
          Text(label, style: TextStyle(fontSize: 12.5, color: p.inkSoft)),
        ],
      ),
    );
  }
}
