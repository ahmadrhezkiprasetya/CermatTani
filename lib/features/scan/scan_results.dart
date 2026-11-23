import 'dart:typed_data';
import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 4: Hasil Scan 3 Tab (Kematangan / Penyakit / Pupuk)
class ScanResultView extends StatefulWidget {
  const ScanResultView({
    super.key,
    required this.scan,
    required this.plant,
    required this.lowThreshold,
    required this.saved,
    required this.onSave,
    required this.onAskCermo,
    required this.onScanAgain,
    this.photoBytes,
  });

  final ScanModel scan;
  final PlantModel plant;
  final Uint8List? photoBytes;
  final int lowThreshold;
  final bool saved;
  final VoidCallback onSave;
  final VoidCallback onAskCermo;
  final VoidCallback onScanAgain;

  @override
  State<ScanResultView> createState() => _ScanResultViewState();
}

class _ScanResultViewState extends State<ScanResultView> {
  late int _tabIndex;

  @override
  void initState() {
    super.initState();
    _tabIndex = widget.scan.bagian == PlantPart.buah ? 0 : 1;
  }

  Color _stageColor(RipenessStage s) => switch (s) {
        RipenessStage.mentah => AppColors.mentah,
        RipenessStage.setengahMatang => AppColors.setengahMatang,
        RipenessStage.matang => AppColors.matang,
      };

  String _stageLabel(RipenessStage s) => switch (s) {
        RipenessStage.mentah => 'Mentah',
        RipenessStage.setengahMatang => 'Setengah matang',
        RipenessStage.matang => 'Matang',
      };

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final scan = widget.scan;
    final disease = knowledgeDiseases[scan.penyakitUtamaId] ?? knowledgeDiseases['sehat']!;
    final nutrient = knowledgeNutrients[scan.dugaanHaraId] ?? knowledgeNutrients['cukup']!;

