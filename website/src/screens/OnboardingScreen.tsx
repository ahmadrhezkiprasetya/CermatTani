'use client';

import React, { useState } from 'react';
import { ArrowRight, Camera, Check, Leaf, Sprout } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { PakCermatMascot } from '../components/PakCermatMascot';

/* Layar Onboarding — Karakter Pendamping Pak Cermat sesuai DESIGN.md v2.0 §8.2 & §8.3 */
export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding, setActiveScreen, state } = useApp();
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

  const stepLabels = [
    { id: 1, title: 'Profil' },
    { id: 2, title: 'Kebun' },
    { id: 3, title: 'Tanaman' },
  ] as const;

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-split">
        {/* Panel Kiri: Pak Cermat Menyambut (DESIGN v2.0 §8.2) */}
        <aside className="onboarding-showcase">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span className="pill" style={{ background: 'var(--lime-300)', color: 'var(--on-lime)' }}>
              CermatTani
            </span>
            <button
              type="button"
              onClick={() => setActiveScreen('landing')}
              style={{
                border: '1px solid rgba(255,255,255,0.24)',
                background: 'rgba(255,255,255,0.08)',
                color: '#FFFFFF',
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Halaman Publik
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <PakCermatMascot
              pose={step === 1 ? 'jempol' : step === 2 ? 'bibit' : 'tomat'}
              height={220}
            />
            <div>
              <div className="font-display" style={{ fontSize: '1.35rem', color: '#D8F36A' }}>
                {step === 1
                  ? 'Selamat datang di CermatTani'
                  : step === 2
                    ? 'Siapkan kebun pertamamu'
                    : 'Catat tanaman untuk dipantau'}
              </div>
              <p className="t-small" style={{ color: '#CFE6D8', marginTop: 6 }}>
                Pak Cermat menemani pengaturan awal kurang dari 2 menit. Di dalam aplikasi nanti,
                asisten Cermo akan siap memeriksa fotomu.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
              WCAG 2.2 AA
            </span>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
              Solusi Organik Dulu
            </span>
          </div>
        </aside>

        {/* Panel Kanan: Formulir 3 Langkah */}
        <section className="onboarding-form-pane">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {stepLabels.map((item) => {
              const active = item.id === step;
              const done = item.id < step;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: active ? 'var(--forest-900)' : done ? 'var(--ok-bg)' : 'var(--surface-2)',
                    color: active ? '#D8F36A' : done ? 'var(--ok-fg)' : 'var(--ink-soft)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}
                >
                  <span>{done ? '✓' : item.id}</span>
                  <span>{item.title}</span>
                </div>
              );
            })}
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h1 className="t-h1" style={{ marginBottom: 8 }}>
                  Kelola kebunmu lebih cermat hari ini.
                </h1>
                <p className="t-body t-soft">
                  Pantau kematangan tomat, cabai, dan sayuran, kenali gejala penyakit daun dengan
                  langkah organik lebih dulu, serta pantau kelembapan tanah dan surya.
                </p>
              </div>

              <div className="field-group">
                <label htmlFor="ob-name" className="field-label">
                  Nama panggilanmu
                </label>
                <input
                  id="ob-name"
                  className="field-input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Contoh: Pak Joko atau Bu Rina"
                />
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="pill pill-ok">
                  <Check size={13} /> Banyak jenis tanaman
                </span>
                <span className="pill pill-ok">
                  <Leaf size={13} /> Organik lebih dulu
                </span>
                <span className="pill pill-ok">
                  <Check size={13} /> Siap sinyal lemah (PWA)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                <button type="button" className="btn-primary" onClick={() => setStep(2)}>
                  Mulai atur kebun <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => completeOnboarding({ userName, goToScan: false })}
                >
                  Langsung ke dasbor contoh
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
                  Mendukung kebun terbuka, bedengan, maupun polybag di rumah. Kosongkan bila ingin
                  memakai kebun contoh Pak Joko.
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

              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 6 }}>
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
                  Setiap hasil scan akan tersimpan di timeline tanaman agar perkiraan panen makin
                  akurat.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                <div className="field-group">
                  <label htmlFor="ob-plant" className="field-label">
                    Nama tanaman / petak
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

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                <button type="button" className="btn-tomato" onClick={() => handleFinish(true)}>
                  <Camera size={18} /> Selesai &amp; scan sekarang
                </button>
                <button type="button" className="btn-primary" onClick={() => handleFinish(false)}>
                  <Sprout size={18} /> Buka dasbor
                </button>
                <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
                  Kembali
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
