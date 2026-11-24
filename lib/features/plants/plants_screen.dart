import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

const _growthPhases = ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];

/// Layar 5: Tanaman — Filter Fase, 5-Langkah Progres Tumbuh, Grafik Kesehatan Halus & Timeline Scan Nyata
class PlantsScreen extends ConsumerStatefulWidget {
  const PlantsScreen({super.key});

  @override
  ConsumerState<PlantsScreen> createState() => _PlantsScreenState();
}

class _PlantsScreenState extends ConsumerState<PlantsScreen> {
  String _filter = 'semua'; // semua | panen | tumbuh | cek
  String? _selectedPlantId;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final allPlants = state.activePlants;

    List<PlantModel> filtered = allPlants.where((pl) {
      final latest = state.scans.where((s) => s.plantId == pl.id).firstOrNull;
      return switch (_filter) {
        'panen' => pl.fase == 'Panen' || pl.fase == 'Berbuah',
        'tumbuh' => pl.fase == 'Bibit' || pl.fase == 'Vegetatif' || pl.fase == 'Berbunga',
        'cek' => latest != null && (latest.penyakitUtamaId != 'sehat' || latest.keyakinanRendah),
        _ => true,
      };
    }).toList();

    final selected = filtered.where((pl) => pl.id == _selectedPlantId).firstOrNull ??
        filtered.firstOrNull ??
        allPlants.firstOrNull;

    final plantScans = selected == null
        ? const <ScanModel>[]
        : state.scans.where((s) => s.plantId == selected.id).toList();
    final latestScan = plantScans.firstOrNull;
    final phaseIdx = selected == null
        ? 0
        : _growthPhases.indexOf(selected.fase).clamp(0, _growthPhases.length - 1);

    final chartPoints = plantScans.reversed.map((s) {
      final score = s.penyakitUtamaId == 'sehat'
          ? s.keyakinan.toDouble().clamp(60.0, 99.0)
          : (100 - s.keyakinan * 0.55).clamp(25.0, 75.0);
      return ChartPoint(DateFormat('d/M', 'id_ID').format(s.waktu), score);
    }).toList();

