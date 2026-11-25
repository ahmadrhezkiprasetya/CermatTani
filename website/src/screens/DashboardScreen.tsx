'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  Droplets,
  Leaf,
  MapPin,
  MessageCircle,
  Plus,
  Sparkles,
  Sprout,
  Sun,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { PakCermatMascot } from '../components/PakCermatMascot';
import {
  AnimatedCounter,
  GreenAreaChart,
  ProductionBarChart,
  StripedProgressBar,
} from '../components/Charts';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { PlantSearchInput } from '../components/PlantSearchInput';
import { GrowthPhase } from '../types/cermattani';

const PHASES: GrowthPhase[] = ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];

/* Beranda — Ringan 100% tanpa WebGL (Simulasi 3D fokus di halaman Lahan agar performa enteng di semua perangkat) */
export const DashboardScreen: React.FC = () => {
  const {
    state,
    activeFarm,
    activeFarmPlants,
    openScanWith,
    setActiveScreen,
    toggleTask,
    addTask,
    addFarm,
    addPlant,
  } = useApp();

  const [bottomTab, setBottomTab] = useState<'aktivitas' | 'grafik'>('aktivitas');
  const [chartMode, setChartMode] = useState<'batang' | 'area'>('batang');
  const [newTaskText, setNewTaskText] = useState('');

  const [showAddFarm, setShowAddFarm] = useState(false);
  const [farmNama, setFarmNama] = useState('');
  const [farmLokasi, setFarmLokasi] = useState('');

  const [showAddPlant, setShowAddPlant] = useState(false);
  const [plantNama, setPlantNama] = useState('');
  const [plantVarietas, setPlantVarietas] = useState('Cabai Rawit');
  const [plantFase, setPlantFase] = useState<GrowthPhase>('Vegetatif');

  const farmPlantIds = useMemo(() => new Set(activeFarmPlants.map((p) => p.id)), [activeFarmPlants]);
  const farmScans = useMemo(
    () =>
      state.scans
        .filter((s) => farmPlantIds.has(s.plantId))
        .sort((a, b) => b.waktu.localeCompare(a.waktu)),
    [state.scans, farmPlantIds]
  );

  const readyToHarvestCount = useMemo(() => {
    const latestByPlant = new Map<string, (typeof farmScans)[number]>();
    for (const s of farmScans) {
      if (!latestByPlant.has(s.plantId)) latestByPlant.set(s.plantId, s);
    }
    let count = 0;
    latestByPlant.forEach((s) => {
      if (s.anjuranPanen === 'Panen sekarang') count += Math.max(1, s.jumlahBuah);
    });
    return count;
  }, [farmScans]);

  const attentionCount = useMemo(() => {
    const latestByPlant = new Map<string, (typeof farmScans)[number]>();
    for (const s of farmScans) {
      if (!latestByPlant.has(s.plantId)) latestByPlant.set(s.plantId, s);
    }
    let count = 0;
    latestByPlant.forEach((s) => {
      if (s.penyakitUtamaId !== 'sehat' || s.keyakinanRendah) count++;
    });
    return count;
  }, [farmScans]);

  const healthyPercent = useMemo(() => {
    if (activeFarmPlants.length === 0) return 100;
    return Math.max(
      45,
      Math.round(((activeFarmPlants.length - attentionCount) / activeFarmPlants.length) * 100)
    );
  }, [activeFarmPlants.length, attentionCount]);

  const estimatedTotalKg = useMemo(() => {
    const grams = farmScans.reduce((sum, s) => sum + (s.estimasiBobotGram || 0), 0);
    return Number((grams / 1000).toFixed(1));
  }, [farmScans]);

  const latestFruitScan = useMemo(
    () => farmScans.find((s) => s.bagian === 'buah') || state.scans.find((s) => s.bagian === 'buah') || null,
    [farmScans, state.scans]
  );
  const latestLeafScan = useMemo(
    () => farmScans.find((s) => s.bagian === 'daun') || state.scans.find((s) => s.bagian === 'daun') || null,
    [farmScans, state.scans]
  );

  const isDiseaseRisk =
    state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit;
  const isTankLow = state.sensor.levelTandonPersen < state.settings.ambangTandonRendah;
  const isSoilDry = state.sensor.kelembapanTanah < state.settings.ambangTanahBawah;
  const isPowerSave = state.sensor.bateraiPersen <= state.settings.ambangBateraiHemat;
  const liveAlertCount =
    (isDiseaseRisk ? 1 : 0) +
    (isTankLow ? 1 : 0) +
    (isSoilDry ? 1 : 0) +
    (isPowerSave ? 1 : 0);
  const activeReminderCount = state.settings.jadwalPengingat.filter((r) => r.aktif).length;
  const latestAnyScan = farmScans[0] || state.scans[0] || null;

  const upcomingHarvests = useMemo(() => {
    return state.harvestEvents
      .filter((h) => h.sumber === 'estimasi')
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .slice(0, 4);
  }, [state.harvestEvents]);

  const farmTasks = useMemo(
    () => state.tasks.filter((t) => t.farmId === activeFarm?.id),
    [state.tasks, activeFarm]
  );

  const weeklyYieldBars = [
    { label: 'Mgg 1', value: 1.4 },
    { label: 'Mgg 2', value: 2.1 },
    { label: 'Mgg 3', value: 1.9 },
    { label: 'Mgg 4', value: 3.2, active: true },
    { label: 'Mgg 5', value: 2.7 },
    { label: 'Mgg 6', value: 2.4 },
  ];

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    addTask(newTaskText, 'cek', 'Hari ini');
    setNewTaskText('');
  };

  const handleCreateFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmNama.trim()) return;
    addFarm(farmNama, farmLokasi, 'Lahan budidaya');
    setFarmNama('');
    setFarmLokasi('');
    setShowAddFarm(false);
  };

  const handleQuickAddPlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantNama.trim() || !activeFarm) return;
    addPlant({
      farmId: activeFarm.id,
      nama: plantNama,
      varietas: plantVarietas.trim() || 'Tanaman Kebun',
      tanggalTanam: new Date().toISOString().slice(0, 10),
      fase: plantFase,
    });
    setPlantNama('');
    setShowAddPlant(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1A. Hero Mobile — Sama Persis dengan Flutter Mobile App (<= 768px) */}
      <section className="card-forest dash-hero-mobile" aria-label="Ringkasan sambutan mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="pill pill-ok">{activeFarmPlants.length} tanaman aktif</span>
              <span className="pill pill-water">{activeReminderCount} pengingat aktif</span>
            </div>
            <h2
              className="font-display"
              style={{ fontSize: '1.5rem', lineHeight: 1.15, marginTop: 8, color: 'var(--ink)' }}
            >
              Halo, {state.user.nama}!
            </h2>
            <p className="t-small t-soft" style={{ marginTop: 4, fontSize: '0.845rem', lineHeight: 1.42 }}>
              {liveAlertCount > 0
                ? `Ada ${liveAlertCount} kondisi lahan yang perlu dicek sekarang.`
                : !latestAnyScan
                  ? 'Siap pindai foto buah atau daun dengan Gemini AI hari ini?'
                  : `Terakhir scan: ${latestAnyScan.penyakitUtamaNama} (${latestAnyScan.keyakinan}%).`}
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <CermoMascot pose={liveAlertCount > 0 ? 'worried' : 'happy'} size={86} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            className="btn-tomato"
            style={{ minHeight: 46, padding: '10px 12px', fontSize: '0.9rem', borderRadius: 13 }}
            onClick={() => openScanWith('buah')}
          >
            <Camera size={18} /> Scan Foto AI
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: 46, padding: '10px 12px', fontSize: '0.875rem', borderRadius: 13 }}
            onClick={() => setActiveScreen('cermo')}
          >
            <MessageCircle size={17} color="var(--leaf-600)" /> Tanya Cermo
          </button>
        </div>
      </section>

      {/* 1B. Hero Desktop — Tetap dipertahankan untuk layar besar (>= 769px) */}
      {activeFarmPlants.length === 0 ? (
        <section
          className="card dash-hero-desktop"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 260px' }}>
            <PakCermatMascot pose="bibit" height={110} />
            <div>
              <h2 className="t-h2">Kebun ini belum memiliki tanaman</h2>
              <p className="t-small t-soft" style={{ marginTop: 4 }}>
                Tambahkan satu tanaman pertama agar CermatTani dapat memantau kematangan dan jadwal panennya.
              </p>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={() => setShowAddPlant(true)}>
            <Plus size={18} /> Tambah tanaman
          </button>
        </section>
      ) : (
        <section
          className="card dash-hero-desktop"
          style={{
            background:
              'radial-gradient(circle at 96% 12%, color-mix(in srgb, var(--cream-warm) 88%, transparent), transparent 48%), radial-gradient(circle at 4% 92%, color-mix(in srgb, var(--surface-milk) 72%, transparent), transparent 44%), var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            flexWrap: 'wrap',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 280px', minWidth: 0 }}>
            <CermoMascot
              pose={isDiseaseRisk ? 'worried' : readyToHarvestCount > 0 ? 'happy' : 'wave'}
              size={78}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span className="t-micro" style={{ color: 'var(--leaf-600)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={13} /> Analisis AI Gemini · Keputusan dalam 5 detik
              </span>
              <h2 className="t-h2" style={{ fontSize: 'clamp(1.125rem, 1.8vw, 1.35rem)', lineHeight: 1.25 }}>
                {readyToHarvestCount > 0
                  ? `Ada ${readyToHarvestCount} buah siap dipetik hari ini`
                  : 'Cek kesehatan & kematangan kebunmu'}
              </h2>
              <p className="t-small t-soft">
                Pindai buah, daun, atau batang untuk estimasi panen, solusi organik lebih dulu, dan saran pupuk.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 1 240px', width: '100%' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openScanWith('buah')}
                style={{ flex: 1 }}
              >
                <Camera size={18} /> Scan tanaman
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAddPlant(true)}
                title="Tambah tanaman baru"
                aria-label="Tambah tanaman baru"
                style={{ padding: '8px 12px', flexShrink: 0 }}
              >
                <Plus size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(['buah', 'daun', 'batang'] as const).map((part) => (
                <button
                  key={part}
                  type="button"
                  className="btn-ghost"
                  style={{
                    minHeight: 34,
                    padding: '4px 6px',
                    fontSize: '0.78rem',
                    textTransform: 'capitalize',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 9,
                  }}
                  onClick={() => openScanWith(part)}
                >
                  {part}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Peringatan Kritis (Hanya muncul bila ambang terlewati) */}
      {isDiseaseRisk && (
        <div className="alert-card alert-card--warn" role="alert" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <CermoMascot pose="worried" size={48} interactive={false} />
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong className="t-small" style={{ fontWeight: 700 }}>Risiko jamur daun meningkat</strong>
              <span className="pill pill-sim">Simulasi</span>
            </div>
            <p className="t-small t-soft" style={{ marginTop: 2 }}>
              Kelembapan udara {state.sensor.kelembapanUdara}% melewati batas {state.settings.ambangKelembapanRisikoPenyakit}%. Disarankan cek daun hari ini.
            </p>
          </div>
          <button type="button" className="btn-tomato" onClick={() => openScanWith('daun')}>
            Scan daun
          </button>
        </div>
      )}

      {isTankLow && (
        <div className="alert-card alert-card--bad" role="alert" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <CermoMascot pose="water" size={48} interactive={false} />
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong className="t-small" style={{ fontWeight: 700 }}>Tandon air kritis ({state.sensor.levelTandonPersen}%)</strong>
              <span className="pill pill-sim">Simulasi</span>
            </div>
            <p className="t-small t-soft" style={{ marginTop: 2 }}>
              Pengaman interlock menahan pompa agar tidak berjalan kering. Isi ulang tandon di halaman Lahan.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setActiveScreen('lahan')}>
            Buka Lahan
          </button>
        </div>
      )}

      {/* 2A. Baris KPI 2×2 Mobile — Identik dengan MetricCard3 di Flutter Mobile App (<= 768px) */}
      <section className="dash-kpi-mobile" aria-label="Metrik kebun mobile">
        <button
          type="button"
          className="app-metric-card app-metric-card--milk"
          onClick={() => setActiveScreen('lahan')}
        >
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--surface)', color: 'var(--leaf-600)' }}>
              <Droplets size={18} />
            </span>
            <span className="t-micro t-soft" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
              {isSoilDry ? 'Kering' : 'Ideal'}
            </span>
          </div>
          <div>
            <div className="kpi-value" style={{ fontSize: '1.5rem' }}>
              <AnimatedCounter value={state.sensor.kelembapanTanah} suffix="%" />
            </div>
            <div className="t-micro t-soft" style={{ marginTop: 2, fontWeight: 600 }}>
              Kelembapan tanah
            </div>
          </div>
        </button>

        <button
          type="button"
          className="app-metric-card app-metric-card--white"
          onClick={() => setActiveScreen('lahan')}
        >
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--surface-2)', color: 'var(--leaf-600)' }}>
              <Waves size={18} />
            </span>
            <span className="t-micro t-soft" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
              {isTankLow ? 'Kritis' : 'Aman'}
            </span>
          </div>
          <div>
            <div className="kpi-value" style={{ fontSize: '1.5rem' }}>
              <AnimatedCounter value={state.sensor.levelTandonPersen} suffix="%" />
            </div>
            <div className="t-micro t-soft" style={{ marginTop: 2, fontWeight: 600 }}>
              Level air tandon
            </div>
          </div>
        </button>

        <button
          type="button"
          className="app-metric-card app-metric-card--cream"
          onClick={() => setActiveScreen('energi')}
        >
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--surface)', color: 'var(--tomato-btn)' }}>
              <Sun size={18} />
            </span>
            <span className="t-micro t-soft" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
              {isPowerSave ? 'Hemat' : `${state.sensor.teganganVolt}V`}
            </span>
          </div>
          <div>
            <div className="kpi-value" style={{ fontSize: '1.5rem' }}>
              <AnimatedCounter value={state.sensor.bateraiPersen} suffix="%" />
            </div>
            <div className="t-micro t-soft" style={{ marginTop: 2, fontWeight: 600 }}>
              Baterai surya
            </div>
          </div>
        </button>

        <button
          type="button"
          className="app-metric-card app-metric-card--white"
          onClick={() => setActiveScreen('kalender')}
        >
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--surface-2)', color: 'var(--leaf-600)' }}>
              <CalendarDays size={18} />
            </span>
            <span className="t-micro t-soft" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
              {state.settings.pompaMenyala ? 'Pompa ON' : 'Siaga'}
            </span>
          </div>
          <div>
            <div className="kpi-value" style={{ fontSize: '1.5rem' }}>
              <AnimatedCounter value={upcomingHarvests.length} />
            </div>
            <div className="t-micro t-soft" style={{ marginTop: 2, fontWeight: 600 }}>
              Jadwal panen
            </div>
          </div>
        </button>
      </section>

      {/* 2B. Kartu Ringkasan Terpadu Desktop (>= 769px) — Lokasi, Suhu, 4 Metrik Sejajar & Busur Matahari */}
      {(() => {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        const sunriseMins = 5 * 60 + 45; // 05:45
        const sunsetMins = 17 * 60 + 55; // 17:55
        const sunT = Math.max(0.08, Math.min(0.92, (mins - sunriseMins) / (sunsetMins - sunriseMins)));
        const sunX = (1 - sunT) * (1 - sunT) * 14 + 2 * (1 - sunT) * sunT * 180 + sunT * sunT * 346;
        const sunY = (1 - sunT) * (1 - sunT) * 48 + 2 * (1 - sunT) * sunT * -6 + sunT * sunT * 48;
        const tempRounded = Math.round(state.sensor.suhuUdara);

        return (
          <section className="dash-climate-card dash-kpi-desktop stagger-card stagger-1" aria-label="Ringkasan utama kebun">
            {/* Baris Atas: Lokasi kebun di kiri, ikon awan lembut + suhu udara di kanan */}
            <div className="dash-climate-top">
              <div className="dash-climate-loc">
                <MapPin size={18} strokeWidth={1.85} className="dash-climate-pin" />
                <span>{activeFarm?.lokasi || activeFarm?.nama || 'Lahan Aktif'}</span>
              </div>

              <div className="dash-climate-temp-wrap">
                <svg
                  className="dash-climate-cloud"
                  viewBox="0 0 88 54"
                  width="68"
                  height="42"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="ctCloudGrad" x1="16" y1="8" x2="66" y2="50" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#F5FAFF" />
                      <stop offset="55%" stopColor="#DCEEFF" />
                      <stop offset="100%" stopColor="#C2DFFA" />
                    </linearGradient>
                    <radialGradient id="ctSunPeek" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFE17D" />
                      <stop offset="100%" stopColor="#F5B82E" stopOpacity="0.85" />
                    </radialGradient>
                    <filter id="ctCloudShadow" x="-15%" y="-15%" width="130%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7AA7D4" floodOpacity="0.24" />
                    </filter>
                  </defs>
                  {state.sensor.cahayaLux >= 18000 && (
                    <circle cx="58" cy="18" r="11" fill="url(#ctSunPeek)" />
                  )}
                  <path
                    d="M25 46H64C72.284 46 79 39.508 79 31.5C79 24.06 73.22 17.93 65.87 17.1C63.61 9.54 56.6 4 48.3 4C38.68 4 30.78 11.45 30.06 20.88C28.51 20.31 26.82 20 25 20C17.268 20 11 25.82 11 33C11 40.18 17.268 46 25 46Z"
                    fill="url(#ctCloudGrad)"
                    filter="url(#ctCloudShadow)"
                  />
                </svg>
                <span className="dash-climate-temp tabular-nums">
                  {tempRounded > 0 ? `+${tempRounded}` : tempRounded}°C
                </span>
              </div>
            </div>

            {/* Baris Tengah: 4 Metrik Utama Sejajar (ikon garis tipis, angka tebal, label lembut) */}
            <div className="dash-climate-metrics">
              <button
                type="button"
                className="dash-climate-metric"
                onClick={() => setActiveScreen('tanaman')}
              >
                <Sprout size={22} strokeWidth={1.65} className="dash-climate-icon" />
                <div className="dash-climate-val tabular-nums">
                  <AnimatedCounter value={activeFarmPlants.length} />
                  <span className="dash-climate-subval"> · {healthyPercent}% sehat</span>
                </div>
                <div className="dash-climate-label">Tanaman dipantau</div>
              </button>

              <button
                type="button"
                className="dash-climate-metric"
                onClick={() => setActiveScreen('kalender')}
              >
                <Sparkles size={22} strokeWidth={1.65} className="dash-climate-icon" />
                <div className="dash-climate-val tabular-nums">
                  <AnimatedCounter value={readyToHarvestCount} />
                  <span className="dash-climate-subval"> · ±{estimatedTotalKg} kg</span>
                </div>
                <div className="dash-climate-label">Buah siap dipetik</div>
              </button>

              <button
                type="button"
                className="dash-climate-metric"
                onClick={() => openScanWith('buah')}
              >
                <Camera size={22} strokeWidth={1.65} className="dash-climate-icon" />
                <div className="dash-climate-val tabular-nums">
                  <AnimatedCounter value={state.scans.length} />
                  <span className="dash-climate-subval">
                    {attentionCount > 0 ? ` · ${attentionCount} cek` : ' · AI'}
                  </span>
                </div>
                <div className="dash-climate-label">Riwayat scan AI</div>
              </button>

              <button
                type="button"
                className="dash-climate-metric"
                onClick={() => setActiveScreen('lahan')}
              >
                <Droplets size={22} strokeWidth={1.65} className="dash-climate-icon" />
                <div className="dash-climate-val tabular-nums">
                  <AnimatedCounter value={state.sensor.kelembapanTanah} suffix="%" />
                </div>
                <div className="dash-climate-label">Kelembapan tanah</div>
              </button>
            </div>

            {/* Baris Bawah: Busur Matahari Terbit — Terbenam */}
            <div className="dash-climate-sunrow">
              <div className="dash-climate-suntime">
                <strong className="tabular-nums">05:45</strong>
                <span>Terbit</span>
              </div>

              <svg
                className="dash-climate-arc"
                viewBox="0 0 360 56"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="ctArcSunGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F5B82E" stopOpacity="1" />
                    <stop offset="55%" stopColor="#F7C948" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#F7C948" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path
                  d="M 14 48 Q 180 -6 346 48"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.28"
                  strokeWidth="1.6"
                  strokeDasharray="3.5 4.5"
                  strokeLinecap="round"
                />
                <circle cx={sunX} cy={sunY} r="11" fill="url(#ctArcSunGlow)" />
                <circle cx={sunX} cy={sunY} r="4.2" fill="#F5B82E" />
              </svg>

              <div className="dash-climate-suntime dash-climate-suntime--right">
                <strong className="tabular-nums">17:55</strong>
                <span>Terbenam</span>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 3. Baris Bento Tengah Seimbang: Kondisi Lahan (+ Pintu Simulasi 3D) | Jadwal Panen Dekat */}
      <div className="dashboard-bento-row">
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <h3 className="t-h3">Kondisi lahan &amp; iklim</h3>
              <p className="t-micro t-soft" style={{ marginTop: 2 }}>Ringkasan sensor tanah, udara &amp; tandon</p>
            </div>
            <span className="pill pill-sim">Simulasi</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
            <StripedProgressBar
              label="Kelembapan tanah (ideal 45–65%)"
              valueLabel={`${state.sensor.kelembapanTanah}%`}
              percent={state.sensor.kelembapanTanah}
              color="var(--water)"
            />
            <StripedProgressBar
              label="Suhu udara lahan"
              valueLabel={`${state.sensor.suhuUdara} °C`}
              percent={Math.min(100, Math.round((state.sensor.suhuUdara / 40) * 100))}
              color="var(--fruit-ripe)"
            />
            <StripedProgressBar
              label="Kelembapan udara"
              valueLabel={`${state.sensor.kelembapanUdara}%`}
              percent={state.sensor.kelembapanUdara}
              color={isDiseaseRisk ? 'var(--bad-600)' : 'var(--leaf-500)'}
            />
            <StripedProgressBar
              label="Level air tandon"
              valueLabel={`${state.sensor.levelTandonPersen}%`}
              percent={state.sensor.levelTandonPersen}
              color={isTankLow ? 'var(--bad-600)' : 'var(--water-700)'}
            />
          </div>

          {/* Footer: NPK + Pintasan ke Simulasi Kebun 3D di halaman Lahan */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              paddingTop: 12,
              borderTop: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="pill pill-neutral tabular-nums">N {state.sensor.nitrogenMgKg}</span>
              <span className="pill pill-neutral tabular-nums">P {state.sensor.fosforMgKg}</span>
              <span className="pill pill-neutral tabular-nums">K {state.sensor.kaliumMgKg}</span>
              <span className="pill pill-ok tabular-nums">
                <Sun size={12} /> {state.sensor.bateraiPersen}%
              </span>
            </div>
            <div className="dash-land-cta-row">
              <button
                type="button"
                className="btn-primary dash-sim3d-btn"
                style={{ minHeight: 42, padding: '8px 14px', fontSize: '0.84rem', borderRadius: 13 }}
                onClick={() => setActiveScreen('lahan')}
              >
                <Box size={16} /> Buka Simulasi 3D Lahan
              </button>
              <button
                type="button"
                className="btn-secondary mobile-only-inline"
                style={{ minHeight: 42, padding: '8px 14px', fontSize: '0.84rem', borderRadius: 13 }}
                onClick={() => setActiveScreen('energi')}
              >
                <Zap size={16} color="var(--leaf-600)" /> Surya
              </button>
            </div>
          </div>
        </section>

        {/* Jadwal Panen Dekat — Kartu Aksen Mint Cerah (Krim Hangat di Mobile seperti App) */}
        <section className="card-forest dash-harvest-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <h3 className="t-h3" style={{ color: 'var(--ink)' }}>Jadwal panen dekat</h3>
              <p className="t-micro t-soft" style={{ marginTop: 2 }}>Estimasi petik &amp; pengingat otomatis</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveScreen('kalender')}
              className="btn-secondary"
              style={{
                minHeight: 32,
                borderRadius: 999,
                padding: '4px 12px',
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              Kalender
            </button>
          </div>

          {upcomingHarvests.length === 0 ? (
            <div style={{ margin: 'auto 0', padding: '16px 0' }}>
              <p className="t-small t-soft">
                Belum ada jadwal panen. Scan buah untuk menjadwalkan otomatis di kalender.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {upcomingHarvests.map((ev) => {
                const plant = state.plants.find((p) => p.id === ev.plantId);
                const isToday = ev.tanggal === new Date().toISOString().slice(0, 10);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setActiveScreen('kalender')}
                    className="card-interactive"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 13,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--ink)',
                    }}
                  >
                    <span
                      className="ripeness-dot"
                      style={{
                        width: 9,
                        height: 9,
                        background: isToday ? 'var(--fruit-ripe)' : 'var(--fruit-mid)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {plant?.nama || 'Tanaman'}
                      </div>
                      <div className="t-micro t-soft">
                        {isToday ? 'Hari ini — siap petik' : ev.tanggal}
                      </div>
                    </div>
                    <CalendarDays size={16} color="var(--leaf-600)" />
                  </button>
                );
              })}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              paddingTop: 10,
              borderTop: '1px solid var(--line)',
            }}
          >
            <span className="t-micro t-soft">
              {state.farms.length} kebun terdaftar
            </span>
            <button
              type="button"
              onClick={() => setShowAddFarm(true)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--leaf-700)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={14} /> Tambah kebun
            </button>
          </div>
        </section>
      </div>

      {/* 4. Baris Bento Bawah Seimbang: Tugas Harian | Aktivitas & Grafik Panen */}
      <div className="dashboard-bento-row">
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <h3 className="t-h3">Tugas kebun hari ini</h3>
              <p className="t-micro t-soft" style={{ marginTop: 2 }}>Langkah perawatan harian</p>
            </div>
            <span className="pill pill-ok tabular-nums">
              {farmTasks.filter((t) => t.selesai).length}/{farmTasks.length} selesai
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {farmTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  aria-label={`Tandai tugas ${t.judul}`}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 2,
                    color: t.selesai ? 'var(--leaf-600)' : 'var(--ink-soft)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {t.selesai ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="t-small"
                    style={{
                      fontWeight: 600,
                      textDecoration: t.selesai ? 'line-through' : 'none',
                      opacity: t.selesai ? 0.55 : 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.judul}
                  </div>
                  <span className="t-micro t-soft">{t.waktuLabel}</span>
                </div>
                {t.plantId && !t.selesai && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ minHeight: 30, padding: '2px 8px', fontSize: '0.78rem', flexShrink: 0 }}
                    onClick={() => openScanWith(t.kategori === 'cek' ? 'daun' : 'buah', t.plantId)}
                  >
                    Scan
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 8 }}>
            <input
              className="field-input"
              style={{ minHeight: 40, padding: '8px 12px', fontSize: '0.875rem' }}
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Tambah tugas baru..."
              aria-label="Tambah tugas baru"
            />
            <button type="submit" className="btn-secondary" style={{ minHeight: 40, padding: '6px 12px', flexShrink: 0 }} aria-label="Tambah tugas">
              <Plus size={16} />
            </button>
          </form>
        </section>

        {/* Aktivitas Terbaru & Grafik/Fase Tumbuh (Rapi dalam 1 Kartu Berimbang) */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h3 className="t-h3">
                {bottomTab === 'aktivitas' ? 'Aktivitas terbaru' : 'Perkiraan panen & fase'}
              </h3>
              <p className="t-micro t-soft" style={{ marginTop: 2 }}>
                {bottomTab === 'aktivitas'
                  ? 'Pintasan scan buah, daun & irigasi'
                  : 'Estimasi kasar mingguan & fase tumbuh'}
              </p>
            </div>

            <div className="seg-tabs" role="tablist" aria-label="Tampilan aktivitas atau grafik">
              <button
                type="button"
                role="tab"
                aria-selected={bottomTab === 'aktivitas'}
                className={`seg-tab ${bottomTab === 'aktivitas' ? 'active' : ''}`}
                onClick={() => setBottomTab('aktivitas')}
              >
                Aktivitas
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bottomTab === 'grafik'}
                className={`seg-tab ${bottomTab === 'grafik' ? 'active' : ''}`}
                onClick={() => setBottomTab('grafik')}
              >
                Grafik
              </button>
            </div>
          </div>

          {bottomTab === 'aktivitas' ? (
            <div key="tab-aktivitas" className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
              <button
                type="button"
                className="card-subtle card-interactive"
                onClick={() => openScanWith('buah')}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                }}
              >
                <span className="kpi-icon" style={{ background: 'rgba(242,86,43,0.12)', color: 'var(--tomato-btn)' }}>
                  <Camera size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-small" style={{ fontWeight: 700 }}>
                    {latestFruitScan?.anjuranPanen || 'Scan buah pertama'}
                  </div>
                  <div className="t-micro t-soft">
                    {latestFruitScan
                      ? `${latestFruitScan.jumlahBuah} buah terdeteksi`
                      : 'Cek kematangan & hari panen'}
                  </div>
                </div>
                <span className="pill pill-ok">
                  {latestFruitScan?.tahapDominan
                    ? RIPENESS_REFERENCE[latestFruitScan.tahapDominan].label
                    : 'Siap'}
                </span>
              </button>

              <button
                type="button"
                className="card-subtle card-interactive"
                onClick={() => openScanWith('daun')}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                }}
              >
                <span className="kpi-icon" style={{ background: 'var(--ok-bg)', color: 'var(--leaf-600)' }}>
                  <Leaf size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="t-small"
                    style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {latestLeafScan?.penyakitUtamaNama || 'Scan daun pertama'}
                  </div>
                  <div className="t-micro t-soft">
                    {latestLeafScan?.dugaanHaraNama || 'Deteksi penyakit & dugaan hara'}
                  </div>
                </div>
                <span
                  className={`pill ${latestLeafScan && latestLeafScan.penyakitUtamaId !== 'sehat' ? 'pill-warn' : 'pill-ok'
                    }`}
                >
                  {latestLeafScan
                    ? latestLeafScan.penyakitUtamaId === 'sehat'
                      ? 'Sehat'
                      : 'Cek'
                    : 'Siap'}
                </span>
              </button>

              <button
                type="button"
                className="card-subtle card-interactive"
                onClick={() => setActiveScreen('lahan')}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                }}
              >
                <span className="kpi-icon" style={{ background: 'var(--water-bg)', color: 'var(--water-700)' }}>
                  <Droplets size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-small" style={{ fontWeight: 700 }}>
                    Irigasi {state.settings.irigasiOtomatis ? 'otomatis' : 'manual'}
                  </div>
                  <div className="t-micro t-soft">
                    {state.irrigationEvents.length} siklus · Tandon {state.sensor.levelTandonPersen}%
                  </div>
                </div>
                <span className="pill pill-sim">
                  {state.settings.pompaMenyala ? 'Aktif' : 'Siaga'}
                </span>
              </button>
            </div>
          ) : (
            <div key="tab-grafik" className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="pill pill-warn">Estimasi kasar</span>
                <div className="seg-tabs">
                  <button
                    type="button"
                    className={`seg-tab ${chartMode === 'batang' ? 'active' : ''}`}
                    onClick={() => setChartMode('batang')}
                  >
                    Batang
                  </button>
                  <button
                    type="button"
                    className={`seg-tab ${chartMode === 'area' ? 'active' : ''}`}
                    onClick={() => setChartMode('area')}
                  >
                    Tren
                  </button>
                </div>
              </div>

              {chartMode === 'batang' ? (
                <ProductionBarChart data={weeklyYieldBars} unit=" kg" />
              ) : (
                <GreenAreaChart
                  points={weeklyYieldBars.map((d) => ({ label: d.label, value: d.value }))}
                  unit=" kg"
                  color="#1F9D55"
                />
              )}

              <div className="phase-grid-5">
                {PHASES.map((phase, idx) => {
                  const count = activeFarmPlants.filter((p) => p.fase === phase).length;
                  const dotColors = ['#5DBB63', '#1F9D55', '#FFB63D', '#F2562B', '#D63D12'];
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setActiveScreen('tanaman')}
                      style={{
                        border: '1px solid var(--line)',
                        background: 'var(--surface-2)',
                        borderRadius: 11,
                        padding: '8px 4px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <span
                        className="font-display tabular-nums"
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 600,
                          color: count > 0 ? dotColors[idx] : 'var(--ink-soft)',
                        }}
                      >
                        {count}
                      </span>
                      <span className="t-micro t-soft" style={{ fontSize: '0.7rem' }}>{phase}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal Tambah Tanaman */}
      {showAddPlant && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddPlant(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tambah tanaman baru"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="t-h2">Tambah tanaman baru</h2>
              <button type="button" className="icon-btn" onClick={() => setShowAddPlant(false)} aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddPlant} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-group">
                <label htmlFor="dash-plant-name" className="field-label">
                  Nama tanaman / petak
                </label>
                <input
                  id="dash-plant-name"
                  className="field-input"
                  placeholder="Contoh: Cabai Rawit #02, Terong Ungu #01, atau Selada #01"
                  value={plantNama}
                  onChange={(e) => setPlantNama(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="dash-plant-var" className="field-label">
                  Jenis / varietas (bisa semua tanaman)
                </label>
                <PlantSearchInput
                  id="dash-plant-var"
                  value={plantVarietas}
                  onChange={setPlantVarietas}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="dash-plant-phase" className="field-label">
                  Fase tumbuh
                </label>
                <select
                  id="dash-plant-phase"
                  className="field-select"
                  value={plantFase}
                  onChange={(e) => setPlantFase(e.target.value as GrowthPhase)}
                >
                  {PHASES.map((ph) => (
                    <option key={ph} value={ph}>
                      {ph}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Simpan tanaman
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kebun */}
      {showAddFarm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddFarm(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tambah kebun baru"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="t-h2">Tambah kebun baru</h2>
              <button type="button" className="icon-btn" onClick={() => setShowAddFarm(false)} aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFarm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-group">
                <label htmlFor="dash-farm-name" className="field-label">Nama kebun</label>
                <input
                  id="dash-farm-name"
                  className="field-input"
                  placeholder="Contoh: Greenhouse Blok B"
                  value={farmNama}
                  onChange={(e) => setFarmNama(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="dash-farm-loc" className="field-label">Lokasi</label>
                <input
                  id="dash-farm-loc"
                  className="field-input"
                  placeholder="Contoh: Lembang, Bandung"
                  value={farmLokasi}
                  onChange={(e) => setFarmLokasi(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary">
                Simpan kebun
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
