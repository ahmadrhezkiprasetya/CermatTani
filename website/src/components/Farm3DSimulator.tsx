'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Apple,
  CloudRain,
  Compass,
  Droplets,
  Flame,
  Layers,
  Leaf,
  Microscope,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  Power,
  RefreshCw,
  RotateCcw,
  Scissors,
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
  ShowcaseLabel3D,
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

/* Tahap busuk pada mode contoh (urut kiri → kanan di bedengan depan) */
const ROT_STAGES = [
  { name: 'Sehat', desc: 'Daun hijau segar, buah mulus mengilap, bunga masih ada.' },
  { name: 'Gejala awal', desc: 'Daun bawah menguning, bercak kecil, buah mulai kusam.' },
  { name: 'Sedang', desc: 'Bercak coklat bercincin berhalo kuning, buah berlesi cekung.' },
  { name: 'Parah', desc: 'Daun coklat menggulung & sobek, buah keriput berkapang abu-abu.' },
  { name: 'Mati', desc: 'Batang coklat condong, daun & buah busuk rontok ke bedengan.' },
] as const;

type ScenarioId = 'cerah' | 'kering' | 'hujan' | 'tandon' | 'hemat';

const SCENARIO_BUTTONS: { id: ScenarioId; label: string; icon: React.ReactNode; wide?: boolean }[] = [
  { id: 'cerah', label: 'Cerah normal', icon: <Sun size={14} color="#E69A00" /> },
  { id: 'kering', label: 'Kemarau', icon: <Flame size={14} color="#D63D12" /> },
  { id: 'hujan', label: 'Hujan lembap', icon: <CloudRain size={14} color="#1F76BD" /> },
  { id: 'tandon', label: 'Tandon kritis', icon: <ShieldAlert size={14} color="#C62F36" /> },
  { id: 'hemat', label: 'Mendung · hemat baterai', icon: <Moon size={14} color="#5B4CD6" />, wide: true },
];

/* Slider seragam panel samping: label kiri, nilai kanan, slider di bawah */
const SimSlider: React.FC<{
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}> = ({ label, value, unit, min, max, onChange, ariaLabel }) => (
  <div className="sim3d-slider">
    <div className="sim3d-slider-head">
      <span>{label}</span>
      <strong className="tabular-nums">
        {value}
        {unit}
      </strong>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="range-slider"
      aria-label={ariaLabel}
    />
  </div>
);

