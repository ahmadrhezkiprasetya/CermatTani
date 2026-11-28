import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';
import '../../data/services/gemini_service.dart';
import 'scan_results.dart';

/// Layar 3 & 4: Scan Otomatis (Langsung Kamera/Galeri -> Output Dataset Terfokus -> Tanya Lanjutan ke Chatbot)
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  String? _selectedPlantId;
  bool _scanning = false;
  Uint8List? _capturedPhotoBytes;
  String _capturedMime = 'image/jpeg';
  ScanModel? _result;
  String? _errorMsg;
  bool _saved = false;

  String _guessMime(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  Future<void> _pickAndAnalyze(ImageSource source) async {
    final picker = ImagePicker();
    try {
      final file = await picker.pickImage(
        source: source,
        maxWidth: 1080,
        imageQuality: 82,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      final mime = _guessMime(file.name);
      setState(() {
        _capturedPhotoBytes = bytes;
        _capturedMime = mime;
        _errorMsg = null;
      });
      await _analyzeCurrentPhoto();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMsg = source == ImageSource.camera
            ? 'Kamera tidak dapat dibuka. Pastikan izin kamera aktif atau gunakan tombol "Unggah foto".'
            : 'Gagal membaca file gambar dari galeri. Pilih foto JPG/PNG/WebP yang jelas.';
      });
    }
  }

  Future<void> _analyzeCurrentPhoto() async {
    final bytes = _capturedPhotoBytes;
    if (bytes == null) return;
    final state = ref.read(cermatProvider);
    final plant =
        state.plants.where((p) => p.id == _selectedPlantId).firstOrNull ?? state.plants.firstOrNull;
    if (plant == null) {
      setState(() => _errorMsg = 'Belum ada tanaman terdaftar. Tambahkan tanaman dulu di menu Tanaman.');
      return;
    }

    setState(() {
      _scanning = true;
      _result = null;
      _saved = false;
      _errorMsg = null;
    });

    try {
      final prevFruitScans = state.scans
          .where((s) => s.plantId == plant.id && s.fokusOutput == ScanOutputFocus.kematangan)
          .length;
      final out = await GeminiService.analyzePlantPhoto(
        imageBytes: bytes,
        mimeType: _capturedMime,
        plant: plant,
        sensorAvailable: state.sensorTersedia,
        lowConfidenceThreshold: state.ambangKeyakinanRendah,
        prevFruitScans: prevFruitScans,
      );
      if (!mounted) return;
      setState(() {
        _scanning = false;
        _result = out.scan;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _scanning = false;
        _errorMsg = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final plant =
        state.plants.where((pl) => pl.id == _selectedPlantId).firstOrNull ?? state.plants.firstOrNull;

    return AppScaffold(
      location: '/scan',
      title: 'Scan tanaman AI',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          if (_scanning)
            CermatCard(
              padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 20),
              child: Column(
                children: [
                  if (_capturedPhotoBytes != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.memory(
                        _capturedPhotoBytes!,
                        height: 200,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  const CermoMascot(pose: CermoPose.scan, size: 102, interactive: false),
                  const SizedBox(height: 12),
                  Text('Cermo sedang memeriksa fotomu...', style: context.displayStyle(size: 21)),
                  const SizedBox(height: 6),
                  Text(
                    'Mencocokkan kondisi foto dengan dataset agronomi CermatTani.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13.5, color: p.inkSoft),
                  ),
                  const SizedBox(height: 16),
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
              photoBytes: _capturedPhotoBytes,
              lowThreshold: state.ambangKeyakinanRendah,
              saved: _saved,
              onSave: () {
                ref.read(cermatProvider.notifier).saveScan(_result!);
                setState(() => _saved = true);
              },
              onAskFollowUp: (String? question) {
                if (!_saved) {
                  ref.read(cermatProvider.notifier).saveScan(_result!);
                  setState(() => _saved = true);
                }
                ref.read(cermatProvider.notifier).openChatWithScan(
                      _result!,
                      initialQuestion: question,
                    );
                context.go('/chatbot');
              },
              onScanAgain: () => setState(() {
                _result = null;
                _capturedPhotoBytes = null;
                _errorMsg = null;
              }),
              onShareTelegram: () =>
                  ref.read(cermatProvider.notifier).shareScanToTelegram(_result!),
            )
          else ...[
            if (_errorMsg != null) ...[
              StatusAlertCard(
                accent: AppColors.bad,
                icon: Icons.error_outline_rounded,
                title: 'Analisis AI belum berhasil',
                body: _errorMsg!,
                action: _capturedPhotoBytes != null
                    ? SecondaryOutlineButton(
                        label: 'Coba analisis ulang',
                        icon: Icons.refresh_rounded,
                        onPressed: _analyzeCurrentPhoto,
                      )
                    : null,
              ),
              const SizedBox(height: 12),
            ],

            // Langsung pilih tanaman + kamera/galeri (tanpa perlu pilih bagian manual)
            CermatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CermoMascot(pose: CermoPose.scan, size: 80),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CermatPill.ok('Gemini Vision AI · Dataset Agronomi'),
                            const SizedBox(height: 6),
                            Text(
                              'Langsung foto buah, daun, atau batang dari kamera atau galeri. Cermo otomatis menyesuaikan hasil dari dataset agronomi.',
                              style: TextStyle(fontSize: 13.5, color: p.inkSoft, height: 1.45),
                            ),
                          ],
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
                  const SizedBox(height: 18),
                  const Text('Ambil foto langsung atau pilih dari galeri', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Primary3DButton(
                          label: 'Buka kamera',
                          icon: Icons.camera_alt_rounded,
                          tomato: true,
                          onPressed: () => _pickAndAnalyze(ImageSource.camera),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Primary3DButton(
                          label: 'Unggah foto',
                          icon: Icons.photo_library_outlined,
                          onPressed: () => _pickAndAnalyze(ImageSource.gallery),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            CermatAccentCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Panduan foto agar hasil lebih akurat', style: context.cardTitleStyle(size: 15.5)),
                  const SizedBox(height: 8),
                  const _TipLine(icon: Icons.wb_sunny_outlined, text: 'Ambil foto di cahaya alami terang (hindari bayangan gelap).'),
                  const _TipLine(icon: Icons.center_focus_strong_outlined, text: 'Arahkan kamera 20–40 cm ke buah, daun, atau batang yang ingin dicek.'),
                  const _TipLine(icon: Icons.verified_outlined, text: 'Semua penjelasan dan penanganan bersumber dari Dataset Agronomi CermatTani.'),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TipLine extends StatelessWidget {
  const _TipLine({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: p.leaf700),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: TextStyle(fontSize: 13.2, color: p.inkSoft, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
