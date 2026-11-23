'use client';

import React, { useState } from 'react';
import { BatteryCharging, Calculator, Moon, RotateCcw, Sun, Zap } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { SolarBatteryVisual } from '../components/Illustrations';

const STANDARD_PANEL_WP = [10, 20, 30, 50, 80, 100, 150, 200];

function roundToCommercialPanel(wp: number): number {
  const match = STANDARD_PANEL_WP.find((s) => s >= wp);
  return match || Math.ceil(wp / 50) * 50;
}

/* Layar 8: Energi Surya — Monitor INA219 (F13) + Kalkulator Perancangan (F9) */
export const SolarScreen: React.FC = () => {
  const { state, updateSensor } = useApp();
  const { sensor, settings } = state;

  // F9.2: Nilai contoh awal PERSIS PRD (1 W, 24 jam, 2 hari, DoD 0.8, η 0.85, PSH 4, f_rugi 0.7)
  const [hariOtonomi, setHariOtonomi] = useState(2);
  const [dod, setDod] = useState(0.8);
  const [efisiensi, setEfisiensi] = useState(0.85);
  const [faktorRugi, setFaktorRugi] = useState(0.7);
  const [bebanPreset, setBebanPreset] = useState<'ringan' | 'sedang' | 'besar'>('ringan');
  const [cuacaPreset, setCuacaPreset] = useState<'cerah' | 'berawan'>('cerah');

  const simpleDayaW = bebanPreset === 'ringan' ? 1 : bebanPreset === 'sedang' ? 5 : 12;
  const simpleDurasiJam = bebanPreset === 'besar' ? 12 : 24;
  const simplePsh = cuacaPreset === 'cerah' ? 4 : 2.5;

  // Rumus eksak F9.1:
  // E_harian = P × t
  // C_baterai = E × H / (DoD × η)
  // P_panel = E / (PSH × f_rugi)
  const effectiveDayaBebanW = simpleDayaW;
  const effectiveDurasiJam = simpleDurasiJam;
  const effectivePsh = simplePsh;
  const eHarian = effectiveDayaBebanW * effectiveDurasiJam;
  const cBateraiWh = dod > 0 && efisiensi > 0 ? (eHarian * hariOtonomi) / (dod * efisiensi) : 0;
  const pPanelWp = effectivePsh > 0 && faktorRugi > 0 ? eHarian / (effectivePsh * faktorRugi) : 0;
  const pPanelRounded = roundToCommercialPanel(pPanelWp);

  const isPowerSave = sensor.bateraiPersen <= settings.ambangBateraiHemat;
  const estBackupHours = Math.max(1, Math.round((sensor.bateraiPersen / 100) * 48));

  const resetDefaults = () => {
    setHariOtonomi(2);
    setDod(0.8);
    setEfisiensi(0.85);
    setFaktorRugi(0.7);
    setBebanPreset('ringan');
    setCuacaPreset('cerah');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Bagian 1: Pemantauan Energi Surya INA219 (F13) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 className="t-h1">Pemantauan energi surya</h2>
              <span className="pill pill-sim">Simulasi</span>
              {isPowerSave && (
                <span className="pill pill-warn">
                  <Moon size={14} /> Mode hemat
                </span>
              )}
            </div>
            <p className="t-small t-soft">
              Sensor arus & tegangan INA219 pada perangkat ESP32 bertenaga surya.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CermoMascot
              pose={isPowerSave ? 'sleep' : 'happy'}
              size={78}
              tipOverride={
                isPowerSave
                  ? 'Baterai rendah! ESP32 masuk mode hemat & kirim data tiap 30 menit.'
                  : 'Energi matahari cerah, baterai perangkat aman!'
              }
            />
          </div>
        </div>

        {/* Visualisasi baterai bergelombang + sinar matahari berputar 8s */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div className="card-subtle" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <SolarBatteryVisual batteryPercent={sensor.bateraiPersen} powerSave={isPowerSave} />
            <div className="font-display tabular-nums" style={{ fontSize: '2rem' }}>
              {sensor.bateraiPersen}%
            </div>
            <span className="t-small t-soft">
              Perkiraan sisa baterai: <strong>± {estBackupHours} jam</strong>
            </span>
          </div>

          {/* Tegangan, Arus, Daya & Status Mode Hemat (F13.1, F13.2) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div className="card-subtle">
              <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={14} /> Tegangan (INA219)
              </div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.65rem', marginTop: 4 }}>
                {sensor.teganganVolt.toFixed(1)} V
              </div>
            </div>

            <div className="card-subtle">
              <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <BatteryCharging size={14} /> Arus beban
              </div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.65rem', marginTop: 4 }}>
                {isPowerSave ? 32 : sensor.arusMa} mA
              </div>
            </div>

            <div className="card-subtle">
              <div className="t-micro t-soft" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sun size={14} /> Daya sesaat
              </div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.65rem', marginTop: 4 }}>
                {(isPowerSave ? 0.38 : sensor.dayaWatt).toFixed(2)} W
              </div>
            </div>

            <div className="card-subtle">
              <div className="t-micro t-soft">Interval kirim data</div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.4rem', marginTop: 4 }}>
                {isPowerSave ? '30 menit' : '5 menit'}
              </div>
              <div className="t-micro t-soft">{isPowerSave ? 'Mode hemat aktif' : 'Normal'}</div>
            </div>
          </div>
        </div>

        {/* Mode Hemat Alert & Slider uji baterai (F13.2) */}
        {isPowerSave && (
          <div className="alert-card alert-card--warn" role="status">
            <Moon size={20} style={{ flexShrink: 0 }} />
            <div className="t-small">
              <strong>Mode hemat aktif (baterai ≤ {settings.ambangBateraiHemat}%).</strong> ESP32
              mengirim data lebih jarang (tiap 30 menit) untuk menjaga pasokan daya sampai matahari
              kembali mengisi panel. Cermo ikut istirahat sementara.
            </div>
          </div>
        )}

        <div
          className="card-subtle"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}
        >
          <div>
            <div className="t-micro" style={{ fontWeight: 800, color: 'var(--leaf-600)' }}>Rekomendasi Cermo</div>
            <p className="t-small" style={{ marginTop: 4 }}>
              {isPowerSave
                ? 'Kurangi aktivitas siang: jeda scan dan matikan pompa manual. Baterai perlu waktu menyala kembali.'
                : 'Energi cukup untuk pemakaian normal. Pantau cuaca dan usahakan pengisian tetap mendapat matahari.'}
            </p>
          </div>
          <div>
            <div className="t-micro" style={{ fontWeight: 800, color: 'var(--leaf-600)' }}>Cara hemat energi</div>
            <p className="t-small" style={{ marginTop: 4 }}>
              Aktifkan mode hemat otomatis, kirim data lebih jarang, dan gunakan pompa hanya saat tanah benar-benar kering.
            </p>
          </div>
        </div>

        <div className="card-subtle">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label htmlFor="sim-batt" className="t-small" style={{ fontWeight: 600 }}>
              Uji simulasi level baterai (turunkan ≤ {settings.ambangBateraiHemat}% untuk melihat Mode hemat & Cermo tidur)
            </label>
            <strong className="tabular-nums">{sensor.bateraiPersen}%</strong>
          </div>
          <input
            id="sim-batt"
            type="range"
            min={8}
            max={100}
            value={sensor.bateraiPersen}
            onChange={(e) => {
              const pct = Number(e.target.value);
              const volt = Number((11.1 + (pct / 100) * 1.9).toFixed(1));
              updateSensor({ bateraiPersen: pct, teganganVolt: volt });
            }}
            className="range-slider"
          />
        </div>
      </section>

      {/* Bagian 2: Kalkulator Perancangan Tenaga Surya (F9.1, F9.2) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Calculator size={22} color="var(--leaf-600)" />
              <h2 className="t-h2">Kalkulator perancangan tenaga surya</h2>
              <span className="pill pill-sim">Rancangan / Simulasi</span>
            </div>
            <p className="t-small t-soft">
              Pilih perangkat dan kondisi cuaca. Cermo akan mengubahnya menjadi ukuran baterai dan panel yang mudah dipakai.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={resetDefaults}>
            <RotateCcw size={16} /> Nilai awal PRD
          </button>
        </div>

        {/* Kartu Hasil Perhitungan (3 kartu metrik: Lime, Putih, Forest) */}
        <div className="metrics-grid-3">
          <div className="metric-card metric-card--lime">
            <div className="t-micro" style={{ fontWeight: 700 }}>
              Kebutuhan energi harian
            </div>
            <div className="metric-value">{eHarian.toFixed(1).replace('.', ',')} Wh</div>
            <div className="t-micro">
              Perkiraan untuk {bebanPreset === 'ringan' ? 'sensor saja' : bebanPreset === 'sedang' ? 'sensor + internet' : 'sensor + pompa'}
            </div>
          </div>

          <div className="metric-card metric-card--white">
            <div className="t-micro t-soft" style={{ fontWeight: 700 }}>
              Ukuran baterai disarankan
            </div>
            <div className="metric-value">≈ {Math.round(cBateraiWh)} Wh</div>
            <div className="t-micro t-soft">
              Untuk cadangan sekitar {hariOtonomi} hari
            </div>
          </div>

          <div className="metric-card metric-card--forest">
            <div className="t-micro" style={{ opacity: 0.85, fontWeight: 700 }}>
              Ukuran panel surya
            </div>
            <div className="metric-value">
              {pPanelWp.toFixed(1).replace('.', ',')} Wp → {pPanelRounded} Wp
            </div>
            <div className="t-micro" style={{ opacity: 0.85 }}>
              Pilih panel komersial terdekat: {pPanelRounded} Wp
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div className="field-group">
            <label htmlFor="calc-load" className="field-label">Perangkat apa yang dijalankan?</label>
            <select id="calc-load" className="field-select" value={bebanPreset} onChange={(e) => setBebanPreset(e.target.value as typeof bebanPreset)}>
              <option value="ringan">Sensor saja</option>
              <option value="sedang">Sensor + internet</option>
              <option value="besar">Sensor + pompa</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="calc-days" className="field-label">Berapa hari aman saat matahari kurang?</label>
            <select id="calc-days" className="field-select" value={hariOtonomi} onChange={(e) => setHariOtonomi(Number(e.target.value))}>
              <option value={1}>1 hari</option>
              <option value={2}>2 hari</option>
              <option value={3}>3 hari</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="calc-weather" className="field-label">Biasanya cuaca di lokasi</label>
            <select id="calc-weather" className="field-select" value={cuacaPreset} onChange={(e) => setCuacaPreset(e.target.value as typeof cuacaPreset)}>
              <option value="cerah">Cerah, matahari cukup</option>
              <option value="berawan">Sering mendung / hujan</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
};
