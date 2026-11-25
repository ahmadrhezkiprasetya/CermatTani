'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  CloudRain,
  Compass,
  Droplets,
  Flame,
  Layers,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  Power,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sun,
  Waves,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import type {
  CameraPreset3D,
  HotspotId3D,
  LiveSimState3D,
  ProjectedLabel3D,
  SimLayer3D,
  WeatherMode3D,
} from './Farm3DWebGLCanvas';

/* Lazy-load WebGL Three.js hanya di sisi klien (0 beban SSR & tidak memperlambat halaman lain) */
const Farm3DWebGLCanvas = dynamic(() => import('./Farm3DWebGLCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(180deg, #2c82c9 0%, #8ed1ec 55%, #3b6e4c 100%)',
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: '0.9rem',
      }}
    >
      Memuat simulasi kebun 3D...
    </div>
  ),
});

interface Farm3DSimulatorProps {
  mode?: 'dashboard' | 'lab';
  height?: number;
}

export const Farm3DSimulator: React.FC<Farm3DSimulatorProps> = ({
  mode = 'dashboard',
  height = 410,
}) => {
  const {
    state,
    activeFarm,
    activeFarmPlants,
    updateSensor,
    updateSettings,
    triggerManualPump,
    setActiveScreen,
    openScanWith,
  } = useApp();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef(true);

  const [layer, setLayer] = useState<SimLayer3D>('normal');
  const [weather, setWeather] = useState<WeatherMode3D>('cerah');
  const [simRunning, setSimRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState<1 | 3>(1);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotId3D>(null);
  const [statusToast, setStatusToast] = useState<string>('');
  const [cameraPreset, setCameraPreset] = useState<{ id: CameraPreset3D; seq: number }>({
    id: 'overview',
    seq: 0,
  });
  const [zoomCommand, setZoomCommand] = useState<{ delta: number; seq: number }>({
    delta: 0,
    seq: 0,
  });
  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel3D[]>([]);

  const liveStateRef = useRef<LiveSimState3D>({
    moisture: state.sensor.kelembapanTanah,
    humidity: state.sensor.kelembapanUdara,
    temp: state.sensor.suhuUdara,
    lux: state.sensor.cahayaLux,
    tank: state.sensor.levelTandonPersen,
    battery: state.sensor.bateraiPersen,
    pumpOn: state.settings.pompaMenyala,
    lowSoil: state.settings.ambangTanahBawah,
    tankLow: state.settings.ambangTandonRendah,
    diseaseRh: state.settings.ambangKelembapanRisikoPenyakit,
    battLow: state.settings.ambangBateraiHemat,
    plantCount: Math.max(1, activeFarmPlants.length),
    layer: 'normal',
    weather: 'cerah',
    selectedHotspot: null,
    autoOrbit: false,
  });

  // Sinkronkan state live ke mesin WebGL tanpa restart canvas
  useEffect(() => {
    const derivedWeather: WeatherMode3D =
      state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit
        ? 'hujan'
        : state.sensor.kelembapanTanah < 32 && state.sensor.suhuUdara >= 29
          ? 'kering'
          : state.sensor.cahayaLux < 14000
            ? 'berawan'
            : weather;

    liveStateRef.current = {
      moisture: state.sensor.kelembapanTanah,
      humidity: state.sensor.kelembapanUdara,
      temp: state.sensor.suhuUdara,
      lux: state.sensor.cahayaLux,
      tank: state.sensor.levelTandonPersen,
      battery: state.sensor.bateraiPersen,
      pumpOn: state.settings.pompaMenyala,
      lowSoil: state.settings.ambangTanahBawah,
      tankLow: state.settings.ambangTandonRendah,
      diseaseRh: state.settings.ambangKelembapanRisikoPenyakit,
      battLow: state.settings.ambangBateraiHemat,
      plantCount: Math.max(1, activeFarmPlants.length),
      layer,
      weather: derivedWeather,
      selectedHotspot,
      autoOrbit,
    };
  }, [state.sensor, state.settings, activeFarmPlants.length, layer, weather, selectedHotspot, autoOrbit]);

  // IntersectionObserver untuk jeda loop fisika saat di luar viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = Boolean(entries[0]?.isIntersecting);
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Simulasi fisika lingkungan real-time ringan (evaporasi, irigasi, pengisian surya)
  useEffect(() => {
    if (!simRunning) return;
    const stepMs = simSpeed === 3 ? 650 : 1600;
    const timer = window.setInterval(() => {
      if (!isVisibleRef.current || document.hidden) return;
      const cur = liveStateRef.current;

      let nextMoisture = cur.moisture;
      let nextTank = cur.tank;
      let nextBattery = cur.battery;
      const tankCrit = cur.tank < cur.tankLow;

      if (cur.pumpOn && !tankCrit) {
        nextMoisture = Math.min(82, cur.moisture + 3);
        nextTank = Math.max(5, cur.tank - 1);
        nextBattery = Math.max(8, cur.battery - (cur.weather === 'cerah' ? 0 : 1));
      } else if (cur.weather === 'hujan') {
        nextMoisture = Math.min(85, cur.moisture + 1);
        nextTank = Math.min(100, cur.tank + 1);
        nextBattery = Math.max(10, cur.battery - 1);
      } else if (cur.weather === 'kering') {
        nextMoisture = Math.max(12, cur.moisture - 2);
        nextBattery = Math.min(100, cur.battery + 1);
      } else if (cur.weather === 'berawan') {
        nextMoisture = Math.max(16, cur.moisture - 1);
        nextBattery = Math.max(10, cur.battery - 1);
      } else {
        nextMoisture = Math.max(18, cur.moisture - 1);
        nextBattery = Math.min(100, cur.battery + 1);
      }

      if (nextMoisture !== cur.moisture || nextTank !== cur.tank || nextBattery !== cur.battery) {
        const volt = Number((11.1 + (nextBattery / 100) * 1.9).toFixed(1));
        updateSensor({
          kelembapanTanah: nextMoisture,
          levelTandonPersen: nextTank,
          bateraiPersen: nextBattery,
          teganganVolt: volt,
        });
      }
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [simRunning, simSpeed, updateSensor]);

  const applyScenario = useCallback(
    (id: 'cerah' | 'kering' | 'hujan' | 'tandon' | 'hemat') => {
      if (id === 'cerah') {
        setWeather('cerah');
        updateSettings({ irigasiOtomatis: true, pompaMenyala: false });
        updateSensor({
          kelembapanTanah: 54,
          suhuUdara: 26.5,
          kelembapanUdara: 70,
          cahayaLux: 38500,
          levelTandonPersen: 76,
          bateraiPersen: 86,
          teganganVolt: 12.7,
        });
        setStatusToast('Siang Cerah: pencahayaan matahari penuh, pengisian surya & kebun stabil.');
      } else if (id === 'kering') {
        setWeather('kering');
        updateSettings({ irigasiOtomatis: true });
        updateSensor({
          kelembapanTanah: 27,
          suhuUdara: 32.8,
          kelembapanUdara: 52,
          cahayaLux: 48500,
          levelTandonPersen: 68,
          bateraiPersen: 90,
          teganganVolt: 12.8,
        });
        setStatusToast('Kemarau Terik: tanah kering 27% → pompa irigasi otomatis menyala menyiram bedengan!');
      } else if (id === 'hujan') {
        setWeather('hujan');
        updateSettings({ pompaMenyala: false });
        updateSensor({
          kelembapanTanah: 70,
          suhuUdara: 22.4,
          kelembapanUdara: 92,
          cahayaLux: 7200,
          levelTandonPersen: 90,
          bateraiPersen: 62,
          teganganVolt: 12.2,
        });
        setStatusToast('Hujan & Lembap 92% RH: kabut lembap naik & peringatan risiko jamur aktif!');
      } else if (id === 'tandon') {
        setWeather('kering');
        updateSettings({ irigasiOtomatis: true });
        updateSensor({
          kelembapanTanah: 25,
          suhuUdara: 30.5,
          kelembapanUdara: 60,
          cahayaLux: 36000,
          levelTandonPersen: 13,
          bateraiPersen: 78,
          teganganVolt: 12.6,
        });
        setStatusToast('Tandon Kritis 13%: air tandon merah & pengaman interlock menahan pompa!');
      } else {
        setWeather('berawan');
        updateSettings({ pompaMenyala: false });
        updateSensor({
          kelembapanTanah: 48,
          suhuUdara: 24.0,
          kelembapanUdara: 79,
          cahayaLux: 5200,
          levelTandonPersen: 64,
          bateraiPersen: 16,
          teganganVolt: 11.4,
        });
        setStatusToast('Mendung & Baterai 16%: stasiun surya masuk Mode Hemat daya.');
      }
      setSimRunning(true);
    },
    [updateSensor, updateSettings]
  );

  const handleTogglePump = () => {
    const res = triggerManualPump(!state.settings.pompaMenyala);
    setStatusToast(res.message);
  };

  const handleRefillTank = () => {
    updateSensor({ levelTandonPersen: 95 });
    setStatusToast('Tandon diisi penuh ke 95% (≈ 475 liter). Pengaman interlock kembali aman.');
  };

  const flyTo = (id: CameraPreset3D) => {
    setCameraPreset((prev) => ({ id, seq: prev.seq + 1 }));
  };

  const isTankCrit = state.sensor.levelTandonPersen < state.settings.ambangTandonRendah;
  const isDiseaseRisk =
    state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit;
  const isPowerSave = state.sensor.bateraiPersen <= state.settings.ambangBateraiHemat;
  const isFlowing = state.settings.pompaMenyala && !isTankCrit;

  const hotspotDetail: Record<
    Exclude<HotspotId3D, null>,
    { title: string; desc: string; ctaLabel: string; onCta: () => void }
  > = {
    bedengan: {
      title: `Bedengan ${activeFarm?.nama || 'Blok A'}`,
      desc: `Kelembapan tanah ${state.sensor.kelembapanTanah}% · Suhu ${state.sensor.suhuUdara}°C · RH ${state.sensor.kelembapanUdara}%.`,
      ctaLabel: 'Scan tanaman sekarang',
      onCta: () => openScanWith('buah'),
    },
    tandon: {
      title: `Tandon Air 500L (${state.sensor.levelTandonPersen}%)`,
      desc: isTankCrit
        ? 'Air kritis (< 20%)! Pengaman interlock menahan pompa agar tidak rusak.'
        : `Tersedia sekitar ${Math.round((state.sensor.levelTandonPersen / 100) * 500)} liter siap alir ke pipa tetes.`,
      ctaLabel: isTankCrit ? 'Isi ulang tandon 95%' : 'Buka halaman Lahan',
      onCta: isTankCrit ? handleRefillTank : () => setActiveScreen('lahan'),
    },
    pompa: {
      title: `Pompa Irigasi (${isFlowing ? 'Menyala' : isTankCrit ? 'Interlock' : 'Siaga'})`,
      desc: `Mode ${state.settings.irigasiOtomatis ? 'Otomatis' : 'Manual'} · Nyala < ${state.settings.ambangTanahBawah}%, mati ≥ ${state.settings.ambangTanahAtas}%.`,
      ctaLabel: state.settings.pompaMenyala ? 'Matikan pompa' : 'Nyalakan pompa',
      onCta: handleTogglePump,
    },
    surya: {
      title: `Stasiun Surya & ESP32 (${state.sensor.bateraiPersen}%)`,
      desc: `${state.sensor.teganganVolt.toFixed(1)} V · ${state.sensor.dayaWatt.toFixed(2)} W · ${isPowerSave ? 'Mode hemat aktif' : 'Pengisian optimal'}.`,
      ctaLabel: 'Buka kalkulator surya',
      onCta: () => setActiveScreen('energi'),
    },
  };

  const labelContent = (id: Exclude<HotspotId3D, null>): { text: string; accent?: string } => {
    if (id === 'tandon') {
      return {
        text: `Tandon ${state.sensor.levelTandonPersen}%`,
        accent: isTankCrit ? '#EF4444' : undefined,
      };
    }
    if (id === 'pompa') {
      return {
        text: isFlowing ? 'Pompa ON' : isTankCrit ? 'Interlock' : 'Pompa Siaga',
        accent: isTankCrit ? '#EF4444' : isFlowing ? '#38BDF8' : undefined,
      };
    }
    if (id === 'surya') {
      return {
        text: `Surya ${state.sensor.bateraiPersen}%`,
        accent: isPowerSave ? '#F59E0B' : undefined,
      };
    }
    return {
      text:
        layer === 'panen'
          ? `Bedengan · ${activeFarmPlants.length} tanaman`
          : layer === 'kesehatan'
            ? `RH ${state.sensor.kelembapanUdara}%`
            : `Tanah ${state.sensor.kelembapanTanah}%`,
      accent: state.sensor.kelembapanTanah < state.settings.ambangTanahBawah ? '#F59E0B' : undefined,
    };
  };

  const simBody = (
    <section
      ref={containerRef}
      className="card"
      style={{
        padding: fullscreen ? 20 : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        ...(fullscreen
          ? {
              position: 'fixed',
              inset: 16,
              zIndex: 120,
              overflowY: 'auto',
              boxShadow: 'var(--shadow-3)',
            }
          : {}),
      }}
    >
      {/* Header Simulasi 3D */}
      <div className="sim3d-header">
        <div className="sim3d-title-block">
          <div className="sim3d-title-row">
            <h3 className="t-h3 sim3d-heading">Simulasi Kebun 3D</h3>
            <button
              type="button"
              className="icon-btn sim3d-fs-btn sim3d-fs-btn--mobile"
              onClick={() => setFullscreen((v) => !v)}
              title={fullscreen ? 'Keluar layar penuh' : 'Perbesar layar penuh'}
              aria-label={fullscreen ? 'Keluar layar penuh' : 'Perbesar layar penuh'}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
          <div className="sim3d-badges">
            <span className="pill pill-sim">WebGL 3D · Simulasi</span>
            {isFlowing && (
              <span className="pill pill-water">
                <Droplets size={12} /> Irigasi aktif
              </span>
            )}
            {isDiseaseRisk && (
              <span className="pill pill-warn">
                <ShieldAlert size={12} /> Risiko jamur
              </span>
            )}
          </div>
          <p className="t-micro t-soft sim3d-subtitle">
            Geser bebas 360° untuk mengelilingi kebun · Scroll untuk zoom · Klik objek 3D atau sudut kamera di bawah.
          </p>
        </div>

        <div className="sim3d-tabs-wrap">
          <div className="seg-tabs sim3d-seg-tabs" role="tablist" aria-label="Lapisan visual 3D">
            {(
              [
                { id: 'normal', label: '3D Nyata' },
                { id: 'kelembapan', label: 'Tanah' },
                { id: 'kesehatan', label: 'Kesehatan' },
                { id: 'panen', label: 'Panen' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={layer === tab.id}
                className={`seg-tab ${layer === tab.id ? 'active' : ''}`}
                onClick={() => setLayer(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="icon-btn sim3d-fs-btn sim3d-fs-btn--desktop"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? 'Keluar layar penuh' : 'Perbesar layar penuh'}
            aria-label={fullscreen ? 'Keluar layar penuh' : 'Perbesar layar penuh'}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Bar Sudut Kamera 3D 1-Klik */}
      <div className="sim3d-toolbar">
        <div className="sim3d-cam-group">
          <span className="t-micro t-soft sim3d-cam-label">
            <Compass size={13} color="var(--leaf-600)" /> Sudut kamera:
          </span>
          <div className="sim3d-cam-pills">
            {(
              [
                { id: 'overview', label: 'Udara' },
                { id: 'tanaman', label: 'Tanaman' },
                { id: 'irigasi', label: 'Irigasi' },
                { id: 'surya', label: 'Surya' },
              ] as const
            ).map((camBtn) => (
              <button
                key={camBtn.id}
                type="button"
                onClick={() => flyTo(camBtn.id)}
                className={`sim3d-cam-btn ${cameraPreset.id === camBtn.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {camBtn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sim3d-play-group">
          <button
            type="button"
            onClick={() => setSimRunning((v) => !v)}
            className="btn-secondary sim3d-ctrl-btn"
          >
            {simRunning ? <Pause size={13} /> : <Play size={13} />}
            {simRunning ? 'Jalan' : 'Jeda'}
          </button>
          <button
            type="button"
            onClick={() => setSimSpeed((s) => (s === 1 ? 3 : 1))}
            className="btn-secondary sim3d-ctrl-btn"
            title="Kecepatan waktu simulasi"
          >
            {simSpeed}×
          </button>
        </div>
      </div>

      {/* Panggung 3D WebGL PBR + Panel Skenario Samping */}
      <div
        className="sim3d-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            mode === 'lab' || fullscreen
              ? 'minmax(0, 1.7fr) minmax(260px, 0.72fr)'
              : 'minmax(0, 1.72fr) minmax(252px, 0.78fr)',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* Viewport WebGL 3D — Bersih, responsif di HP/tablet/desktop */}
        <div
          className={`sim3d-viewport ${fullscreen ? 'sim3d-viewport--full' : ''}`}
          style={!fullscreen && height !== 410 ? { height } : undefined}
        >
          <Farm3DWebGLCanvas
            liveStateRef={liveStateRef}
            cameraPreset={cameraPreset}
            zoomCommand={zoomCommand}
            onLabelsUpdate={setProjectedLabels}
            onHotspotSelect={(id) => setSelectedHotspot((prev) => (prev === id ? null : id))}
          />

          {/* Label 3D Terproyeksi Bebas Tabrakan */}
          {projectedLabels.map((lb) => {
            if (!lb.visible) return null;
            const info = labelContent(lb.id);
            const active = selectedHotspot === lb.id;
            return (
              <button
                key={lb.id}
                type="button"
                onClick={() => setSelectedHotspot((prev) => (prev === lb.id ? null : lb.id))}
                style={{
                  position: 'absolute',
                  left: lb.x,
                  top: lb.y,
                  transform: 'translate(-50%, -50%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 11px',
                  borderRadius: 999,
                  border: active
                    ? '1.5px solid #14302A'
                    : info.accent
                      ? `1.5px solid ${info.accent}`
                      : '1px solid rgba(255,255,255,0.28)',
                  background: active ? 'rgba(216,243,106,0.96)' : 'rgba(12,32,27,0.78)',
                  color: active ? '#14302A' : '#F4FBF7',
                  backdropFilter: 'blur(8px)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
                  zIndex: active ? 8 : 5,
                  pointerEvents: 'auto',
                }}
              >
                {info.text}
              </button>
            );
          })}

          {/* Pojok Kanan Bawah: Zoom & Reset Kamera */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              display: 'flex',
              gap: 6,
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setAutoOrbit((v) => !v)}
              className="glass-surface"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                background: autoOrbit ? 'var(--leaf-600)' : undefined,
                color: autoOrbit ? '#ffffff' : undefined,
              }}
              aria-label={autoOrbit ? 'Matikan putar otomatis 360 derajat' : 'Putar otomatis 360 derajat'}
              title={autoOrbit ? 'Matikan putar otomatis 360°' : 'Putar otomatis 360°'}
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoomCommand((z) => ({ delta: -1, seq: z.seq + 1 }))}
              className="glass-surface"
              style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              aria-label="Perkecil 3D"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={() => setZoomCommand((z) => ({ delta: 1, seq: z.seq + 1 }))}
              className="glass-surface"
              style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              aria-label="Perbesar 3D"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => flyTo('overview')}
              className="glass-surface"
              style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              aria-label="Reset sudut kamera 3D"
              title="Reset sudut kamera"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Kartu Inspeksi saat Hotspot 3D Diklik */}
          {selectedHotspot && (
            <div
              className="glass-surface"
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                maxWidth: 270,
                borderRadius: 14,
                padding: '10px 12px',
                boxShadow: 'var(--shadow-2)',
                zIndex: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                {hotspotDetail[selectedHotspot].title}
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: 3, lineHeight: 1.4, opacity: 0.9 }}>
                {hotspotDetail[selectedHotspot].desc}
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ minHeight: 32, padding: '4px 10px', fontSize: '0.75rem', marginTop: 8 }}
                onClick={hotspotDetail[selectedHotspot].onCta}
              >
                {hotspotDetail[selectedHotspot].ctaLabel}
              </button>
            </div>
          )}
        </div>

        {/* Panel Kontrol Interaktif Samping */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div>
            <div className="t-micro" style={{ fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={14} color="var(--leaf-600)" /> Skenario Cuaca &amp; Lahan
            </div>
            <p className="t-micro t-soft" style={{ marginTop: 2, fontWeight: 500 }}>
              Rasakan reaksi 3D pompa, hujan, tandon &amp; surya dalam 1 klik:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 38, padding: '6px 10px', fontSize: '0.78rem', justifyContent: 'flex-start' }}
              onClick={() => applyScenario('cerah')}
            >
              <Sun size={14} color="#E69A00" /> Cerah Normal
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 38, padding: '6px 10px', fontSize: '0.78rem', justifyContent: 'flex-start' }}
              onClick={() => applyScenario('kering')}
            >
              <Flame size={14} color="#D63D12" /> Kemarau
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 38, padding: '6px 10px', fontSize: '0.78rem', justifyContent: 'flex-start' }}
              onClick={() => applyScenario('hujan')}
            >
              <CloudRain size={14} color="#1F76BD" /> Hujan Lembap
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 38, padding: '6px 10px', fontSize: '0.78rem', justifyContent: 'flex-start' }}
              onClick={() => applyScenario('tandon')}
            >
              <ShieldAlert size={14} color="#C62F36" /> Tandon Kritis
            </button>
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: 36, padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => applyScenario('hemat')}
          >
            <Moon size={14} color="#5B4CD6" /> Mendung · Mode Hemat Baterai
          </button>

          <hr className="card-divider" style={{ margin: '2px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-micro t-soft">Kelembapan tanah</span>
                <strong className="t-micro tabular-nums">{state.sensor.kelembapanTanah}%</strong>
              </div>
              <input
                type="range"
                min={12}
                max={88}
                value={state.sensor.kelembapanTanah}
                onChange={(e) => updateSensor({ kelembapanTanah: Number(e.target.value) })}
                className="range-slider"
                aria-label="Atur kelembapan tanah simulasi 3D"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-micro t-soft">Level air tandon</span>
                <strong className="t-micro tabular-nums">{state.sensor.levelTandonPersen}%</strong>
              </div>
              <input
                type="range"
                min={8}
                max={100}
                value={state.sensor.levelTandonPersen}
                onChange={(e) => updateSensor({ levelTandonPersen: Number(e.target.value) })}
                className="range-slider"
                aria-label="Atur level tandon simulasi 3D"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 'auto' }}>
            <button
              type="button"
              className={state.settings.pompaMenyala ? 'btn-danger' : 'btn-primary'}
              style={{ minHeight: 40, fontSize: '0.82rem', padding: '6px 12px' }}
              onClick={handleTogglePump}
              disabled={isTankCrit && !state.settings.pompaMenyala}
            >
              <Power size={15} />
              {state.settings.pompaMenyala ? 'Matikan Pompa' : 'Siram Sekarang'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 40, padding: '6px 10px', fontSize: '0.8rem' }}
              onClick={handleRefillTank}
              title="Isi penuh tandon air"
            >
              <Waves size={15} /> Isi
            </button>
          </div>

          {statusToast && (
            <div
              className="t-micro"
              role="status"
              style={{
                padding: '7px 10px',
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                color: 'var(--ink-soft)',
                lineHeight: 1.4,
              }}
            >
              {statusToast}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  if (fullscreen) {
    return (
      <>
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 24, 20, 0.56)',
            backdropFilter: 'blur(4px)',
            zIndex: 115,
          }}
        />
        {simBody}
      </>
    );
  }

  return simBody;
};
