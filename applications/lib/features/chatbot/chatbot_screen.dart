import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/cermo_mascot.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';

/// Layar 9: Tanya Cermo — Chatbot Asisten Tani (F5.1–F5.4)
class ChatbotScreen extends ConsumerStatefulWidget {
  const ChatbotScreen({super.key});

  @override
  ConsumerState<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends ConsumerState<ChatbotScreen> {
  final _ctrl = TextEditingController();

  static const _quickQuestions = [
    'Apa arti hasil ini?',
    'Kapan panen?',
    'Pupuk apa?',
    'Solusi penyakit organik?',
  ];

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _send(String text) {
    if (text.trim().isEmpty) return;
    ref.read(cermatProvider.notifier).sendChat(text);
    _ctrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);

    return AppScaffold(
      location: '/chatbot',
      title: 'Tanya Cermo',
      body: Column(
        children: [
          // Konteks tanaman & scan terbaru (F5.1)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: CermatCard(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              radius: 18,
              child: Row(
                children: [
                  const CermoMascot(pose: CermoPose.wave, size: 46),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: state.plants.any((pl) => pl.id == state.chatPlantId)
                            ? state.chatPlantId
                            : state.plants.firstOrNull?.id,
                        items: [
                          for (final pl in state.plants)
                            DropdownMenuItem(value: pl.id, child: Text('Konteks: ${pl.nama}', overflow: TextOverflow.ellipsis)),
                        ],
                        onChanged: (v) {
                          if (v != null) ref.read(cermatProvider.notifier).setChatPlant(v);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Daftar gelembung chat
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: state.chatMessages.length,
              itemBuilder: (_, i) {
                final msg = state.chatMessages[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    mainAxisAlignment: msg.dariCermo ? MainAxisAlignment.start : MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (msg.dariCermo) ...[
                        const CermoMascot(pose: CermoPose.wave, size: 40, interactive: false),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: msg.dariCermo ? p.surface : p.leaf600,
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF14302A).withAlpha(18),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                msg.isi,
                                style: TextStyle(
                                  fontSize: 15,
                                  height: 1.45,
                                  color: msg.dariCermo ? p.ink : p.onLeaf,
                                ),
                              ),
                              // F5.3: Tag wajib pada setiap jawaban Cermo
                              if (msg.dariCermo) ...[
                                const SizedBox(height: 8),
                                CermatPill.warn('Saran, bukan keputusan akhir'),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Saran pertanyaan cepat (F5.4) + Input pesan
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            decoration: BoxDecoration(
              color: p.surface,
              border: Border(top: BorderSide(color: p.line)),
            ),
            child: Column(
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final q in _quickQuestions) ...[
                        ActionChip(
                          label: Text(q, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          backgroundColor: p.surface2,
                          onPressed: () => _send(q),
                        ),
                        const SizedBox(width: 6),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _ctrl,
                        textInputAction: TextInputAction.send,
                        onSubmitted: _send,
                        decoration: InputDecoration(
                          hintText: 'Tanya Cermo soal tomatmu...',
                          filled: true,
                          fillColor: p.surface2,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: p.leaf600,
                        minimumSize: const Size(48, 48),
                      ),
                      onPressed: () => _send(_ctrl.text),
                      icon: Icon(Icons.send_rounded, color: p.onLeaf),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
