'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  Download,
  Leaf,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Sprout,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { PakCermatMascot } from '../components/PakCermatMascot';
import { GreenAreaChart } from '../components/Charts';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { PlantSearchInput } from '../components/PlantSearchInput';
import { downloadCsv } from '../utils/scanAnalyzer';
import { GrowthPhase, ScanRecord } from '../types/cermattani';

const GROWTH_PHASES: GrowthPhase[] = ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];

function daysSince(ymd: string): number {
  const start = new Date(ymd).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateId(ymd: string): string {
  try {
    return new Date(`${ymd}T00:00:00`).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

/* Layar 5: Tanaman & Timeline — Master–Detail Rapi & Nyaman Digunakan (F4.1–F4.3) */
export const PlantsScreen: React.FC = () => {
  const {
    state,
    activeFarm,
    activeFarmPlants,
    addPlant,
    openScanWith,
    openChatWithPlant,
    setActiveScreen,
  } = useApp();

  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    activeFarmPlants[0]?.id || state.plants[0]?.id || ''
  );
  const [phaseFilter, setPhaseFilter] = useState<'semua' | 'berbuah' | 'tumbuh' | 'perhatian'>('semua');
  const [localSearch, setLocalSearch] = useState('');
  const [openedScan, setOpenedScan] = useState<ScanRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form tambah tanaman
  const [nama, setNama] = useState('');
  const [varietas, setVarietas] = useState('Cabai Rawit');
  const [tanggalTanam, setTanggalTanam] = useState(new Date().toISOString().slice(0, 10));
  const [fase, setFase] = useState<GrowthPhase>('Vegetatif');

  const plantMetaMap = useMemo(() => {
    const map = new Map<
      string,
      { scans: ScanRecord[]; latest?: ScanRecord; hasIssue: boolean; nextHarvest?: string }
    >();
    for (const p of activeFarmPlants) {
      const scans = state.scans
        .filter((s) => s.plantId === p.id)
        .sort((a, b) => b.waktu.localeCompare(a.waktu));
      const latest = scans[0];
      const hasIssue = Boolean(latest && latest.penyakitUtamaId !== 'sehat');
      const nextEv = state.harvestEvents
        .filter((h) => h.plantId === p.id && h.sumber === 'estimasi')
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0];
      map.set(p.id, { scans, latest, hasIssue, nextHarvest: nextEv?.tanggal });
    }
    return map;
  }, [activeFarmPlants, state.scans, state.harvestEvents]);

  const filteredPlants = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return activeFarmPlants.filter((p) => {
      const meta = plantMetaMap.get(p.id);
      if (q && !p.nama.toLowerCase().includes(q) && !p.varietas.toLowerCase().includes(q)) {
        return false;
      }
      if (phaseFilter === 'berbuah') return p.fase === 'Berbuah' || p.fase === 'Panen';
      if (phaseFilter === 'tumbuh') return p.fase === 'Bibit' || p.fase === 'Vegetatif' || p.fase === 'Berbunga';
      if (phaseFilter === 'perhatian') return Boolean(meta?.hasIssue);
      return true;
    });
  }, [activeFarmPlants, plantMetaMap, localSearch, phaseFilter]);

  const selectedPlant = useMemo(
    () =>
      filteredPlants.find((p) => p.id === selectedPlantId) ||
      activeFarmPlants.find((p) => p.id === selectedPlantId) ||
      filteredPlants[0] ||
      activeFarmPlants[0] ||
      null,
    [filteredPlants, activeFarmPlants, selectedPlantId]
  );

  // Semua scan tanaman terpilih urut dari terlama -> terbaru untuk timeline
  const plantScansChrono = useMemo(() => {
    if (!selectedPlant) return [];
    return state.scans
      .filter((s) => s.plantId === selectedPlant.id)
      .sort((a, b) => a.waktu.localeCompare(b.waktu));
  }, [state.scans, selectedPlant]);

  const firstDiseaseScanId = useMemo(
    () => plantScansChrono.find((s) => s.penyakitUtamaId !== 'sehat')?.id || null,
    [plantScansChrono]
  );

  const chartPoints = useMemo(() => {
    return plantScansChrono.map((s) => {
      const score =
        s.penyakitUtamaId === 'sehat'
          ? Math.max(78, s.keyakinan)
          : Math.max(25, 100 - s.keyakinan);
      return {
        label: new Date(s.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        value: score,
      };
    });
  }, [plantScansChrono]);

  const attentionCount = useMemo(
    () => activeFarmPlants.filter((p) => plantMetaMap.get(p.id)?.hasIssue).length,
    [activeFarmPlants, plantMetaMap]
  );

  const fruitingCount = useMemo(
    () => activeFarmPlants.filter((p) => p.fase === 'Berbuah' || p.fase === 'Panen').length,
    [activeFarmPlants]
  );

  const handleExportCsv = () => {
    const headers = [
      'ID Scan',
      'Tanaman',
      'Waktu',
      'Bagian',
      'Tahap Kematangan',
      'Jumlah Buah',
      'Anjuran Panen',
      'Penyakit Utama',
      'Keyakinan (%)',
      'Dugaan Hara',
      'Pakai Sensor',
    ];
    const rows = state.scans.map((s) => {
      const p = state.plants.find((pl) => pl.id === s.plantId);
      return [
        s.id,
        p?.nama || s.plantId,
        s.waktu,
        s.bagian,
        s.tahapDominan ? RIPENESS_REFERENCE[s.tahapDominan].label : '-',
        s.jumlahBuah,
        s.anjuranPanen,
        s.penyakitUtamaNama,
        s.keyakinan,
        s.dugaanHaraNama,
        s.pakaiDataSensor ? 'Ya (Simulasi)' : 'Visual',
      ];
    });
    downloadCsv('cermattani-riwayat-scan.csv', headers, rows);
  };

  const handleAddPlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !activeFarm) return;
    const created = addPlant({
      farmId: activeFarm.id,
      nama,
      varietas: varietas.trim() || 'Tanaman Kebun',
      tanggalTanam,
      fase,
    });
    setSelectedPlantId(created.id);
    setPhaseFilter('semua');
    setNama('');
    setShowAddModal(false);
  };

  const selectedMeta = selectedPlant ? plantMetaMap.get(selectedPlant.id) : undefined;
  const selectedPhaseIndex = selectedPlant
    ? Math.max(0, GROWTH_PHASES.indexOf(selectedPlant.fase))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Bar Atas: Filter Fase + Cari Cepat + Aksi */}
      <section
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="seg-tabs" role="tablist" aria-label="Filter tanaman">
            {(
              [
                { id: 'semua', label: `Semua (${activeFarmPlants.length})` },
                { id: 'berbuah', label: `Berbuah (${fruitingCount})` },
                { id: 'tumbuh', label: 'Tumbuh' },
                ...(attentionCount > 0 ? [{ id: 'perhatian' as const, label: `Cek (${attentionCount})` }] : []),
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={phaseFilter === tab.id}
                className={`seg-tab ${phaseFilter === tab.id ? 'active' : ''}`}
                onClick={() => setPhaseFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 11px',
              minHeight: 36,
              borderRadius: 11,
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
            }}
          >
            <Search size={14} color="var(--ink-soft)" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter petak..."
              aria-label="Filter daftar tanaman"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.82rem',
                width: 130,
                color: 'var(--ink)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: 38, padding: '6px 13px', fontSize: '0.84rem' }}
            onClick={handleExportCsv}
          >
            <Download size={15} /> Ekspor CSV
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ minHeight: 38, padding: '6px 14px', fontSize: '0.84rem' }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> Tambah tanaman
          </button>
        </div>
      </section>

      {activeFarmPlants.length === 0 ? (
        <section
          className="card"
          style={{
            textAlign: 'center',
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <PakCermatMascot pose="bibit" height={150} />
          <h3 className="t-h2" style={{ marginTop: 14 }}>
            Belum ada tanaman di kebun ini
          </h3>
          <p className="t-body t-soft" style={{ margin: '8px auto 18px' }}>
            Tambahkan tanaman seperti tomat, cabai, selada, atau bayam supaya riwayat panennya tercatat rapi.
          </p>
          <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Tambah tanaman pertama
          </button>
        </section>
      ) : (
        /* Tata Letak Master–Detail: Daftar Petak Kiri (scroll lokal / swipe HP) + Detail Lengkap Kanan */
        <div className="plants-layout">
          <aside className="plants-list-col" aria-label="Daftar tanaman kebun">
            {filteredPlants.length === 0 ? (
              <div className="card-subtle" style={{ textAlign: 'center', padding: 20 }}>
                <p className="t-small t-soft">Tidak ada tanaman yang cocok dengan filter.</p>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    setPhaseFilter('semua');
                    setLocalSearch('');
                  }}
                >
                  Reset filter
                </button>
              </div>
            ) : (
              filteredPlants.map((p) => {
                const isSelected = selectedPlant?.id === p.id;
                const meta = plantMetaMap.get(p.id);
                const hasIssue = Boolean(meta?.hasIssue);
                const scanCount = meta?.scans.length || 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlantId(p.id)}
                    className={`plant-row-btn ${isSelected ? 'active' : ''}`}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: isSelected ? 'var(--leaf-600)' : 'var(--surface-2)',
                        color: isSelected ? '#FFFFFF' : 'var(--leaf-600)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        transition: 'background 200ms ease, color 200ms ease',
                      }}
                    >
                      <Sprout size={19} strokeWidth={1.9} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: 'var(--ink)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.nama}
                      </div>
                      <div className="t-micro t-soft" style={{ marginTop: 1 }}>
                        {p.varietas} · {daysSince(p.tanggalTanam)} HST · {scanCount} scan
                      </div>
                    </div>
                    <span className={`pill ${hasIssue ? 'pill-bad' : 'pill-ok'}`} style={{ flexShrink: 0 }}>
                      {hasIssue ? 'Cek' : p.fase}
                    </span>
                  </button>
                );
              })
            )}
          </aside>

          {/* Panel Kanan: Detail, Progres Fase & Jejak Scan Tanaman Terpilih */}
          {selectedPlant && (
            <section
              key={selectedPlant.id}
              className="card step-transition"
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {/* Kepala Detail Tanaman */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 14,
                  flexWrap: 'wrap',
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span className={`pill ${selectedMeta?.hasIssue ? 'pill-bad' : 'pill-ok'}`}>
                      {selectedMeta?.hasIssue ? 'Perlu perhatian' : `Fase ${selectedPlant.fase}`}
                    </span>
                    <span className="pill pill-neutral tabular-nums">
                      {daysSince(selectedPlant.tanggalTanam)} HST
                    </span>
                  </div>
                  <h2 className="t-h2" style={{ fontSize: '1.4rem' }}>{selectedPlant.nama}</h2>
                  <p className="t-small t-soft" style={{ marginTop: 2 }}>
                    Varietas <strong>{selectedPlant.varietas}</strong> · Tanam {formatDateId(selectedPlant.tanggalTanam)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-tomato"
                    onClick={() => openScanWith('buah', selectedPlant.id)}
                  >
                    <Camera size={17} /> Scan tanaman
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => openChatWithPlant(selectedPlant.id)}
                  >
                    <MessageCircle size={16} /> Tanya Cermo
                  </button>
                </div>
              </div>

              {/* Jalur Progres 5 Fase Pertumbuhan */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="t-small" style={{ fontWeight: 700 }}>Tahap pertumbuhan tanaman</span>
                  <span className="t-micro t-soft">
                    Langkah {selectedPhaseIndex + 1} dari {GROWTH_PHASES.length}
                  </span>
                </div>
                <div className="growth-stepper">
                  {GROWTH_PHASES.map((phaseName, idx) => {
                    const isDone = idx < selectedPhaseIndex;
                    const isCurrent = idx === selectedPhaseIndex;
                    return (
                      <div
                        key={phaseName}
                        className={`growth-step ${
                          isCurrent ? 'growth-step--current' : isDone ? 'growth-step--done' : ''
                        }`}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: isCurrent
                              ? 'rgba(255,255,255,0.22)'
                              : isDone
                                ? 'var(--leaf-600)'
                                : 'var(--surface)',
                            color: isCurrent || isDone ? '#FFFFFF' : 'var(--ink-soft)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          {isDone ? <Check size={13} strokeWidth={2.6} /> : idx + 1}
                        </span>
                        <span
                          className="t-micro"
                          style={{
                            color: isCurrent ? '#FFFFFF' : isDone ? 'var(--ok-fg)' : 'var(--ink-soft)',
                          }}
                        >
                          {phaseName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strip 3 Metrik Ringkas Tanaman */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <div className="card-subtle" style={{ padding: '12px 14px' }}>
                  <div className="t-micro t-soft">Total pemeriksaan AI</div>
                  <div className="font-display tabular-nums" style={{ fontSize: '1.35rem', marginTop: 2 }}>
                    {plantScansChrono.length} kali
                  </div>
                </div>
                <div className="card-subtle" style={{ padding: '12px 14px' }}>
                  <div className="t-micro t-soft">Status terakhir</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 4, color: 'var(--ink)' }}>
                    {selectedMeta?.latest
                      ? selectedMeta.latest.penyakitUtamaNama
                      : 'Belum pernah dipindai'}
                  </div>
                </div>
                <button
                  type="button"
                  className="card-subtle card-interactive"
                  onClick={() => setActiveScreen('kalender')}
                  style={{ padding: '12px 14px', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CalendarDays size={13} color="var(--leaf-600)" /> Estimasi panen
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 4, color: 'var(--ink)' }}>
                    {selectedMeta?.nextHarvest ? formatDateId(selectedMeta.nextHarvest) : 'Atur di kalender'}
                  </div>
                </button>
              </div>

              {/* Riwayat Scan & Grafik Kesehatan */}
              {plantScansChrono.length === 0 ? (
                <div
                  className="card-forest"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 18,
                    flexWrap: 'wrap',
                    padding: '22px 24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 240px' }}>
                    <CermoMascot pose="wave" size={82} />
                    <div>
                      <strong style={{ fontSize: '1rem', display: 'block' }}>
                        Belum ada catatan scan untuk {selectedPlant.nama}
                      </strong>
                      <p className="t-small t-soft" style={{ marginTop: 4 }}>
                        Ambil 1 foto buah, daun, atau batang agar timeline pertumbuhan dan jadwal panennya terisi otomatis.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ minHeight: 38, padding: '6px 13px', fontSize: '0.84rem' }}
                      onClick={() => openScanWith('buah', selectedPlant.id)}
                    >
                      <Sparkles size={15} /> Scan Buah
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ minHeight: 38, padding: '6px 13px', fontSize: '0.84rem' }}
                      onClick={() => openScanWith('daun', selectedPlant.id)}
                    >
                      <Leaf size={15} /> Scan Daun
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Daftar Kartu Jejak Scan Rapi */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <h3 className="t-h3">Jejak pemeriksaan AI (klik kartu untuk detail)</h3>
                      {firstDiseaseScanId && (
                        <span className="pill pill-bad">
                          <AlertCircle size={14} /> Gejala pertama ditandai merah
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {plantScansChrono.map((scan) => {
                        const isDisease = scan.penyakitUtamaId !== 'sehat';
                        const isFirstDisease = scan.id === firstDiseaseScanId;
                        return (
                          <button
                            key={scan.id}
                            type="button"
                            onClick={() => setOpenedScan(scan)}
                            className="card-subtle card-interactive"
                            style={{
                              padding: 10,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              borderColor: isDisease ? 'var(--bad-600)' : 'var(--line)',
                            }}
                          >
                            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 108 }}>
                              <img
                                src={scan.fotoUrl}
                                alt={`Scan ${scan.bagian}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                              <span
                                className={`pill ${isDisease ? 'pill-bad' : 'pill-ok'}`}
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  fontSize: '0.68rem',
                                  padding: '2px 8px',
                                }}
                              >
                                {isFirstDisease ? 'Gejala awal' : scan.bagian}
                              </span>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.84rem',
                                  color: 'var(--ink)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {scan.tahapDominan
                                  ? RIPENESS_REFERENCE[scan.tahapDominan].label
                                  : scan.penyakitUtamaNama}
                              </div>
                              <div className="t-micro t-soft" style={{ marginTop: 2 }}>
                                {formatDateShort(scan.waktu)} · {scan.keyakinan}%
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grafik Skor Kesehatan Kurva Halus */}
                  <div className="card-subtle" style={{ padding: '16px 18px' }}>
                    <div style={{ marginBottom: 10 }}>
                      <strong className="t-small">Tren kesehatan tanaman per pemeriksaan</strong>
                      <p className="t-micro t-soft">
                        Penurunan grafik menunjukkan waktu terdeteksinya gejala penyakit pada timeline.
                      </p>
                    </div>
                    <GreenAreaChart points={chartPoints} unit="%" color="var(--leaf-600)" height={165} />
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}

      {/* Modal Detail Scan Lama (F4.3) */}
      {openedScan && (
        <div
          className="modal-backdrop"
          onClick={() => setOpenedScan(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Detail riwayat scan"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="t-h2">Catatan scan tersimpan</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setOpenedScan(null)}
                aria-label="Tutup detail scan"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={openedScan.fotoUrl}
              alt={`Foto scan ${openedScan.bagian}`}
              style={{ width: '100%', borderRadius: 16, maxHeight: 240, objectFit: 'cover', marginBottom: 14 }}
            />
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="card-subtle">
                <div className="t-micro t-soft">Waktu pemeriksaan</div>
                <div style={{ fontWeight: 700 }}>
                  {formatDateShort(openedScan.waktu)}
                </div>
              </div>
              {openedScan.fokusOutput !== 'kematangan' && openedScan.fokusOutput !== 'hara' && (
                <div className="card-subtle">
                  <div className="t-micro t-soft">Hasil pemeriksaan &amp; keyakinan</div>
                  <div style={{ fontWeight: 700 }}>
                    {openedScan.penyakitUtamaNama} (Keyakinan: {openedScan.keyakinan}%)
                  </div>
                </div>
              )}
              {openedScan.tahapDominan && openedScan.fokusOutput !== 'penyakit' && (
                <div className="card-subtle">
                  <div className="t-micro t-soft">Kematangan &amp; estimasi kasar</div>
                  <div style={{ fontWeight: 700 }}>
                    {RIPENESS_REFERENCE[openedScan.tahapDominan].label} · {openedScan.jumlahBuah} buah ≈{' '}
                    {openedScan.estimasiBobotGram} g ({openedScan.anjuranPanen})
                  </div>
                </div>
              )}
              {(openedScan.adaGejalaHara || openedScan.fokusOutput === 'hara') && (
                <div className="card-subtle">
                  <div className="t-micro t-soft">Dugaan hara</div>
                  <div style={{ fontWeight: 700 }}>
                    {openedScan.dugaanHaraNama} ({openedScan.pakaiDataSensor ? 'Dengan data sensor' : 'Dugaan visual'})
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Tanaman */}
      {showAddModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tambah tanaman baru"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="t-h2">Tambah tanaman</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup form"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPlant} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-group">
                <label htmlFor="add-plant-name" className="field-label">
                  Nama tanaman / bedengan
                </label>
                <input
                  id="add-plant-name"
                  className="field-input"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Cabai Rawit #02"
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="add-plant-var" className="field-label">
                  Jenis / varietas (bisa semua tanaman)
                </label>
                <PlantSearchInput
                  id="add-plant-var"
                  value={varietas}
                  onChange={setVarietas}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label htmlFor="add-plant-date" className="field-label">
                    Tanggal tanam
                  </label>
                  <input
                    id="add-plant-date"
                    type="date"
                    className="field-input"
                    value={tanggalTanam}
                    onChange={(e) => setTanggalTanam(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="add-plant-phase" className="field-label">
                    Fase tumbuh
                  </label>
                  <select
                    id="add-plant-phase"
                    className="field-select"
                    value={fase}
                    onChange={(e) => setFase(e.target.value as GrowthPhase)}
                  >
                    <option value="Bibit">Bibit</option>
                    <option value="Vegetatif">Vegetatif</option>
                    <option value="Berbunga">Berbunga</option>
                    <option value="Berbuah">Berbuah</option>
                    <option value="Panen">Panen</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 6 }}>
                Simpan tanaman
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
