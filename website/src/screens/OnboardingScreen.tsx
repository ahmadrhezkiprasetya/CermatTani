'use client';

import React, { useState } from 'react';
import { ArrowRight, Camera, Check, Sprout } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { GardenLandscapeIllustration } from '../components/Illustrations';

/* Layar 1: Onboarding (3 langkah, Cermo melambai, target < 2 menit — PRD §6, §10, X5) */
export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding, state } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userName, setUserName] = useState(state.user.nama || 'Pak Joko');
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [plantName, setPlantName] = useState('Tomat Servo #01');
  const [varietas, setVarietas] = useState('Servo F1');
  const [tanggalTanam, setTanggalTanam] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 45);
    return d.toISOString().slice(0, 10);
  });

  const handleFinish = (goToScan: boolean) => {
    completeOnboarding({
      userName,
      farmName: farmName.trim() || undefined,
      farmLocation: farmLocation.trim() || undefined,
      plantName: farmName.trim() ? plantName : undefined,
      varietas,
      tanggalTanam,
      goToScan,
    });
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'grid',
        placeItems: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="card page-enter"
        style={{
          width: 'min(760px, 100%)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Ilustrasi kebun datar di bagian atas (tanpa teks di dalam SVG) */}
        <div style={{ position: 'relative' }}>
          <GardenLandscapeIllustration height={190} />
          <div
            style={{
              position: 'absolute',
              bottom: -36,
              left: 28,
              background: 'var(--surface)',
              borderRadius: '50%',
              padding: 8,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <CermoMascot pose={step === 3 ? 'happy' : 'wave'} size={96} />
          </div>
        </div>

        <div style={{ padding: '48px 28px 28px' }}>
          {/* Indikator 3 langkah */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  height: 8,
                  flex: 1,
                  borderRadius: '999px',
                  background: s <= step ? 'var(--leaf-600)' : 'var(--line)',
                  transition: 'background 220ms ease',
                }}
              />
            ))}
            <span className="t-micro t-soft" style={{ fontWeight: 700, marginLeft: 4 }}>
              Langkah {step} dari 3
            </span>
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h1 className="t-display" style={{ marginBottom: 8 }}>
                  Halo! Kelola kebunmu lebih mudah bersama Cermo.
                </h1>
                <p className="t-body t-soft">
                  CermatTani membantu memantau tomat, cabai, sayuran, tanah, irigasi, dan penggunaan
                  energi surya — cukup dengan foto atau data sensor.
                </p>
              </div>

              <div className="field-group">
                <label htmlFor="ob-name" className="field-label">
                  Siapa nama panggilanmu?
                </label>
                <input
                  id="ob-name"
                  className="field-input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Contoh: Pak Joko atau Bu Rina"
                />
              </div>

              <div className="card-subtle" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span className="pill pill-ok">
                  <Check size={14} /> Banyak jenis tanaman
                </span>
                <span className="pill pill-ok">
                  <Check size={14} /> Solusi organik lebih dulu
                </span>
                <span className="pill pill-ok">
                  <Check size={14} /> Bisa dipakai di sinyal lemah
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                <button type="button" className="btn-primary" onClick={() => setStep(2)}>
                  Mulai atur kebun <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => completeOnboarding({ userName, goToScan: false })}
                >
                  Langsung lihat kebun contoh
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 className="t-h1" style={{ marginBottom: 6 }}>
                  Buat kebun pertamamu
                </h2>
                <p className="t-body t-soft">
                  Kamu bisa menambahkan kebun terbuka, polybag, atau bedengan dengan jenis tanaman apa pun.
                  Kosongkan bila ingin memakai kebun contoh Pak Joko.
                </p>
              </div>

              <div className="field-group">
                <label htmlFor="ob-farm" className="field-label">
                  Nama kebun
                </label>
                <input
                  id="ob-farm"
                  className="field-input"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="Contoh: Kebun Tomat Blok B atau Polybag Teras"
                />
              </div>

              <div className="field-group">
                <label htmlFor="ob-loc" className="field-label">
                  Lokasi kebun
                </label>
                <input
                  id="ob-loc"
                  className="field-input"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  placeholder="Contoh: Ciawi, Bogor"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
                  Kembali
                </button>
                <button type="button" className="btn-primary" onClick={() => setStep(3)}>
                  Lanjut tambah tanaman <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 className="t-h1" style={{ marginBottom: 6 }}>
                  Catat satu tanaman untuk dipantau
                </h2>
                <p className="t-body t-soft">
                  Setiap hasil scan akan disimpan ke timeline tanaman ini agar perkiraan panen makin
                  akurat.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div className="field-group">
                  <label htmlFor="ob-plant" className="field-label">
                    Nama tanaman / rumpun
                  </label>
                  <input
                    id="ob-plant"
                    className="field-input"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    placeholder="Contoh: Tomat Servo #01"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="ob-var" className="field-label">
                    Jenis / varietas tanaman
                  </label>
                  <select
                    id="ob-var"
                    className="field-select"
                    value={varietas}
                    onChange={(e) => setVarietas(e.target.value)}
                  >
                    <option value="Servo F1">Servo F1 (dataran rendah–menengah)</option>
                    <option value="Gustavi">Gustavi (buah besar)</option>
                    <option value="Tomat Ceri">Tomat Ceri (polybag/urban)</option>
                    <option value="Rampai">Tomat Rampai</option>
                    <option value="Lokal">Varietas Lokal</option>
                    <option value="Cabai Rawit">Cabai Rawit</option>
                    <option value="Cabai Besar">Cabai Besar</option>
                    <option value="Selada Keriting">Selada Keriting</option>
                    <option value="Bayam Hijau">Bayam Hijau</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="ob-date" className="field-label">
                  Tanggal tanam
                </label>
                <input
                  id="ob-date"
                  type="date"
                  className="field-input"
                  value={tanggalTanam}
                  onChange={(e) => setTanggalTanam(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                <button type="button" className="btn-tomato" onClick={() => handleFinish(true)}>
                  <Camera size={18} /> Selesai & langsung scan
                </button>
                <button type="button" className="btn-primary" onClick={() => handleFinish(false)}>
                  <Sprout size={18} /> Masuk ke Beranda
                </button>
                <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
                  Kembali
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
