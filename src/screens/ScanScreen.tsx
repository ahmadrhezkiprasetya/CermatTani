'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  CloudOff,
  FlaskConical,
  Leaf,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sprout,
  Upload,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { TomatoConfetti } from '../components/Illustrations';
import {
  DEMO_PHOTO_PRESETS,
  KNOWLEDGE_DISEASES,
  KNOWLEDGE_NUTRIENTS,
  RIPENESS_REFERENCE,
} from '../data/knowledgeBase';
import { compressImageClient, runTomatoScanAnalysis } from '../utils/scanAnalyzer';
import { PlantPart, ScanRecord } from '../types/cermattani';

/* Layar 3 & 4: Scan (pilih bagian -> kamera/unggah -> proses 2.4s -> hasil 3 tab) */
export const ScanScreen: React.FC = () => {
  const {
    state,
    activeFarmPlants,
    scanPreselectPart,
    scanPreselectPlantId,
    saveScan,
    enqueueOfflineScan,
    isOffline,
    openChatWithPlant,
    setActiveScreen,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedPart, setSelectedPart] = useState<PlantPart>(scanPreselectPart || 'buah');
  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    scanPreselectPlantId || activeFarmPlants[0]?.id || state.plants[0]?.id || ''
  );
  const [stage, setStage] = useState<'pick' | 'scanning' | 'result'>('pick');
  const [previewFoto, setPreviewFoto] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [queueNotice, setQueueNotice] = useState<string>('');
  const [result, setResult] = useState<ScanRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'kematangan' | 'penyakit' | 'pupuk'>('kematangan');
  const [savedToTimeline, setSavedToTimeline] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (scanPreselectPart) setSelectedPart(scanPreselectPart);
    if (scanPreselectPlantId) setSelectedPlantId(scanPreselectPlantId);
  }, [scanPreselectPart, scanPreselectPlantId]);

  const targetPlant = useMemo(
    () =>
      state.plants.find((p) => p.id === selectedPlantId) ||
      activeFarmPlants[0] ||
      state.plants[0],
    [state.plants, activeFarmPlants, selectedPlantId]
  );

  const startAnalysis = async (params: {
    fotoUrl: string;
    part: PlantPart;
    presetId?: string;
    originalKb?: number;
    compressedKb?: number;
  }) => {
    if (!targetPlant) {
      setUploadError('Tambahkan minimal satu tanaman tomat di menu Tanaman sebelum memindai.');
      return;
    }

    setUploadError('');
    setQueueNotice('');
    setSavedToTimeline(false);

    // Bila sedang offline, masukkan antrean unggah ulang otomatis (PRD §8)
    if (isOffline) {
      enqueueOfflineScan({
        plantId: targetPlant.id,
        bagian: params.part,
        fotoUrl: params.fotoUrl,
        presetId: params.presetId,
      });
      setQueueNotice(
        'Koneksi sedang offline. Foto sudah dikompres dan masuk antrean — akan otomatis dianalisis saat jaringan kembali.'
      );
      return;
    }

    setPreviewFoto(params.fotoUrl);
    setStage('scanning');

    const prevScans = state.scans.filter((s) => s.plantId === targetPlant.id);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const [analysis] = await Promise.all([
      runTomatoScanAnalysis({
        plant: targetPlant,
        bagian: params.part,
        fotoUrl: params.fotoUrl,
        presetId: params.presetId,
        originalKb: params.originalKb,
        compressedKb: params.compressedKb,
        sensorAvailable: state.sensor.sensorTersedia,
        lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
        previousPlantScans: prevScans,
      }),
      new Promise((r) => window.setTimeout(r, reduced ? 120 : 2400)),
    ]);

    setResult(analysis);
    setActiveTab(params.part === 'buah' ? 'kematangan' : 'penyakit');
    setStage('result');

    if (analysis.anjuranPanen === 'Panen sekarang') {
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 1400);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageClient(file);
      await startAnalysis({
        fotoUrl: compressed.dataUrl,
        part: selectedPart,
        originalKb: compressed.originalKb,
        compressedKb: compressed.compressedKb,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Foto belum bisa diproses. Pastikan ukuran ≤ 10 MB (JPG/PNG/HEIC).'
      );
    }
  };

  const handleSave = () => {
    if (!result || savedToTimeline) return;
    saveScan(result);
    setSavedToTimeline(true);
  };

  // Alt-text aksesibel hasil deteksi (DESIGN.md §12)
  const detectionAltText = useMemo(() => {
    if (!result) return 'Foto tanaman tomat';
    if (result.boxes.length === 0) {
      return `Foto ${result.bagian} tomat: ${result.penyakitUtamaNama}`;
    }
    const raw = result.boxes.filter((b) => b.stage === 'mentah').length;
    const half = result.boxes.filter((b) => b.stage === 'setengah_matang').length;
    const ripe = result.boxes.filter((b) => b.stage === 'matang').length;
    return `${result.boxes.length} tomat terdeteksi: ${raw} mentah, ${half} setengah matang, ${ripe} matang`;
  }, [result]);

  const diseaseInfo = result
    ? KNOWLEDGE_DISEASES[result.penyakitUtamaId] || KNOWLEDGE_DISEASES.sehat
    : null;
  const nutrientInfo = result
    ? KNOWLEDGE_NUTRIENTS[result.dugaanHaraId] || KNOWLEDGE_NUTRIENTS.cukup
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
      {/* STEP 1 & 2: Pilih bagian tanaman -> Ambil/unggah foto */}
      {stage === 'pick' && (
        <>
          <section className="card stagger-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
              <CermoMascot pose="wave" size={82} />
              <div style={{ flex: '1 1 260px' }}>
                <h2 className="t-h1">Scan tanaman tomat</h2>
                <p className="t-body t-soft">
                  Pilih tanaman dan bagian yang mau difoto. Foto dikompres otomatis di ponselmu agar
                  hemat kuota.
                </p>
              </div>
            </div>

            {/* Pilih tanaman target */}
            <div className="field-group" style={{ marginBottom: 20 }}>
              <label htmlFor="scan-plant-select" className="field-label">
                Tanaman yang dipindai
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  id="scan-plant-select"
                  className="field-select"
                  style={{ flex: '1 1 240px' }}
                  value={targetPlant?.id || ''}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                >
                  {state.plants.map((p) => {
                    const farm = state.farms.find((f) => f.id === p.farmId);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.varietas} · Fase {p.fase}) — {farm?.nama}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveScreen('tanaman')}
                >
                  + Kelola tanaman
                </button>
              </div>
            </div>

            {/* F2.1: Pilihan bagian tanaman dengan ikon besar */}
            <div style={{ marginBottom: 22 }}>
              <div className="field-label" style={{ marginBottom: 10 }}>
                1. Pilih bagian tanaman
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: 12,
                }}
              >
                {(
                  [
                    {
                      id: 'buah',
                      title: 'Buah tomat',
                      desc: 'Cek kematangan, hari panen & perkiraan hasil',
                      color: '#F2562B',
                      icon: Sparkles,
                    },
                    {
                      id: 'daun',
                      title: 'Daun tomat',
                      desc: 'Kenali bercak/penyakit & dugaan kekurangan pupuk',
                      color: '#1F9D55',
                      icon: Leaf,
                    },
                    {
                      id: 'batang',
                      title: 'Batang tomat',
                      desc: 'Deteksi gejala layu batang & pangkal tanaman',
                      color: '#0E4F43',
                      icon: Sprout,
                    },
                  ] as const
                ).map((part) => {
                  const Icon = part.icon;
                  const active = selectedPart === part.id;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => setSelectedPart(part.id)}
                      aria-pressed={active}
                      style={{
                        border: active ? `2.5px solid ${part.color}` : '1.5px solid var(--line)',
                        background: active ? 'var(--surface-2)' : 'var(--surface)',
                        borderRadius: 20,
                        padding: 18,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        transition: 'transform 160ms ease, border-color 160ms ease',
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: active ? part.color : 'var(--surface-2)',
                          color: active ? '#FFFFFF' : part.color,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon size={26} strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="t-h3">{part.title}</div>
                        <p className="t-small t-soft" style={{ marginTop: 2 }}>
                          {part.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* F1.1: Ambil kamera / unggah foto (JPG/PNG/HEIC ≤ 10 MB) */}
            <div>
              <div className="field-label" style={{ marginBottom: 10 }}>
                2. Ambil atau unggah foto (JPG, PNG, HEIC · maks 10 MB)
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  className="btn-tomato"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={20} /> Buka kamera
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} /> Unggah dari galeri
                </button>
              </div>
              <p className="t-micro t-soft" style={{ marginTop: 8 }}>
                Tips foto jelas: ambil di cahaya terang, jarak 20–40 cm, fokuskan kamera ke buah atau
                daun.
              </p>
            </div>

            {uploadError && (
              <div className="alert-card alert-card--bad" style={{ marginTop: 14 }} role="alert">
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>{uploadError}</div>
              </div>
            )}

            {queueNotice && (
              <div className="alert-card alert-card--warn" style={{ marginTop: 14 }} role="status">
                <CloudOff size={20} style={{ flexShrink: 0 }} />
                <div>{queueNotice}</div>
              </div>
            )}
          </section>

          {/* Contoh foto cepat untuk demo & uji semua skenario PRD */}
          <section className="card stagger-card stagger-1">
            <div style={{ marginBottom: 14 }}>
              <h3 className="t-h3">Atau coba cepat dengan foto contoh</h3>
              <p className="t-small t-soft">
                Pilih skenario di bawah untuk langsung melihat cara Cermo menilai kematangan,
                penyakit, keyakinan rendah, hingga foto gelap.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {DEMO_PHOTO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPart(preset.bagian);
                    void startAnalysis({
                      fotoUrl: preset.fotoUrl,
                      part: preset.bagian,
                      presetId: preset.id,
                      originalKb: 1840,
                      compressedKb: 165,
                    });
                  }}
                  className="card-interactive"
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 18,
                    padding: 10,
                    background: 'var(--surface-2)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <img
                    src={preset.fotoUrl}
                    alt={preset.label}
                    style={{
                      width: '100%',
                      height: 118,
                      objectFit: 'cover',
                      borderRadius: 12,
                      display: 'block',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{preset.label}</div>
                    <div className="t-micro t-soft">{preset.deskripsi}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* STEP 3: Proses animasi memindai 2.4s (DESIGN.md §10) */}
      {stage === 'scanning' && (
        <section
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            textAlign: 'center',
            padding: '32px 24px',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 'min(480px, 100%)',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <img
              src={previewFoto}
              alt="Sedang memindai foto tomat"
              style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}
            />
            {/* Garis hijau menyapu foto */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 4,
                background: '#D8F36A',
                boxShadow: '0 0 18px 6px rgba(31, 157, 85, 0.72)',
                animation: 'scanBeam 1.6s ease-in-out infinite',
              }}
            />
          </div>

          <CermoMascot pose="scan" size={104} interactive={false} />

          <div>
            <h2 className="t-h2">Cermo sedang memeriksa fotomu...</h2>
            <p className="t-body t-soft" style={{ marginTop: 6 }}>
              Mengecek warna buah, pola bercak daun, serta kecocokan gejala hara.
            </p>
          </div>
        </section>
      )}

      {/* STEP 4 (Layar 4): Hasil Scan dengan 3 Tab (Kematangan / Penyakit / Pupuk) */}
      {stage === 'result' && result && diseaseInfo && nutrientInfo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Foto beranotasi kotak deteksi 3px + pil label + konfeti bila panen siap */}
          <section className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <TomatoConfetti active={showConfetti} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                gap: 20,
                alignItems: 'center',
              }}
            >
              {/* Foto + Detection Boxes */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: '#12241C',
                }}
              >
                <img
                  src={result.fotoUrl}
                  alt={detectionAltText}
                  style={{ width: '100%', display: 'block', aspectRatio: '16 / 10.5', objectFit: 'cover' }}
                />
                {result.boxes.map((box, idx) => {
                  const ref = RIPENESS_REFERENCE[box.stage];
                  return (
                    <div
                      key={box.id}
                      style={{
                        position: 'absolute',
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`,
                        border: `3px solid ${ref.color}`,
                        borderRadius: 12,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                        animation: `boxPopIn 360ms cubic-bezier(.2,.8,.2,1) ${idx * 160}ms both`,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: -26,
                          left: -2,
                          background: ref.color,
                          color: box.stage === 'setengah_matang' ? '#14302A' : '#FFFFFF',
                          padding: '2px 9px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
                        }}
                      >
                        {ref.label} {box.confidence}%
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Ringkasan keputusan utama (Hasil = keputusan, lebih besar dari angka keyakinan — F1.4) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CermoMascot
                    pose={
                      result.tanpaBuahTerdeteksi || result.keyakinanRendah || result.penyakitUtamaId !== 'sehat'
                        ? 'worried'
                        : 'happy'
                    }
                    size={76}
                  />
                  <div>
                    <span className="pill pill-neutral">
                      {targetPlant?.nama} · Bagian {result.bagian}
                    </span>
                    {result.fotoUkuranAsliKb && result.fotoUkuranKompresKb && (
                      <div className="t-micro t-soft" style={{ marginTop: 4 }}>
                        Kompresi klien: {result.fotoUkuranAsliKb} KB → {result.fotoUkuranKompresKb} KB
                      </div>
                    )}
                  </div>
                </div>

                {/* Keputusan besar */}
                <div
                  className="card-subtle"
                  style={{
                    borderLeft: `5px solid ${
                      result.tanpaBuahTerdeteksi
                        ? 'var(--warn)'
                        : result.anjuranPanen === 'Panen sekarang'
                          ? 'var(--tomato-500)'
                          : result.penyakitUtamaId !== 'sehat'
                            ? 'var(--bad)'
                            : 'var(--leaf-600)'
                    }`,
                  }}
                >
                  <div className="t-micro t-soft" style={{ fontWeight: 700 }}>
                    Anjuran utama Cermo
                  </div>
                  <div className="t-display" style={{ marginTop: 4 }}>
                    {result.tanpaBuahTerdeteksi
                      ? 'Buah belum terlihat'
                      : result.bagian === 'buah'
                        ? result.anjuranPanen === 'Panen sekarang'
                          ? 'Panen sekarang'
                          : `Tunggu ${result.estimasiHariMin}–${result.estimasiHariMax} hari`
                        : result.penyakitUtamaNama}
                  </div>
                  <div className="t-small t-soft" style={{ marginTop: 6 }}>
                    Seberapa yakin Cermo: <strong className="tabular-nums">{result.keyakinan}%</strong>
                  </div>
                </div>

                {/* F1.5: Pesan jika tidak ada buah terdeteksi */}
                {result.tanpaBuahTerdeteksi && (
                  <div className="alert-card alert-card--warn">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Foto terlalu gelap atau buah tidak tampak jelas.</strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        Coba dekat jendela atau nyalakan cahaya tambahan, arahkan kamera 20–40 cm dari
                        buah tomat, dan pastikan buah tidak tertutup daun.
                      </p>
                    </div>
                  </div>
                )}

                {/* F2.4: Peringatan keyakinan rendah (< ambang, default 60%) */}
                {result.keyakinanRendah && !result.tanpaBuahTerdeteksi && (
                  <div className="alert-card alert-card--warn" role="alert">
                    <ShieldAlert size={22} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Cermo belum cukup yakin ({result.keyakinan}% &lt; {state.settings.ambangKeyakinanRendah}%).</strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        Coba ambil foto ulang di tempat terang, dan konfirmasi juga ke penyuluh
                        pertanian setempat sebelum mengambil tindakan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3 Tab Hasil Scan: Kematangan / Penyakit / Pupuk */}
          <section className="card">
            <div className="tabs-bar" role="tablist" aria-label="Tab hasil scan">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'kematangan'}
                className={`tab-btn ${activeTab === 'kematangan' ? 'active' : ''}`}
                onClick={() => setActiveTab('kematangan')}
              >
                <Sparkles size={18} /> Kematangan & panen
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'penyakit'}
                className={`tab-btn ${activeTab === 'penyakit' ? 'active' : ''}`}
                onClick={() => setActiveTab('penyakit')}
              >
                <ShieldAlert size={18} /> Penyakit & solusi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'pupuk'}
                className={`tab-btn ${activeTab === 'pupuk' ? 'active' : ''}`}
                onClick={() => setActiveTab('pupuk')}
              >
                <FlaskConical size={18} /> Rekomendasi pupuk
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              {/* TAB 1: KEMATANGAN & ESTIMASI PANEN (F1 + F6) */}
              {activeTab === 'kematangan' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {result.bagian !== 'buah' ? (
                    <div className="card-subtle">
                      <p className="t-body">
                        Kamu memindai bagian <strong>{result.bagian}</strong>. Untuk melihat tahap
                        kematangan buah dan perkiraan hasil panen, coba scan bagian <strong>buah</strong>.
                      </p>
                    </div>
                  ) : result.tanpaBuahTerdeteksi ? (
                    <div className="card-subtle">
                      <p className="t-body">
                        Tidak ada buah tomat yang terdeteksi pada foto ini. Gunakan tombol "Scan lagi"
                        di bawah dengan pencahayaan yang lebih baik.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: 14,
                        }}
                      >
                        <div className="card-subtle">
                          <div className="t-micro t-soft">Tahap dominan</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <span
                              className="ripeness-dot"
                              style={{
                                width: 14,
                                height: 14,
                                background: result.tahapDominan
                                  ? RIPENESS_REFERENCE[result.tahapDominan].color
                                  : '#5DBB63',
                              }}
                            />
                            <span className="t-h2">
                              {result.tahapDominan ? RIPENESS_REFERENCE[result.tahapDominan].label : '-'}
                            </span>
                          </div>
                          <p className="t-small t-soft" style={{ marginTop: 6 }}>
                            {result.tahapDominan ? RIPENESS_REFERENCE[result.tahapDominan].ringkasan : ''}
                          </p>
                        </div>

                        {/* F6: Estimasi hasil panen + label "Estimasi kasar" */}
                        <div className="card-subtle">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <span className="t-micro t-soft">Perkiraan hasil (foto ini)</span>
                            <span className="pill pill-warn">Estimasi kasar</span>
                          </div>
                          <div className="t-h2 tabular-nums" style={{ marginTop: 6 }}>
                            {result.jumlahBuah} buah ≈ {result.estimasiBobotGram} gram
                          </div>
                          <p className="t-small t-soft" style={{ marginTop: 6 }}>
                            Dihitung dari {result.jumlahBuah} kotak deteksi × bobot rata-rata{' '}
                            {targetPlant?.bobotRataBuahGram || 85} g ({targetPlant?.varietas}). Angka ini
                            estimasi kasar karena foto hanya menangkap sebagian tanaman.
                          </p>
                        </div>
                      </div>

                      {/* F1.3: Catatan penyesuaian riwayat ≥ 2 scan */}
                      {result.estimasiDisesuaikanRiwayat && (
                        <div className="alert-card alert-card--ok">
                          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                          <div className="t-small">
                            <strong>Estimasi disesuaikan dengan riwayat tanaman.</strong> Karena{' '}
                            {targetPlant?.nama} sudah memiliki ≥ 2 scan, rentang hari panen menghitung
                            laju perubahan warna buah sebelumnya.
                          </div>
                        </div>
                      )}

                      {/* Tabel referensi tahap kematangan */}
                      <div className="card-subtle">
                        <div className="t-small" style={{ fontWeight: 700, marginBottom: 8 }}>
                          Acuan rentang hari menuju panen
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
                          {(['mentah', 'setengah_matang', 'matang'] as const).map((st) => {
                            const ref = RIPENESS_REFERENCE[st];
                            return (
                              <div
                                key={st}
                                style={{
                                  background: 'var(--surface)',
                                  padding: 12,
                                  borderRadius: 14,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                  <span className="ripeness-dot" style={{ background: ref.color }} />
                                  {ref.label}
                                </div>
                                <div className="t-small tabular-nums">
                                  {st === 'matang' ? 'Siap panen (0–1 hari)' : `Tunggu ${ref.minDays}–${ref.maxDays} hari`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="t-micro t-soft" style={{ marginTop: 8 }}>
                          Sumber: {RIPENESS_REFERENCE.matang.sumber}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: PENYAKIT & SOLUSI (F2.2, F2.3, F2.4) */}
              {activeTab === 'penyakit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* F2.2: 3 teratas kemungkinan termasuk "Sehat" */}
                  <div className="card-subtle">
                    <div className="t-small" style={{ fontWeight: 700, marginBottom: 10 }}>
                      3 kemungkinan teratas (termasuk kelas Sehat)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {result.penyakitTop3.map((item, idx) => (
                        <div key={item.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: idx === 0 ? 700 : 500 }}>
                              {idx + 1}. {item.nama}
                            </span>
                            <span className="tabular-nums" style={{ fontWeight: 700 }}>
                              {item.confidence}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 10,
                              borderRadius: 99,
                              background: 'var(--line)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${item.confidence}%`,
                                height: '100%',
                                borderRadius: 99,
                                background:
                                  item.id === 'sehat'
                                    ? 'var(--ok)'
                                    : idx === 0
                                      ? 'var(--bad)'
                                      : 'var(--warn)',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* F2.3: Basis pengetahuan (Penyebab, Gejala, Organik dulu, Kimiawi + baca label produk, Pencegahan, Sumber) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <h3 className="t-h3">{diseaseInfo.penyakit}</h3>
                      <p className="t-small t-soft" style={{ marginTop: 4 }}>
                        <strong>Penyebab:</strong> {diseaseInfo.penyebab}
                      </p>
                      <p className="t-small t-soft" style={{ marginTop: 4 }}>
                        <strong>Gejala pembanding:</strong> {diseaseInfo.gejala}
                      </p>
                    </div>

                    {/* Solusi Organik & Budidaya SELALU PERTAMA */}
                    <div className="alert-card alert-card--ok">
                      <Leaf size={22} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <strong>Solusi organik & budidaya</strong>
                          <span className="pill pill-ok">Organik lebih dulu</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {diseaseInfo.solusiOrganik.map((s, i) => (
                            <li key={i} className="t-small">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Opsi Kimiawi + wajib "Baca label produk" */}
                    <div className="alert-card alert-card--warn">
                      <AlertTriangle size={22} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <strong>Opsi kimiawi (pilihan terakhir)</strong>
                          <span className="pill pill-warn">Baca label produk</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {diseaseInfo.solusiKimia.map((s, i) => (
                            <li key={i} className="t-small">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="card-subtle">
                      <strong className="t-small">Langkah pencegahan:</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {diseaseInfo.pencegahan.map((p, i) => (
                          <li key={i} className="t-small t-soft">
                            {p}
                          </li>
                        ))}
                      </ul>
                      <p className="t-micro t-soft" style={{ marginTop: 10 }}>
                        Sumber: {diseaseInfo.sumber} · Konfirmasi ke penyuluh pertanian bila ragu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: REKOMENDASI PUPUK (F3.1–F3.4) */}
              {activeTab === 'pupuk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 className="t-h3">{nutrientInfo.dugaan}</h3>
                    {/* F3.3: Label Dengan data sensor vs Dugaan visual */}
                    {result.pakaiDataSensor ? (
                      <>
                        <span className="pill pill-ok">Dengan data sensor</span>
                        <span className="pill pill-sim">Simulasi</span>
                      </>
                    ) : (
                      <span className="pill pill-warn">Dugaan visual</span>
                    )}
                  </div>

                  <p className="t-small t-soft">
                    <strong>Gejala acuan:</strong> {nutrientInfo.gejala}
                  </p>

                  {/* Rekomendasi organik dulu */}
                  <div className="alert-card alert-card--ok">
                    <Leaf size={22} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
                    <div>
                      <strong>Pilihan organik lebih dulu</strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        {nutrientInfo.rekomendasiOrganik}
                      </p>
                    </div>
                  </div>

                  {/* Tabel dosis umum per fase tumbuh (F3.2) */}
                  <div className="card-subtle">
                    <div style={{ marginBottom: 8 }}>
                      <strong className="t-small">
                        Dosis umum untuk fase aktif ({targetPlant?.fase || 'Berbuah'})
                      </strong>
                      <p className="t-body" style={{ marginTop: 4, fontWeight: 600 }}>
                        {nutrientInfo.dosisPerFase[targetPlant?.fase || 'Berbuah']}
                      </p>
                    </div>
                    <hr className="card-divider" />
                    <div className="t-micro t-soft" style={{ fontWeight: 700, marginBottom: 6 }}>
                      Panduan per fase tumbuh:
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {Object.entries(nutrientInfo.dosisPerFase).map(([fase, dosis]) => (
                        <div
                          key={fase}
                          className="t-small"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 10,
                            background:
                              fase === targetPlant?.fase ? 'var(--surface)' : 'transparent',
                            fontWeight: fase === targetPlant?.fase ? 700 : 400,
                          }}
                        >
                          <span style={{ color: 'var(--leaf-600)', fontWeight: 700 }}>{fase}:</span> {dosis}
                        </div>
                      ))}
                    </div>
                    <p className="t-micro t-soft" style={{ marginTop: 10 }}>
                      Sumber: {nutrientInfo.sumber}
                    </p>
                  </div>

                  {/* F3.4: Disclaimer wajib selalu tampil */}
                  <div className="alert-card alert-card--warn" role="note">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div className="t-small">
                      <strong>Bukan pengganti uji tanah.</strong> Takaran pupuk di atas adalah acuan
                      umum dan sebaiknya disesuaikan dengan kondisi lahan serta arahan penyuluh
                      pertanian.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Aksi bawah hasil scan */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={savedToTimeline}
            >
              {savedToTimeline ? (
                <>
                  <Check size={18} /> Tersimpan di timeline & kalender
                </>
              ) : (
                'Simpan ke timeline'
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!savedToTimeline) handleSave();
                openChatWithPlant(result.plantId);
              }}
            >
              <MessageCircle size={18} /> Tanya Cermo tentang hasil ini
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setStage('pick');
                setResult(null);
              }}
            >
              <RefreshCw size={18} /> Scan lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