interface Farm3DSimulatorProps {
  /** 'page' = halaman Simulasi 3D tersendiri (viewport lebih tinggi, menyesuaikan layar). */
  mode?: 'dashboard' | 'lab' | 'page';
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
  useEffect(() => {
    if (!statusToast) return;
    const t = window.setTimeout(() => setStatusToast(''), 6000);
    return () => window.clearTimeout(t);
  }, [statusToast]);
  const [cameraPreset, setCameraPreset] = useState<{ id: CameraPreset3D; seq: number }>({
    id: 'overview',
    seq: 0,
  });
  const [zoomCommand, setZoomCommand] = useState<{ delta: number; seq: number }>({
    delta: 0,
    seq: 0,
  });
  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel3D[]>([]);
  // Simulasi penyakit busuk (persen organ terserang 0–100)
  const [fruitRot, setFruitRot] = useState(0);
  const [leafRot, setLeafRot] = useState(0);
  // Mode contoh: 5 tanaman bedengan depan dari sehat → mati busuk, lengkap dengan label tahap
  const [rotShowcase, setRotShowcase] = useState(false);
  const [showcaseLabels, setShowcaseLabels] = useState<ShowcaseLabel3D[]>([]);

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
    fruitRot: 0,
    leafRot: 0,
    rotShowcase: false,
  });

  // Sinkronkan state live ke mesin WebGL tanpa restart canvas
  useEffect(() => {
    // Hujan hanya tampil bila dipilih lewat skenario (bukan otomatis dari kelembapan) — default cerah & ringan
    const derivedWeather: WeatherMode3D =
      weather === 'hujan'
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
      fruitRot: fruitRot / 100,
      leafRot: leafRot / 100,
      rotShowcase,
    };
  }, [state.sensor, state.settings, activeFarmPlants.length, layer, weather, selectedHotspot, autoOrbit, fruitRot, leafRot, rotShowcase]);

  // Penyakit busuk menyebar perlahan saat udara lembap melewati ambang risiko jamur (simulasi berjalan)
  useEffect(() => {
    if (!simRunning || (fruitRot === 0 && leafRot === 0)) return;
    const humid = state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit;
    if (!humid) return;
    const stepMs = simSpeed === 3 ? 900 : 2400;
    const timer = window.setInterval(() => {
      if (!isVisibleRef.current || document.hidden) return;
      setFruitRot((v) => (v > 0 ? Math.min(100, v + 2) : v));
      setLeafRot((v) => (v > 0 ? Math.min(100, v + 2) : v));
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [simRunning, simSpeed, fruitRot, leafRot, state.sensor.kelembapanUdara, state.settings.ambangKelembapanRisikoPenyakit]);

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
    (id: 'cerah' | 'kering' | 'hujan' | 'tandon' | 'hemat' | 'buahBusuk' | 'daunBusuk') => {
      if (id === 'buahBusuk') {
        // Klik lagi saat aktif = hentikan simulasi buah busuk
        if (fruitRot > 0) {
          setFruitRot(0);
          setStatusToast('Simulasi buah busuk dihentikan.');
          return;
        }
        setWeather('berawan');
        updateSettings({ pompaMenyala: false });
        updateSensor({ kelembapanUdara: 93, suhuUdara: 23.2, kelembapanTanah: 72, cahayaLux: 6800 });
        setFruitRot(45);
        setLayer('normal');
        setCameraPreset((prev) => ({ id: 'tanaman', seq: prev.seq + 1 }));
        setStatusToast(
          'Busuk Buah (Botrytis/antraknosa): buah menghitam, mengerut, berkapang abu-abu lalu rontok. Udara lembap 93% mempercepat penyebaran.'
        );
        setSimRunning(true);
        return;
      }
      if (id === 'daunBusuk') {
        if (leafRot > 0) {
          setLeafRot(0);
          setStatusToast('Simulasi daun busuk dihentikan.');
          return;
        }
        setWeather('berawan');
        updateSettings({ pompaMenyala: false });
        updateSensor({ kelembapanUdara: 91, suhuUdara: 21.8, kelembapanTanah: 74, cahayaLux: 7400 });
        setLeafRot(40);
        setLayer('normal');
        setCameraPreset((prev) => ({ id: 'tanaman', seq: prev.seq + 1 }));
        setStatusToast(
          'Busuk Daun (hawar/Phytophthora): bercak kuning lalu coklat kehitaman dari daun bawah, daun terkulai. Lembap 91% mempercepat serangan.'
        );
        setSimRunning(true);
        return;
      }
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
    [updateSensor, updateSettings, fruitRot, leafRot]
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
  const totalFruits = Math.max(1, activeFarmPlants.length) * 5;
  const rottenFruitCount = Math.round((fruitRot / 100) * totalFruits);
  const hasRot = fruitRot > 0 || leafRot > 0 || rotShowcase;

  const toggleRotShowcase = () => {
    if (rotShowcase) {
      setRotShowcase(false);
      setStatusToast('Mode contoh ditutup. Tanaman kembali ke kondisi simulasi.');
      return;
    }
    setRotShowcase(true);
    setLayer('normal');
    setAutoOrbit(false);
    setSelectedHotspot(null);
    setCameraPreset((prev) => ({ id: 'contoh', seq: prev.seq + 1 }));
    setStatusToast('Contoh tanaman busuk: bedengan depan dari kiri (sehat) ke kanan (mati). Perbesar untuk melihat bercak & kapang.');
  };

  const handleSanitize = () => {
    setFruitRot(0);
    setLeafRot(0);
    setRotShowcase(false);
    setStatusToast('Sanitasi kebun: buah & daun busuk dipangkas, dibuang jauh dari bedengan, lalu disemprot fungisida hayati.');
  };

  const hotspotDetail: Record<
    Exclude<HotspotId3D, null>,
    { title: string; desc: string; ctaLabel: string; onCta: () => void }
  > = {
    bedengan: {
      title: `Bedengan ${activeFarm?.nama || 'Blok A'}`,
      desc: hasRot
        ? `Terserang busuk: buah ${fruitRot}% (≈${rottenFruitCount} buah) · daun ${leafRot}%. RH ${state.sensor.kelembapanUdara}% ${isDiseaseRisk ? 'mempercepat penyebaran' : 'aman, penyebaran berhenti'}.`
        : `Kelembapan tanah ${state.sensor.kelembapanTanah}% · Suhu ${state.sensor.suhuUdara}°C · RH ${state.sensor.kelembapanUdara}%.`,
      ctaLabel: hasRot ? 'Scan gejala busuk' : 'Scan tanaman sekarang',
      onCta: () => openScanWith(leafRot > fruitRot ? 'daun' : 'buah'),
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
    if (rotShowcase && fruitRot === 0 && leafRot === 0) {
      return { text: 'Contoh busuk', accent: '#F59E0B' };
    }
    if (hasRot) {
      return {
        text: fruitRot > 0 ? `Busuk ≈${rottenFruitCount} buah` : `Daun busuk ${leafRot}%`,
        accent: '#EF4444',
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
      {/* Header: judul kartu + status aktif */}
      <div className="sim3d-header">
        <div className="sim3d-title-block">
          <h3 className="t-h3 sim3d-heading">Kebun 3D interaktif</h3>
          <p className="t-micro t-soft sim3d-subtitle">
            Geser untuk memutar 360° · scroll untuk zoom · klik objek untuk melihat detail
          </p>
        </div>
        {(isFlowing || isDiseaseRisk || hasRot) && (
          <div className="sim3d-badges">
            {rotShowcase && (
              <span className="pill pill-warn">
                <Microscope size={12} /> Contoh tahap busuk
              </span>
            )}
            {fruitRot > 0 && (
              <span className="pill pill-bad">
                <Apple size={12} /> Buah busuk {fruitRot}%
              </span>
            )}
            {leafRot > 0 && (
              <span className="pill pill-bad">
                <Leaf size={12} /> Daun busuk {leafRot}%
              </span>
            )}
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
        )}
      </div>

      {/* Toolbar: sudut kamera (kiri) · lapisan visual + layar penuh (kanan) */}
      <div className="sim3d-toolbar">
        <div className="sim3d-cam-group">
          <span className="t-micro t-soft sim3d-cam-label">
            <Compass size={13} color="var(--leaf-600)" /> Sudut kamera
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
            className="icon-btn sim3d-fs-btn"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? 'Keluar layar penuh' : 'Perbesar layar penuh'}
            aria-label={fullscreen ? 'Keluar layar penuh' : 'Perbesar layar penuh'}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Panggung 3D WebGL PBR + Panel Skenario Samping */}
      <div
        className="sim3d-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            mode === 'lab' || mode === 'page' || fullscreen
              ? 'minmax(0, 1.7fr) minmax(260px, 0.72fr)'
              : 'minmax(0, 1.72fr) minmax(252px, 0.78fr)',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* Viewport WebGL 3D — Bersih, responsif di HP/tablet/desktop */}
        <div
          className={`sim3d-viewport ${fullscreen ? 'sim3d-viewport--full' : mode === 'page' ? 'sim3d-viewport--page' : ''}`}
          style={!fullscreen && height !== 410 ? { height } : undefined}
        >
          <Farm3DWebGLCanvas
            liveStateRef={liveStateRef}
            cameraPreset={cameraPreset}
            zoomCommand={zoomCommand}
            onLabelsUpdate={setProjectedLabels}
            onShowcaseLabels={setShowcaseLabels}
            onHotspotSelect={(id) => setSelectedHotspot((prev) => (prev === id ? null : id))}
          />

          {/* Label 3D Terproyeksi Bebas Tabrakan */}
          {projectedLabels.map((lb) => {
            if (!lb.visible) return null;
            // Mode contoh: label bedengan disembunyikan agar tak menumpuk label tahap busuk
            if (rotShowcase && lb.id === 'bedengan') return null;
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

          {/* Label tahap busuk di atas 5 tanaman contoh */}
          {rotShowcase &&
            showcaseLabels.map((lb, idx) =>
              lb.visible ? (
                <span
                  key={ROT_STAGES[idx].name}
                  className={`sim3d-stage-tag sim3d-stage-tag--${idx}`}
                  style={{ left: lb.x, top: lb.y }}
                >
                  <b>{idx + 1}</b> {ROT_STAGES[idx].name}
                </span>
              ) : null
            )}

          {/* Pojok kanan atas: jalankan/jeda & kecepatan waktu simulasi */}
          <div className="sim3d-overlay-top">
            <button
              type="button"
              onClick={() => setSimRunning((v) => !v)}
              className="glass-surface sim3d-overlay-btn"
              aria-label={simRunning ? 'Jeda simulasi' : 'Jalankan simulasi'}
            >
              {simRunning ? <Pause size={13} /> : <Play size={13} />}
              {simRunning ? 'Jalan' : 'Jeda'}
            </button>
            <button
              type="button"
              onClick={() => setSimSpeed((sp) => (sp === 1 ? 3 : 1))}
              className="glass-surface sim3d-overlay-btn"
              title="Kecepatan waktu simulasi"
              aria-label={`Kecepatan simulasi ${simSpeed} kali`}
            >
              {simSpeed}×
            </button>
          </div>

          {/* Notifikasi skenario mengambang (hilang otomatis) — panel samping tak lagi memanjang */}
          {statusToast && (
            <div className="glass-surface sim3d-toast" role="status">
              {statusToast}
            </div>
          )}

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

        {/* Panel kontrol samping: 3 bagian seragam. Tingginya mengikuti panggung 3D, isinya bisa digulir */}
        <div className="sim3d-panel-wrap">
        <div className="sim3d-panel">
          <div className="sim3d-panel-section">
            <div className="sim3d-panel-title">
              <Layers size={14} color="var(--leaf-600)" /> Skenario cuaca &amp; lahan
            </div>
            <div className="sim3d-btn-grid">
              {SCENARIO_BUTTONS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`btn-secondary sim3d-opt-btn ${sc.wide ? 'sim3d-opt-btn--wide' : ''}`}
                  onClick={() => applyScenario(sc.id)}
                >
                  {sc.icon} {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simulasi Penyakit Busuk Buah & Daun */}
          <div className="sim3d-panel-section">
            <div className="sim3d-panel-title">
              <ShieldAlert size={14} color="#C62F36" /> Penyakit busuk
            </div>
            <div className="sim3d-btn-grid">
              <button
                type="button"
                className={`${fruitRot > 0 ? 'btn-danger' : 'btn-secondary'} sim3d-opt-btn`}
                onClick={() => applyScenario('buahBusuk')}
                aria-pressed={fruitRot > 0}
                title={fruitRot > 0 ? 'Klik lagi untuk menghentikan' : undefined}
              >
                <Apple size={14} /> Buah busuk
              </button>
              <button
                type="button"
                className={`${leafRot > 0 ? 'btn-danger' : 'btn-secondary'} sim3d-opt-btn`}
                onClick={() => applyScenario('daunBusuk')}
                aria-pressed={leafRot > 0}
                title={leafRot > 0 ? 'Klik lagi untuk menghentikan' : undefined}
              >
                <Leaf size={14} /> Daun busuk
              </button>
              <button
                type="button"
                className={`${rotShowcase ? 'btn-primary' : 'btn-secondary'} sim3d-opt-btn sim3d-opt-btn--wide`}
                onClick={toggleRotShowcase}
                aria-pressed={rotShowcase}
              >
                <Microscope size={14} /> {rotShowcase ? 'Tutup contoh tanaman busuk' : 'Lihat contoh tanaman busuk'}
              </button>
            </div>
            {rotShowcase && (
              <ol className="sim3d-stage-list">
                {ROT_STAGES.map((stage, idx) => (
                  <li key={stage.name}>
                    <span className={`sim3d-stage-dot sim3d-stage-dot--${idx}`}>{idx + 1}</span>
                    <div>
                      <strong>{stage.name}</strong>
                      <span>{stage.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <SimSlider label="Buah terserang" value={fruitRot} unit="%" min={0} max={100} onChange={setFruitRot} ariaLabel="Atur persentase buah busuk" />
            <SimSlider label="Daun terserang" value={leafRot} unit="%" min={0} max={100} onChange={setLeafRot} ariaLabel="Atur persentase daun busuk" />
            {hasRot && (
              <button type="button" className="btn-secondary sim3d-opt-btn sim3d-opt-btn--center" onClick={handleSanitize}>
                <Scissors size={14} color="var(--leaf-600)" /> Pangkas &amp; sanitasi
              </button>
            )}
          </div>

          <div className="sim3d-panel-section">
            <div className="sim3d-panel-title">
              <Droplets size={14} color="var(--water-700)" /> Kontrol lahan
            </div>
            <SimSlider
              label="Kelembapan tanah"
              value={state.sensor.kelembapanTanah}
              unit="%"
              min={12}
              max={88}
              onChange={(v) => updateSensor({ kelembapanTanah: v })}
              ariaLabel="Atur kelembapan tanah simulasi 3D"
            />
            <SimSlider
              label="Level air tandon"
              value={state.sensor.levelTandonPersen}
              unit="%"
              min={8}
              max={100}
              onChange={(v) => updateSensor({ levelTandonPersen: v })}
              ariaLabel="Atur level tandon simulasi 3D"
            />
            <div className="sim3d-pump-row">
              <button
                type="button"
                className={state.settings.pompaMenyala ? 'btn-danger' : 'btn-primary'}
                onClick={handleTogglePump}
                disabled={isTankCrit && !state.settings.pompaMenyala}
              >
                <Power size={15} />
                {state.settings.pompaMenyala ? 'Matikan pompa' : 'Siram sekarang'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleRefillTank} title="Isi penuh tandon air">
                <Waves size={15} /> Isi tandon
              </button>
            </div>
          </div>
        </div>
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
