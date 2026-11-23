import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 5: Tanaman & Timeline pertumbuhan per tanaman (F4.1–F4.3)
class PlantsScreen extends ConsumerStatefulWidget {
  const PlantsScreen({super.key});

  @override
  ConsumerState<PlantsScreen> createState() => _PlantsScreenState();
}

class _PlantsScreenState extends ConsumerState<PlantsScreen> {
  String? _selectedPlantId;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final plants = state.activePlants;
    final selected = plants.where((pl) => pl.id == _selectedPlantId).firstOrNull ?? plants.firstOrNull;
    final scans = selected == null
        ? const <ScanModel>[]
        : (state.scans.where((s) => s.plantId == selected.id).toList()
          ..sort((a, b) => a.waktu.compareTo(b.waktu)));
    final firstDiseaseId = scans.where((s) => s.penyakitUtamaId != 'sehat').firstOrNull?.id;

    return AppScaffold(
      location: '/plants',
      title: 'Tanaman & timeline',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${state.activeFarm.nama} · ${plants.length} tanaman',
                  style: TextStyle(color: p.inkSoft, fontWeight: FontWeight.w600),
                ),
              ),
              Primary3DButton(
                label: 'Tambah',
                icon: Icons.add_rounded,
                onPressed: () => _openAddPlant(context),
              ),
            ],
          ),
          const SizedBox(height: 14),

          if (plants.isEmpty)
            CermatCard(
              child: Column(
                children: [
                  const CermoMascot(pose: CermoPose.wave, size: 88),
                  const SizedBox(height: 12),
                  Text('Belum ada tanaman di kebun ini', style: context.displayStyle(size: 19)),
                  const SizedBox(height: 6),
                  Text('Tambahkan satu tanaman tomat untuk mulai mencatat timeline.', textAlign: TextAlign.center, style: TextStyle(color: p.inkSoft)),
                ],
              ),
            )
          else ...[
            SizedBox(
              height: 118,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: plants.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (_, i) {
                  final pl = plants[i];
                  final isSel = pl.id == selected?.id;
                  return InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => setState(() => _selectedPlantId = pl.id),
                    child: Container(
                      width: 185,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isSel ? p.forest900 : p.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isSel ? p.lime300 : p.line, width: isSel ? 2 : 1),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CermatPill(
                            label: pl.fase,
                            background: isSel ? p.lime300 : p.surface2,
                            foreground: AppColors.inkLight,
                          ),
                          const Spacer(),
                          Text(
                            pl.nama,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: isSel ? Colors.white : p.ink,
                            ),
                          ),
                          Text(
                            '${pl.varietas} · ${pl.hst} HST',
                            style: TextStyle(fontSize: 12.5, color: isSel ? Colors.white.withAlpha(195) : p.inkSoft),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),

            if (selected != null)
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
                              Text(selected.nama, style: context.displayStyle(size: 21)),
                              Text('${selected.varietas} · ${selected.hst} hari setelah tanam', style: TextStyle(color: p.inkSoft)),
                            ],
                          ),
                        ),
                        IconButton.filled(
                          style: IconButton.styleFrom(backgroundColor: AppColors.tomatoBtn),
                          onPressed: () => context.go('/scan'),
                          icon: const Icon(Icons.camera_alt_rounded, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    if (firstDiseaseId != null) ...[
                      CermatPill.bad('Penyakit pertama muncul ditandai merah'),
                      const SizedBox(height: 12),
                    ],
                    if (scans.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Column(
                            children: [
                              const CermoMascot(pose: CermoPose.wave, size: 74),
                              const SizedBox(height: 8),
                              const Text('Belum ada scan. Foto satu tomat untuk mulai.'),
                            ],
                          ),
                        ),
                      )
                    else
                      for (final sc in scans)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => _openScanDetail(context, sc),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: p.surface2,
                                borderRadius: BorderRadius.circular(16),
                                border: Border(
                                  left: BorderSide(
                                    color: sc.penyakitUtamaId != 'sehat' ? AppColors.bad : p.leaf600,
                                    width: 4,
                                  ),
                                ),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 22,
                                    backgroundColor: sc.penyakitUtamaId != 'sehat' ? AppColors.bad : p.leaf600,
                                    child: Icon(
                                      sc.bagian == PlantPart.buah ? Icons.auto_awesome_rounded : Icons.eco_rounded,
                                      color: Colors.white,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          sc.bagian == PlantPart.buah ? sc.anjuranPanen : sc.penyakitUtamaNama,
                                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                        ),
                                        Text(
                                          '${sc.waktu.day}/${sc.waktu.month}/${sc.waktu.year} · Yakin ${sc.keyakinan}%',
                                          style: TextStyle(fontSize: 12.5, color: p.inkSoft),
                                        ),
                                        if (sc.id == firstDiseaseId)
                                          const Text('Penyakit pertama muncul', style: TextStyle(fontSize: 12, color: AppColors.bad, fontWeight: FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right_rounded),
                                ],
                              ),
                            ),
                          ),
                        ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  void _openScanDetail(BuildContext context, ScanModel sc) {
    final p = context.ct;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: p.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Catatan scan tersimpan', style: context.displayStyle(size: 20)),
              const SizedBox(height: 12),
              Text('Bagian: ${sc.bagian.name}', style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('Kesehatan: ${sc.penyakitUtamaNama} (keyakinan ${sc.keyakinan}%)'),
              if (sc.tahapDominan != null) Text('Panen: ${sc.anjuranPanen} · ${sc.jumlahBuah} buah ≈ ${sc.estimasiBobotGram} g (Estimasi kasar)'),
              Text('Dugaan hara: ${sc.dugaanHaraNama} (${sc.pakaiDataSensor ? 'Dengan data sensor' : 'Dugaan visual'})'),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: Primary3DButton(label: 'Tutup', onPressed: () => Navigator.pop(context)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openAddPlant(BuildContext context) {
    final p = context.ct;
    final nameCtrl = TextEditingController();
    var varietas = 'Servo F1';
    var fase = 'Vegetatif';

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: p.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Tambah tanaman tomat', style: context.displayStyle(size: 20)),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Nama tanaman (mis. Tomat Servo #06)',
                  filled: true,
                  fillColor: p.surface2,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: varietas,
                decoration: InputDecoration(labelText: 'Varietas', filled: true, fillColor: p.surface2, border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))),
                items: const [
                  DropdownMenuItem(value: 'Servo F1', child: Text('Servo F1')),
                  DropdownMenuItem(value: 'Gustavi', child: Text('Gustavi')),
                  DropdownMenuItem(value: 'Tomat Ceri', child: Text('Tomat Ceri')),
                  DropdownMenuItem(value: 'Rampai', child: Text('Tomat Rampai')),
                ],
                onChanged: (v) => setModalState(() => varietas = v ?? 'Servo F1'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: fase,
                decoration: InputDecoration(labelText: 'Fase tumbuh', filled: true, fillColor: p.surface2, border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))),
                items: const [
                  DropdownMenuItem(value: 'Bibit', child: Text('Bibit')),
                  DropdownMenuItem(value: 'Vegetatif', child: Text('Vegetatif')),
                  DropdownMenuItem(value: 'Berbunga', child: Text('Berbunga')),
                  DropdownMenuItem(value: 'Berbuah', child: Text('Berbuah')),
                  DropdownMenuItem(value: 'Panen', child: Text('Panen')),
                ],
                onChanged: (v) => setModalState(() => fase = v ?? 'Vegetatif'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: Primary3DButton(
                  label: 'Simpan tanaman',
                  onPressed: () {
                    if (nameCtrl.text.trim().isEmpty) return;
                    ref.read(cermatProvider.notifier).addPlant(nameCtrl.text, varietas, fase, DateTime.now());
                    Navigator.pop(ctx);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
