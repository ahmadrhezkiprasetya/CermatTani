import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../core/widgets/plant_search_field.dart';
import '../../data/cermat_state.dart';

/// Layar 1: Onboarding 3 langkah — Hijau Susu Matcha × Krim Hangat, Maskot Transparan Tanpa Frame
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int step = 1;
  final nameCtrl = TextEditingController(text: 'Pak Joko');
  final farmCtrl = TextEditingController();
  final locCtrl = TextEditingController();
  final plantCtrl = TextEditingController(text: 'Cabai Rawit #01');
  String varietas = 'Cabai Rawit';

  @override
  void dispose() {
    nameCtrl.dispose();
    farmCtrl.dispose();
    locCtrl.dispose();
    plantCtrl.dispose();
    super.dispose();
  }

  void _finish({required bool goToScan}) {
    final resolvedVar = varietas.trim().isEmpty ? 'Tanaman Kebun' : varietas.trim();
    ref.read(cermatProvider.notifier).completeOnboarding(
          userName: nameCtrl.text,
          farmName: farmCtrl.text,
          farmLocation: locCtrl.text,
          plantName: farmCtrl.text.trim().isNotEmpty ? plantCtrl.text : null,
          varietas: resolvedVar,
        );
    context.go(goToScan ? '/scan' : '/');
  }

  InputDecoration _inputDec(CermatPalette p, String label) => InputDecoration(
        labelText: label,
        filled: true,
        fillColor: p.surface2,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: p.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: p.line),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final pose = switch (step) {
      1 => CermoPose.wave,
      2 => CermoPose.bibit,
      _ => CermoPose.happy,
    };

    return Scaffold(
      backgroundColor: p.bg,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                CermatCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Banner kebun cerah + Pak Cermat transparan tanpa bingkai/lingkaran putih
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          const GardenLandscapeBanner(height: 158),
                          Positioned(
                            right: 16,
                            top: 12,
                            child: CermatPill.ok('CermatTani'),
                          ),
                          Positioned(
                            left: 16,
                            bottom: -26,
                            child: CermoMascot(pose: pose, size: 108),
                          ),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 38, 20, 22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Indikator 3 langkah halus
                            Row(
                              children: [
                                for (var i = 1; i <= 3; i++) ...[
                                  Expanded(
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 260),
                                      height: 7,
                                      decoration: BoxDecoration(
                                        color: i <= step ? p.leaf600 : p.line,
                                        borderRadius: BorderRadius.circular(99),
                                      ),
                                    ),
                                  ),
                                  if (i < 3) const SizedBox(width: 6),
                                ],
                                const SizedBox(width: 10),
                                Text(
                                  'Langkah $step/3',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.inkSoft),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),

                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 250),
                              switchInCurve: Curves.easeOutCubic,
                              child: _buildStepBody(p),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepBody(CermatPalette p) {
    if (step == 1) {
      return Column(
        key: const ValueKey('step-1'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Halo! Yuk, pantau kebunmu bareng Pak Cermat.', style: context.displayStyle(size: 25)),
          const SizedBox(height: 8),
          Text(
            'Analisis foto buah & daun secara nyata lewat Gemini AI, atur jadwal siram dan panen, serta pantau irigasi surya dalam satu aplikasi.',
            style: TextStyle(fontSize: 14.5, color: p.inkSoft, height: 1.5),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: nameCtrl,
            decoration: _inputDec(p, 'Nama panggilanmu'),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              CermatPill.ok('Gemini AI + Dataset Agronomi'),
              CermatPill.ok('Organik lebih dulu'),
              CermatPill.water('Pengingat tepat waktu'),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: Primary3DButton(
              label: 'Mulai atur kebun',
              icon: Icons.arrow_forward_rounded,
              onPressed: () => setState(() => step = 2),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: SecondaryOutlineButton(
              label: 'Langsung masuk ke Beranda',
              onPressed: () => _finish(goToScan: false),
            ),
          ),
        ],
      );
    }

    if (step == 2) {
      return Column(
        key: const ValueKey('step-2'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Buat kebun pertamamu', style: context.displayStyle(size: 23)),
          const SizedBox(height: 6),
          Text(
            'Kosongkan bila ingin memakai profil kebun Blok A — Ciawi terlebih dahulu.',
            style: TextStyle(fontSize: 14.5, color: p.inkSoft),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: farmCtrl,
            decoration: _inputDec(p, 'Nama kebun (mis. Kebun Blok B)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: locCtrl,
            decoration: _inputDec(p, 'Lokasi (mis. Ciawi, Bogor)'),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              TextButton(onPressed: () => setState(() => step = 1), child: const Text('Kembali')),
              const Spacer(),
              Primary3DButton(
                label: 'Lanjut tanaman',
                icon: Icons.arrow_forward_rounded,
                onPressed: () => setState(() => step = 3),
              ),
            ],
          ),
        ],
      );
    }

    return Column(
      key: const ValueKey('step-3'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Catat tanaman utamamu', style: context.displayStyle(size: 23)),
        const SizedBox(height: 6),
        Text(
          'Setiap hasil scan foto nyata akan tersimpan ke timeline tanaman dan jadwal panen.',
          style: TextStyle(fontSize: 14.5, color: p.inkSoft),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: plantCtrl,
          decoration: _inputDec(p, 'Nama tanaman / petak'),
        ),
        const SizedBox(height: 12),
        PlantSearchField(
          value: varietas,
          label: 'Jenis / Varietas (bisa semua tanaman)',
          onChanged: (next) {
            setState(() {
              varietas = next;
              if (next.trim().isNotEmpty &&
                  (plantCtrl.text.trim().isEmpty || plantCtrl.text.trim().endsWith('#01'))) {
                plantCtrl.text = '${next.trim()} #01';
              }
            });
          },
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: Primary3DButton(
            label: 'Selesai & langsung scan foto',
            icon: Icons.camera_alt_rounded,
            tomato: true,
            onPressed: () => _finish(goToScan: true),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: Primary3DButton(
            label: 'Masuk ke Beranda',
            icon: Icons.home_rounded,
            onPressed: () => _finish(goToScan: false),
          ),
        ),
      ],
    );
  }
}
