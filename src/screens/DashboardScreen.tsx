'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  CloudSun,
  Leaf,
  Plus,
  Sparkles,
  Sprout,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { PakCermatMascot } from '../components/PakCermatMascot';
import {
  AgrovaFarmMap,
  IrrigationSoilVisual,
} from '../components/Illustrations';
import {
  AnimatedCounter,
  GreenAreaChart,
  HealthSemiGauge,
  PercentageRing,
  ProductionBarChart,
  StripedProgressBar,
} from '../components/Charts';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { GrowthPhase } from '../types/cermattani';

const PHASES: GrowthPhase[] = ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];

/* Layar Beranda Aplikasi — 100% sesuai DESIGN.md v2.0 §5.1, §6.3, §6.6, §6.7, §8.3, §9.2 */
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
    setActiveFarmId,
  } = useApp();

  const [chartMode, setChartMode] = useState<'batang' | 'area'>('batang');
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [farmNama, setFarmNama] = useState('');
  const [farmLokasi, setFarmLokasi] = useState('');

  const [showAddPlant, setShowAddPlant] = useState(false);
  const [plantNama, setPlantNama] = useState('');
  const [plantVarietas, setPlantVarietas] = useState('Servo F1');
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

  const ripenessAvgPercent = useMemo(() => {
    const fruitScans = farmScans.filter((s) => s.tahapDominan);
    if (fruitScans.length === 0) return 0;
    const scoreMap = { mentah: 35, setengah_matang: 70, matang: 96 };
    const avg = fruitScans.reduce((acc, s) => acc + scoreMap[s.tahapDominan!], 0) / fruitScans.length;
    return Math.round(avg);
  }, [farmScans]);

  const estimatedTotalKg = useMemo(() => {
    const grams = farmScans.reduce((sum, s) => sum + (s.estimasiBobotGram || 0), 0);
    return Number((grams / 1000).toFixed(2));
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
      varietas: plantVarietas,
      tanggalTanam: new Date().toISOString().slice(0, 10),
      fase: plantFase,
    });
    setPlantNama('');
    setShowAddPlant(false);
  };

  const ripePinLabel = latestFruitScan?.tahapDominan
    ? `${RIPENESS_REFERENCE[latestFruitScan.tahapDominan].label}: ${latestFruitScan.keyakinan}%`
    : 'Belum ada scan buah';

  return (
    <div className="dashboard-layout">
      {/* AREA UTAMA TENGAH */}
      <div className="dashboard-center">
        {/* Baris Pil Penghitung + Tombol Gelap Panah Bulat "+ Tambah tanaman" (Agrova §5.1 & §6.1) */}
        <div className="status-strip">
          <div className="status-strip-pills">
            <span className="status-chip-solid tabular-nums">
              <CheckCircle2 size={15} /> Scan selesai: {state.scans.length}
            </span>
            <button
              type="button"
              className="status-chip-surface tabular-nums"
              onClick={() => setActiveScreen('tanaman')}
              style={{ cursor: 'pointer' }}
            >
              <span
                className="ripeness-dot"
                style={{ background: attentionCount > 0 ? 'var(--warn)' : 'var(--ok)' }}
              />
              Perlu perhatian: {attentionCount}
            </button>
            <button
              type="button"
              className="status-chip-surface tabular-nums"
              onClick={() => setActiveScreen('kalender')}
              style={{ cursor: 'pointer' }}
            >
              <span className="ripeness-dot" style={{ background: 'var(--fruit-ripe)' }} />
              Siap panen: {readyToHarvestCount} buah
            </button>
          </div>

          <button type="button" className="ct-btn-dark" onClick={() => setShowAddPlant(true)}>
            <span>+ Tambah tanaman</span>
            <span className="ct-btn-dark-circle">
              <ArrowUpRight size={17} />
            </span>
          </button>
        </div>

        {/* Keadaan Kosong (§9.2): Pak Cermat menanam bibit + 1 tombol */}
        {activeFarmPlants.length === 0 ? (
          <section
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <PakCermatMascot pose="bibit" height={140} />
              <div>
                <h2 className="t-h1">Kebun ini belum memiliki tanaman</h2>
                <p className="t-body t-soft" style={{ marginTop: 6 }}>
                  Tambahkan satu tanaman pertama agar Cermo dapat memantau kematangan dan jadwal panennya.
                </p>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={() => setShowAddPlant(true)}>
              <Plus size={18} /> Tambah tanaman pertama
            </button>
          </section>
        ) : (
          /* Hero Scan bersama Cermo si Tomat (HANYA Cermo di kartu ini per §8.3) */
          <section
            className="card"
            style={{
              background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 64%, rgba(216,243,106,0.22) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: '1 1 310px' }}>
              <CermoMascot
                pose={isDiseaseRisk ? 'worried' : readyToHarvestCount > 0 ? 'happy' : 'wave'}
                size={96}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="pill pill-ok" style={{ alignSelf: 'flex-start' }}>
                  <Sparkles size={13} /> Foto dulu, keputusan dalam 5 detik
                </span>
                <h2 className="t-h2">
                  {readyToHarvestCount > 0
                    ? `Wah, ada ${readyToHarvestCount} buah siap dipanen!`
                    : 'Halo! Yuk, cek tanaman kebunmu hari ini.'}
                </h2>
                <p className="t-small t-soft">
                  Pilih bagian buah, daun, atau batang untuk tahu kapan panen, solusi organik lebih
                  dulu, dan saran pupuk yang aman.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 215 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openScanWith('buah')}
                style={{ width: '100%' }}
              >
                <Camera size={20} strokeWidth={2} /> Scan tanaman
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['buah', 'daun', 'batang'] as const).map((part) => (
                  <button
                    key={part}
                    type="button"
                    className="btn-secondary"
                    style={{
                      minHeight: 42,
                      padding: '6px 8px',
                      fontSize: '0.84rem',
                      textTransform: 'capitalize',
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

        {/* Peringatan Risiko Penyakit F11 (HANYA tampil bila ambang terlewati) */}
        {isDiseaseRisk && (
          <div className="alert-card alert-card--warn" role="alert">
            <CermoMascot pose="worried" size={56} interactive={false} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <strong className="t-h3">Risiko jamur daun meningkat!</strong>
                <span className="pill pill-sim">Simulasi</span>
              </div>
              <p className="t-small">
                Kelembapan udara mencapai <strong>{state.sensor.kelembapanUdara}%</strong> (melewati batas{' '}
                {state.settings.ambangKelembapanRisikoPenyakit}%). Scan daun hari ini untuk pencegahan dini.
              </p>
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn-tomato" onClick={() => openScanWith('daun')}>
                  <Camera size={18} /> Scan daun sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Peringatan Tandon Kritis F12.2 */}
        {isTankLow && (
          <div className="alert-card alert-card--bad" role="alert">
            <CermoMascot pose="water" size={56} interactive={false} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <strong className="t-h3">Tandon tinggal {state.sensor.levelTandonPersen}%</strong>
                <span className="pill pill-sim">Simulasi</span>
              </div>
              <p className="t-small">
                Tandon tinggal {state.sensor.levelTandonPersen}%. Pompa kutahan dulu supaya tidak kering.
              </p>
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setActiveScreen('lahan')}>
                  Buka monitor tandon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4 Ubin Statistik Agrova (§6.6) */}
        <section className="stat-tiles-4" aria-label="Ringkasan statistik kebun">
          <div className="stat-tile">
            <span className="t-small t-soft">Tanaman</span>
            <span className="stat-tile-value">{activeFarmPlants.length}</span>
            <span className="t-micro t-soft">petak tercatat</span>
          </div>
          <div className="stat-tile">
            <span className="t-small t-soft">Kebun</span>
            <span className="stat-tile-value">{state.farms.length}</span>
            <span className="t-micro t-soft">{activeFarm?.luasLabel || 'lahan aktif'}</span>
          </div>
          <div className="stat-tile">
            <span className="t-small t-soft">Scan bulan ini</span>
            <span className="stat-tile-value">{state.scans.length}</span>
            <span className="t-micro t-soft">riwayat tersimpan</span>
          </div>
          <div className="stat-tile">
            <span className="t-small t-soft">Kelembapan</span>
            <span className="stat-tile-value">{state.sensor.kelembapanTanah}%</span>
            <span className="t-micro" style={{ color: 'var(--sim-600)' }}>● Simulasi</span>
          </div>
        </section>

        {/* 3 Kartu Metrik Varian (Plant Monitor §6.3: Lime sorot, Putih, Forest penekanan) */}
        <section className="metrics-grid-3" aria-label="Metrik utama kebun">
          <div className="metric-card metric-card--lime">
            <div className="metric-top-row">
              <div className="metric-icon-circle">
                <Sparkles size={20} strokeWidth={1.75} />
              </div>
              <span className="t-micro" style={{ fontWeight: 700 }}>Panen siap</span>
            </div>
            <div className="metric-value">
              <AnimatedCounter value={readyToHarvestCount} />
            </div>
            <div className="metric-label">Buah siap dipetik</div>
          </div>

          <div className="metric-card metric-card--white">
            <div className="metric-top-row">
              <div className="metric-icon-circle">
                <Sprout size={20} strokeWidth={1.75} />
              </div>
              <span className="pill pill-ok">{healthyPercent}% sehat</span>
            </div>
            <div className="metric-value">
              <AnimatedCounter value={activeFarmPlants.length} />
            </div>
            <div className="metric-label">Tanaman dipantau</div>
          </div>

          <div className="metric-card metric-card--forest">
            <div className="metric-top-row">
              <div className="metric-icon-circle">
                <Leaf size={20} strokeWidth={1.75} />
              </div>
              <span className="pill" style={{ background: 'rgba(255,255,255,0.14)', color: '#FFFFFF' }}>
                Estimasi kasar
              </span>
            </div>
            <div className="metric-value">
              ± <AnimatedCounter value={estimatedTotalKg} decimals={1} suffix=" kg" />
            </div>
            <div className="metric-label" style={{ color: '#CFE6D8' }}>Perkiraan hasil panen</div>
          </div>
        </section>

        {/* Bento Row: Kartu Kesehatan Tanah (--forest-900 §6.6) + Gauge & Cuaca Mikro */}
        <div className="dashboard-bento-row">
          <section className="card-forest" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <h3 className="t-h3" style={{ color: '#FFFFFF' }}>Kesehatan tanah &amp; unsur hara</h3>
                <p className="t-small t-soft">Kelembapan tanah &amp; N, P, K (mg/kg)</p>
              </div>
              <span className="pill pill-sim">Simulasi</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1 }}>
              <StripedProgressBar
                label="Kelembapan tanah"
                valueLabel={`${state.sensor.kelembapanTanah}%`}
                percent={state.sensor.kelembapanTanah}
                color="#2B8FD9"
                darkBg
              />
              <StripedProgressBar
                label="Nitrogen (N)"
                valueLabel={`${state.sensor.nitrogenMgKg} mg/kg`}
                percent={Math.min(100, Math.round((state.sensor.nitrogenMgKg / 80) * 100))}
                color="#D8F36A"
                darkBg
              />
              <StripedProgressBar
                label="Fosfor (P)"
                valueLabel={`${state.sensor.fosforMgKg} mg/kg`}
                percent={Math.min(100, Math.round((state.sensor.fosforMgKg / 60) * 100))}
                color="#FFB63D"
                darkBg
              />
              <StripedProgressBar
                label="Kalium (K)"
                valueLabel={`${state.sensor.kaliumMgKg} mg/kg`}
                percent={Math.min(100, Math.round((state.sensor.kaliumMgKg / 90) * 100))}
                color="#3DBE74"
                darkBg
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveScreen('lahan')}
              style={{
                border: '1px solid rgba(216,243,106,0.34)',
                background: 'rgba(216,243,106,0.14)',
                color: '#D8F36A',
                borderRadius: 14,
                minHeight: 46,
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              Kelola pompa air &amp; tandon <ArrowUpRight size={16} />
            </button>
          </section>

          {/* Gauge Kesiapan & Cuaca Mikro (§6.6) */}
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CloudSun size={20} color="var(--leaf-600)" />
                <h3 className="t-h3">Gauge &amp; cuaca mikro</h3>
              </div>
              <span className="pill pill-sim">Simulasi</span>
            </div>

            <div
              style={{
                background: 'var(--forest-900)',
                color: '#FFFFFF',
                borderRadius: 20,
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <HealthSemiGauge value={healthyPercent} subtitle="Kesehatan kebun" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                <PercentageRing percent={ripenessAvgPercent} label="Matang" color="#F2562B" size={58} darkBg />
                <PercentageRing percent={state.sensor.kelembapanTanah} label="Tanah" color="#2B8FD9" size={58} darkBg />
                <PercentageRing percent={state.sensor.levelTandonPersen} label="Tandon" color="#7CC7FF" size={58} darkBg />
                <PercentageRing percent={state.sensor.bateraiPersen} label="Surya" color="#D8F36A" size={58} darkBg />
              </div>
            </div>

            {/* Suhu gradasi --leaf-500 -> --sun-400 + kelembapan & cahaya (§6.6) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="t-small t-soft">Suhu udara lahan</span>
                  <strong className="t-small tabular-nums">{state.sensor.suhuUdara} °C</strong>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 10,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #1F9D55 0%, #FFB63D 100%)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: `${Math.min(94, Math.max(6, (state.sensor.suhuUdara / 40) * 100))}%`,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      border: '3px solid #14302A',
                      transform: 'translateX(-50%)',
                    }}
                  />
                </div>
              </div>
              <StripedProgressBar
                label="Kelembapan udara"
                valueLabel={`${state.sensor.kelembapanUdara}%`}
                percent={state.sensor.kelembapanUdara}
                color={isDiseaseRisk ? '#C62F36' : '#1F9D55'}
              />
              <StripedProgressBar
                label="Cahaya siang"
                valueLabel={`${(state.sensor.cahayaLux / 1000).toFixed(1)}k lux`}
                percent={Math.min(100, Math.round((state.sensor.cahayaLux / 50000) * 100))}
                color="#FFB63D"
              />
            </div>
          </section>
        </div>

        {/* 3 Kartu Foto Tugas Bersematan Status (Agrova §6.3) */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div>
              <h3 className="t-h3">Aktivitas terakhir kebun</h3>
              <p className="t-small t-soft">Scan buah, scan daun, dan siklus pompa air terbaru</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setActiveScreen('tanaman')}>
              Semua riwayat <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="activity-photo-grid">
            <button type="button" className="activity-photo-card" onClick={() => openScanWith('buah')}>
              <div className="activity-photo-media">
                {latestFruitScan ? (
                  <img
                    src={latestFruitScan.fotoUrl}
                    alt="Scan buah terakhir"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#FFFFFF' }}>
                    <Camera size={28} />
                  </div>
                )}
                <div className="activity-photo-scrim" />
              </div>
              <span className="pill pill-ok activity-photo-chip">
                {latestFruitScan?.tahapDominan
                  ? `Selesai · ${RIPENESS_REFERENCE[latestFruitScan.tahapDominan].label}`
                  : 'Menunggu scan'}
              </span>
              <div className="activity-photo-body">
                <strong className="t-small" style={{ color: '#FFFFFF' }}>
                  {latestFruitScan?.anjuranPanen || 'Scan buah pertama'}
                </strong>
                <span className="t-micro" style={{ color: '#CFE6D8' }}>
                  {latestFruitScan ? `${latestFruitScan.jumlahBuah} buah ditemukan` : 'Klik untuk memindai'}
                </span>
              </div>
            </button>

            <button type="button" className="activity-photo-card" onClick={() => openScanWith('daun')}>
              <div className="activity-photo-media">
                {latestLeafScan ? (
                  <img
                    src={latestLeafScan.fotoUrl}
                    alt="Scan daun terakhir"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#FFFFFF' }}>
                    <Leaf size={28} />
                  </div>
                )}
                <div className="activity-photo-scrim" />
              </div>
              <span
                className={`pill activity-photo-chip ${
                  latestLeafScan && latestLeafScan.penyakitUtamaId !== 'sehat' ? 'pill-warn' : 'pill-ok'
                }`}
              >
                {latestLeafScan
                  ? latestLeafScan.penyakitUtamaId === 'sehat'
                    ? 'Selesai · Sehat'
                    : 'Perlu cek'
                  : 'Menunggu scan'}
              </span>
              <div className="activity-photo-body">
                <strong
                  className="t-small"
                  style={{ color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {latestLeafScan?.penyakitUtamaNama || 'Scan daun pertama'}
                </strong>
                <span className="t-micro" style={{ color: '#CFE6D8' }}>
                  {latestLeafScan?.dugaanHaraNama || 'Cek penyakit & pupuk'}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="activity-photo-card"
              onClick={() => setActiveScreen('lahan')}
              style={{ background: '#0E4F43' }}
            >
              <div className="activity-photo-media" style={{ display: 'grid', placeItems: 'center', padding: '12px 10px 44px' }}>
                <IrrigationSoilVisual
                  pumpOn={state.settings.pompaMenyala}
                  moisture={state.sensor.kelembapanTanah}
                />
                <div className="activity-photo-scrim" />
              </div>
              <span className="pill pill-sim activity-photo-chip">
                {state.settings.pompaMenyala ? 'Berjalan · Pompa' : 'Siaga · Simulasi'}
              </span>
              <div className="activity-photo-body">
                <strong className="t-small" style={{ color: '#FFFFFF' }}>
                  Tanah {state.sensor.kelembapanTanah}% · Tandon {state.sensor.levelTandonPersen}%
                </strong>
                <span className="t-micro" style={{ color: '#CFE6D8' }}>
                  {state.irrigationEvents.length} siklus pompa tercatat
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* Grafik Hasil Panen + Fase Tumbuh & Daftar Tugas */}
        <div className="dashboard-two-col">
          <div className="dashboard-col">
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 className="t-h3">Perkiraan hasil panen mingguan</h3>
                    <span className="pill pill-warn">Estimasi kasar</span>
                  </div>
                  <p className="t-small t-soft">Dari jumlah buah foto scan × bobot rata-rata</p>
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
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      background: chartMode === 'batang' ? 'var(--forest-900)' : 'transparent',
                      color: chartMode === 'batang' ? '#D8F36A' : 'var(--ink-soft)',
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
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      background: chartMode === 'area' ? 'var(--forest-900)' : 'transparent',
                      color: chartMode === 'area' ? '#D8F36A' : 'var(--ink-soft)',
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

              <hr className="card-divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="t-small" style={{ fontWeight: 700 }}>Sebaran fase tumbuh</span>
                <span className="t-micro t-soft">{activeFarmPlants.length} tanaman</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
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
                        borderRadius: 14,
                        padding: '10px 4px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        className="font-display tabular-nums"
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 600,
                          color: count > 0 ? dotColors[idx] : 'var(--ink-soft)',
                        }}
                      >
                        {count}
                      </span>
                      <span className="t-micro" style={{ color: 'var(--ink-soft)' }}>
                        {phase}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Daftar Tugas Kebun */}
          <div className="dashboard-col">
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 className="t-h3">Daftar tugas kebun</h3>
                  <p className="t-small t-soft">Langkah harian agar panen tepat waktu</p>
                </div>
                <span className="pill pill-ok tabular-nums">
                  {farmTasks.filter((t) => t.selesai).length}/{farmTasks.length} selesai
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {farmTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
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
                        minWidth: 40,
                        minHeight: 40,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {t.selesai ? <CheckCircle2 size={21} /> : <Circle size={21} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="t-small"
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
                        style={{ minHeight: 38, padding: '4px 10px', fontSize: '0.82rem' }}
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
                  placeholder="Tambah tugas kebun..."
                  aria-label="Tambah tugas baru"
                />
                <button type="submit" className="btn-secondary" style={{ flexShrink: 0 }}>
                  <Plus size={18} /> Tambah
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>

      {/* PANEL KANAN 340px: Peta Kebun Interaktif Agrova (§6.7) + Kartu Gelap Jadwal Panen */}
      <aside className="dashboard-right-panel" aria-label="Peta kebun dan jadwal panen">
        <AgrovaFarmMap
          moisture={state.sensor.kelembapanTanah}
          healthyPercent={healthyPercent}
          attentionCount={attentionCount}
          ripeLabel={ripePinLabel}
          onPinClick={(target) => {
            if (target === 'scan') openScanWith('buah');
            else setActiveScreen(target);
          }}
        />

        {/* Jadwal Panen (Kartu Gelap --forest-900 §5.1) */}
        <section className="card-forest" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="t-h3" style={{ color: '#FFFFFF' }}>Jadwal panen dekat</h3>
            <button
              type="button"
              onClick={() => setActiveScreen('kalender')}
              style={{
                border: 'none',
                background: 'rgba(216,243,106,0.18)',
                color: '#D8F36A',
                borderRadius: 999,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Kalender
            </button>
          </div>

          {upcomingHarvests.length === 0 ? (
            <p className="t-small" style={{ color: '#CFE6D8' }}>
              Belum ada jadwal panen. Scan buah untuk menjadwalkan otomatis.
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
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
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
                        width: 11,
                        height: 11,
                        background: isToday ? 'var(--fruit-ripe)' : 'var(--fruit-mid)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9125rem' }}>
                        {plant?.nama || 'Tanaman'}
                      </div>
                      <div className="t-micro" style={{ color: '#CFE6D8' }}>
                        {isToday ? 'Hari ini — siap petik' : ev.tanggal}
                      </div>
                    </div>
                    <CalendarDays size={18} color="#D8F36A" />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Kartu Kelola Kebun */}
        <section className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="t-h3">Kebun aktif</h3>
            <button
              type="button"
              className="btn-ghost"
              style={{ minHeight: 38, padding: '4px 10px' }}
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
                    border: isSelected ? '2px solid var(--leaf-600)' : '1.5px solid var(--line)',
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
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.nama}</div>
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
        </section>
      </aside>

      {/* Modal Cepat "+ Tambah tanaman" */}
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
                <X size={20} />
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
                  placeholder="Contoh: Tomat Servo #06 atau Cabai Rawit #02"
                  value={plantNama}
                  onChange={(e) => setPlantNama(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field-group">
                  <label htmlFor="dash-plant-var" className="field-label">
                    Jenis / varietas
                  </label>
                  <select
                    id="dash-plant-var"
                    className="field-select"
                    value={plantVarietas}
                    onChange={(e) => setPlantVarietas(e.target.value)}
                  >
                    <option value="Servo F1">Servo F1</option>
                    <option value="Gustavi">Gustavi</option>
                    <option value="Tomat Ceri">Tomat Ceri</option>
                    <option value="Cabai Rawit">Cabai Rawit</option>
                    <option value="Selada Keriting">Selada Keriting</option>
                    <option value="Bayam Hijau">Bayam Hijau</option>
                  </select>
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
