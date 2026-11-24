import 'dart:async';
import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../../data/plant_varieties.dart';
import '../../data/services/plant_catalog_service.dart';

/// Input pencarian & bebas-ketik untuk SEMUA jenis tanaman (CKAN Satu Data Klaten + GBIF Plantae + Wiki ID + Katalog).
class PlantSearchField extends StatelessWidget {
  const PlantSearchField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label = 'Jenis / Varietas (bisa semua tanaman)',
  });

  final String value;
  final ValueChanged<String> onChanged;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => _openPicker(context),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          filled: true,
          fillColor: p.surface2,
          prefixIcon: Icon(Icons.search_rounded, size: 20, color: p.leaf600),
          suffixIcon: Icon(Icons.tune_rounded, size: 18, color: p.inkSoft),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: p.line),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: p.line),
          ),
        ),
        child: Text(
          value.trim().isEmpty ? 'Cari atau ketik tanaman apa saja...' : value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14.5,
            fontWeight: value.trim().isEmpty ? FontWeight.w400 : FontWeight.w600,
            color: value.trim().isEmpty ? p.inkSoft : p.ink,
          ),
        ),
      ),
    );
  }

  Future<void> _openPicker(BuildContext context) async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.ct.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (_) => _PlantSearchSheet(initialValue: value),
    );
    if (picked != null && picked.trim().isNotEmpty) {
      onChanged(picked.trim());
    }
  }
}

class _PlantSearchSheet extends StatefulWidget {
  const _PlantSearchSheet({required this.initialValue});
  final String initialValue;

  @override
  State<_PlantSearchSheet> createState() => _PlantSearchSheetState();
}

class _PlantSearchSheetState extends State<_PlantSearchSheet> {
  late final TextEditingController _ctrl;
  List<PlantVarietyOption> _items = kPlantVarietyCatalog;
  bool _loading = false;
  String _activeTab = 'Semua';
  Timer? _debounce;

  static const _tabs = ['Semua', 'Satu Data Klaten', 'Sayur', 'Pangan', 'Buah', 'Rempah', 'Hias'];

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialValue);
    _runSearch(widget.initialValue);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  void _onQueryChanged(String val) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 260), () => _runSearch(val));
  }

  Future<void> _runSearch(String q) async {
    if (!mounted) return;
    setState(() => _loading = true);
    final res = await PlantCatalogService.searchPlants(q);
    if (!mounted) return;
    setState(() {
      _items = res;
      _loading = false;
    });
  }

  List<PlantVarietyOption> get _filtered {
    if (_activeTab == 'Semua') return _items;
    if (_activeTab == 'Satu Data Klaten') {
      return _items.where((i) => i.source == 'satudata_klaten').toList();
    }
    final tabLower = _activeTab.toLowerCase();
    return _items.where((i) => i.category.toLowerCase().contains(tabLower)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.ct;
    final typed = _ctrl.text.trim();
    final filtered = _filtered;
    final exactMatch =
        typed.isNotEmpty && filtered.any((i) => i.value.toLowerCase() == typed.toLowerCase());

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).viewInsets.bottom + 14),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.72,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(color: p.line, borderRadius: BorderRadius.circular(99)),
                ),
              ),
              const SizedBox(height: 12),
              Text('Pilih atau ketik tanaman apa saja', style: context.displayStyle(size: 19)),
              const SizedBox(height: 3),
              Text(
                'Terhubung ke Satu Data Klaten (CKAN), GBIF Plantae (global), & Wikipedia ID — atau ketik bebas.',
                style: TextStyle(fontSize: 12, color: p.inkSoft),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _ctrl,
                autofocus: true,
                onChanged: (v) {
                  setState(() {});
                  _onQueryChanged(v);
                },
                onSubmitted: (v) {
                  if (v.trim().isNotEmpty) Navigator.pop(context, v.trim());
                },
                decoration: InputDecoration(
                  hintText: 'Contoh: Cabai, Bawang Putih, Padi, Durian, Kopi, Anggrek...',
                  filled: true,
                  fillColor: p.surface2,
                  prefixIcon: Icon(Icons.search_rounded, color: p.leaf600),
                  suffixIcon: _loading
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                        )
                      : typed.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close_rounded, size: 18),
                              onPressed: () {
                                _ctrl.clear();
                                setState(() {});
                                _runSearch('');
                              },
                            )
                          : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: p.line),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _tabs.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, idx) {
                    final tab = _tabs[idx];
                    final active = _activeTab == tab;
                    return ChoiceChip(
                      label: Text(tab, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : p.inkSoft)),
                      selected: active,
                      selectedColor: p.leaf600,
                      backgroundColor: p.surface2,
                      side: BorderSide(color: p.line),
                      visualDensity: VisualDensity.compact,
                      onSelected: (_) => setState(() => _activeTab = tab),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              if (typed.isNotEmpty && !exactMatch)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: ListTile(
                    dense: true,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: p.leaf600),
                    ),
                    tileColor: p.surfaceMilk,
                    leading: Icon(Icons.eco_rounded, color: p.leaf700),
                    title: Text(
                      'Gunakan "$typed" (tanaman bebas)',
                      style: TextStyle(fontWeight: FontWeight.w700, color: p.leaf700, fontSize: 13.5),
                    ),
                    onTap: () => Navigator.pop(context, typed),
                  ),
                ),
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          'Ketik nama tanamanmu lalu tekan "Gunakan" di atas.',
                          style: TextStyle(color: p.inkSoft, fontSize: 13),
                        ),
                      )
                    : ListView.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => Divider(height: 1, color: p.line.withAlpha(90)),
                        itemBuilder: (_, i) {
                          final item = filtered[i];
                          final badgeBg = switch (item.source) {
                            'satudata_klaten' => AppColors.waterBg,
                            'gbif' => AppColors.okBg,
                            'wikipedia' => p.creamWarm,
                            _ => p.surface2,
                          };
                          final badgeFg = switch (item.source) {
                            'satudata_klaten' => AppColors.waterFg,
                            'gbif' => AppColors.okFg,
                            _ => p.inkSoft,
                          };
                          return ListTile(
                            dense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            title: Text(item.label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: p.ink)),
                            subtitle: Text(
                              item.scientificName ?? item.category,
                              style: TextStyle(fontSize: 11.5, color: p.inkSoft),
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(99)),
                              child: Text(
                                item.sourceLabel,
                                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: badgeFg),
                              ),
                            ),
                            onTap: () => Navigator.pop(context, item.value),
                          );
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
