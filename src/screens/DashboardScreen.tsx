'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  CloudSun,
  Droplets,
  Leaf,
  Plus,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { GardenLandscapeIllustration } from '../components/Illustrations';
import {
  AnimatedCounter,
  GreenAreaChart,
  HealthSemiGauge,
  PercentageRing,
  ProductionBarChart,
} from '../components/Charts';
import { GrowthPhase } from '../types/cermattani';

const PHASES: GrowthPhase[] = ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];

/* Layar 2: Beranda — Desktop 3-kolom (Plant Monitor + Agri-cultur + FarmVista, DESIGN.md §6) */
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
    setActiveFarmId,
  } = useApp();

  const [chartMode, setChartMode] = useState<'batang' | 'area'>('batang');
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [farmNama, setFarmNama] = useState('');
  const [farmLokasi, setFarmLokasi] = useState('');

  // Hitung metrik kebun aktif
  const farmPlantIds = useMemo(() => new Set(activeFarmPlants.map((p) => p.id)), [activeFarmPlants]);
  const farmScans = useMemo(
    () => state.scans.filter((s) => farmPlantIds.has(s.plantId)),
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
    return Math.max(45, Math.round(((activeFarmPlants.length - attentionCount) / activeFarmPlants.length) * 100));
  }, [activeFarmPlants.length, attentionCount]);

  const ripenessAvgPercent = useMemo(() => {
    const fruitScans = farmScans.filter((s) => s.tahapDominan);
    if (fruitScans.length === 0) return 68;
    const scoreMap = { mentah: 35, setengah_matang: 70, matang: 98 };
    const avg =
      fruitScans.reduce((acc, s) => acc + scoreMap[s.tahapDominan!], 0) / fruitScans.length;
    return Math.round(avg);
  }, [farmScans]);

  const isDiseaseRisk =
    state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit;
  const isTankLow = state.sensor.levelTandonPersen < state.settings.ambangTandonRendah;

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
    addFarm(farmNama, farmLokasi, 'Kebun tomat');
    setFarmNama('');
    setFarmLokasi('');
    setShowAddFarm(false);
  };

  return (
    <div className="dashboard-layout">
      {/* Kolom Tengah: Hero Scan + 2-kolom konten */}
      <div className="dashboard-center">
        {/* Hero Scan (Cermo + tombol Scan selalu terlihat — DESIGN.md §2 prinsip 1) */}
        <section
          className="card stagger-card"
          style={{
            background:
              'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 65%, rgba(216,243,106,0.22) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: '1 1 300px' }}>
            <CermoMascot
              pose={isDiseaseRisk ? 'worried' : readyToHarvestCount > 0 ? 'happy' : 'wave'}
              size={104}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="pill pill-ok" style={{ alignSelf: 'flex-start' }}>
                <Sparkles size={14} /> Foto dulu, keputusan dalam 5 detik
              </span>
              <h2 className="t-h2">
                {readyToHarvestCount > 0
                  ? `Wah, ada ${readyToHarvestCount} tomat yang siap dipanen!`
                  : 'Halo! Yuk, cek tomatmu hari ini.'}
              </h2>
              <p className="t-small t-soft">
                Pilih bagian buah, daun, atau batang untuk tahu kapan panen, gejala penyakit, dan
                saran pupuk yang aman.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 210 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openScanWith('buah')}
              style={{ width: '100%' }}
            >
              <Camera size={20} strokeWidth={2} /> Scan tanaman
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, minHeight: 44, padding: '6px 10px', fontSize: '0.875rem' }}
                onClick={() => openScanWith('buah')}
              >
                Buah
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, minHeight: 44, padding: '6px 10px', fontSize: '0.875rem' }}
                onClick={() => openScanWith('daun')}
              >
                Daun
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, minHeight: 44, padding: '6px 10px', fontSize: '0.875rem' }}
                onClick={() => openScanWith('batang')}
              >
                Batang
              </button>
            </div>
          </div>
        </section>

        {/* Peringatan Risiko Penyakit F11 (HANYA tampil bila ambang terlewati — F11.3!) */}
        {isDiseaseRisk && (
          <div className="alert-card alert-card--warn stagger-card" role="alert">
            <CermoMascot pose="worried" size={56} interactive={false} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <strong className="t-h3">Risiko jamur daun meningkat!</strong>
                <span className="pill pill-sim">Simulasi</span>
              </div>
              <p className="t-small">
                Kelembapan udara mencapai <strong>{state.sensor.kelembapanUdara}%</strong> (melewati ambang{' '}
                {state.settings.ambangKelembapanRisikoPenyakit}%). Kondisi lembap tinggi rawan memicu busuk daun{' '}
                <em>Phytophthora infestans</em> (sumber: Balitsa Kementan RI).
              </p>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-tomato"
                  onClick={() => openScanWith('daun')}
                >
                  <Camera size={18} /> Scan penyakit sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Peringatan tandon rendah F12.2 */}
        {isTankLow && (
          <div className="alert-card alert-card--bad stagger-card" role="alert">
            <CermoMascot pose="water" size={56} interactive={false} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <strong className="t-h3">Tandon air hampir habis ({state.sensor.levelTandonPersen}%)</strong>
                <span className="pill pill-sim">Simulasi</span>
              </div>
              <p className="t-small">
                Tandon tinggal {state.sensor.levelTandonPersen}%. Pompa otomatis ditahan supaya tidak kering.
                Isi tandon dulu sebelum menyalakan irigasi.
              </p>
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setActiveScreen('lahan')}>
                  Buka monitor tandon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid 2 kolom bawah Hero sesuai DESIGN.md §6 */}
        <div className="dashboard-two-col">
          {/* Sub-kolom kiri: Fase tumbuh, Produksi/Hasil, Tabel tugas */}
          <div className="dashboard-col">
            {/* Fase tumbuh dengan avatar bulat terhubung (Plant Monitor) */}
            <section className="card stagger-card stagger-1">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 className="t-h3">Fase tumbuh tomat</h3>
                  <p className="t-small t-soft">Sebaran tanaman di {activeFarm?.nama}</p>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setActiveScreen('tanaman')}
                >
                  Lihat semua
                </button>
              </div>

              <div
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 24,
                    left: '10%',
                    right: '10%',
                    height: 3,
                    background: 'linear-gradient(90deg, #5DBB63, #FFB63D, #F2562B)',
                    borderRadius: 99,
                    opacity: 0.45,
                  }}
                />
                {PHASES.map((phase, idx) => {
                  const count = activeFarmPlants.filter((p) => p.fase === phase).length;
                  const dotColors = ['#5DBB63', '#1F9D55', '#FFB63D', '#F2562B', '#D63D12'];
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setActiveScreen('tanaman')}
                      style={{
                        position: 'relative',
                        border: 'none',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: count > 0 ? dotColors[idx] : 'var(--surface-2)',
                          color: count > 0 ? '#FFFFFF' : 'var(--ink-soft)',
                          border: '3px solid var(--surface)',
                          boxShadow: 'var(--shadow-card)',
                          display: 'grid',
                          placeItems: 'center',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          fontSize: '1.1rem',
                        }}
                      >
                        {count}
                      </div>
                      <span className="t-micro" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {phase}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Produksi / Estimasi hasil panen (Batang pastel persik + Area chart) */}
            <section className="card stagger-card stagger-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 className="t-h3">Perkiraan hasil panen</h3>
                    <span className="pill pill-warn">Estimasi kasar</span>
                  </div>
                  <p className="t-small t-soft">Dihitung dari jumlah buah pada foto scan × bobot rata-rata</p>
                </div>
                <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 12 }}>
                  <button
                    type="button"
                    onClick={() => setChartMode('batang')}
                    style={{
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      background: chartMode === 'batang' ? 'var(--surface)' : 'transparent',
                      color: chartMode === 'batang' ? 'var(--leaf-600)' : 'var(--ink-soft)',
                    }}
                  >
                    Batang
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('area')}
                    style={{
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      background: chartMode === 'area' ? 'var(--surface)' : 'transparent',
                      color: chartMode === 'area' ? 'var(--leaf-600)' : 'var(--ink-soft)',
                    }}
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
            </section>

            {/* Tabel tugas (FarmVista) */}
            <section className="card stagger-card stagger-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 className="t-h3">Daftar tugas kebun</h3>
                  <p className="t-small t-soft">Langkah harian agar panen tepat waktu</p>
                </div>
                <span className="pill pill-neutral tabular-nums">
                  {farmTasks.filter((t) => t.selesai).length}/{farmTasks.length} selesai
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {farmTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: 'var(--surface-2)',
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
                        padding: 4,
                        color: t.selesai ? 'var(--leaf-600)' : 'var(--ink-soft)',
                        minWidth: 36,
                        minHeight: 36,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {t.selesai ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          textDecoration: t.selesai ? 'line-through' : 'none',
                          opacity: t.selesai ? 0.6 : 1,
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
                        style={{ minHeight: 40, padding: '4px 10px', fontSize: '0.8125rem' }}
                        onClick={() => openScanWith(t.kategori === 'cek' ? 'daun' : 'buah', t.plantId)}
                      >
                        Scan
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <input
                  className="field-input"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Tambah tugas cepat (mis. cek daun bawah)..."
                  aria-label="Tambah tugas baru"
                />
                <button type="submit" className="btn-secondary" style={{ flexShrink: 0 }}>
                  <Plus size={18} /> Tambah
                </button>
              </form>
            </section>
          </div>

          {/* Sub-kolom kanan: Kartu metrik x3 (Lime, Putih, Forest), Gauge statistik, Cuaca mikro */}
          <div className="dashboard-col">
            {/* 3 Varian Kartu Metrik (DESIGN.md §7) */}
            <section className="metrics-grid-3 stagger-card stagger-1" aria-label="Ringkasan kebun">
              <div className="metric-card metric-card--lime">
                <div className="metric-icon-circle">
                  <Sparkles size={20} strokeWidth={1.75} />
                </div>
                <div className="metric-value">
                  <AnimatedCounter value={readyToHarvestCount} />
                </div>
                <div className="metric-label">Buah siap panen</div>
              </div>

              <div className="metric-card metric-card--white">
                <div className="metric-icon-circle">
                  <Sprout size={20} strokeWidth={1.75} />
                </div>
                <div className="metric-value">
                  <AnimatedCounter value={activeFarmPlants.length} />
                </div>
                <div className="metric-label">Tanaman aktif</div>
              </div>

              <div className="metric-card metric-card--forest">
                <div className="metric-icon-circle">
                  <AlertTriangle size={20} strokeWidth={1.75} />
                </div>
                <div className="metric-value">
                  <AnimatedCounter value={attentionCount} />
                </div>
                <div className="metric-label">Perlu dicek</div>
              </div>
            </section>

            {/* Gauge statistik (--forest-900 penekanan) + Cincin persentase Agri-cultur */}
            <section className="card-forest stagger-card stagger-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 className="t-h3">Kesehatan & kematangan</h3>
                <span className="pill" style={{ background: 'rgba(216,243,106,0.18)', color: '#D8F36A' }}>
                  Ringkasan scan
                </span>
              </div>

              <HealthSemiGauge value={healthyPercent} subtitle="Tanaman terpantau sehat" />

              <hr style={{ border: 'none', height: 1, background: 'rgba(255,255,255,0.14)', margin: '18px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <PercentageRing percent={ripenessAvgPercent} label="Kematangan" color="#F2562B" darkBg />
                <PercentageRing percent={state.sensor.kelembapanTanah} label="Tanah" color="#2B8FD9" darkBg />
                <PercentageRing percent={state.sensor.bateraiPersen} label="Surya" color="#D8F36A" darkBg />
              </div>
            </section>

            {/* Cuaca mikro & sensor lahan (Agri-cultur + F8/F11) */}
            <section className="card stagger-card stagger-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CloudSun size={22} strokeWidth={1.75} color="var(--leaf-600)" />
                  <h3 className="t-h3">Cuaca mikro lahan</h3>
                </div>
                <span className="pill pill-sim">Simulasi</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div className="card-subtle">
                  <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Thermometer size={14} /> Suhu udara
                  </div>
                  <div className="font-display tabular-nums" style={{ fontSize: '1.5rem', marginTop: 4 }}>
                    {state.sensor.suhuUdara} °C
                  </div>
                </div>

                <div className="card-subtle">
                  <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Droplets size={14} /> Kelembapan udara
                  </div>
                  <div
                    className="font-display tabular-nums"
                    style={{
                      fontSize: '1.5rem',
                      marginTop: 4,
                      color: isDiseaseRisk ? 'var(--bad)' : 'var(--ink)',
                    }}
                  >
                    {state.sensor.kelembapanUdara}%
                  </div>
                </div>

                <div className="card-subtle">
                  <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Leaf size={14} /> Kelembapan tanah
                  </div>
                  <div className="font-display tabular-nums" style={{ fontSize: '1.5rem', marginTop: 4 }}>
                    {state.sensor.kelembapanTanah}%
                  </div>
                </div>

                <div className="card-subtle">
                  <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Sun size={14} /> Cahaya (BH1750)
                  </div>
                  <div className="font-display tabular-nums" style={{ fontSize: '1.5rem', marginTop: 4 }}>
                    {(state.sensor.cahayaLux / 1000).toFixed(1)}k lux
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', marginTop: 14 }}
                onClick={() => setActiveScreen('lahan')}
              >
                Kelola sensor, irigasi & tandon
              </button>
            </section>
          </div>
        </div>
      </div>

      {/* Panel Kanan Desktop (Tablet pindah ke bawah sebagai kartu — DESIGN.md §6) */}
      <aside className="dashboard-right-panel" aria-label="Ilustrasi kebun dan jadwal panen">
        {/* Panel ilustrasi kebun + Jadwal panen (gelap --forest-900) */}
        <div className="card-forest stagger-card stagger-2" style={{ padding: 16 }}>
          <GardenLandscapeIllustration height={164} />

          <div style={{ padding: '16px 6px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="t-h3" style={{ color: '#FFFFFF' }}>
                Jadwal panen dekat
              </h3>
              <button
                type="button"
                onClick={() => setActiveScreen('kalender')}
                style={{
                  border: 'none',
                  background: 'rgba(216,243,106,0.16)',
                  color: '#D8F36A',
                  borderRadius: '999px',
                  padding: '6px 12px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Kalender
              </button>
            </div>

            {upcomingHarvests.length === 0 ? (
              <p className="t-small" style={{ color: 'rgba(234,245,238,0.8)' }}>
                Belum ada jadwal panen. Scan buah tomat untuk menjadwalkan otomatis.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingHarvests.map((ev) => {
                  const plant = state.plants.find((p) => p.id === ev.plantId);
                  const isToday = ev.tanggal === new Date().toISOString().slice(0, 10);
                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: 'rgba(255,255,255,0.09)',
                        borderRadius: 16,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span
                        className="ripeness-dot"
                        style={{
                          width: 12,
                          height: 12,
                          background: isToday ? '#F2562B' : '#FFB63D',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                          {plant?.nama || 'Tomat'}
                        </div>
                        <div className="t-micro" style={{ color: 'rgba(234,245,238,0.78)' }}>
                          {isToday ? 'Hari ini — siap petik' : ev.tanggal}
                        </div>
                      </div>
                      <CalendarDays size={18} color="#D8F36A" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Kartu Kelola Banyak Kebun (X1) */}
        <div className="card stagger-card stagger-3" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="t-h3">Kelola banyak kebun</h3>
            <button
              type="button"
              className="btn-ghost"
              style={{ minHeight: 40, padding: '4px 10px' }}
              onClick={() => setShowAddFarm((v) => !v)}
            >
              <Plus size={16} /> Kebun
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.farms.map((f) => {
              const isSelected = f.id === activeFarm?.id;
              const pCount = state.plants.filter((p) => p.farmId === f.id).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFarmId(f.id)}
                  style={{
                    border: isSelected ? '2px solid var(--leaf-600)' : '1px solid var(--line)',
                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                    borderRadius: 16,
                    padding: '12px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{f.nama}</div>
                    <div className="t-micro t-soft">{f.lokasi}</div>
                  </div>
                  <span className="pill pill-ok">{pCount} tanaman</span>
                </button>
              );
            })}
          </div>

          {showAddFarm && (
            <form onSubmit={handleCreateFarm} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <input
                className="field-input"
                placeholder="Nama kebun baru"
                value={farmNama}
                onChange={(e) => setFarmNama(e.target.value)}
                required
              />
              <input
                className="field-input"
                placeholder="Lokasi (mis. Lembang)"
                value={farmLokasi}
                onChange={(e) => setFarmLokasi(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                Simpan kebun
              </button>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
};
