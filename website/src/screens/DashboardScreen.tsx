'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Cloud,
  CloudDrizzle,
  CloudSun,
  Circle,
  Droplets,
  MapPin,
  MessageCircle,
  Moon,
  Plus,
  Sparkles,
  Sprout,
  Sun,
  Waves,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { SunArcPanel } from '../components/SunArcPanel';
import { CermoMascot } from '../components/CermoMascot';
import { PakCermatMascot } from '../components/PakCermatMascot';
import { AnimatedCounter } from '../components/Charts';
import { PlantSearchInput } from '../components/PlantSearchInput';
import { GrowthPhase } from '../types/cermattani';

const PHASES: GrowthPhase[] = ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];

/* Beranda — Ringan 100% tanpa WebGL (Simulasi 3D punya halaman sendiri /simulasi; data sensor detail ada di halaman Lahan) */
export const DashboardScreen: React.FC = () => {
  const {
    state,
    activeFarm,
    activeFarmPlants,
    openScanWith,
    setActiveScreen,
    toggleTask,
    addTask,
    addPlant,
  } = useApp();

  const [newTaskText, setNewTaskText] = useState('');

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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    addTask(newTaskText, 'cek', 'Hari ini');
    setNewTaskText('');
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
                  ? 'Siap pindai foto buah atau daun dengan AI hari ini?'
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
                <Sparkles size={13} /> Analisis AI · Keputusan dalam 5 detik
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
          </div>
        </section>
      )}

      {/* Peringatan Kritis (Hanya muncul bila ambang terlewati) — risiko jamur cukup ditandai di kotak Kelembapan udara */}
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

      {/* 2B. Kartu Ringkasan Terpadu Desktop (>= 769px) — Lokasi & cuaca, 4 metrik bertingkat, busur matahari */}
      {(() => {
        const now = new Date();
        const mins = now.getHours() * 60 + now.getMinutes();
        const sunriseMins = 5 * 60 + 45; // 05:45
        const sunsetMins = 17 * 60 + 55; // 17:55
        const isDaytime = mins >= sunriseMins && mins <= sunsetMins;
        const lux = state.sensor.cahayaLux;
        const condition = !isDaytime ? 'Malam' : lux >= 18000 ? 'Cerah' : lux >= 8000 ? 'Berawan' : 'Mendung';
        const CondIcon = !isDaytime ? Moon : lux >= 18000 ? Sun : lux >= 8000 ? CloudSun : Cloud;
        const tempRounded = Math.round(state.sensor.suhuUdara);
        const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

        const soilLow = state.sensor.kelembapanTanah < state.settings.ambangTanahBawah;
        const metrics = [
          {
            id: 'tanaman',
            icon: <Sprout size={18} />,
            tone: 'leaf',
            value: <AnimatedCounter value={activeFarmPlants.length} />,
            unit: 'tanaman',
            label: 'Tanaman dipantau',
            status: { text: `${healthyPercent}% sehat`, cls: healthyPercent >= 70 ? 'pill-ok' : 'pill-warn' },
            bar: healthyPercent,
            mark: null as number | null,
            go: 'tanaman' as const,
          },
          {
            id: 'tandon',
            icon: <Waves size={18} />,
            tone: 'water',
            value: <AnimatedCounter value={state.sensor.levelTandonPersen} suffix="%" />,
            unit: `≈ ${Math.round((state.sensor.levelTandonPersen / 100) * state.sensor.kapasitasTandonLiter)} L`,
            label: 'Level air tandon',
            status: isTankLow ? { text: 'Kritis', cls: 'pill-bad' } : { text: 'Aman', cls: 'pill-water' },
            bar: state.sensor.levelTandonPersen,
            mark: state.settings.ambangTandonRendah,
            go: 'lahan' as const,
          },
          {
            id: 'udara',
            icon: <CloudDrizzle size={18} />,
            tone: 'sky',
            value: <AnimatedCounter value={state.sensor.kelembapanUdara} suffix="%" />,
            unit: `${state.sensor.suhuUdara}°C`,
            label: 'Kelembapan udara',
            status: isDiseaseRisk ? { text: 'Risiko jamur', cls: 'pill-warn' } : { text: 'Normal', cls: 'pill-ok' },
            bar: state.sensor.kelembapanUdara,
            mark: state.settings.ambangKelembapanRisikoPenyakit,
            go: 'lahan' as const,
          },
          {
            id: 'tanah',
            icon: <Droplets size={18} />,
            tone: 'soil',
            value: <AnimatedCounter value={state.sensor.kelembapanTanah} suffix="%" />,
            unit: `ideal ${state.settings.ambangTanahBawah}–${state.settings.ambangTanahAtas}%`,
            label: 'Kelembapan tanah',
            status: soilLow ? { text: 'Kering', cls: 'pill-warn' } : { text: 'Ideal', cls: 'pill-ok' },
            bar: state.sensor.kelembapanTanah,
            mark: state.settings.ambangTanahBawah,
            go: 'lahan' as const,
          },
        ];

        return (
          <>
          <section className="dash-climate-card dash-kpi-desktop stagger-card stagger-1" aria-label="Ringkasan utama kebun">
            {/* Baris atas: lokasi + tanggal (kiri) · kondisi cuaca & suhu (kanan) */}
            <div className="dash-climate-top">
              <div className="dash-climate-place">
                <div className="dash-climate-loc">
                  <MapPin size={17} strokeWidth={1.9} className="dash-climate-pin" />
                  <span>{activeFarm?.lokasi || activeFarm?.nama || 'Lahan aktif'}</span>
                </div>
                <span className="dash-climate-date">
                  {dateLabel} · {activeFarm?.nama || 'Kebun aktif'}
                </span>
              </div>

              <div className="dash-climate-weather">
                <span className={`dash-climate-cond-icon dash-climate-cond-icon--${condition.toLowerCase()}`}>
                  <CondIcon size={24} strokeWidth={1.8} />
                </span>
                <div className="dash-climate-weather-text">
                  <span className="dash-climate-temp tabular-nums">
                    {tempRounded > 0 ? `+${tempRounded}` : tempRounded}°C
                  </span>
                  <span className="dash-climate-cond">
                    {condition} · {lux.toLocaleString('id-ID')} lux
                  </span>
                </div>
              </div>
            </div>

            {/* Kotak matahari: animasi matahari meluncur, jam berjalan & geser busur untuk fase cahaya */}
            <SunArcPanel />
          </section>

            {/* 3. Baris bersebelahan: kondisi kebun (4 metrik 2×2) | tugas kebun hari ini */}
            <div className="dash-split-row">
              <section className="card dash-metrics-card dash-kpi-desktop" aria-label="Kondisi kebun">
                <div className="dash-metrics-head">
                  <div>
                    <h3 className="t-h3">Kondisi kebun</h3>
                    <p className="t-micro t-soft" style={{ marginTop: 2 }}>
                      Sensor ESP32 · klik kotak untuk detail
                    </p>
                  </div>
                </div>
                {/* 4 metrik dalam kotak seragam (ikon berwarna, angka, status, bar level) */}
                <div className="dash-climate-metrics">
                  {metrics.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="dash-climate-metric"
                      onClick={() => setActiveScreen(m.go)}
                    >
                      <div className="dash-climate-metric-head">
                        <span className={`dash-climate-chip dash-climate-chip--${m.tone}`}>{m.icon}</span>
                        <span className={`pill ${m.status.cls} dash-climate-pill`}>{m.status.text}</span>
                      </div>
                      <div className="dash-climate-val tabular-nums">
                        {m.value}
                        <span className="dash-climate-subval">{m.unit}</span>
                      </div>
                      <div className="dash-climate-label">{m.label}</div>
                      <div className={`dash-climate-bar dash-climate-bar--${m.tone}`} aria-hidden="true">
                        <span style={{ width: `${Math.max(0, Math.min(100, m.bar))}%` }} />
                        {m.mark !== null && <i style={{ left: `${m.mark}%` }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card dash-tasks-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            </div>
          </>
        );
      })()}

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

    </div>
  );
};