    final headlineDecision = scan.tanpaBuahTerdeteksi
        ? 'Buah belum terlihat'
        : scan.bagian == PlantPart.buah
            ? (scan.anjuranPanen == 'Panen sekarang'
                ? 'Panen sekarang'
                : 'Tunggu ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari')
            : scan.penyakitUtamaNama;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Foto beranotasi kotak deteksi 3px + keputusan utama (lebih besar dari angka keyakinan F1.4)
        CermatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LayoutBuilder(
                builder: (_, constraints) {
                  final w = constraints.maxWidth;
                  const h = 200.0;
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: w,
                      height: h,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [p.forest900, const Color(0xFF1E563B)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (widget.photoBytes != null)
                            Image.memory(widget.photoBytes!, fit: BoxFit.cover)
                          else
                            Center(
                              child: Icon(
                                scan.bagian == PlantPart.buah ? Icons.local_florist_rounded : Icons.eco_rounded,
                                size: 86,
                                color: Colors.white.withAlpha(42),
                              ),
                            ),
                          for (final b in scan.boxes)
                            Positioned(
                              left: b.leftFrac * w,
                              top: b.topFrac * h,
                              width: b.widthFrac * w,
                              height: b.heightFrac * h,
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: _stageColor(b.stage), width: 3),
                                ),
                                child: Align(
                                  alignment: Alignment.topLeft,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: _stageColor(b.stage),
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                    child: Text(
                                      '${_stageLabel(b.stage)} ${b.confidence}%',
                                      style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  CermoMascot(
                    pose: (scan.tanpaBuahTerdeteksi || scan.keyakinanRendah || scan.penyakitUtamaId != 'sehat')
                        ? CermoPose.worried
                        : CermoPose.happy,
                    size: 66,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Anjuran utama Cermo', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: p.inkSoft)),
                        Text(headlineDecision, style: context.displayStyle(size: 26)),
                        Text(
                          'Seberapa yakin Cermo: ${scan.keyakinan}%',
                          style: TextStyle(fontSize: 13.5, color: p.inkSoft, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              if (scan.tanpaBuahTerdeteksi) ...[
                const SizedBox(height: 12),
                const StatusAlertCard(
                  accent: AppColors.warn,
                  title: 'Foto terlalu gelap atau buah tidak tampak',
                  body: 'Coba dekat jendela atau nyalakan cahaya, arahkan kamera 20–40 cm dari buah tomat.',
                ),
              ],
              if (scan.keyakinanRendah && !scan.tanpaBuahTerdeteksi) ...[
                const SizedBox(height: 12),
                StatusAlertCard(
                  accent: AppColors.warn,
                  title: 'Cermo belum cukup yakin (${scan.keyakinan}% < ${widget.lowThreshold}%)',
                  body: 'Foto ulang di tempat terang dan konfirmasi ke penyuluh pertanian setempat sebelum bertindak.',
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 3 Tab: Kematangan / Penyakit / Pupuk
        CermatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _TabPill('Kematangan', _tabIndex == 0, () => setState(() => _tabIndex = 0)),
                  const SizedBox(width: 6),
                  _TabPill('Penyakit', _tabIndex == 1, () => setState(() => _tabIndex = 1)),
                  const SizedBox(width: 6),
                  _TabPill('Pupuk', _tabIndex == 2, () => setState(() => _tabIndex = 2)),
                ],
              ),
              const SizedBox(height: 16),

              if (_tabIndex == 0) ...[
                if (scan.bagian != PlantPart.buah || scan.tanpaBuahTerdeteksi)
                  Text(
                    'Scan bagian buah tomat di tempat terang untuk melihat tahap kematangan dan estimasi hasil.',
                    style: TextStyle(color: p.inkSoft),
                  )
                else ...[
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${scan.jumlahBuah} buah ≈ ${scan.estimasiBobotGram} gram',
                          style: context.displayStyle(size: 20),
                        ),
                      ),
                      CermatPill.warn('Estimasi kasar'),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Dihitung dari ${scan.jumlahBuah} kotak deteksi × ${widget.plant.bobotRataBuahGram} g (${widget.plant.varietas}). Estimasi kasar karena foto hanya menangkap sebagian tanaman.',
                    style: TextStyle(fontSize: 13.5, color: p.inkSoft),
                  ),
                  if (scan.estimasiDisesuaikanRiwayat) ...[
                    const SizedBox(height: 10),
                    const StatusAlertCard(
                      accent: AppColors.ok,
                      title: 'Estimasi disesuaikan riwayat ≥ 2 scan',
                      body: 'Perkiraan hari panen menghitung laju perubahan warna buah dari scan sebelumnya.',
                    ),
                  ],
                ],
              ] else if (_tabIndex == 1) ...[
                const Text('3 kemungkinan teratas (termasuk Sehat)', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                for (final pred in scan.penyakitTop3) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(pred.nama, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                      Text('${pred.confidence}%', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: pred.confidence / 100,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(99),
                    color: pred.id == 'sehat' ? AppColors.ok : AppColors.bad,
                    backgroundColor: p.surface2,
                  ),
                  const SizedBox(height: 10),
                ],
                Text('Penyebab: ${disease.penyebab}', style: TextStyle(fontSize: 13.5, color: p.inkSoft)),
                const SizedBox(height: 10),
                StatusAlertCard(
                  accent: AppColors.ok,
                  title: 'Solusi organik & budidaya (Organik lebih dulu)',
                  body: disease.solusiOrganik.map((s) => '• $s').join('\n'),
                ),
                const SizedBox(height: 10),
                StatusAlertCard(
                  accent: AppColors.warn,
                  title: 'Opsi kimiawi (Baca label produk)',
                  body: disease.solusiKimia.join('\n'),
                ),
                const SizedBox(height: 8),
                Text('Sumber: ${disease.sumber} · Konfirmasi ke penyuluh bila ragu.', style: TextStyle(fontSize: 12, color: p.inkSoft)),
              ] else ...[
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(nutrient.dugaan, style: context.displayStyle(size: 19)),
                    if (scan.pakaiDataSensor) ...[
                      CermatPill.ok('Dengan data sensor'),
                      CermatPill.simulasi(),
                    ] else
                      CermatPill.warn('Dugaan visual'),
                  ],
                ),
                const SizedBox(height: 10),
                StatusAlertCard(
                  accent: AppColors.ok,
                  title: 'Pilihan organik lebih dulu',
                  body: nutrient.rekomendasiOrganik,
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Dosis umum fase ${widget.plant.fase}:', style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(nutrient.dosisPerFase[widget.plant.fase] ?? ''),
                      const SizedBox(height: 6),
                      Text('Sumber: ${nutrient.sumber}', style: TextStyle(fontSize: 12, color: p.inkSoft)),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                const StatusAlertCard(
                  accent: AppColors.warn,
                  title: 'Bukan pengganti uji tanah',
                  body: 'Takaran pupuk bersifat acuan umum. Sesuaikan dengan kondisi lahan dan arahan penyuluh pertanian.',
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Aksi bawah hasil scan
        SizedBox(
          width: double.infinity,
          child: Primary3DButton(
            label: widget.saved ? 'Tersimpan di timeline & kalender' : 'Simpan ke timeline',
            icon: widget.saved ? Icons.check_rounded : Icons.bookmark_add_outlined,
            onPressed: widget.saved ? null : widget.onSave,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: SecondaryOutlineButton(
                label: 'Tanya Cermo',
                icon: Icons.chat_bubble_outline_rounded,
                onPressed: widget.onAskCermo,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SecondaryOutlineButton(
                label: 'Scan lagi',
                icon: Icons.refresh_rounded,
                onPressed: widget.onScanAgain,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TabPill extends StatelessWidget {
  const _TabPill(this.label, this.active, this.onTap);
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? p.leaf600 : p.surface2,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
              color: active ? p.onLeaf : p.inkSoft,
            ),
          ),
        ),
      ),
    );
  }
}
