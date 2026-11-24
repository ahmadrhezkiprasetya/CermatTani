'use client';

import React, { useMemo, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Download,
  Droplets,
  Power,
  ShieldAlert,
  Sliders,
  Sprout,
  Thermometer,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { Farm3DSimulator } from '../components/Farm3DSimulator';
import { IrrigationSoilVisual, WaterTankVisual } from '../components/Illustrations';
import { GreenAreaChart, StripedProgressBar } from '../components/Charts';
import { downloadCsv } from '../utils/scanAnalyzer';

/* Layar 7: Lahan — Tata letak bersih & rapi: KPI 4 sensor, Irigasi & Tandon, Grafik 24 jam, Simulasi lipat */
export const LandScreen: React.FC = () => {
  const { state, updateSettings, updateSensor, triggerManualPump, openScanWith } = useApp();
  const [chartMetric, setChartMetric] = useState<'tanah' | 'suhu' | 'udara' | 'cahaya'>('tanah');
  const [pumpFeedback, setPumpFeedback] = useState<string>('');
  const [showSimPanel, setShowSimPanel] = useState(false);

  const { sensor, settings } = state;
  const isTankCritical = sensor.levelTandonPersen < settings.ambangTandonRendah;
  const isDiseaseRisk = sensor.kelembapanUdara >= settings.ambangKelembapanRisikoPenyakit;
  const tankLiters = Math.round((sensor.levelTandonPersen / 100) * sensor.kapasitasTandonLiter);

  const chartData = useMemo(() => {
    const livePoint = {
      jam: 'Kini',
      kelembapanTanah: sensor.kelembapanTanah,
      suhuUdara: sensor.suhuUdara,
      kelembapanUdara: sensor.kelembapanUdara,
      cahayaLux: sensor.cahayaLux,
    };
    const merged = [...state.sensor24h, livePoint];
    return merged.map((pt) => {
      if (chartMetric === 'tanah') return { label: pt.jam, value: pt.kelembapanTanah };
      if (chartMetric === 'suhu') return { label: pt.jam, value: pt.suhuUdara };
      if (chartMetric === 'udara') return { label: pt.jam, value: pt.kelembapanUdara };
      return { label: pt.jam, value: Math.round(pt.cahayaLux / 1000) };
    });
  }, [state.sensor24h, sensor, chartMetric]);

  const chartMeta = {
    tanah: { unit: '%', color: 'var(--leaf-500)', label: 'Kelembapan tanah' },
    suhu: { unit: '°C', color: 'var(--fruit-ripe)', label: 'Suhu udara' },
    udara: { unit: '%', color: 'var(--water)', label: 'Kelembapan udara' },
    cahaya: { unit: 'k lux', color: 'var(--fruit-mid)', label: 'Cahaya (BH1750)' },
  }[chartMetric];

  const handleManualPump = () => {
    const res = triggerManualPump(!settings.pompaMenyala);
    setPumpFeedback(res.message);
  };

  const handleExportSensorCsv = () => {
    const headers = ['Jam', 'Kelembapan Tanah (%)', 'Suhu Udara (°C)', 'Kelembapan Udara (%)', 'Cahaya (lux)', 'Status'];
    const rows = state.sensor24h.map((pt) => [
      pt.jam,
      pt.kelembapanTanah,
      pt.suhuUdara,
      pt.kelembapanUdara,
      pt.cahayaLux,
      'Simulasi ESP32',
    ]);
    downloadCsv('cermattani-sensor-24jam.csv', headers, rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header Bar Ringkas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="pill pill-sim">Simulasi ESP32</span>
          <span className="t-small t-soft">
            Perangkat aktif: <strong style={{ color: 'var(--ink)' }}>{state.devices[0]?.id}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowSimPanel((v) => !v)}
          >
            <Sliders size={16} /> Uji sensor {showSimPanel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button type="button" className="btn-secondary" onClick={handleExportSensorCsv}>
            <Download size={16} /> Ekspor CSV
          </button>
        </div>
      </div>

      {/* Panel Lipat Uji Simulasi Sensor ESP32 (tidak memenuhi layar saat tidak dipakai) */}
      {showSimPanel && (
        <section className="card step-transition" style={{ display: 'grid', gap: 14, borderColor: 'var(--sim-600)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 className="t-h3">Panel uji simulasi sensor ESP32</h3>
              <p className="t-micro t-soft">Geser slider untuk menguji otomatisasi pompa, interlock tandon, &amp; peringatan jamur.</p>
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

      {/* Peringatan Risiko Penyakit (hanya tampil bila ambang terlewati) */}
      {isDiseaseRisk && (
        <div className="alert-card alert-card--warn" role="alert">
          <CermoMascot pose="worried" size={50} interactive={false} />
          <div style={{ flex: 1 }}>
            <strong className="t-small">Risiko jamur busuk daun meningkat ({sensor.kelembapanUdara}% RH)</strong>
            <p className="t-small t-soft" style={{ marginTop: 2 }}>
              Kelembapan udara melewati batas {settings.ambangKelembapanRisikoPenyakit}% pada suhu {sensor.suhuUdara} °C. Cek bagian bawah daun hari ini.
            </p>
          </div>
          <button type="button" className="btn-tomato" onClick={() => openScanWith('daun')}>
            <Camera size={16} /> Scan daun
          </button>
        </div>
      )}

      {/* Panggung Utama Simulasi 3D Laboratorium Lahan (Eksklusif di halaman Lahan, responsif HP/Tablet/Desktop) */}
      <Farm3DSimulator mode="lab" />

      {/* Baris KPI 4 Sensor Utama (Seragam & Mudah Dibaca Sekilas) */}
      <section className="kpi-grid-4" aria-label="Pembacaan sensor lahan">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--water-bg)', color: 'var(--water-700)' }}>
              <Droplets size={18} />
            </span>
            <span className="t-micro t-soft">Ideal 45–65%</span>
          </div>
          <div>
            <div className="kpi-value">{sensor.kelembapanTanah}%</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Kelembapan tanah</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'rgba(242,86,43,0.12)', color: 'var(--tomato-btn)' }}>
              <Thermometer size={18} />
            </span>
            <span className="t-micro t-soft">Ideal 20–28 °C</span>
          </div>
          <div>
            <div className="kpi-value">{sensor.suhuUdara}°C</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Suhu udara (DHT22)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--ok-bg)', color: 'var(--leaf-600)' }}>
              <CloudSun size={18} />
            </span>
            <span className={`pill ${isDiseaseRisk ? 'pill-bad' : 'pill-ok'}`}>
              {isDiseaseRisk ? 'Tinggi' : 'Aman'}
            </span>
          </div>
          <div>
            <div className="kpi-value">{sensor.kelembapanUdara}%</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Kelembapan udara</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--surface-2)', color: 'var(--forest-900)' }}>
              <Sprout size={18} />
            </span>
            <span className={`pill ${isTankCritical ? 'pill-bad' : 'pill-water'}`}>
              {isTankCritical ? 'Kritis' : `${tankLiters} L`}
            </span>
          </div>
          <div>
            <div className="kpi-value">{sensor.levelTandonPersen}%</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Level air tandon</div>
          </div>
        </div>
      </section>

      {/* Bento Utama: Irigasi Otomatis + Level Tandon & Unsur Hara NPK */}
      <div className="dashboard-bento-row">
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <h3 className="t-h3">Irigasi otomatis &amp; pompa</h3>
              <p className="t-micro t-soft" style={{ marginTop: 2 }}>
                Nyala &lt; {settings.ambangTanahBawah}% · Mati ≥ {settings.ambangTanahAtas}% · Maks {settings.durasiMaksPompaMenit} menit
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-micro" style={{ fontWeight: 700 }}>Auto</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.irigasiOtomatis}
                aria-label="Aktifkan irigasi otomatis"
                className="irrigation-toggle"
                onClick={() => updateSettings({ irigasiOtomatis: !settings.irigasiOtomatis })}
              >
                <span className="irrigation-toggle-thumb">
                  <Droplets size={14} />
                </span>
              </button>
            </div>
          </div>

          <IrrigationSoilVisual pumpOn={settings.pompaMenyala} moisture={sensor.kelembapanTanah} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span className={`pill ${settings.pompaMenyala ? 'pill-water' : 'pill-neutral'}`}>
              <Power size={13} /> Pompa: {settings.pompaMenyala ? 'Menyala' : 'Mati'}
            </span>
            <button
              type="button"
              className={settings.pompaMenyala ? 'btn-danger' : 'btn-primary'}
              onClick={handleManualPump}
              disabled={isTankCritical && !settings.pompaMenyala}
            >
              <Power size={16} /> {settings.pompaMenyala ? 'Matikan pompa' : 'Nyalakan manual'}
            </button>
          </div>

          {isTankCritical && (
            <div className="alert-card alert-card--bad" role="alert">
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <div className="t-small">
                <strong>Interlock aktif:</strong> Tandon tinggal {sensor.levelTandonPersen}%. Pompa ditahan agar tidak kering.
              </div>
            </div>
          )}

          {pumpFeedback && !isTankCritical && (
            <div className="card-subtle t-small" role="status">{pumpFeedback}</div>
          )}

          <div className="card-subtle" style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="ambang-bawah" className="t-micro" style={{ fontWeight: 700 }}>Ambang nyala (&lt;)</label>
                <strong className="t-micro tabular-nums">{settings.ambangTanahBawah}%</strong>
              </div>
              <input
                id="ambang-bawah"
                type="range"
                min={15}
                max={55}
                value={settings.ambangTanahBawah}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateSettings({ ambangTanahBawah: v, ambangTanahAtas: Math.max(v + 10, settings.ambangTanahAtas) });
                }}
                className="range-slider"
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="ambang-atas" className="t-micro" style={{ fontWeight: 700 }}>Ambang mati (≥)</label>
                <strong className="t-micro tabular-nums">{settings.ambangTanahAtas}%</strong>
              </div>
              <input
                id="ambang-atas"
                type="range"
                min={45}
                max={85}
                value={settings.ambangTanahAtas}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateSettings({ ambangTanahAtas: v, ambangTanahBawah: Math.min(v - 10, settings.ambangTanahBawah) });
                }}
                className="range-slider"
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="durasi-maks" className="t-micro" style={{ fontWeight: 700 }}>Durasi maks/siklus</label>
                <strong className="t-micro tabular-nums">{settings.durasiMaksPompaMenit} menit</strong>
              </div>
              <input
                id="durasi-maks"
                type="range"
                min={3}
                max={30}
                value={settings.durasiMaksPompaMenit}
                onChange={(e) => updateSettings({ durasiMaksPompaMenit: Number(e.target.value) })}
                className="range-slider"
              />
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tandon Air */}
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="t-h3">Level air tandon</h3>
              <span className={`pill ${isTankCritical ? 'pill-bad' : 'pill-water'}`}>
                {isTankCritical ? 'Kritis (< 20%)' : 'Aman'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <WaterTankVisual levelPercent={sensor.levelTandonPersen} isLow={isTankCritical} />
              <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="font-display tabular-nums" style={{ fontSize: '2.1rem', lineHeight: 1.05 }}>
                  {sensor.levelTandonPersen}%
                </div>
                <div className="t-small tabular-nums" style={{ fontWeight: 700 }}>
                  ≈ {tankLiters} / {sensor.kapasitasTandonLiter} liter
                </div>
                <div className="t-micro t-soft tabular-nums">
                  Jarak ultrasonik: {sensor.jarakUltrasonikCm} cm (tinggi {sensor.tinggiTandonCm} cm)
                </div>
              </div>
            </div>
          </section>

          {/* Unsur Hara NPK & Cahaya */}
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="t-h3">Unsur hara (NPK) &amp; cahaya</h3>
              <span className="pill pill-sim">Simulasi</span>
            </div>
            <StripedProgressBar
              label="Nitrogen (N)"
              valueLabel={`${sensor.nitrogenMgKg} mg/kg`}
              percent={Math.min(100, Math.round((sensor.nitrogenMgKg / 80) * 100))}
              color="var(--leaf-500)"
            />
            <StripedProgressBar
              label="Fosfor (P)"
              valueLabel={`${sensor.fosforMgKg} mg/kg`}
              percent={Math.min(100, Math.round((sensor.fosforMgKg / 60) * 100))}
              color="var(--fruit-mid)"
            />
            <StripedProgressBar
              label="Kalium (K)"
              valueLabel={`${sensor.kaliumMgKg} mg/kg`}
              percent={Math.min(100, Math.round((sensor.kaliumMgKg / 90) * 100))}
              color="var(--water)"
            />
            <StripedProgressBar
              label="Cahaya siang (BH1750)"
              valueLabel={`${(sensor.cahayaLux / 1000).toFixed(1)}k lux`}
              percent={Math.min(100, Math.round((sensor.cahayaLux / 50000) * 100))}
              color="var(--fruit-ripe)"
            />
          </section>
        </div>
      </div>

      {/* Grafik 24 Jam + Riwayat Siklus Pompa berdampingan rapi */}
      <div className="dashboard-two-col">
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div>
              <h3 className="t-h3">Grafik sensor 24 jam</h3>
              <p className="t-micro t-soft">Arahkan kursor untuk melihat angka</p>
            </div>
            <div className="seg-tabs">
              {(
                [
                  { id: 'tanah', label: 'Tanah' },
                  { id: 'suhu', label: 'Suhu' },
                  { id: 'udara', label: 'Udara' },
                  { id: 'cahaya', label: 'Cahaya' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChartMetric(tab.id)}
                  className={`seg-tab ${chartMetric === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div key={chartMetric} className="tab-fade">
            <GreenAreaChart points={chartData} unit={chartMeta.unit} color={chartMeta.color} height={215} />
          </div>
        </section>

        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="t-h3">Riwayat siklus pompa</h3>
            <span className="pill pill-sim">Simulasi</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th className="t-micro t-soft" style={{ padding: '8px 6px' }}>Waktu</th>
                  <th className="t-micro t-soft" style={{ padding: '8px 6px' }}>Mode</th>
                  <th className="t-micro t-soft" style={{ padding: '8px 6px' }}>Durasi</th>
                  <th className="t-micro t-soft" style={{ padding: '8px 6px' }}>Tanah</th>
                </tr>
              </thead>
              <tbody>
                {state.irrigationEvents.slice(0, 6).map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="t-small tabular-nums" style={{ padding: '10px 6px' }}>
                      {new Date(ev.mulai).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <span className={`pill ${ev.mode === 'Otomatis' ? 'pill-ok' : 'pill-water'}`}>
                        {ev.mode}
                      </span>
                    </td>
                    <td className="t-small tabular-nums" style={{ padding: '10px 6px' }}>{ev.durasiMenit} mnt</td>
                    <td className="t-small tabular-nums" style={{ padding: '10px 6px', fontWeight: 600 }}>
                      {ev.kelembapanAwal}% → {ev.kelembapanAkhir}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
