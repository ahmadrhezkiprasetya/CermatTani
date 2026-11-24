'use client';

import React, { useState } from 'react';
import { ArrowRight, Camera, Check, Leaf, Sprout } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { PakCermatMascot } from '../components/PakCermatMascot';
import { PlantSearchInput } from '../components/PlantSearchInput';

/* Layar Onboarding — Karakter Pendamping Pak Cermat sesuai DESIGN.md v2.0 §8.2 & §8.3 */
export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding, setActiveScreen, state } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userName, setUserName] = useState(state.user.nama || 'Pak Joko');
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [plantName, setPlantName] = useState('Cabai Rawit #01');
  const [varietas, setVarietas] = useState('Cabai Rawit');
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
      varietas: varietas.trim() || 'Tanaman Kebun',
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
        {/* Panel Kiri: Pak Cermat Menyambut (Cerah & Segar) */}
        <aside className="onboarding-showcase">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span className="pill pill-ok">
              CermatTani
            </span>
            <button
              type="button"
              onClick={() => setActiveScreen('landing')}
              className="btn-secondary"
              style={{
                minHeight: 32,
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: '0.76rem',
              }}
            >
              Halaman Publik
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <div key={step} className="pose-swap ambient-float">
              <PakCermatMascot
                pose={step === 1 ? 'jempol' : step === 2 ? 'bibit' : 'tomat'}
                height={220}
              />
            </div>
            <div key={`title-${step}`} className="step-transition">
              <div className="font-display" style={{ fontSize: '1.35rem', color: 'var(--ink)' }}>
                {step === 1
                  ? 'Selamat datang di CermatTani'
                  : step === 2
                    ? 'Siapkan kebun pertamamu'
                    : 'Catat tanaman untuk dipantau'}
              </div>
              <p className="t-small t-soft" style={{ marginTop: 6 }}>
                Pak Cermat menemani pengaturan awal kurang dari 2 menit. Di dalam aplikasi nanti,
                asisten CermatTani akan siap memeriksa fotomu.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="pill" style={{ background: 'var(--surface)', color: 'var(--leaf-700)', border: '1px solid var(--line)' }}>
              WCAG 2.2 AA
            </span>
            <span className="pill" style={{ background: 'var(--surface)', color: 'var(--leaf-700)', border: '1px solid var(--line)' }}>
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
                    background: active ? 'var(--leaf-600)' : done ? 'var(--ok-bg)' : 'var(--surface-2)',
                    color: active ? '#FFFFFF' : done ? 'var(--ok-fg)' : 'var(--ink-soft)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    transition: 'background 240ms var(--ease-out), color 240ms var(--ease-out), transform 200ms var(--ease-out)',
                  }}
                >
                  <span>{done ? '✓' : item.id}</span>
                  <span>{item.title}</span>
                </div>
              );
            })}
          </div>

          {step === 1 && (
            <div key="ob-step-1" className="step-transition" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h1 className="t-h1" style={{ marginBottom: 8 }}>
                  Kelola kebunmu lebih cermat hari ini.
                </h1>
                <p className="t-body t-soft">
                  Pantau kematangan dan pertumbuhan beragam tanaman (cabai, tomat, sayuran daun, pangan,
                  hingga buah kebun), kenali gejala penyakit dengan langkah organik lebih dulu, serta pantau
                  kelembapan tanah dan surya.
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
            <div key="ob-step-2" className="step-transition" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  placeholder="Contoh: Kebun Sayur Blok B atau Polybag Teras"
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
            <div key="ob-step-3" className="step-transition" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    placeholder="Contoh: Cabai Rawit #01 atau Selada #01"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="ob-var" className="field-label">
                    Jenis / varietas tanaman (bisa semua tanaman)
                  </label>
                  <PlantSearchInput
                    id="ob-var"
                    value={varietas}
                    onChange={(next) => {
                      setVarietas(next);
                      if (next.trim() && (!plantName.trim() || plantName.endsWith('#01'))) {
                        setPlantName(`${next.trim()} #01`);
                      }
                    }}
                    placeholder="Cari atau ketik bebas (Cabai, Bawang, Padi, Durian, Anggrek...)"
                  />
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
