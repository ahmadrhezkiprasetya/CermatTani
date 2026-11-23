'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Download,
  Plus,
  Sprout,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { GreenAreaChart } from '../components/Charts';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { downloadCsv } from '../utils/scanAnalyzer';
import { GrowthPhase, ScanRecord } from '../types/cermattani';

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

/* Layar 5: Tanaman & Timeline pertumbuhan per tanaman (F4.1–F4.3, X1, X4) */
export const PlantsScreen: React.FC = () => {
  const { state, activeFarm, activeFarmPlants, addPlant, openScanWith } = useApp();
  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    activeFarmPlants[0]?.id || state.plants[0]?.id || ''
  );
  const [openedScan, setOpenedScan] = useState<ScanRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form tambah tanaman
  const [nama, setNama] = useState('');
  const [varietas, setVarietas] = useState('Servo F1');
  const [tanggalTanam, setTanggalTanam] = useState(new Date().toISOString().slice(0, 10));
  const [fase, setFase] = useState<GrowthPhase>('Vegetatif');

  const selectedPlant = useMemo(
    () =>
      activeFarmPlants.find((p) => p.id === selectedPlantId) ||
      activeFarmPlants[0] ||
      null,
    [activeFarmPlants, selectedPlantId]
  );

  // Semua scan tanaman terpilih urut dari terlama -> terbaru untuk timeline
  const plantScansChrono = useMemo(() => {
    if (!selectedPlant) return [];
    return state.scans
      .filter((s) => s.plantId === selectedPlant.id)
      .sort((a, b) => a.waktu.localeCompare(b.waktu));
  }, [state.scans, selectedPlant]);

  // F4.2: Tandai kapan penyakit pertama kali muncul
  const firstDiseaseScanId = useMemo(
    () => plantScansChrono.find((s) => s.penyakitUtamaId !== 'sehat')?.id || null,
    [plantScansChrono]
  );

  // Data grafik perkembangan (skor kesehatan / kematangan per scan)
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
      varietas,
      tanggalTanam,
      fase,
    });
    setSelectedPlantId(created.id);
    setNama('');
    setShowAddModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Aksi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="t-h1">Tanaman & timeline pertumbuhan</h2>
          <p className="t-small t-soft">
            Kebun aktif: <strong>{activeFarm?.nama}</strong> ({activeFarmPlants.length} tanaman)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={handleExportCsv}>
            <Download size={18} /> Ekspor CSV
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Tambah tanaman
          </button>
        </div>
      </div>

      {/* Daftar kartu tanaman di kebun aktif */}
      {activeFarmPlants.length === 0 ? (
        <section className="card" style={{ textAlign: 'center', padding: 36 }}>
          <CermoMascot pose="wave" size={96} />
          <h3 className="t-h2" style={{ marginTop: 14 }}>
            Belum ada tanaman di kebun ini
          </h3>
          <p className="t-body t-soft" style={{ margin: '8px auto 18px' }}>
            Tambahkan tanaman seperti tomat, cabai, selada, atau bayam supaya riwayat panennya tercatat rapi.
          </p>
          <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Tambah tanaman
          </button>
        </section>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 12,
            }}
          >
            {activeFarmPlants.map((p) => {
              const isSelected = selectedPlant?.id === p.id;
              const scans = state.scans
                .filter((s) => s.plantId === p.id)
                .sort((a, b) => b.waktu.localeCompare(a.waktu));
              const latest = scans[0];
              const hasIssue = latest && latest.penyakitUtamaId !== 'sehat';

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlantId(p.id)}
                  className="card-sm card-interactive"
                  style={{
                    border: isSelected ? '2.5px solid var(--leaf-600)' : '2px solid transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: isSelected ? 'var(--lime-300)' : 'var(--surface-2)',
                        color: 'var(--ink)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Sprout size={20} strokeWidth={1.75} />
                    </div>
                    <span className={`pill ${hasIssue ? 'pill-bad' : 'pill-ok'}`}>
                      {hasIssue ? 'Perlu cek' : p.fase}
                    </span>
                  </div>

                  <div>
                    <div className="t-h3">{p.nama}</div>
                    <div className="t-micro t-soft">
                      {p.varietas} · {daysSince(p.tanggalTanam)} HST
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="t-micro t-soft tabular-nums">{scans.length} riwayat scan</span>
                    {latest?.tahapDominan && (
                      <span className="pill pill-neutral" style={{ fontSize: '0.75rem' }}>
                        <span
                          className="ripeness-dot"
                          style={{ background: RIPENESS_REFERENCE[latest.tahapDominan].color }}
                        />
                        {RIPENESS_REFERENCE[latest.tahapDominan].label}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail & Timeline Tanaman Terpilih (F4) */}
          {selectedPlant && (
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span className="pill pill-ok" style={{ marginBottom: 6 }}>
                    Fase {selectedPlant.fase} · {daysSince(selectedPlant.tanggalTanam)} hari setelah tanam
                  </span>
                  <h3 className="t-h2">{selectedPlant.nama}</h3>
                  <p className="t-small t-soft">
                    Varietas {selectedPlant.varietas} · Tanam {selectedPlant.tanggalTanam}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-tomato"
                  onClick={() => openScanWith('buah', selectedPlant.id)}
                >
                  <Camera size={18} /> Scan tanaman ini
                </button>
              </div>

              {plantScansChrono.length === 0 ? (
                <div className="card-subtle" style={{ textAlign: 'center', padding: 28 }}>
                  <CermoMascot pose="wave" size={82} />
                  <p className="t-body" style={{ marginTop: 10, fontWeight: 600 }}>
                    Belum ada scan. Foto satu tomat untuk mulai.
                  </p>
                </div>
              ) : (
                <>
                  {/* Timeline bergelombang dengan avatar bulat & titik merah penyakit (DESIGN.md §7, F4.2) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <h4 className="t-h3">Jejak scan (klik lingkaran untuk buka detail)</h4>
                      {firstDiseaseScanId && (
                        <span className="pill pill-bad">
                          <AlertCircle size={14} /> Penyakit pertama muncul ditandai merah
                        </span>
                      )}
                    </div>

                    <div style={{ position: 'relative', overflowX: 'auto', padding: '16px 8px 12px' }}>
                      {/* Garis bergelombang SVG di belakang avatar */}
                      <svg
                        viewBox="0 0 600 40"
                        preserveAspectRatio="none"
                        width="100%"
                        height="40"
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: 34,
                          left: 0,
                          right: 0,
                          pointerEvents: 'none',
                        }}
                      >
                        <path
                          d="M 10 20 Q 85 2, 160 20 T 310 20 T 460 20 T 590 20"
                          fill="none"
                          stroke="var(--leaf-500)"
                          strokeOpacity="0.45"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>

                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          gap: 20,
                          minWidth: 'max-content',
                          alignItems: 'flex-start',
                        }}
                      >
                        {plantScansChrono.map((scan, idx) => {
                          const isDisease = scan.penyakitUtamaId !== 'sehat';
                          const isFirstDisease = scan.id === firstDiseaseScanId;
                          return (
                            <button
                              key={scan.id}
                              type="button"
                              onClick={() => setOpenedScan(scan)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                                width: 148,
                                paddingTop: idx % 2 === 1 ? 14 : 0,
                              }}
                            >
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={scan.fotoUrl}
                                  alt={`Scan ${scan.bagian}`}
                                  style={{
                                    width: 68,
                                    height: 68,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: `4px solid ${isDisease ? 'var(--bad)' : 'var(--leaf-600)'}`,
                                    boxShadow: 'var(--shadow-card)',
                                    display: 'block',
                                  }}
                                />
                                {isDisease && (
                                  <span
                                    title={isFirstDisease ? 'Penyakit pertama muncul' : 'Terdeteksi gejala'}
                                    style={{
                                      position: 'absolute',
                                      top: -2,
                                      right: -2,
                                      width: 22,
                                      height: 22,
                                      borderRadius: '50%',
                                      background: 'var(--bad)',
                                      color: '#FFFFFF',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      display: 'grid',
                                      placeItems: 'center',
                                      border: '2px solid var(--surface)',
                                    }}
                                  >
                                    !
                                  </span>
                                )}
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div className="t-micro" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                                  {scan.tahapDominan
                                    ? RIPENESS_REFERENCE[scan.tahapDominan].label
                                    : scan.penyakitUtamaNama.slice(0, 22)}
                                </div>
                                <div className="t-micro t-soft">{formatDateShort(scan.waktu)}</div>
                                {isFirstDisease && (
                                  <span className="pill pill-bad" style={{ marginTop: 4, fontSize: '0.6875rem', padding: '2px 8px' }}>
                                    Muncul pertama
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Grafik perkembangan kesehatan (F4.2) */}
                  <div className="card-subtle">
                    <div style={{ marginBottom: 8 }}>
                      <strong className="t-small">Grafik skor kesehatan tanaman per scan</strong>
                      <p className="t-micro t-soft">
                        Penurunan grafik menunjukkan waktu munculnya gejala penyakit pada timeline.
                      </p>
                    </div>
                    <GreenAreaChart points={chartPoints} unit="%" color="#1F9D55" height={140} />
                  </div>
                </>
              )}
            </section>
          )}
        </>
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
                <div className="t-micro t-soft">Waktu & bagian</div>
                <div style={{ fontWeight: 700 }}>
                  {formatDateShort(openedScan.waktu)} · Bagian {openedScan.bagian}
                </div>
              </div>
              <div className="card-subtle">
                <div className="t-micro t-soft">Hasil kesehatan & keyakinan</div>
                <div style={{ fontWeight: 700 }}>
                  {openedScan.penyakitUtamaNama} (Seberapa yakin Cermo: {openedScan.keyakinan}%)
                </div>
              </div>
              {openedScan.tahapDominan && (
                <div className="card-subtle">
                  <div className="t-micro t-soft">Kematangan & estimasi kasar</div>
                  <div style={{ fontWeight: 700 }}>
                    {RIPENESS_REFERENCE[openedScan.tahapDominan].label} · {openedScan.jumlahBuah} buah ≈{' '}
                    {openedScan.estimasiBobotGram} g ({openedScan.anjuranPanen})
                  </div>
                </div>
              )}
              <div className="card-subtle">
                <div className="t-micro t-soft">Dugaan hara</div>
                <div style={{ fontWeight: 700 }}>
                  {openedScan.dugaanHaraNama} ({openedScan.pakaiDataSensor ? 'Dengan data sensor' : 'Dugaan visual'})
                </div>
              </div>
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
                  Jenis / varietas
                </label>
                <select
                  id="add-plant-var"
                  className="field-select"
                  value={varietas}
                  onChange={(e) => setVarietas(e.target.value)}
                >
                  <option value="Servo F1">Servo F1</option>
                  <option value="Gustavi">Gustavi</option>
                  <option value="Tomat Ceri">Tomat Ceri</option>
                  <option value="Rampai">Tomat Rampai</option>
                  <option value="Lokal">Lokal</option>
                  <option value="Cabai Rawit">Cabai Rawit</option>
                  <option value="Cabai Besar">Cabai Besar</option>
                  <option value="Selada Keriting">Selada Keriting</option>
                  <option value="Bayam Hijau">Bayam Hijau</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
