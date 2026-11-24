import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/app_scaffold.dart';
import '../../core/widgets/common_cards.dart';
import '../../data/cermat_state.dart';
import '../../data/services/telegram_service.dart';

/// Layar 6: Kalender Panen & Pengingat Otomatis (Grid Bulanan + Antrean Panen + Tab Harian & Telegram)
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  DateTime _visibleMonth = DateTime(DateTime.now().year, DateTime.now().month);
  DateTime _selectedDate = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
  int _reminderTab = 0; // 0: Harian | 1: Telegram
  final _noteCtrl = TextEditingController();
  final _tgCtrl = TextEditingController();
  String? _addPlantId;
  bool _tgBusy = false;
  String? _tgStatusMsg;
  bool _tgStatusOk = false;
  String? _botUsername;

  @override
  void initState() {
    super.initState();
    TelegramService.getBotInfo().then((info) {
      if (mounted && info != null) {
        setState(() => _botUsername = info.username);
      }
    });
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    _tgCtrl.dispose();
    super.dispose();
  }

  bool _sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final state = ref.watch(cermatProvider);
    final notifier = ref.read(cermatProvider.notifier);

    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final upcoming = state.harvestEvents.where((h) => h.sumber == 'estimasi').toList()
      ..sort((a, b) => a.tanggal.compareTo(b.tanggal));
    final actualCount = state.harvestEvents.where((h) => h.sumber == 'aktual').length;
    final selectedEvents = state.harvestEvents.where((h) => _sameDay(h.tanggal, _selectedDate)).toList();

    final firstOfMonth = DateTime(_visibleMonth.year, _visibleMonth.month, 1);
    final daysInMonth = DateTime(_visibleMonth.year, _visibleMonth.month + 1, 0).day;
    final leadingBlanks = (firstOfMonth.weekday - 1) % 7; // Senin = 0

    return AppScaffold(
      location: '/calendar',
      title: 'Kalender panen',
      showBack: true,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          // Ringkasan atas + tombol cepat Ke hari ini & Uji alert
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CermatPill.bad('${upcoming.length} siap/estimasi'),
              CermatPill.ok('$actualCount sudah dipetik'),
              CermatPill.water('${state.jadwalPengingat.where((r) => r.aktif).length} pengingat aktif'),
              ActionChip(
                backgroundColor: p.surface,
                side: BorderSide(color: p.line),
                label: Text('Ke hari ini', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.leaf700)),
                onPressed: () => setState(() {
                  _visibleMonth = DateTime(today.year, today.month);
                  _selectedDate = today;
                }),
              ),
              ActionChip(
                backgroundColor: p.creamWarm,
                side: BorderSide(color: p.creamBorder),
                label: Text('Uji alert', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.ink)),
                onPressed: () => notifier.triggerTestAlert(),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Kalender Grid Bulanan Interaktif
          CermatCard(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      onPressed: () => setState(
                        () => _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month - 1),
                      ),
                      icon: Icon(Icons.chevron_left_rounded, color: p.ink),
                    ),
                    Text(
                      DateFormat('MMMM yyyy', 'id_ID').format(_visibleMonth),
                      style: context.displayStyle(size: 19),
                    ),
                    IconButton(
                      onPressed: () => setState(
                        () => _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month + 1),
                      ),
                      icon: Icon(Icons.chevron_right_rounded, color: p.ink),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    for (final d in const ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'])
                      Expanded(
                        child: Center(
                          child: Text(d, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: leadingBlanks + daysInMonth,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisSpacing: 6,
                    crossAxisSpacing: 6,
                    childAspectRatio: 1.0,
                  ),
                  itemBuilder: (_, idx) {
                    if (idx < leadingBlanks) return const SizedBox.shrink();
                    final day = idx - leadingBlanks + 1;
                    final date = DateTime(_visibleMonth.year, _visibleMonth.month, day);
                    final isToday = _sameDay(date, today);
                    final isSel = _sameDay(date, _selectedDate);
                    final dayEvents = state.harvestEvents.where((h) => _sameDay(h.tanggal, date)).toList();
                    final hasEst = dayEvents.any((e) => e.sumber == 'estimasi');
                    final hasAct = dayEvents.any((e) => e.sumber == 'aktual');

                    return GestureDetector(
                      onTap: () => setState(() => _selectedDate = date),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        decoration: BoxDecoration(
                          color: isSel
                              ? p.leaf600
                              : isToday
                                  ? p.creamWarm
                                  : p.surface2,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSel
                                ? p.leaf600
                                : isToday
                                    ? AppColors.tomatoBtn
                                    : p.line.withAlpha(130),
                            width: isToday && !isSel ? 1.6 : 1,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '$day',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isSel ? p.onLeaf : p.ink,
                              ),
                            ),
                            if (hasEst || hasAct) ...[
                              const SizedBox(height: 3),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (hasEst)
                                    Container(
                                      width: 5.5,
                                      height: 5.5,
                                      margin: const EdgeInsets.symmetric(horizontal: 1.5),
                                      decoration: BoxDecoration(
                                        color: isSel ? Colors.white : AppColors.tomatoBtn,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  if (hasAct)
                                    Container(
                                      width: 5.5,
                                      height: 5.5,
                                      margin: const EdgeInsets.symmetric(horizontal: 1.5),
                                      decoration: BoxDecoration(
                                        color: isSel ? p.lime300 : p.leaf600,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Agenda Tanggal Terpilih + Tambah Jadwal Manual
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Agenda ${DateFormat('d MMMM yyyy', 'id_ID').format(_selectedDate)}',
                  style: context.cardTitleStyle(size: 16),
                ),
                const SizedBox(height: 10),
                if (selectedEvents.isEmpty)
                  Text('Belum ada jadwal panen pada tanggal ini.', style: TextStyle(fontSize: 13.5, color: p.inkSoft))
                else
                  for (final ev in selectedEvents) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: p.surface2,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  state.plants.where((pl) => pl.id == ev.plantId).firstOrNull?.nama ?? 'Tanaman',
                                  style: const TextStyle(fontWeight: FontWeight.w700),
                                ),
                                Text(ev.catatan, style: TextStyle(fontSize: 12.8, color: p.inkSoft)),
                              ],
                            ),
                          ),
                          if (ev.sumber == 'estimasi')
                            FilledButton(
                              style: FilledButton.styleFrom(backgroundColor: p.leaf600, foregroundColor: p.onLeaf),
                              onPressed: () => notifier.markHarvestActual(ev.id),
                              child: const Text('Panen'),
                            )
                          else
                            CermatPill.ok('Dipanen'),
                        ],
                      ),
                    ),
                  ],
                const SizedBox(height: 10),
                if (state.plants.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    value: _addPlantId ?? state.plants.first.id,
                    decoration: InputDecoration(
                      labelText: 'Tambah jadwal panen untuk',
                      filled: true,
                      fillColor: p.surface2,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: [
                      for (final pl in state.plants)
                        DropdownMenuItem(value: pl.id, child: Text(pl.nama)),
                    ],
                    onChanged: (v) => setState(() => _addPlantId = v),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _noteCtrl,
                          decoration: InputDecoration(
                            hintText: 'Catatan panen (opsional)',
                            filled: true,
                            fillColor: p.surface2,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Primary3DButton(
                        label: 'Tambah',
                        onPressed: () {
                          final pid = _addPlantId ?? state.plants.first.id;
                          notifier.addHarvestEvent(pid, _selectedDate, _noteCtrl.text);
                          _noteCtrl.clear();
                        },
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Antrean Panen Terdekat
          if (upcoming.isNotEmpty) ...[
            CermatCard(
              color: p.creamWarm,
              borderColor: p.creamBorder,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Antrean panen mendatang', style: context.cardTitleStyle(size: 16)),
                  const SizedBox(height: 10),
                  for (final ev in upcoming.take(4)) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(11),
                      decoration: BoxDecoration(
                        color: p.surface,
                        borderRadius: BorderRadius.circular(13),
                        border: Border.all(color: p.line),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  state.plants.where((pl) => pl.id == ev.plantId).firstOrNull?.nama ?? 'Tanaman',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.8),
                                ),
                                Text(
                                  '${DateFormat('d MMM', 'id_ID').format(ev.tanggal)} · ${ev.catatan}',
                                  style: TextStyle(fontSize: 12.2, color: p.inkSoft),
                                ),
                              ],
                            ),
                          ),
                          FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: p.leaf600,
                              foregroundColor: p.onLeaf,
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                            ),
                            onPressed: () => notifier.markHarvestActual(ev.id),
                            child: const Text('Panen'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Pengingat Otomatis (2 Tab: Harian & Telegram)
          CermatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Pengingat otomatis', style: context.cardTitleStyle(size: 16.5)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _SmallTab('Jadwal Harian', _reminderTab == 0, () => setState(() => _reminderTab = 0)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _SmallTab('Bot Telegram', _reminderTab == 1, () => setState(() => _reminderTab = 1)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_reminderTab == 0) ...[
                  for (final r in state.jadwalPengingat)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      title: Text(r.judul, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      subtitle: Text(r.catatan, style: TextStyle(fontSize: 12.2, color: p.inkSoft)),
                      leading: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () => _pickTime(context, r),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: p.surfaceMilk,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(r.jam, style: TextStyle(fontWeight: FontWeight.w700, color: p.leaf700)),
                        ),
                      ),
                      trailing: Switch(
                        activeColor: p.leaf600,
                        value: r.aktif,
                        onChanged: (v) => notifier.updateReminderSchedule(r.id, aktif: v),
                      ),
                    ),
                ] else ...[
                  if (state.telegramChatId != null) ...[
                    StatusAlertCard(
                      accent: AppColors.ok,
                      title: 'Tertaut ke Chat ID ${state.telegramChatId}',
                      body:
                          'Jadwal panen/siram (${state.telegramTime} WIB), peringatan sensor kritis, dan temuan penyakit scan aktif dikirim ke Telegram.',
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Primary3DButton(
                            label: _tgBusy ? 'Mengirim...' : 'Kirim pesan uji',
                            icon: Icons.send_rounded,
                            onPressed: _tgBusy
                                ? null
                                : () async {
                                    setState(() {
                                      _tgBusy = true;
                                      _tgStatusMsg = null;
                                    });
                                    final res = await notifier.sendTestTelegram();
                                    if (!mounted) return;
                                    setState(() {
                                      _tgBusy = false;
                                      _tgStatusOk = res.ok;
                                      _tgStatusMsg = res.message;
                                    });
                                  },
                          ),
                        ),
                        const SizedBox(width: 8),
                        SecondaryOutlineButton(
                          label: 'Putuskan',
                          onPressed: () {
                            notifier.unlinkTelegram();
                            setState(() => _tgStatusMsg = null);
                          },
                        ),
                      ],
                    ),
                  ] else ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: p.surface2,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: p.line),
                      ),
                      child: Column(
                        children: [
                          Text('Kode tautan 6 digit', style: TextStyle(fontSize: 12, color: p.inkSoft)),
                          const SizedBox(height: 4),
                          Text(
                            state.telegramCode,
                            style: context.displayStyle(size: 26),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            alignment: WrapAlignment.center,
                            children: [
                              ActionChip(
                                avatar: Icon(Icons.copy_rounded, size: 15, color: p.leaf700),
                                label: Text(
                                  _botUsername != null
                                      ? 'Salin link @$_botUsername'
                                      : 'Salin /link ${state.telegramCode}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                ),
                                onPressed: () {
                                  final text = _botUsername != null
                                      ? 'https://t.me/$_botUsername?start=${state.telegramCode}'
                                      : '/link ${state.telegramCode}';
                                  Clipboard.setData(ClipboardData(text: text));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Disalin: $text')),
                                  );
                                },
                              ),
                              ActionChip(
                                avatar: Icon(Icons.refresh_rounded, size: 15, color: p.inkSoft),
                                label: const Text('Kode baru', style: TextStyle(fontSize: 12)),
                                onPressed: () => notifier.regenerateTelegramCode(),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '1. Buka bot ${_botUsername != null ? '@$_botUsername' : 'Telegram CermatTani'} lalu tekan Start (atau kirim /link ${state.telegramCode}).\n2. Tekan "Deteksi & Sambungkan Otomatis" di bawah.',
                      style: TextStyle(fontSize: 12.5, color: p.inkSoft, height: 1.45),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: Primary3DButton(
                        label: _tgBusy ? 'Mendeteksi pesan bot...' : 'Deteksi & Sambungkan Otomatis',
                        icon: Icons.auto_awesome_rounded,
                        onPressed: _tgBusy
                            ? null
                            : () async {
                                setState(() {
                                  _tgBusy = true;
                                  _tgStatusMsg = null;
                                });
                                final res = await notifier.linkTelegram();
                                if (!mounted) return;
                                setState(() {
                                  _tgBusy = false;
                                  _tgStatusOk = res.ok;
                                  _tgStatusMsg = res.message;
                                });
                              },
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _tgCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Atau Chat ID numerik manual (opsional)',
                        filled: true,
                        fillColor: p.surface2,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: SecondaryOutlineButton(
                        label: 'Tautkan Chat ID Manual',
                        icon: Icons.send_rounded,
                        onPressed: _tgBusy
                            ? null
                            : () async {
                                setState(() {
                                  _tgBusy = true;
                                  _tgStatusMsg = null;
                                });
                                final res = await notifier.linkTelegram(manualChatId: _tgCtrl.text);
                                if (!mounted) return;
                                setState(() {
                                  _tgBusy = false;
                                  _tgStatusOk = res.ok;
                                  _tgStatusMsg = res.message;
                                });
                              },
                      ),
                    ),
                  ],
                  if (_tgStatusMsg != null) ...[
                    const SizedBox(height: 10),
                    StatusAlertCard(
                      accent: _tgStatusOk ? AppColors.ok : AppColors.warn,
                      title: _tgStatusOk ? 'Berhasil' : 'Info Telegram',
                      body: _tgStatusMsg!,
                    ),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickTime(BuildContext context, ReminderScheduleModel item) async {
    final parts = item.jam.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.first) ?? 7,
      minute: int.tryParse(parts.last) ?? 0,
    );
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked == null) return;
    final formatted =
        '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    ref.read(cermatProvider.notifier).updateReminderSchedule(item.id, jam: formatted);
  }
}

class _SmallTab extends StatelessWidget {
  const _SmallTab(this.label, this.active, this.onTap);
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
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? p.leaf600 : p.surface2,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: active ? p.onLeaf : p.inkSoft),
        ),
      ),
    );
  }
}
