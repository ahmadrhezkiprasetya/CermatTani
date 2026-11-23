import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';
import 'scan_results.dart';

/// Layar 3 & 4: Scan (pilih bagian -> kamera/galeri/contoh -> proses -> hasil 3 tab)
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  PlantPart _part = PlantPart.buah;
  String? _selectedPlantId;
  bool _scanning = false;
  ScanModel? _result;
  bool _saved = false;

  Future<void> _pickPhoto(ImageSource source) async {
    final picker = ImagePicker();
    try {
      final file = await picker.pickImage(source: source, maxWidth: 960, imageQuality: 78);
      if (file == null) return;
      await _runScenario(_part == PlantPart.buah ? 'buah_campur' : _part == PlantPart.daun ? 'daun_bercak' : 'batang_layu');
    } catch (_) {
      await _runScenario(_part == PlantPart.buah ? 'buah_campur' : 'daun_bercak');
    }
  }

  Future<void> _runScenario(String scenarioId) async {
    final state = ref.read(cermatProvider);
    final plant = state.plants.where((p) => p.id == _selectedPlantId).firstOrNull ?? state.plants.firstOrNull;
    if (plant == null) return;

    setState(() {
      _scanning = true;
      _result = null;
      _saved = false;
    });

    await Future<void>.delayed(const Duration(milliseconds: 1400));
    if (!mounted) return;

    final prevFruitScans = state.scans.where((s) => s.plantId == plant.id && s.bagian == PlantPart.buah).length;
    final now = DateTime.now();
    late final ScanModel built;

    if (scenarioId == 'buah_siap') {
      built = ScanModel(
        id: 'scan-${now.millisecondsSinceEpoch}',
        plantId: plant.id,
        waktu: now,
        bagian: PlantPart.buah,
        boxes: const [
          DetectionBoxModel(leftFrac: 0.12, topFrac: 0.25, widthFrac: 0.22, heightFrac: 0.30, stage: RipenessStage.matang, confidence: 95),
          DetectionBoxModel(leftFrac: 0.40, topFrac: 0.38, widthFrac: 0.22, heightFrac: 0.30, stage: RipenessStage.matang, confidence: 93),
          DetectionBoxModel(leftFrac: 0.67, topFrac: 0.24, widthFrac: 0.21, heightFrac: 0.29, stage: RipenessStage.matang, confidence: 91),
        ],
        tahapDominan: RipenessStage.matang,
        jumlahBuah: 3,
        anjuranPanen: 'Panen sekarang',
        estimasiHariMin: 0,
        estimasiHariMax: 1,
        estimasiDisesuaikanRiwayat: prevFruitScans >= 2,
        estimasiBobotGram: 3 * plant.bobotRataBuahGram,
        penyakitTop3: const [
          DiseasePred('sehat', 'Sehat', 94),
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 4),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 2),
        ],
        penyakitUtamaId: 'sehat',
        penyakitUtamaNama: 'Sehat',
        keyakinan: 93,
        keyakinanRendah: 93 < state.ambangKeyakinanRendah,
        dugaanHaraId: 'cukup',
        dugaanHaraNama: 'Hara terlihat seimbang',
        pakaiDataSensor: state.sensorTersedia,
      );
    } else if (scenarioId == 'daun_bercak') {
      built = ScanModel(
        id: 'scan-${now.millisecondsSinceEpoch}',
        plantId: plant.id,
        waktu: now,
        bagian: PlantPart.daun,
        boxes: const [],
        tahapDominan: null,
        jumlahBuah: 0,
        anjuranPanen: 'Fokus daun/batang',
        estimasiHariMin: null,
        estimasiHariMax: null,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 0,
        penyakitTop3: const [
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 86),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 9),
          DiseasePred('sehat', 'Sehat', 5),
        ],
        penyakitUtamaId: 'bercak_kering',
        penyakitUtamaNama: 'Bercak daun kering (Early blight)',
        keyakinan: 86,
        keyakinanRendah: 86 < state.ambangKeyakinanRendah,
        dugaanHaraId: 'kurang_kalium',
        dugaanHaraNama: 'Dugaan kekurangan Kalium (K)',
        pakaiDataSensor: state.sensorTersedia,
      );
    } else if (scenarioId == 'daun_ragu') {
      built = ScanModel(
        id: 'scan-${now.millisecondsSinceEpoch}',
        plantId: plant.id,
        waktu: now,
        bagian: PlantPart.daun,
        boxes: const [],
        tahapDominan: null,
        jumlahBuah: 0,
        anjuranPanen: 'Fokus daun/batang',
        estimasiHariMin: null,
        estimasiHariMax: null,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 0,
        penyakitTop3: const [
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 54),
          DiseasePred('sehat', 'Sehat', 31),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 15),
        ],
        penyakitUtamaId: 'bercak_kering',
        penyakitUtamaNama: 'Bercak daun kering (Early blight)',
        keyakinan: 54,
        keyakinanRendah: 54 < state.ambangKeyakinanRendah,
        dugaanHaraId: 'kurang_nitrogen',
        dugaanHaraNama: 'Dugaan kekurangan Nitrogen (N)',
        pakaiDataSensor: state.sensorTersedia,
      );
    } else if (scenarioId == 'foto_kosong') {
      built = ScanModel(
        id: 'scan-${now.millisecondsSinceEpoch}',
        plantId: plant.id,
        waktu: now,
        bagian: PlantPart.buah,
        boxes: const [],
        tahapDominan: null,
        jumlahBuah: 0,
        anjuranPanen: 'Perlu foto ulang',
        estimasiHariMin: null,
        estimasiHariMax: null,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 0,
        penyakitTop3: const [
          DiseasePred('sehat', 'Sehat', 42),
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 33),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 25),
        ],
        penyakitUtamaId: 'sehat',
        penyakitUtamaNama: 'Sehat',
        keyakinan: 42,
        keyakinanRendah: true,
        dugaanHaraId: 'cukup',
        dugaanHaraNama: 'Hara terlihat seimbang',
        pakaiDataSensor: state.sensorTersedia,
        tanpaBuahTerdeteksi: true,
      );
    } else if (scenarioId == 'batang_layu') {
      built = ScanModel(
        id: 'scan-${now.millisecondsSinceEpoch}',
        plantId: plant.id,
        waktu: now,
        bagian: PlantPart.batang,
        boxes: const [],
        tahapDominan: null,
        jumlahBuah: 0,
        anjuranPanen: 'Fokus daun/batang',
        estimasiHariMin: null,
        estimasiHariMax: null,
        estimasiDisesuaikanRiwayat: false,
        estimasiBobotGram: 0,
        penyakitTop3: const [
          DiseasePred('layu_batang', 'Layu fusarium / bakteri batang', 79),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 13),
          DiseasePred('sehat', 'Sehat', 8),
        ],
        penyakitUtamaId: 'layu_batang',
        penyakitUtamaNama: 'Layu fusarium / bakteri batang',
        keyakinan: 79,
        keyakinanRendah: 79 < state.ambangKeyakinanRendah,
        dugaanHaraId: 'cukup',
        dugaanHaraNama: 'Hara terlihat seimbang',
        pakaiDataSensor: state.sensorTersedia,
      );
    } else {
      built = ScanModel(
        id: 'scan-${now.millisecondsSinceEpoch}',
        plantId: plant.id,
        waktu: now,
        bagian: PlantPart.buah,
        boxes: const [
          DetectionBoxModel(leftFrac: 0.12, topFrac: 0.30, widthFrac: 0.23, heightFrac: 0.32, stage: RipenessStage.matang, confidence: 92),
          DetectionBoxModel(leftFrac: 0.39, topFrac: 0.28, widthFrac: 0.22, heightFrac: 0.30, stage: RipenessStage.setengahMatang, confidence: 88),
          DetectionBoxModel(leftFrac: 0.66, topFrac: 0.34, widthFrac: 0.22, heightFrac: 0.29, stage: RipenessStage.mentah, confidence: 90),
        ],
        tahapDominan: RipenessStage.setengahMatang,
        jumlahBuah: 3,
        anjuranPanen: 'Tunggu',
        estimasiHariMin: prevFruitScans >= 2 ? 1 : 2,
        estimasiHariMax: prevFruitScans >= 2 ? 3 : 4,
        estimasiDisesuaikanRiwayat: prevFruitScans >= 2,
        estimasiBobotGram: 3 * plant.bobotRataBuahGram,
        penyakitTop3: const [
          DiseasePred('sehat', 'Sehat', 91),
          DiseasePred('bercak_kering', 'Bercak daun kering (Early blight)', 6),
          DiseasePred('busuk_daun', 'Busuk daun (Late blight)', 3),
        ],
        penyakitUtamaId: 'sehat',
        penyakitUtamaNama: 'Sehat',
        keyakinan: 90,
        keyakinanRendah: 90 < state.ambangKeyakinanRendah,
        dugaanHaraId: 'cukup',
        dugaanHaraNama: 'Hara terlihat seimbang',
        pakaiDataSensor: state.sensorTersedia,
      );
    }

    setState(() {
      _scanning = false;
      _result = built;
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final plant = state.plants.where((pl) => pl.id == _selectedPlantId).firstOrNull ?? state.plants.firstOrNull;

    return AppScaffold(
      location: '/scan',
      title: 'Scan tanaman',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          if (_scanning)
            CermatCard(
              padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
              child: Column(
                children: [
                  const CermoMascot(pose: CermoPose.scan, size: 112, interactive: false),
                  const SizedBox(height: 18),
                  Text('Cermo sedang memindai...', style: context.displayStyle(size: 22)),
                  const SizedBox(height: 8),
                  Text(
                    'Memeriksa warna buah, bercak daun, serta gejala kekurangan hara.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: p.inkSoft),
                  ),
                  const SizedBox(height: 18),
                  LinearProgressIndicator(
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(99),
                    color: p.leaf600,
                    backgroundColor: p.surface2,
                  ),
                ],
              ),
            )
          else if (_result != null && plant != null)
            ScanResultView(
              scan: _result!,
              plant: plant,
              lowThreshold: state.ambangKeyakinanRendah,
              saved: _saved,
              onSave: () {
                ref.read(cermatProvider.notifier).saveScan(_result!);
                setState(() => _saved = true);
              },
              onAskCermo: () {
                if (!_saved) ref.read(cermatProvider.notifier).saveScan(_result!);
                ref.read(cermatProvider.notifier).setChatPlant(plant.id);
                context.go('/chatbot');
              },
              onScanAgain: () => setState(() => _result = null),
            )
          else ...[
            CermatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CermoMascot(pose: CermoPose.wave, size: 70),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Pilih tanaman & bagian yang mau difoto. Kompresi otomatis di perangkat.',
                          style: TextStyle(fontSize: 14.5, color: p.inkSoft, height: 1.45),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: plant?.id,
                    decoration: InputDecoration(
                      labelText: 'Tanaman yang dipindai',
                      filled: true,
                      fillColor: p.surface2,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    items: [
                      for (final pl in state.plants)
                        DropdownMenuItem(value: pl.id, child: Text('${pl.nama} (${pl.fase})')),
                    ],
                    onChanged: (v) => setState(() => _selectedPlantId = v),
                  ),
                  const SizedBox(height: 16),
                  // F2.1: Pilihan bagian tanaman berupa ikon besar (Buah / Daun / Batang)
                  const Text('1. Pilih bagian tanaman', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _PartTile(
                          label: 'Buah',
                          icon: Icons.auto_awesome_rounded,
                          color: AppColors.tomato500,
                          selected: _part == PlantPart.buah,
                          onTap: () => setState(() => _part = PlantPart.buah),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _PartTile(
                          label: 'Daun',
                          icon: Icons.eco_rounded,
                          color: AppColors.leaf500,
                          selected: _part == PlantPart.daun,
                          onTap: () => setState(() => _part = PlantPart.daun),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _PartTile(
                          label: 'Batang',
                          icon: Icons.park_outlined,
                          color: AppColors.forest900,
                          selected: _part == PlantPart.batang,
                          onTap: () => setState(() => _part = PlantPart.batang),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Text('2. Ambil atau unggah foto (≤ 10 MB)', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Primary3DButton(
                          label: 'Kamera',
                          icon: Icons.camera_alt_rounded,
                          tomato: true,
                          onPressed: () => _pickPhoto(ImageSource.camera),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Primary3DButton(
                          label: 'Galeri',
                          icon: Icons.photo_library_outlined,
                          onPressed: () => _pickPhoto(ImageSource.gallery),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Uji skenario contoh langsung
            CermatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Coba cepat foto contoh', style: context.displayStyle(size: 18)),
                  const SizedBox(height: 6),
                  Text('Uji semua ketentuan PRD langsung tanpa perlu memotret:', style: TextStyle(fontSize: 13.5, color: p.inkSoft)),
                  const SizedBox(height: 12),
                  _PresetRow('Buah tomat campur (3 tahap)', 'Uji F1 kotak deteksi & F6 estimasi kasar', () => _runScenario('buah_campur')),
                  _PresetRow('Buah matang siap panen', 'Memicu anjuran "Panen sekarang"', () => _runScenario('buah_siap')),
                  _PresetRow('Daun bercak kering (Early blight)', 'Uji F2 organik dulu + "Baca label produk"', () => _runScenario('daun_bercak')),
                  _PresetRow('Daun kuning (keyakinan 54%)', 'Uji F2.4 peringatan kuning < 60% & F3 pupuk', () => _runScenario('daun_ragu')),
                  _PresetRow('Foto gelap / tanpa buah', 'Uji F1.5 saran cara memotret ulang', () => _runScenario('foto_kosong')),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PartTile extends StatelessWidget {
  const _PartTile({
    required this.label,
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? color.withAlpha(32) : p.surface2,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: selected ? color : p.line, width: selected ? 2.5 : 1),
        ),
        child: Column(
          children: [
            Icon(icon, size: 30, color: color),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

class _PresetRow extends StatelessWidget {
  const _PresetRow(this.title, this.sub, this.onTap);
  final String title;
  final String sub;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(14)),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                    Text(sub, style: TextStyle(fontSize: 12.5, color: p.inkSoft)),
                  ],
                ),
              ),
              Icon(Icons.play_circle_outline_rounded, color: p.leaf600),
            ],
          ),
        ),
      ),
    );
  }
}
