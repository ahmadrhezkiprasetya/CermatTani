import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../core/widgets/formatted_text.dart';
import '../../data/cermat_state.dart';
import '../../data/services/gemini_service.dart';

/// Layar 9: Tanya Cermo AI — Viewport-Locked + Auto-Terima Pertanyaan & Data Scan dari Layar Scan
class ChatbotScreen extends ConsumerStatefulWidget {
  const ChatbotScreen({super.key});

  @override
  ConsumerState<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends ConsumerState<ChatbotScreen> {
  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _loading = false;
  bool _showJumpDown = false;
  String? _errorText;
  String? _lastDispatchedSig;

  static const _defaultQuestions = [
    'Apa arti hasil scan terakhirku?',
    'Kapan waktu terbaik panen?',
    'Pupuk organik apa yang cocok?',
    'Cara atasi penyakit secara organik?',
    'Apakah tandon & irigasi aman?',
  ];

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    _ctrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    final max = _scrollCtrl.position.maxScrollExtent;
    final curr = _scrollCtrl.position.pixels;
    final away = (max - curr) > 100;
    if (away != _showJumpDown) {
      setState(() => _showJumpDown = away);
    }
  }

  void _scrollToBottom({bool animated = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollCtrl.hasClients) return;
      final target = _scrollCtrl.position.maxScrollExtent;
      if (animated) {
        _scrollCtrl.animateTo(
          target,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
        );
      } else {
        _scrollCtrl.jumpTo(target);
      }
    });
  }

  ScanModel? _resolveActiveScan(CermatState state, PlantModel? plant) {
    if (state.chatContextScan != null &&
        (plant == null || state.chatContextScan!.plantId == plant.id)) {
      return state.chatContextScan;
    }
    if (plant == null) return null;
    return state.scans.where((s) => s.plantId == plant.id).firstOrNull;
  }

  String? _scanBannerText(ScanModel? scan) {
    if (scan == null) return null;
    return switch (scan.fokusOutput) {
      ScanOutputFocus.penyakit =>
        'Data scan aktif: ${scan.penyakitUtamaNama} · Keyakinan ${scan.keyakinan}%',
      ScanOutputFocus.kematangan => () {
          final rip = scan.tahapDominan != null ? knowledgeRipeness[scan.tahapDominan!] : null;
          final minor = scan.penyakitRinganId != null &&
                  knowledgeDiseases.containsKey(scan.penyakitRinganId!)
              ? ' (+ catatan: ${knowledgeDiseases[scan.penyakitRinganId!]!.penyakit})'
              : '';
          return 'Data scan aktif: ${rip?.label ?? '-'} (${scan.anjuranPanen})$minor · Keyakinan ${scan.keyakinan}%';
        }(),
      ScanOutputFocus.hara =>
        'Data scan aktif: ${scan.dugaanHaraNama} · Keyakinan ${scan.keyakinan}%',
      ScanOutputFocus.tidakTerdeteksi =>
        'Data scan aktif: Foto sebelumnya belum jelas · Keyakinan ${scan.keyakinan}%',
    };
  }

  List<String> _contextualQuickQuestions(ScanModel? scan) {
    if (scan == null) return _defaultQuestions;
    return switch (scan.fokusOutput) {
      ScanOutputFocus.penyakit => const [
          'Cara cegah ini menular ke buah/tanaman lain?',
          'Langkah penanganan organik paling aman?',
          'Boleh dijadikan kompos tidak?',
          'Apakah kelembapan kebun memicu ini?',
        ],
      ScanOutputFocus.kematangan => const [
          'Jam berapa terbaik memetik buah ini?',
          'Cara simpan supaya tahan lama?',
          'Pupuk organik apa yang cocok fase ini?',
          'Apakah tandon & irigasi aman?',
        ],
      ScanOutputFocus.hara => const [
          'Berapa takaran pupuk organik yang aman?',
          'Berapa hari sekali pupuk susulan?',
          'Tanda tanaman pulih setelah dipupuk?',
          'Apakah penyiraman perlu disesuaikan?',
        ],
      ScanOutputFocus.tidakTerdeteksi => _defaultQuestions,
    };
  }

  Future<void> _send(String rawText, {ScanModel? overrideScan}) async {
    final text = rawText.trim();
    if (text.isEmpty || _loading) return;
    _ctrl.clear();

    final state = ref.read(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);
    final plant =
        state.plants.where((p) => p.id == state.chatPlantId).firstOrNull ?? state.plants.firstOrNull;
    final activeScan = overrideScan ?? _resolveActiveScan(state, plant);
    final historySnapshot = [...state.chatMessages];

    notifier.appendChatMessage(
      ChatMsgModel(
        id: 'u-${DateTime.now().millisecondsSinceEpoch}',
        dariCermo: false,
        isi: text,
      ),
    );
    setState(() {
      _loading = true;
      _errorText = null;
    });
    _scrollToBottom();

    try {
      final res = await GeminiService.chatWithCermo(
        message: text,
        history: historySnapshot,
        plant: plant,
        latestScan: activeScan,
        state: ref.read(cermatProvider),
      );
      if (!mounted) return;
      notifier.appendChatMessage(
        ChatMsgModel(
          id: 'b-${DateTime.now().millisecondsSinceEpoch}',
          dariCermo: true,
          isi: res.reply,
          aiModel: res.aiModel,
        ),
      );
      setState(() => _loading = false);
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _errorText = e.toString();
      });
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);
    final activePlant =
        state.plants.where((pl) => pl.id == state.chatPlantId).firstOrNull ?? state.plants.firstOrNull;
    final activeScan = _resolveActiveScan(state, activePlant);
    final bannerText = _scanBannerText(activeScan);
    final quickQuestions = _contextualQuickQuestions(activeScan);

    // Otomatis kirim pertanyaan yang baru dikirim dari layar hasil Scan
    final pendingQ = state.pendingChatQuestion;
    if (pendingQ != null && pendingQ.isNotEmpty) {
      final sig = '$pendingQ|${activeScan?.id ?? ''}';
      if (_lastDispatchedSig != sig) {
        _lastDispatchedSig = sig;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          ref.read(cermatProvider.notifier).clearPendingChatQuestion();
          _send(pendingQ, overrideScan: activeScan);
        });
      }
    } else {
      _lastDispatchedSig = null;
    }

    return AppScaffold(
      location: '/chatbot',
      title: 'Tanya Cermo AI',
      trailingActions: [
        if (state.chatMessages.isNotEmpty)
          TextButton(
            onPressed: () {
              notifier.clearChatMessages();
              setState(() => _errorText = null);
            },
            child: Text('Baru', style: TextStyle(fontWeight: FontWeight.w700, color: p.leaf700)),
          ),
      ],
      body: Padding(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
        child: Column(
          children: [
            // 1. Header konteks tanaman & data scan aktif (diam di atas)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: p.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: p.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CermoMascot(pose: CermoPose.wave, size: 42, interactive: false),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isDense: true,
                            isExpanded: true,
                            value: activePlant?.id,
                            items: [
                              for (final pl in state.plants)
                                DropdownMenuItem(
                                  value: pl.id,
                                  child: Text(
                                    '${pl.nama} (${pl.fase})',
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: p.ink),
                                  ),
                                ),
                            ],
                            onChanged: (v) {
                              if (v != null) notifier.setChatPlant(v);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      CermatPill.ok('Gemini AI'),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: p.surface2,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      bannerText ??
                          'Belum ada hasil scan tersimpan. Tanyakan budidaya, penyakit, pupuk organik, atau irigasi di bawah.',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: p.inkSoft),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // 2. Area daftar pesan yang BISA DI-SCROLL secara mandiri
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: p.surfaceMilk.withAlpha(p.isDark ? 90 : 120),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: p.line),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(17),
                  child: Stack(
                    children: [
                      if (state.chatMessages.isEmpty && !_loading && _errorText == null)
                        Center(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.all(22),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CermoMascot(pose: CermoPose.happy, size: 104),
                                const SizedBox(height: 12),
                                Text(
                                  'Halo! Aku Cermo, siap bantu kebunmu',
                                  textAlign: TextAlign.center,
                                  style: context.displayStyle(size: 20),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  bannerText != null
                                      ? '$bannerText sudah terhubung. Langsung tanyakan langkah lanjutan di bawah!'
                                      : 'Semua jawaban dihasilkan langsung oleh Gemini AI dengan acuan Dataset Agronomi CermatTani v2.1.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 13.2, color: p.inkSoft, height: 1.48),
                                ),
                                const SizedBox(height: 12),
                                CermatPill.ok('Organik dulu · Dataset Agronomi'),
                              ],
                            ),
                          ),
                        )
                      else
                        ListView.builder(
                          controller: _scrollCtrl,
                          padding: const EdgeInsets.fromLTRB(12, 12, 12, 18),
                          itemCount:
                              state.chatMessages.length + (_loading ? 1 : 0) + (_errorText != null ? 1 : 0),
                          itemBuilder: (_, idx) {
                            if (idx < state.chatMessages.length) {
                              return _ChatBubble(msg: state.chatMessages[idx]);
                            }
                            if (_loading && idx == state.chatMessages.length) {
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Row(
                                  children: [
                                    const CermoMascot(pose: CermoPose.thinking, size: 42, interactive: false),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: p.surface,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(color: p.line),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          SizedBox(
                                            width: 14,
                                            height: 14,
                                            child: CircularProgressIndicator(strokeWidth: 2, color: p.leaf600),
                                          ),
                                          const SizedBox(width: 8),
                                          Text('Cermo sedang merangkai saran...', style: TextStyle(fontSize: 13, color: p.inkSoft)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: StatusAlertCard(
                                accent: AppColors.bad,
                                title: 'Gagal menghubungi Cermo AI',
                                body: _errorText ?? 'Periksa koneksi internet HP kamu.',
                              ),
                            );
                          },
                        ),

                      if (_showJumpDown)
                        Positioned(
                          right: 12,
                          bottom: 10,
                          child: Material(
                            elevation: 4,
                            color: p.leaf600,
                            borderRadius: BorderRadius.circular(999),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(999),
                              onTap: () => _scrollToBottom(),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.arrow_downward_rounded, size: 15, color: p.onLeaf),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Pesan terbaru',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.onLeaf),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // 3. Chip pertanyaan cepat kontekstual 1 baris horizontal
            SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: quickQuestions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 6),
                itemBuilder: (_, i) => ActionChip(
                  backgroundColor: p.surface,
                  side: BorderSide(color: p.line),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  label: Text(quickQuestions[i], style: TextStyle(fontSize: 12.2, fontWeight: FontWeight.w600, color: p.ink)),
                  onPressed: _loading ? null : () => _send(quickQuestions[i]),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // 4. Bar input pesan tetap diam di bawah
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (v) => _send(v),
                    decoration: InputDecoration(
                      hintText: 'Tanya lanjutan tentang hasil scan, penyakit, atau pupuk...',
                      hintStyle: TextStyle(fontSize: 13.5, color: p.inkSoft),
                      filled: true,
                      fillColor: p.surface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: p.line),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: p.line),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 48,
                  width: 48,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      padding: EdgeInsets.zero,
                      backgroundColor: p.leaf600,
                      foregroundColor: p.onLeaf,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _loading ? null : () => _send(_ctrl.text),
                    child: const Icon(Icons.send_rounded, size: 20),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.msg});
  final ChatMsgModel msg;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final isBot = msg.dariCermo;
    return Align(
      alignment: isBot ? Alignment.centerLeft : Alignment.centerRight,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: isBot ? p.surface : p.leaf600,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isBot ? 4 : 16),
              bottomRight: Radius.circular(isBot ? 16 : 4),
            ),
            border: isBot ? Border.all(color: p.line) : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FormattedText(
                msg.isi,
                style: TextStyle(
                  fontSize: 13.8,
                  height: 1.48,
                  color: isBot ? p.ink : p.onLeaf,
                ),
              ),
              if (isBot) ...[
                const SizedBox(height: 6),
                Text(
                  'Saran, bukan keputusan akhir${msg.aiModel != null ? ' · ${msg.aiModel}' : ''}',
                  style: TextStyle(fontSize: 11, color: p.inkSoft),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
