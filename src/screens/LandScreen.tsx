'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Download,
  Droplets,
  Power,
  ShieldAlert,
  Sliders,
  Sun,
  Thermometer,
  Waves,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { IrrigationSoilVisual, WaterTankVisual } from '../components/Illustrations';
import { GreenAreaChart } from '../components/Charts';
import { downloadCsv } from '../utils/scanAnalyzer';

/* Layar 7: Lahan — Sensor IoT (F8), Irigasi Otomatis (F10), Risiko Penyakit (F11), Tandon (F12) */
export const LandScreen: React.FC = () => {
  const { state, updateSettings, updateSensor, triggerManualPump, openScanWith } = useApp();
  const [chartMetric, setChartMetric] = useState<'tanah' | 'suhu' | 'udara' | 'cahaya'>('tanah');
  const [pumpFeedback, setPumpFeedback] = useState<string>('');

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
    tanah: { unit: '%', color: '#1F9D55', label: 'Kelembapan tanah' },
    suhu: { unit: '°C', color: '#F2562B', label: 'Suhu udara' },
    udara: { unit: '%', color: '#2B8FD9', label: 'Kelembapan udara' },
    cahaya: { unit: 'k lux', color: '#FFB63D', label: 'Cahaya (BH1750)' },
  }[chartMetric];

  const handleManualPump = () => {
    const res = triggerManualPump(!settings.pompaMenyala);
    setPumpFeedback(res.message);
  };

  const handleExportSensorCsv = () => {
    const headers = [
      'Jam',
      'Kelembapan Tanah (%)',
      'Suhu Udara (°C)',
      'Kelembapan Udara (%)',
      'Cahaya (lux)',
      'Status Data',
    ];
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header + Lencana Simulasi (F8.3, X3) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="t-h1">Lahan, irigasi & tandon</h2>
            <span className="pill pill-sim">Simulasi</span>
          </div>
          <p className="t-small t-soft">
            Perangkat: {state.devices[0]?.id} ({state.devices[0]?.tipe}) · Data simulasi diberi lencana
            ungu di semua tampilan.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleExportSensorCsv}>
          <Download size={18} /> Ekspor sensor CSV
        </button>
      </div>

      {/* F11.3: Peringatan risiko penyakit HANYA muncul saat ambang kelembapan udara terlewati */}
      {isDiseaseRisk && (
        <div className="alert-card alert-card--warn" role="alert">
          <CermoMascot pose="worried" size={60} interactive={false} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong className="t-h3">Peringatan dini risiko penyakit daun!</strong>
              <span className="pill pill-sim">Simulasi</span>
            </div>
            <p className="t-small" style={{ marginTop: 4 }}>
              Kelembapan udara <strong>{sensor.kelembapanUdara}%</strong> (melewati ambang{' '}
              {settings.ambangKelembapanRisikoPenyakit}%) pada suhu {sensor.suhuUdara} °C. Kondisi ini
              meningkatkan risiko jamur busuk daun (<em>Phytophthora infestans</em>). Sumber ambang:
              Balitsa Kementan RI (≥ 85% RH pada 18–26 °C).
            </p>
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn-tomato" onClick={() => openScanWith('daun')}>
                <Camera size={18} /> Scan penyakit sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nilai Sensor Terbaru (F8.1, F8.2, F11.1) */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: 12,
        }}
      >
        {[
          {
            label: 'Kelembapan tanah',
            value: `${sensor.kelembapanTanah}%`,
            sub: sensor.kelembapanTanah < settings.ambangTanahBawah ? 'Kering — perlu siram' : 'Cukup lembap',
            icon: Droplets,
            color: '#2B8FD9',
          },
          {
            label: 'Suhu udara (DHT22)',
            value: `${sensor.suhuUdara} °C`,
            sub: 'Ideal tomat 20–28 °C',
            icon: Thermometer,
            color: '#F2562B',
          },
          {
            label: 'Kelembapan udara',
            value: `${sensor.kelembapanUdara}%`,
            sub: isDiseaseRisk ? 'Di atas ambang risiko' : `Aman (< ${settings.ambangKelembapanRisikoPenyakit}%)`,
            icon: Waves,
            color: isDiseaseRisk ? '#E5484D' : '#1F9D55',
          },
          {
            label: 'Cahaya (BH1750)',
            value: `${(sensor.cahayaLux / 1000).toFixed(1)}k lux`,
            sub: 'Penyinaran siang hari',
            icon: Sun,
            color: '#FFB63D',
          },
          {
            label: 'NPK tanah (opsional)',
            value: `${sensor.nitrogenMgKg}/${sensor.fosforMgKg}/${sensor.kaliumMgKg}`,
            sub: 'mg/kg · N / P / K',
            icon: Sliders,
            color: '#7A6CF0',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Icon size={20} strokeWidth={1.75} color={card.color} />
                <span className="pill pill-sim" style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
                  Simulasi
                </span>
              </div>
              <div className="font-display tabular-nums" style={{ fontSize: '1.65rem', lineHeight: 1.15 }}>
                {card.value}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{card.label}</div>
              <div className="t-micro t-soft">{card.sub}</div>
            </div>
          );
        })}
      </section>

      {/* Grafik 24 Jam (F8.2) */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="t-h3">Grafik sensor 24 jam</h3>
              <span className="pill pill-sim">Simulasi</span>
            </div>
            <p className="t-small t-soft">Sentuh atau arahkan kursor ke titik grafik untuk melihat nilai</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                className={chartMetric === tab.id ? 'btn-primary' : 'btn-secondary'}
                style={{ minHeight: 40, padding: '6px 14px', fontSize: '0.875rem', boxShadow: 'none' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <GreenAreaChart points={chartData} unit={chartMeta.unit} color={chartMeta.color} height={195} />
      </section>

      {/* Grid Irigasi Otomatis (F10) & Level Air Tandon (F12) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 20 }}>
        {/* F10: Irigasi Otomatis */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="t-h2">Irigasi otomatis</h3>
                <span className="pill pill-sim">Simulasi</span>
              </div>
              <p className="t-small t-soft">
                Nyala &lt; {settings.ambangTanahBawah}% · Mati ≥ {settings.ambangTanahAtas}%
              </p>
            </div>
            {/* Toggle Irigasi 56×32 (DESIGN.md §7) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-small" style={{ fontWeight: 700 }}>
                Auto
              </span>
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

          {/* Visualisasi tetes air & tanah menggelap saat pompa menyala */}
          <IrrigationSoilVisual pumpOn={settings.pompaMenyala} moisture={sensor.kelembapanTanah} />

          {/* Status pompa + tombol manual + batas durasi (F10.2) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`pill ${settings.pompaMenyala ? 'pill-water' : 'pill-neutral'}`}>
                <Power size={14} /> Pompa: {settings.pompaMenyala ? 'Menyala' : 'Mati'}
              </span>
              <span className="t-micro t-soft">Batas aman: maks {settings.durasiMaksPompaMenit} menit/siklus</span>
            </div>

            <button
              type="button"
              className={settings.pompaMenyala ? 'btn-danger' : 'btn-primary'}
              onClick={handleManualPump}
              disabled={isTankCritical && !settings.pompaMenyala}
            >
              <Power size={18} /> {settings.pompaMenyala ? 'Matikan pompa' : 'Nyalakan manual'}
            </button>
          </div>

          {isTankCritical && (
            <div className="alert-card alert-card--bad" role="alert">
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <div className="t-small">
                <strong>Interlock aktif (F10.3):</strong> Tandon tinggal {sensor.levelTandonPersen}%. Pompa
                otomatis maupun manual ditahan agar tidak berjalan kering.
              </div>
            </div>
          )}

          {pumpFeedback && !isTankCritical && (
            <div className="card-subtle t-small" role="status">
              {pumpFeedback}
            </div>
          )}

          {/* Pengaturan ambang bawah, atas, dan durasi maks (F10.1, F10.2) */}
          <div className="card-subtle" style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="ambang-bawah" className="t-small" style={{ fontWeight: 600 }}>
                  Ambang bawah (pompa nyala jika &lt;)
                </label>
                <strong className="tabular-nums">{settings.ambangTanahBawah}%</strong>
              </div>
              <input
                id="ambang-bawah"
                type="range"
                min={15}
                max={55}
                value={settings.ambangTanahBawah}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateSettings({
                    ambangTanahBawah: v,
                    ambangTanahAtas: Math.max(v + 10, settings.ambangTanahAtas),
                  });
                }}
                className="range-slider"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="ambang-atas" className="t-small" style={{ fontWeight: 600 }}>
                  Ambang atas (pompa mati saat ≥)
                </label>
                <strong className="tabular-nums">{settings.ambangTanahAtas}%</strong>
              </div>
              <input
                id="ambang-atas"
                type="range"
                min={45}
                max={85}
                value={settings.ambangTanahAtas}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateSettings({
                    ambangTanahAtas: v,
                    ambangTanahBawah: Math.min(v - 10, settings.ambangTanahBawah),
                  });
                }}
                className="range-slider"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="durasi-maks" className="t-small" style={{ fontWeight: 600 }}>
                  Pengaman durasi maksimum per siklus
                </label>
                <strong className="tabular-nums">{settings.durasiMaksPompaMenit} menit</strong>
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

        {/* F12: Pemantauan Level Air Tandon + Kontrol Uji Simulasi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="t-h2">Level air tandon</h3>
                <span className="pill pill-sim">Simulasi</span>
              </div>
              <span className={`pill ${isTankCritical ? 'pill-bad' : 'pill-water'}`}>
                {isTankCritical ? 'Kritis (< 20%)' : 'Aman'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <WaterTankVisual levelPercent={sensor.levelTandonPersen} isLow={isTankCritical} />
              <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="font-display tabular-nums" style={{ fontSize: '2.4rem', lineHeight: 1.05 }}>
                  {sensor.levelTandonPersen}%
                </div>
                <div style={{ fontWeight: 700 }} className="tabular-nums">
                  ≈ {tankLiters} liter / {sensor.kapasitasTandonLiter} liter
                </div>
                <div className="t-small t-soft tabular-nums">
                  Jarak sensor ultrasonik ke air: <strong>{sensor.jarakUltrasonikCm} cm</strong> (tinggi
                  tandon {sensor.tinggiTandonCm} cm)
                </div>
                {isTankCritical && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <CermoMascot pose="water" size={48} interactive={false} />
                    <span className="t-small" style={{ color: 'var(--bad)', fontWeight: 600 }}>
                      "Tandon tinggal {sensor.levelTandonPersen}%. Pompa kutahan dulu supaya tidak kering."
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Panel Uji Simulasi Sensor ESP32 (memudahkan demo F3.3, F10, F11, F12) */}
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3 className="t-h3">Kontrol uji sensor ESP32</h3>
              <span className="pill pill-sim">Simulasi</span>
            </div>
            <p className="t-micro t-soft">
              Geser nilai di bawah untuk menguji otomatisasi pompa, interlock tandon &lt; 20%, atau
              peringatan risiko penyakit ≥ {settings.ambangKelembapanRisikoPenyakit}% RH.
            </p>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-small">Simulasi kelembapan tanah</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-small">Simulasi kelembapan udara (DHT22)</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-small">Simulasi level air tandon (Ultrasonik)</span>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <span className="t-small">Status data sensor ke rekomendasi pupuk (F3.3)</span>
              <button
                type="button"
                className="btn-secondary"
                style={{ minHeight: 40, padding: '6px 12px', fontSize: '0.8125rem' }}
                onClick={() => updateSensor({ sensorTersedia: !sensor.sensorTersedia })}
              >
                {sensor.sensorTersedia ? 'Aktif (Dengan data sensor)' : 'Nonaktif (Dugaan visual)'}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* F10.4: Riwayat Siklus Pompa */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="t-h3">Riwayat siklus pompa</h3>
          <span className="pill pill-sim">Simulasi</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                <th className="t-small t-soft" style={{ padding: '10px 8px' }}>Waktu</th>
                <th className="t-small t-soft" style={{ padding: '10px 8px' }}>Mode</th>
                <th className="t-small t-soft" style={{ padding: '10px 8px' }}>Durasi</th>
                <th className="t-small t-soft" style={{ padding: '10px 8px' }}>Kelembapan tanah</th>
              </tr>
            </thead>
            <tbody>
              {state.irrigationEvents.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="t-small tabular-nums" style={{ padding: '12px 8px' }}>
                    {new Date(ev.mulai).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className={`pill ${ev.mode === 'Otomatis' ? 'pill-ok' : 'pill-water'}`}>
                      {ev.mode}
                    </span>
                  </td>
                  <td className="t-small tabular-nums" style={{ padding: '12px 8px' }}>
                    {ev.durasiMenit} menit
                  </td>
                  <td className="t-small tabular-nums" style={{ padding: '12px 8px', fontWeight: 600 }}>
                    {ev.kelembapanAwal}% → {ev.kelembapanAkhir}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
