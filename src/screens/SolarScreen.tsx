'use client';

import React, { useState } from 'react';
import { BatteryCharging, Calculator, Moon, RotateCcw, Sun, Zap } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { SolarBatteryVisual } from '../components/Illustrations';
import { StripedProgressBar } from '../components/Charts';

const STANDARD_PANEL_WP = [10, 20, 30, 50, 80, 100, 150, 200];

function roundToCommercialPanel(wp: number): number {
  const match = STANDARD_PANEL_WP.find((s) => s >= wp);
  return match || Math.ceil(wp / 50) * 50;
}

/* Layar 8: Energi Surya — Layout 2-kolom tenang: Monitor INA219 + Kalkulator Panel Surya */
export const SolarScreen: React.FC = () => {
  const { state, updateSensor } = useApp();
  const { sensor, settings } = state;

  const [hariOtonomi, setHariOtonomi] = useState(2);
  const [dod, setDod] = useState(0.8);
  const [efisiensi, setEfisiensi] = useState(0.85);
  const [faktorRugi, setFaktorRugi] = useState(0.7);
  const [bebanPreset, setBebanPreset] = useState<'ringan' | 'sedang' | 'besar'>('ringan');
  const [cuacaPreset, setCuacaPreset] = useState<'cerah' | 'berawan'>('cerah');

  const simpleDayaW = bebanPreset === 'ringan' ? 1 : bebanPreset === 'sedang' ? 5 : 12;
  const simpleDurasiJam = bebanPreset === 'besar' ? 12 : 24;
  const simplePsh = cuacaPreset === 'cerah' ? 4 : 2.5;

  const eHarian = simpleDayaW * simpleDurasiJam;
  const cBateraiWh = dod > 0 && efisiensi > 0 ? (eHarian * hariOtonomi) / (dod * efisiensi) : 0;
  const pPanelWp = simplePsh > 0 && faktorRugi > 0 ? eHarian / (simplePsh * faktorRugi) : 0;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Baris KPI 4 Metrik Daya INA219 — Seragam & Mudah Dibaca */}
      <section className="kpi-grid-4" aria-label="Ringkasan energi surya">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--ok-bg)', color: 'var(--leaf-600)' }}>
              <BatteryCharging size={18} />
            </span>
            <span className={`pill ${isPowerSave ? 'pill-warn' : 'pill-ok'}`}>
              {isPowerSave ? 'Mode hemat' : 'Optimal'}
            </span>
          </div>
          <div>
            <div className="kpi-value">{sensor.bateraiPersen}%</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Cadangan ± {estBackupHours} jam</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--surface-2)', color: 'var(--forest-900)' }}>
              <Zap size={18} />
            </span>
            <span className="pill pill-sim">Simulasi</span>
          </div>
          <div>
            <div className="kpi-value">{sensor.teganganVolt.toFixed(1)} V</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Tegangan baterai 12V</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>
              <Sun size={18} />
            </span>
            <span className="t-micro t-soft tabular-nums">{isPowerSave ? 32 : sensor.arusMa} mA</span>
          </div>
          <div>
            <div className="kpi-value">{(isPowerSave ? 0.38 : sensor.dayaWatt).toFixed(2)} W</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Daya sesaat INA219</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-icon" style={{ background: 'var(--water-bg)', color: 'var(--water-700)' }}>
              <Moon size={18} />
            </span>
            <span className="t-micro t-soft">{isPowerSave ? 'Hemat' : 'Normal'}</span>
          </div>
          <div>
            <div className="kpi-value">{isPowerSave ? '30 mnt' : '5 mnt'}</div>
            <div className="t-micro t-soft" style={{ marginTop: 2 }}>Interval kirim ESP32</div>
          </div>
        </div>
      </section>

      {/* Bento 2 Kolom Rapi: Monitor Baterai (Mint Cerah) + Kalkulator Surya (Putih Bersih) */}
      <div className="dashboard-bento-row">
        <section className="card-forest" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <h3 className="t-h3" style={{ color: 'var(--ink)' }}>Status baterai &amp; panel</h3>
              <p className="t-micro t-soft" style={{ marginTop: 2 }}>Monitor daya ESP32 bertenaga surya</p>
            </div>
            <CermoMascot
              pose={isPowerSave ? 'sleep' : 'happy'}
              size={54}
              tipOverride={
                isPowerSave
                  ? 'Baterai rendah! ESP32 otomatis masuk mode hemat.'
                  : 'Energi matahari cerah, baterai aman!'
              }
            />
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <SolarBatteryVisual batteryPercent={sensor.bateraiPersen} powerSave={isPowerSave} />
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StripedProgressBar
                label="Kapasitas tersimpan"
                valueLabel={`${sensor.bateraiPersen}%`}
                percent={sensor.bateraiPersen}
                color={isPowerSave ? 'var(--warn)' : 'var(--leaf-500)'}
              />
              <p className="t-micro t-soft" style={{ lineHeight: 1.5 }}>
                {isPowerSave
                  ? 'Mode hemat aktif: jeda scan sementara & gunakan pompa hanya saat tanah sangat kering.'
                  : 'Pasokan daya stabil. Pastikan permukaan panel bebas bayangan daun atau debu.'}
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label htmlFor="sim-batt" className="t-micro" style={{ color: 'var(--ink)' }}>
                Uji simulasi level baterai (≤ {settings.ambangBateraiHemat}% = Mode hemat)
              </label>
              <strong className="t-micro tabular-nums" style={{ color: 'var(--leaf-600)' }}>{sensor.bateraiPersen}%</strong>
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

        {/* Kalkulator Perancangan Tenaga Surya */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={19} color="var(--leaf-600)" />
              <div>
                <h3 className="t-h3">Kalkulator panel surya</h3>
                <p className="t-micro t-soft">Estimasi baterai &amp; panel sesuai kebutuhan</p>
              </div>
            </div>
            <button type="button" className="btn-ghost" onClick={resetDefaults}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="solar-res-grid">
            <div className="card-subtle" style={{ textAlign: 'center', padding: '14px 10px' }}>
              <div className="t-micro t-soft">Energi harian</div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.35rem', marginTop: 4 }}>
                {eHarian.toFixed(0)} Wh
              </div>
            </div>
            <div className="card-subtle" style={{ textAlign: 'center', padding: '14px 10px' }}>
              <div className="t-micro t-soft">Baterai</div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.35rem', marginTop: 4 }}>
                ≈ {Math.round(cBateraiWh)} Wh
              </div>
            </div>
            <div
              className="card-subtle"
              style={{
                textAlign: 'center',
                padding: '14px 10px',
                background: 'var(--ok-bg)',
                borderColor: 'rgba(23,128,63,0.2)',
              }}
            >
              <div className="t-micro" style={{ color: 'var(--ok-fg)' }}>Panel disarankan</div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.35rem', marginTop: 4, color: 'var(--ok-fg)' }}>
                {pPanelRounded} Wp
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="field-group">
              <label htmlFor="calc-load" className="field-label">Perangkat yang dijalankan</label>
              <select
                id="calc-load"
                className="field-select"
                value={bebanPreset}
                onChange={(e) => setBebanPreset(e.target.value as typeof bebanPreset)}
              >
                <option value="ringan">Sensor saja (1 W · 24 jam)</option>
                <option value="sedang">Sensor + internet (5 W · 24 jam)</option>
                <option value="besar">Sensor + pompa kecil (12 W · 12 jam)</option>
              </select>
            </div>
            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="calc-days" className="field-label">Cadangan mendung</label>
                <select
                  id="calc-days"
                  className="field-select"
                  value={hariOtonomi}
                  onChange={(e) => setHariOtonomi(Number(e.target.value))}
                >
                  <option value={1}>1 hari</option>
                  <option value={2}>2 hari</option>
                  <option value={3}>3 hari</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="calc-weather" className="field-label">Cuaca lokasi</label>
                <select
                  id="calc-weather"
                  className="field-select"
                  value={cuacaPreset}
                  onChange={(e) => setCuacaPreset(e.target.value as typeof cuacaPreset)}
                >
                  <option value="cerah">Cerah (4 jam puncak)</option>
                  <option value="berawan">Sering mendung (2,5 jam)</option>
                </select>
              </div>
            </div>
          </div>

          <p className="t-micro t-soft" style={{ marginTop: 'auto' }}>
            Perhitungan tepat: {pPanelWp.toFixed(1).replace('.', ',')} Wp dibulatkan ke panel komersial terdekat {pPanelRounded} Wp (DoD 80%, efisiensi 85%).
          </p>
        </section>
      </div>
    </div>
  );
};
