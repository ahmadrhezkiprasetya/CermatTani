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
  const [dayaBebanW, setDayaBebanW] = useState(1);
  const [durasiJam, setDurasiJam] = useState(24);
  const [hariOtonomi, setHariOtonomi] = useState(2);
  const [dod, setDod] = useState(0.8);
  const [efisiensi, setEfisiensi] = useState(0.85);
  const [psh, setPsh] = useState(4);
  const [faktorRugi, setFaktorRugi] = useState(0.7);

  // Rumus eksak F9.1:
  // E_harian = P × t
  // C_baterai = E × H / (DoD × η)
  // P_panel = E / (PSH × f_rugi)
  const eHarian = dayaBebanW * durasiJam;
  const cBateraiWh = dod > 0 && efisiensi > 0 ? (eHarian * hariOtonomi) / (dod * efisiensi) : 0;
  const pPanelWp = psh > 0 && faktorRugi > 0 ? eHarian / (psh * faktorRugi) : 0;
  const pPanelRounded = roundToCommercialPanel(pPanelWp);

  const isPowerSave = sensor.bateraiPersen <= settings.ambangBateraiHemat;
  const estBackupHours = Math.max(1, Math.round((sensor.bateraiPersen / 100) * 48));

  const resetDefaults = () => {
    setDayaBebanW(1);
    setDurasiJam(24);
    setHariOtonomi(2);
    setDod(0.8);
    setEfisiensi(0.85);
    setPsh(4);
    setFaktorRugi(0.7);
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
              Hitung kebutuhan energi harian, kapasitas baterai, dan ukuran panel surya untuk perangkat
              ESP32 di lahan.
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
              Energi harian (E = P × t)
            </div>
            <div className="metric-value">{eHarian.toFixed(1).replace('.', ',')} Wh</div>
            <div className="t-micro">
              {dayaBebanW} W × {durasiJam} jam/hari
            </div>
          </div>

          <div className="metric-card metric-card--white">
            <div className="t-micro t-soft" style={{ fontWeight: 700 }}>
              Kapasitas baterai (C = E × H / (DoD × η))
            </div>
            <div className="metric-value">≈ {Math.round(cBateraiWh)} Wh</div>
            <div className="t-micro t-soft">
              Tepatnya {cBateraiWh.toFixed(1).replace('.', ',')} Wh (≈ {(cBateraiWh / 12).toFixed(1).replace('.', ',')} Ah @12V)
            </div>
          </div>

          <div className="metric-card metric-card--forest">
            <div className="t-micro" style={{ opacity: 0.85, fontWeight: 700 }}>
              Daya panel (P = E / (PSH × f_rugi))
            </div>
            <div className="metric-value">
              {pPanelWp.toFixed(1).replace('.', ',')} Wp → {pPanelRounded} Wp
            </div>
            <div className="t-micro" style={{ opacity: 0.85 }}>
              Rekomendasi panel pasaran: {pPanelRounded} Wp
            </div>
          </div>
        </div>

        {/* Input asumsi yang dapat diubah (F9.2) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14,
          }}
        >
          <div className="field-group">
            <label htmlFor="calc-p" className="field-label">
              Daya rata-rata perangkat P (Watt)
            </label>
            <input
              id="calc-p"
              type="number"
              step="0.1"
              min="0.1"
              className="field-input tabular-nums"
              value={dayaBebanW}
              onChange={(e) => setDayaBebanW(Math.max(0.1, Number(e.target.value) || 0.1))}
            />
          </div>

          <div className="field-group">
            <label htmlFor="calc-t" className="field-label">
              Durasi operasi harian t (jam)
            </label>
            <input
              id="calc-t"
              type="number"
              step="1"
              min="1"
              max="24"
              className="field-input tabular-nums"
              value={durasiJam}
              onChange={(e) => setDurasiJam(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
            />
          </div>

          <div className="field-group">
            <label htmlFor="calc-h" className="field-label">
              Hari otonomi tanpa matahari H (hari)
            </label>
            <input
              id="calc-h"
              type="number"
              step="0.5"
              min="0.5"
              className="field-input tabular-nums"
              value={hariOtonomi}
              onChange={(e) => setHariOtonomi(Math.max(0.5, Number(e.target.value) || 0.5))}
            />
          </div>

          <div className="field-group">
            <label htmlFor="calc-dod" className="field-label">
              Depth of Discharge (DoD, 0,1–1)
            </label>
            <input
              id="calc-dod"
              type="number"
              step="0.05"
              min="0.2"
              max="1"
              className="field-input tabular-nums"
              value={dod}
              onChange={(e) => setDod(Math.max(0.2, Math.min(1, Number(e.target.value) || 0.8)))}
            />
          </div>

          <div className="field-group">
            <label htmlFor="calc-eta" className="field-label">
              Efisiensi sistem η (0,1–1)
            </label>
            <input
              id="calc-eta"
              type="number"
              step="0.05"
              min="0.3"
              max="1"
              className="field-input tabular-nums"
              value={efisiensi}
              onChange={(e) => setEfisiensi(Math.max(0.3, Math.min(1, Number(e.target.value) || 0.85)))}
            />
          </div>

          <div className="field-group">
            <label htmlFor="calc-psh" className="field-label">
              Peak Sun Hours PSH (jam/hari)
            </label>
            <input
              id="calc-psh"
              type="number"
              step="0.5"
              min="1"
              max="8"
              className="field-input tabular-nums"
              value={psh}
              onChange={(e) => setPsh(Math.max(1, Number(e.target.value) || 4))}
            />
          </div>

          <div className="field-group">
            <label htmlFor="calc-f" className="field-label">
              Faktor rugi panel f_rugi (0,1–1)
            </label>
            <input
              id="calc-f"
              type="number"
              step="0.05"
              min="0.3"
              max="1"
              className="field-input tabular-nums"
              value={faktorRugi}
              onChange={(e) => setFaktorRugi(Math.max(0.3, Math.min(1, Number(e.target.value) || 0.7)))}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
