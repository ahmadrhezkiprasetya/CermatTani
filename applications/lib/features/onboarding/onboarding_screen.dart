import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 1: Onboarding 3 langkah, Cermo melambai (PRD §6, §10, X5)
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
  final plantCtrl = TextEditingController(text: 'Tomat Servo #01');
  String varietas = 'Servo F1';

  @override
  void dispose() {
    nameCtrl.dispose();
    farmCtrl.dispose();
    locCtrl.dispose();
    plantCtrl.dispose();
    super.dispose();
  }

  void _finish({required bool goToScan}) {
    ref.read(cermatProvider.notifier).completeOnboarding(
          userName: nameCtrl.text,
          farmName: farmCtrl.text,
          farmLocation: locCtrl.text,
          plantName: farmCtrl.text.trim().isNotEmpty ? plantCtrl.text : null,
          varietas: varietas,
        );
    context.go(goToScan ? '/scan' : '/');
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Scaffold(
      backgroundColor: p.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            CermatCard(
              padding: EdgeInsets.zero,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const GardenLandscapeBanner(height: 155),
                      Positioned(
                        left: 20,
                        bottom: -34,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: p.surface,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF14302A).withAlpha(24),
                                blurRadius: 14,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: CermoMascot(
                            pose: step == 3 ? CermoPose.happy : CermoPose.wave,
                            size: 76,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 44, 20, 22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Indikator 3 langkah
                        Row(
                          children: [
                            for (var i = 1; i <= 3; i++) ...[
                              Expanded(
                                child: Container(
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
                            Text('Langkah $step/3', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.inkSoft)),
                          ],
                        ),
                        const SizedBox(height: 18),

                        if (step == 1) ...[
                          Text('Halo! Yuk, cek tomatmu bareng Cermo.', style: context.displayStyle(size: 26)),
                          const SizedBox(height: 8),
                          Text(
                            'CermatTani membantumu menilai kematangan buah, mengenali penyakit daun, menduga kebutuhan pupuk, dan memantau irigasi surya.',
                            style: TextStyle(fontSize: 15.5, color: p.inkSoft, height: 1.5),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: nameCtrl,
                            decoration: InputDecoration(
                              labelText: 'Nama panggilanmu',
                              filled: true,
                              fillColor: p.surface2,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              CermatPill.ok('Khusus tomat'),
                              CermatPill.ok('Organik lebih dulu'),
                              CermatPill.ok('Ramah sinyal lemah'),
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
                              label: 'Langsung lihat kebun contoh',
                              onPressed: () => _finish(goToScan: false),
                            ),
                          ),
                        ] else if (step == 2) ...[
                          Text('Buat kebun tomat pertamamu', style: context.displayStyle(size: 24)),
                          const SizedBox(height: 6),
                          Text(
                            'Kosongkan bila ingin memakai data contoh Kebun Blok A milik Pak Joko.',
                            style: TextStyle(fontSize: 15, color: p.inkSoft),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: farmCtrl,
                            decoration: InputDecoration(
                              labelText: 'Nama kebun (mis. Kebun Blok B)',
                              filled: true,
                              fillColor: p.surface2,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: locCtrl,
                            decoration: InputDecoration(
                              labelText: 'Lokasi (mis. Ciawi, Bogor)',
                              filled: true,
                              fillColor: p.surface2,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                            ),
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
                        ] else ...[
                          Text('Catat satu tanaman tomat', style: context.displayStyle(size: 24)),
                          const SizedBox(height: 6),
                          Text(
                            'Setiap hasil scan akan disimpan ke timeline tanaman ini agar jadwal panen akurat.',
                            style: TextStyle(fontSize: 15, color: p.inkSoft),
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: plantCtrl,
                            decoration: InputDecoration(
                              labelText: 'Nama tanaman / rumpun',
                              filled: true,
                              fillColor: p.surface2,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            value: varietas,
                            decoration: InputDecoration(
                              labelText: 'Varietas tomat',
                              filled: true,
                              fillColor: p.surface2,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'Servo F1', child: Text('Servo F1')),
                              DropdownMenuItem(value: 'Gustavi', child: Text('Gustavi')),
                              DropdownMenuItem(value: 'Tomat Ceri', child: Text('Tomat Ceri')),
                              DropdownMenuItem(value: 'Rampai', child: Text('Tomat Rampai')),
                            ],
                            onChanged: (v) => setState(() => varietas = v ?? 'Servo F1'),
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            child: Primary3DButton(
                              label: 'Selesai & langsung scan',
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
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
