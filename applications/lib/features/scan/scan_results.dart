import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../core/widgets/formatted_text.dart';
import '../../data/cermat_state.dart';
import '../../data/services/external_knowledge_service.dart';

/// Layar 4: Output Hasil Scan 100% Dari Dataset (Terfokus Otomatis) + Input Tanya Lanjutan ke Chatbot
class ScanResultView extends StatefulWidget {
  const ScanResultView({
    super.key,
    required this.scan,
    required this.plant,
    required this.lowThreshold,
    required this.saved,
    required this.onSave,
    required this.onAskFollowUp,
    required this.onScanAgain,
    this.onShareTelegram,
    this.photoBytes,
  });

  final ScanModel scan;
  final PlantModel plant;
  final Uint8List? photoBytes;
  final int lowThreshold;
  final bool saved;
  final VoidCallback onSave;
  final void Function(String? question) onAskFollowUp;
  final VoidCallback onScanAgain;
  final Future<({bool ok, String message})> Function()? onShareTelegram;

  @override
  State<ScanResultView> createState() => _ScanResultViewState();
}

class _ScanResultViewState extends State<ScanResultView> {
  final _followUpCtrl = TextEditingController();
  ExternalKnowledgeInfo? _externalRef;
  bool _loadingExt = false;
  bool _sendingTg = false;
  bool _sentTgOk = false;

  @override
  void initState() {
    super.initState();
    _loadExternalKnowledge();
  }