    return AppScaffold(
      location: '/plants',
      title: 'Tanaman & petak',
      trailingActions: [
        IconButton(
          tooltip: 'Tambah tanaman',
          onPressed: () => _openAddPlantDialog(context),
          icon: Icon(Icons.add_circle_outline_rounded, color: p.leaf700),
        ),
      ],
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          // Filter chips cepat
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _FilterChipBtn('Semua (${allPlants.length})', _filter == 'semua', () => setState(() => _filter = 'semua')),
                const SizedBox(width: 8),
                _FilterChipBtn('Berbuah & Panen', _filter == 'panen', () => setState(() => _filter = 'panen')),
                const SizedBox(width: 8),
                _FilterChipBtn('Masa Tumbuh', _filter == 'tumbuh', () => setState(() => _filter = 'tumbuh')),
                const SizedBox(width: 8),
                _FilterChipBtn('Perlu Cek', _filter == 'cek', () => setState(() => _filter = 'cek')),
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (allPlants.isEmpty)
            CermatCard(
              child: Column(
                children: [
                  const CermoMascot(pose: CermoPose.bibit, size: 96),
                  const SizedBox(height: 10),
                  Text('Belum ada tanaman di kebun ini', style: context.displayStyle(size: 19)),
                  const SizedBox(height: 6),
                  Text('Tambahkan petak atau polybag pertamamu untuk mulai memantau.', textAlign: TextAlign.center, style: TextStyle(color: p.inkSoft)),
                  const SizedBox(height: 14),
                  Primary3DButton(
                    label: 'Tambah tanaman baru',
                    icon: Icons.add_rounded,
                    onPressed: () => _openAddPlantDialog(context),
                  ),
                ],
              ),
            )
          else ...[
            // Selector kartu petak horizontal yang lega & responsif
            SizedBox(
              height: 92,
              child: filtered.isEmpty
                  ? Center(
                      child: Text('Tidak ada tanaman di kategori ini.', style: TextStyle(color: p.inkSoft)),
                    )
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, i) {
                        final pl = filtered[i];
                        final isSel = pl.id == selected?.id;
                        final scCount = state.scans.where((s) => s.plantId == pl.id).length;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedPlantId = pl.id),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: 172,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isSel ? p.surfaceMilk : p.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSel ? p.leaf600 : p.line,
                                width: isSel ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        pl.nama,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.8, color: p.ink),
                                      ),
                                    ),
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: pl.fase == 'Panen' ? AppColors.tomatoBtn : p.leaf600,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  '${pl.varietas} · ${pl.hst} HST',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 12, color: p.inkSoft),
                                ),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      pl.fase,
                                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: p.leaf700),
                                    ),
                                    Text(
                                      '$scCount scan',
                                      style: TextStyle(fontSize: 11.5, color: p.inkSoft),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),

            if (selected != null) ...[
              const SizedBox(height: 14),

              // Kartu Detail Utama + 5-Langkah Progres Tumbuh
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
                                  CermatPill.ok('Fase ${selected.fase}'),
                                  CermatPill.water('${selected.hst} HST'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(selected.nama, style: context.displayStyle(size: 22)),
                              Text(
                                '${selected.varietas} · Tanam ${DateFormat('d MMM yyyy', 'id_ID').format(selected.tanggalTanam)}',
                                style: TextStyle(fontSize: 13, color: p.inkSoft),
                              ),
                            ],
                          ),
                        ),
                        CermoMascot(
                          pose: latestScan != null && latestScan.penyakitUtamaId != 'sehat'
                              ? CermoPose.worried
                              : selected.fase == 'Panen'
                                  ? CermoPose.happy
                                  : CermoPose.bibit,
                          size: 86,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Stepper Visual 5 Fase Pertumbuhan
                    Text('Progres fase tumbuh', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: p.inkSoft)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        for (var i = 0; i < _growthPhases.length; i++) ...[
                          Expanded(
                            child: Column(
                              children: [
                                AnimatedContainer(
                                  duration: const Duration(milliseconds: 240),
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: i <= phaseIdx ? p.leaf600 : p.surface.withAlpha(180),
                                    borderRadius: BorderRadius.circular(99),
                                    border: Border.all(color: i <= phaseIdx ? p.leaf600 : p.line),
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  _growthPhases[i],
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: i == phaseIdx ? FontWeight.w700 : FontWeight.w500,
                                    color: i == phaseIdx ? p.leaf700 : p.inkSoft,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (i < _growthPhases.length - 1) const SizedBox(width: 4),
                        ],
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Primary3DButton(
                            label: 'Scan foto AI',
                            icon: Icons.camera_alt_rounded,
                            tomato: true,
                            onPressed: () => context.go('/scan'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: SecondaryOutlineButton(
                            label: 'Tanya Cermo',
                            icon: Icons.chat_bubble_outline_rounded,
                            onPressed: () {
                              ref.read(cermatProvider.notifier).setChatPlant(selected.id);
                              context.go('/chatbot');
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Grafik Tren Kesehatan dari Hasil Scan Nyata
              CermatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Tren kesehatan & riwayat scan', style: context.cardTitleStyle(size: 16.5)),
                    const SizedBox(height: 6),
                    if (chartPoints.length >= 2) ...[
                      SmoothAreaChart(
                        points: chartPoints,
                        color: p.leaf600,
                        unit: '%',
                        height: 155,
                      ),
                      const SizedBox(height: 14),
                    ] else if (plantScans.isEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: p.surface2,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          'Belum ada riwayat scan nyata untuk ${selected.nama}. Gunakan tombol "Scan foto AI" di atas agar Gemini AI mulai mencatat progres tanamanmu.',
                          style: TextStyle(fontSize: 13.5, color: p.inkSoft, height: 1.45),
                        ),
                      ),
                    ],

                    for (final sc in plantScans) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: p.surface2,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: p.line),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: sc.photoBytes != null
                                  ? Image.memory(sc.photoBytes!, width: 58, height: 58, fit: BoxFit.cover)
                                  : Container(
                                      width: 58,
                                      height: 58,
                                      color: p.surfaceMilk,
                                      child: Icon(Icons.eco_rounded, color: p.leaf600),
                                    ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 4,
                                    children: [
                                      Text(
                                        sc.bagian == PlantPart.buah
                                            ? sc.anjuranPanen
                                            : sc.penyakitUtamaNama,
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                      ),
                                      sc.penyakitUtamaId == 'sehat'
                                          ? CermatPill.ok('Yakin ${sc.keyakinan}%')
                                          : CermatPill.warn('Yakin ${sc.keyakinan}%'),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '${DateFormat('d MMM · HH:mm', 'id_ID').format(sc.waktu)} · ${sc.dugaanHaraNama}',
                                    style: TextStyle(fontSize: 12.2, color: p.inkSoft),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  void _openAddPlantDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    var varietas = 'Servo F1';
    var fase = 'Vegetatif';
    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Tambah tanaman / petak'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nama petak (mis. Tomat Servo #05)'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: varietas,
                decoration: const InputDecoration(labelText: 'Varietas'),
                items: const [
                  DropdownMenuItem(value: 'Servo F1', child: Text('Tomat Servo F1')),
                  DropdownMenuItem(value: 'Gustavi', child: Text('Tomat Gustavi')),
                  DropdownMenuItem(value: 'Tomat Ceri', child: Text('Tomat Ceri')),
                  DropdownMenuItem(value: 'Cabai Rawit', child: Text('Cabai Rawit')),
                ],
                onChanged: (v) => setDlg(() => varietas = v ?? 'Servo F1'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: fase,
                decoration: const InputDecoration(labelText: 'Fase tumbuh'),
                items: [for (final f in _growthPhases) DropdownMenuItem(value: f, child: Text(f))],
                onChanged: (v) => setDlg(() => fase = v ?? 'Vegetatif'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            FilledButton(
              onPressed: () {
                if (nameCtrl.text.trim().isNotEmpty) {
                  ref.read(cermatProvider.notifier).addPlant(
                        nameCtrl.text,
                        varietas,
                        fase,
                        DateTime.now().subtract(const Duration(days: 20)),
                      );
                }
                Navigator.pop(ctx);
              },
              child: const Text('Simpan'),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChipBtn extends StatelessWidget {
  const _FilterChipBtn(this.label, this.active, this.onTap);
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: active ? p.leaf600 : p.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: active ? p.leaf600 : p.line),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: active ? p.onLeaf : p.ink,
          ),
        ),
      ),
    );
  }
}
