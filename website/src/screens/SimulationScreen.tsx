'use client';

import React, { useState } from 'react';
import {
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Droplets,
  Power,
  Sliders,
  Sprout,
  Thermometer,
  Waves,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { Farm3DSimulator } from '../components/Farm3DSimulator';

/*
 * Layar Simulasi Kebun 3D — halaman tersendiri.
 * Panggung 3D di bagian utama, uji sensor ESP32 (dipindah dari halaman Lahan), dan pembacaan langsung
 * agar efek setiap skenario (cerah, kemarau, hujan, tandon kritis, hemat baterai) langsung terlihat angkanya.
 */
export const SimulationScreen: React.FC = () => {
  const { state, updateSensor, setActiveScreen } = useApp();
  const [showSensorPanel, setShowSensorPanel] = useState(false);

  const { sensor, settings } = state;
  const isTankCritical = sensor.levelTandonPersen < settings.ambangTandonRendah;
  const isDiseaseRisk = sensor.kelembapanUdara >= settings.ambangKelembapanRisikoPenyakit;
  const isDry = sensor.kelembapanTanah < settings.ambangTanahBawah;
  const isPowerSave = sensor.bateraiPersen <= settings.ambangBateraiHemat;
  const pumpFlowing = settings.pompaMenyala && !isTankCritical;
  const tankLiters = Math.round((sensor.levelTandonPersen / 100) * sensor.kapasitasTandonLiter);

  const readings = [
    {
      id: 'tanah',
      icon: <Droplets size={17} />,
      tone: { background: 'var(--water-bg)', color: 'var(--water-700)' },
      value: `${sensor.kelembapanTanah}%`,
      label: 'Kelembapan tanah',
      status: isDry ? { text: 'Kering', cls: 'pill-warn' } : { text: 'Ideal', cls: 'pill-ok' },
    },
    {
      id: 'suhu',
      icon: <Thermometer size={17} />,
      tone: { background: 'rgba(242,86,43,0.12)', color: 'var(--tomato-btn)' },
      value: `${sensor.suhuUdara}°C`,
      label: 'Suhu udara',
      status: null,
    },
    {
      id: 'udara',
      icon: <CloudSun size={17} />,
      tone: { background: 'var(--ok-bg)', color: 'var(--leaf-600)' },
      value: `${sensor.kelembapanUdara}%`,
      label: 'Kelembapan udara',
      status: isDiseaseRisk ? { text: 'Risiko jamur', cls: 'pill-bad' } : { text: 'Aman', cls: 'pill-ok' },
    },
    {
      id: 'tandon',
      icon: <Waves size={17} />,
      tone: { background: 'var(--surface-2)', color: 'var(--forest-900)' },
      value: `${sensor.levelTandonPersen}%`,
      label: `Tandon ≈ ${tankLiters} L`,
      status: isTankCritical ? { text: 'Kritis', cls: 'pill-bad' } : { text: 'Aman', cls: 'pill-water' },
    },
    {
      id: 'pompa',
      icon: <Power size={17} />,
      tone: { background: 'var(--water-bg)', color: 'var(--water-700)' },
      value: pumpFlowing ? 'Menyala' : isTankCritical ? 'Interlock' : 'Siaga',
      label: `Pompa · ${settings.irigasiOtomatis ? 'Otomatis' : 'Manual'}`,
      status: null,
    },
    {
      id: 'surya',
      icon: <BatteryCharging size={17} />,
      tone: { background: 'rgba(232,172,68,0.16)', color: '#a86b00' },
      value: `${sensor.bateraiPersen}%`,
      label: 'Baterai surya',
      status: isPowerSave ? { text: 'Hemat', cls: 'pill-warn' } : null,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header ringkas: status simulasi + aksi */}
      <div className="land-header-bar">
        <div className="land-device-meta">
          <span className="pill pill-sim">Simulasi ESP32</span>
          <span className="t-small t-soft sim-page-desc">
            Uji skenario cuaca &amp; lahan dengan data sensor simulasi
          </span>
        </div>
        <div className="land-header-actions">
          <button
            type="button"
            className="btn-secondary land-action-btn"
            onClick={() => setShowSensorPanel((v) => !v)}
            aria-expanded={showSensorPanel}
          >
            <Sliders size={15} /> Uji sensor {showSensorPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button type="button" className="btn-secondary land-action-btn" onClick={() => setActiveScreen('lahan')}>
            <Sprout size={15} /> Data lahan
          </button>
        </div>
      </div>

      {/* Panel lipat uji sensor ESP32 (dipindah dari halaman Lahan) */}
      {showSensorPanel && (
        <section className="card step-transition" style={{ display: 'grid', gap: 14, borderColor: 'var(--sim-600)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 className="t-h3">Panel uji sensor ESP32</h3>
              <p className="t-micro t-soft">
                Geser slider untuk menguji otomatisasi pompa, interlock tandon, &amp; peringatan jamur — kebun 3D ikut bereaksi.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 36, padding: '4px 12px', fontSize: '0.8rem' }}
              onClick={() => updateSensor({ sensorTersedia: !sensor.sensorTersedia })}
            >
              Sensor ke pupuk: {sensor.sensorTersedia ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="t-small">Kelembapan tanah</span>
                <strong className="tabular-nums">{sensor.kelembapanTanah}%</strong>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                value={sensor.kelembapanTanah}
                onChange={(e) => updateSensor({ kelembapanTanah: Number(e.target.value) })}
                className="range-slider"
                aria-label="Simulasi kelembapan tanah"
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="t-small">Kelembapan udara (DHT22)</span>
                <strong className="tabular-nums">{sensor.kelembapanUdara}%</strong>
              </div>
              <input
                type="range"
                min={45}
                max={98}
                value={sensor.kelembapanUdara}
                onChange={(e) => updateSensor({ kelembapanUdara: Number(e.target.value) })}
                className="range-slider"
                aria-label="Simulasi kelembapan udara"
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="t-small">Level air tandon</span>
                <strong className="tabular-nums">{sensor.levelTandonPersen}%</strong>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={sensor.levelTandonPersen}
                onChange={(e) => updateSensor({ levelTandonPersen: Number(e.target.value) })}
                className="range-slider"
                aria-label="Simulasi level air tandon"
              />
            </div>
          </div>
        </section>
      )}

      {/* Panggung utama: Simulasi Kebun 3D (viewport lebih besar di halaman ini) */}
      <Farm3DSimulator mode="page" />

      {/* Pembacaan langsung — angka ikut berubah saat skenario/slider dipakai */}
      <section className="card sim-live-card" aria-label="Pembacaan sensor simulasi">
        <div className="sim-live-head">
          <h3 className="t-h3">Pembacaan langsung</h3>
          <span className="t-micro t-soft">Berubah mengikuti skenario &amp; slider</span>
        </div>
        <div className="sim-live-grid">
          {readings.map((r) => (
            <div key={r.id} className="sim-live-item">
              <span className="kpi-icon" style={r.tone}>
                {r.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="sim-live-value tabular-nums">{r.value}</div>
                <div className="t-micro t-soft sim-live-label">{r.label}</div>
              </div>
              {r.status && <span className={`pill ${r.status.cls} sim-live-pill`}>{r.status.text}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