  @override
  void didUpdateWidget(covariant ScanResultView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scan.id != widget.scan.id) {
      _loadExternalKnowledge();
    }
  }

  Future<void> _loadExternalKnowledge() async {
    final scan = widget.scan;
    if (scan.fokusOutput == ScanOutputFocus.tidakTerdeteksi) return;
    setState(() {
      _loadingExt = true;
      _externalRef = null;
    });

    KnowledgeDisease? targetDis;
    if (scan.fokusOutput == ScanOutputFocus.penyakit && scan.penyakitUtamaId != 'sehat') {
      targetDis = knowledgeDiseases[scan.penyakitUtamaId];
    } else if (scan.fokusOutput == ScanOutputFocus.kematangan && scan.penyakitRinganId != null) {
      targetDis = knowledgeDiseases[scan.penyakitRinganId!];
    }

    final query = (targetDis != null && targetDis.wikiQuery.isNotEmpty)
        ? targetDis.wikiQuery
        : (targetDis?.penyakit ?? 'Tomat');
    final sciHint = (targetDis != null && targetDis.namaIlmiahPatogen.isNotEmpty)
        ? targetDis.namaIlmiahPatogen
        : 'Solanum lycopersicum';

    final res = await ExternalKnowledgeService.fetch(
      query: query,
      scientificNameHint: sciHint,
      topicId: targetDis?.id ?? 'sehat',
      indonesianTitle: targetDis?.penyakit,
      indonesianContext: targetDis?.penyebab,
    );
    if (!mounted) return;
    setState(() {
      _externalRef = res;
      _loadingExt = false;
    });
  }

  @override
  void dispose() {
    _followUpCtrl.dispose();
    super.dispose();
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

  List<String> _suggestions(ScanModel scan) {
    return switch (scan.fokusOutput) {
      ScanOutputFocus.penyakit => const [
          'Cara cegah menular ke tanaman/buah lain?',
          'Boleh dijadikan kompos tidak?',
          'Langkah organik pertama hari ini?',
        ],
      ScanOutputFocus.kematangan => [
          'Jam berapa paling baik memetik buah ini?',
          'Cara simpan supaya buah tetap segar?',
          if (scan.penyakitRinganId != null)
            'Apakah bercak kecil ini aman?'
          else
            'Perawatan sampai matang sempurna?',
        ],
      ScanOutputFocus.hara => const [
          'Berapa takaran pupuk organik yang aman?',
          'Berapa hari sekali pupuk susulan?',
          'Tanda tanaman pulih setelah dipupuk?',
        ],
      ScanOutputFocus.tidakTerdeteksi => const [
          'Tips memfoto tanaman agar lebih jelas?',
        ],
    };
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final scan = widget.scan;
    final fokus = scan.fokusOutput;
    final disease = knowledgeDiseases[scan.penyakitUtamaId] ?? knowledgeDiseases['sehat']!;
    final minorDisease =
        scan.penyakitRinganId != null ? knowledgeDiseases[scan.penyakitRinganId!] : null;
    final ripeness =
        scan.tahapDominan != null ? knowledgeRipeness[scan.tahapDominan!] : null;
    final nutrient = (scan.adaGejalaHara && scan.dugaanHaraId != 'cukup')
        ? knowledgeNutrients[scan.dugaanHaraId]
        : null;
    final imgBytes = widget.photoBytes ?? scan.photoBytes;

    final headlineTitle = switch (fokus) {
      ScanOutputFocus.tidakTerdeteksi =>
        scan.diluarKonteksTanaman ? 'Foto bukan objek tanaman' : 'Objek belum terlihat jelas',
      ScanOutputFocus.penyakit => disease.penyakit,
      ScanOutputFocus.hara => nutrient?.dugaan ?? scan.dugaanHaraNama,
      ScanOutputFocus.kematangan => scan.anjuranPanen == 'Panen sekarang'
          ? 'Panen sekarang'
          : 'Tunggu ${scan.estimasiHariMin}–${scan.estimasiHariMax} hari',
    };

    final headlineCaption = switch (fokus) {
      ScanOutputFocus.penyakit => 'Hasil pemeriksaan penyakit',
      ScanOutputFocus.hara => 'Hasil pemeriksaan hara',
      _ => 'Anjuran panen Pak Cermat',
    };

    final suggestions = _suggestions(scan);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Kartu Foto + Keputusan Utama
        CermatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LayoutBuilder(
                builder: (_, constraints) {
                  final w = constraints.maxWidth;
                  const h = 216.0;
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: w,
                      height: h,
                      color: p.surfaceMilk,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (imgBytes != null)
                            Image.memory(imgBytes, fit: BoxFit.cover)
                          else
                            Center(
                              child: Icon(Icons.eco_rounded, size: 78, color: p.leaf600.withAlpha(80)),
                            ),
                          // Kotak deteksi HANYA muncul pada buah segar (kematangan)
                          if (fokus == ScanOutputFocus.kematangan)
                            for (final b in scan.boxes)
                              Positioned(
                                left: b.leftFrac * w,
                                top: b.topFrac * h,
                                width: b.widthFrac * w,
                                height: b.heightFrac * h,
                                child: Container(
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: _stageColor(b.stage), width: 2.8),
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
                                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          if (scan.aiModel != null)
                            Positioned(
                              right: 8,
                              bottom: 8,
                              child: CermatPill.ok('Gemini · ${scan.aiModel}'),
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
                    pose: (fokus == ScanOutputFocus.penyakit ||
                            fokus == ScanOutputFocus.tidakTerdeteksi ||
                            scan.keyakinanRendah)
                        ? CermoPose.worried
                        : CermoPose.happy,
                    size: 72,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(headlineCaption, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.inkSoft)),
                        Text(headlineTitle, style: context.displayStyle(size: 22)),
                        Text(
                          'Seberapa yakin Cermo: ${scan.keyakinan}%',
                          style: TextStyle(fontSize: 13.5, color: p.inkSoft, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              if (scan.temuanVisual.isNotEmpty) ...[
                const SizedBox(height: 10),
                for (final t in scan.temuanVisual)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 3),
                    child: Text('• $t', style: TextStyle(fontSize: 13, color: p.inkSoft, height: 1.4)),
                  ),
              ],

              if (fokus == ScanOutputFocus.tidakTerdeteksi) ...[
                const SizedBox(height: 12),
                StatusAlertCard(
                  accent: AppColors.warn,
                  title: scan.diluarKonteksTanaman
                      ? 'Foto tampak di luar objek tanaman'
                      : 'Objek kurang jelas atau pencahayaan redup',
                  body: scan.ringkasanAi.isNotEmpty
                      ? scan.ringkasanAi
                      : 'Arahkan kamera 20–40 cm pada buah, daun, atau batang di tempat terang lalu pindai ulang.',
                ),
              ] else if (scan.keyakinanRendah) ...[
                const SizedBox(height: 12),
                StatusAlertCard(
                  accent: AppColors.warn,
                  title: 'Cermo belum cukup yakin (${scan.keyakinan}% < ${widget.lowThreshold}%)',
                  body: 'Foto ulang di cahaya terang dan konfirmasi ke penyuluh pertanian setempat sebelum bertindak.',
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 2A. OUTPUT KEMATANGAN BUAH SAJA (untuk buah segar: matang / setengah matang / mentah)
        if (fokus == ScanOutputFocus.kematangan && ripeness != null) ...[
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Kematangan & panen buah', style: context.cardTitleStyle(size: 16.5))),
                    CermatPill.ok(ripeness.anjuran),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Tahap: ${ripeness.label}', style: context.displayStyle(size: 19)),
                      const SizedBox(height: 4),
                      Text(ripeness.ringkasan, style: TextStyle(fontSize: 13.5, color: p.inkSoft)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            '${scan.jumlahBuah} buah ≈ ${scan.estimasiBobotGram} gram',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
                          ),
                          CermatPill.warn('Estimasi kasar'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                StatusAlertCard(
                  accent: AppColors.ok,
                  title: 'Panduan panen & pasca panen',
                  body: '${ripeness.penangananPascaPanen}\n\nSumber: ${ripeness.sumber}',
                ),
                if (scan.estimasiDisesuaikanRiwayat) ...[
                  const SizedBox(height: 10),
                  const StatusAlertCard(
                    accent: AppColors.ok,
                    title: 'Estimasi disesuaikan riwayat ≥ 2 scan',
                    body: 'Perkiraan hari panen memperhitungkan laju pematangan dari scan sebelumnya.',
                  ),
                ],
                // Info tambahan ringkas di bawah HANYA bila ada gejala penyakit kecil pada buah segar
                if (minorDisease != null) ...[
                  const SizedBox(height: 12),
                  StatusAlertCard(
                    accent: AppColors.warn,
                    icon: Icons.info_outline_rounded,
                    title: 'Catatan tambahan: tanda ringan ${minorDisease.penyakit}',
                    body: '${minorDisease.gejala}\n${minorDisease.solusiOrganik.take(2).map((s) => '• $s').join('\n')}',
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // 2B. OUTPUT BUSUK & PENYAKIT SAJA (untuk buah busuk / daun sakit / batang sakit — NOL kematangan!)
        if (fokus == ScanOutputFocus.penyakit) ...[
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text('Diagnosa & penanganan', style: context.cardTitleStyle(size: 16.5))),
                    CermatPill.bad('Dataset Agronomi'),
                  ],
                ),
                const SizedBox(height: 12),
                const Text('3 kemungkinan teratas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                const SizedBox(height: 8),
                for (final pred in scan.penyakitTop3) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(pred.nama, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600))),
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
                  const SizedBox(height: 9),
                ],
                Text('Penyebab: ${disease.penyebab}', style: TextStyle(fontSize: 13.5, color: p.inkSoft)),
                const SizedBox(height: 4),
                Text('Gejala utama: ${disease.gejala}', style: TextStyle(fontSize: 13.5, color: p.inkSoft)),
                const SizedBox(height: 10),
                StatusAlertCard(
                  accent: AppColors.ok,
                  title: 'Solusi organik & sanitasi (Organik lebih dulu)',
                  body: disease.solusiOrganik.map((s) => '• $s').join('\n'),
                ),
                const SizedBox(height: 10),
                StatusAlertCard(
                  accent: AppColors.warn,
                  title: 'Opsi kimiawi (Baca label produk)',
                  body: disease.solusiKimia.join('\n'),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Langkah pencegahan:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                      const SizedBox(height: 4),
                      Text(disease.pencegahan.map((e) => '• $e').join('\n'), style: TextStyle(fontSize: 13, color: p.inkSoft)),
                      const SizedBox(height: 6),
                      Text('Sumber: ${disease.sumber}', style: TextStyle(fontSize: 11.8, color: p.inkSoft)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // 2C. OUTPUT HARA & PUPUK (HANYA muncul otomatis jika terdeteksi gejala kekurangan hara!)
        if (nutrient != null && (fokus == ScanOutputFocus.hara || scan.adaGejalaHara)) ...[
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(nutrient.dugaan, style: context.displayStyle(size: 18.5)),
                    if (scan.pakaiDataSensor) CermatPill.ok('Dengan data sensor') else CermatPill.warn('Dugaan visual'),
                  ],
                ),
                const SizedBox(height: 8),
                StatusAlertCard(
                  accent: AppColors.ok,
                  title: 'Pilihan organik lebih dulu',
                  body: nutrient.rekomendasiOrganik,
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Dosis umum fase ${widget.plant.fase}:', style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(nutrient.dosisPerFase[widget.plant.fase] ?? ''),
                      const SizedBox(height: 6),
                      Text('Sumber: ${nutrient.sumber} · Bukan pengganti uji tanah.', style: TextStyle(fontSize: 12, color: p.inkSoft)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // 2D. REFERENSI PORTAL AGRONOMI RESMI LIVE (Multi-Portal Se-Topik + Auto-Fallback)
        if (fokus != ScanOutputFocus.tidakTerdeteksi && (_loadingExt || _externalRef != null)) ...[
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.menu_book_rounded, size: 18, color: p.leaf700),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text('Pengetahuan eksternal terverifikasi', style: context.cardTitleStyle(size: 15.5)),
                    ),
                    if (_externalRef != null) CermatPill.water(_externalRef!.sumberLabel),
                  ],
                ),
                const SizedBox(height: 8),
                if (_loadingExt && _externalRef == null)
                  Text(
                    'Mencari & memverifikasi portal resmi agronomi se-topik (UC IPM, EPPO, OpenAlex, GBIF)...',
                    style: TextStyle(fontSize: 13, color: p.inkSoft),
                  )
                else if (_externalRef != null) ...[
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(_externalRef!.judul, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      if (_externalRef!.namaIlmiah != null)
                        CermatPill.ok(_externalRef!.namaIlmiah!),
                      if (_externalRef!.famili != null)
                        CermatPill.water('Famili: ${_externalRef!.famili}'),
                    ],
                  ),
                  const SizedBox(height: 6),
                  FormattedText(
                    _externalRef!.ringkasan,
                    style: TextStyle(fontSize: 13, color: p.inkSoft, height: 1.48),
                  ),
                  if (_externalRef!.tautanResmi.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final link in _externalRef!.tautanResmi)
                          ActionChip(
                            avatar: Icon(Icons.open_in_new_rounded, size: 15, color: p.leaf700),
                            backgroundColor: p.surface2,
                            side: BorderSide(color: p.line),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            label: Text(
                              link.label,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.ink),
                            ),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: link.url));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Tautan resmi disalin (${link.domain}): ${link.url}'),
                                ),
                              );
                            },
                          ),
                      ],
                    ),
                  ],
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // 3. INPUT TANYA LANJUTAN LANGSUNG KE CHATBOT CERMO (MEMBAWA DATA HASIL SCAN INI)
        CermatAccentCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const CermoMascot(pose: CermoPose.wave, size: 54, interactive: false),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Tanya lebih lanjut tentang hasil ini', style: context.cardTitleStyle(size: 15.5)),
                        Text(
                          'Data scan ini otomatis dibawa ke Chatbot Cermo untuk diskusi lanjutan.',
                          style: TextStyle(fontSize: 12.5, color: p.inkSoft),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final q in suggestions)
                    ActionChip(
                      backgroundColor: p.surface,
                      side: BorderSide(color: p.line),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                      label: Text(q, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: p.ink)),
                      onPressed: () => widget.onAskFollowUp(q),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _followUpCtrl,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (v) => widget.onAskFollowUp(v),
                      decoration: InputDecoration(
                        hintText: 'Tulis pertanyaan lanjutan...',
                        hintStyle: TextStyle(fontSize: 13.2, color: p.inkSoft),
                        filled: true,
                        fillColor: p.surface,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(13),
                          borderSide: BorderSide(color: p.line),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(13),
                          borderSide: BorderSide(color: p.line),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 46,
                    width: 46,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        padding: EdgeInsets.zero,
                        backgroundColor: p.leaf600,
                        foregroundColor: p.onLeaf,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
                      ),
                      onPressed: () => widget.onAskFollowUp(_followUpCtrl.text),
                      child: const Icon(Icons.send_rounded, size: 19),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 4. Aksi Simpan, Kirim ke Telegram & Scan Foto Lain
        Row(
          children: [
            Expanded(
              child: Primary3DButton(
                label: widget.saved ? 'Tersimpan' : 'Simpan ke timeline',
                icon: widget.saved ? Icons.check_rounded : Icons.bookmark_add_outlined,
                onPressed: widget.saved ? null : widget.onSave,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SecondaryOutlineButton(
                label: 'Scan foto lain',
                icon: Icons.refresh_rounded,
                onPressed: widget.onScanAgain,
              ),
            ),
          ],
        ),
        if (widget.onShareTelegram != null) ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: SecondaryOutlineButton(
              label: _sendingTg
                  ? 'Mengirim ke Telegram...'
                  : _sentTgOk
                      ? 'Terkirim ke Telegram ✓'
                      : 'Kirim ringkasan hasil scan ke Telegram',
              icon: Icons.send_rounded,
              onPressed: _sendingTg
                  ? null
                  : () async {
                      setState(() => _sendingTg = true);
                      final res = await widget.onShareTelegram!();
                      if (!mounted) return;
                      setState(() {
                        _sendingTg = false;
                        if (res.ok) _sentTgOk = true;
                      });
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(res.message)),
                      );
                    },
            ),
          ),
        ],
      ],
    );
  }
}
