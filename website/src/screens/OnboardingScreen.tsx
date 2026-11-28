'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Camera, Check, Leaf, Sprout } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { PakCermatMascot } from '../components/PakCermatMascot';
import { PlantSearchInput } from '../components/PlantSearchInput';

/* Layar Onboarding — Selaras DESIGN.md (token warna CermatTani, radius pill/12/28px, tipografi dua-nada) */
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
    { id: 1 as const, title: 'Profil' },
    { id: 2 as const, title: 'Kebun' },
    { id: 3 as const, title: 'Tanaman' },
  ];

  const showcaseMeta =
    step === 1
      ? {
          pose: 'jempol' as const,
          eyebrow: '• Langkah 1 dari 3',
          title: 'Selamat datang di CermatTani',
          desc: 'Pengaturan awal kurang dari 2 menit. Di dalam aplikasi nanti, Pak Cermat siap memeriksa foto tanamanmu.',
        }
      : step === 2
        ? {
            pose: 'bibit' as const,
            eyebrow: '• Langkah 2 dari 3',
            title: 'Siapkan kebun pertamamu',
            desc: 'Catat nama dan lokasi kebun agar pengingat cuaca, irigasi, dan jadwal panen lebih relevan.',
          }
        : {
            pose: 'tomat' as const,
            eyebrow: '• Langkah 3 dari 3',
            title: 'Catat tanaman untuk dipantau',
            desc: 'Setiap hasil scan otomatis tersimpan di timeline tanaman sehingga estimasi panen makin akurat.',
          };

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-split ob-card-shell">
        {/* Panel Kiri: Showcase Pak Cermat */}
        <aside className="onboarding-showcase ob-showcase">
          <div className="ob-showcase-top">
            <span className="ob-brand-pill">
              <Sprout size={14} /> CermatTani
            </span>
            <button
              type="button"
              onClick={() => setActiveScreen('landing')}
              className="ob-public-btn"
            >
              <span>Halaman Publik</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="ob-showcase-center">
            <div key={step} className="ob-mascot-frame pose-swap">
              <PakCermatMascot pose={showcaseMeta.pose} height={206} />
            </div>

            <div key={`title-${step}`} className="ob-showcase-copy step-transition">
              <span className="ob-eyebrow">{showcaseMeta.eyebrow}</span>
              <h2 className="ob-showcase-title">{showcaseMeta.title}</h2>
              <p className="ob-showcase-desc">{showcaseMeta.desc}</p>
            </div>
          </div>

          <div className="ob-showcase-foot">
            <div className="ob-progress-track" aria-hidden="true">
              <span style={{ width: `${(step / 3) * 100}%` }} />
            </div>
            <div className="ob-showcase-chips">
              <span className="ob-meta-chip">
                <Leaf size={13} /> Solusi Organik Dulu
              </span>
              <span className="ob-meta-chip">
                <Check size={13} /> Siap Sinyal Lemah
              </span>
            </div>
          </div>
        </aside>

        {/* Panel Kanan: Formulir 3 Langkah */}
        <section className="onboarding-form-pane ob-form-pane">
          {/* Stepper 3 Langkah dengan garis hubung putus-putus */}
          <nav className="ob-stepper" aria-label="Tahap pengaturan awal">
            {stepLabels.map((item, idx) => {
              const active = item.id === step;
              const done = item.id < step;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    className={`ob-step-pill ${active ? 'is-active' : done ? 'is-done' : ''}`}
                    onClick={() => {
                      if (done || active) setStep(item.id);
                    }}
                    disabled={!done && !active}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span className="ob-step-num">
                      {done ? <Check size={12} strokeWidth={2.6} /> : item.id}
                    </span>
                    <span>{item.title}</span>
                  </button>
                  {idx < stepLabels.length - 1 && (
                    <span
                      className={`ob-step-connector ${done ? 'is-done' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {step === 1 && (
            <div key="ob-step-1" className="ob-step-body step-transition">
              <header className="ob-step-header">
                <h1 className="ob-heading">
                  Kelola kebunmu <span>lebih cermat hari ini.</span>
                </h1>
                <p className="ob-lead">
                  Pantau kematangan dan pertumbuhan beragam tanaman (cabai, tomat, sayuran daun, pangan,
                  hingga buah kebun), kenali gejala penyakit dengan langkah organik lebih dulu, serta pantau
                  kelembapan tanah dan surya.
                </p>
              </header>

              <div className="ob-fields">
                <div className="field-group">
                  <label htmlFor="ob-name" className="field-label">
                    Nama panggilanmu
                  </label>
                  <input
                    id="ob-name"
                    className="field-input ob-input"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Contoh: Pak Joko atau Bu Rina"
                  />
                </div>

                <div className="ob-feature-chips">
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
              </div>

              <div className="ob-actions">
                <button
                  type="button"
                  className="btn-secondary ob-pill-btn"
                  onClick={() => completeOnboarding({ userName, goToScan: false })}
                >
                  Langsung ke dasbor contoh
                </button>
                <button
                  type="button"
                  className="btn-primary ob-pill-btn"
                  onClick={() => setStep(2)}
                >
                  <span>Mulai atur kebun</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div key="ob-step-2" className="ob-step-body step-transition">
              <header className="ob-step-header">
                <h1 className="ob-heading">
                  Buat kebun <span>pertamamu</span>
                </h1>
                <p className="ob-lead">
                  Mendukung kebun terbuka, bedengan, maupun polybag di rumah. Kosongkan bila ingin
                  memakai kebun contoh Pak Joko.
                </p>
              </header>

              <div className="ob-fields">
                <div className="field-group">
                  <label htmlFor="ob-farm" className="field-label">
                    Nama kebun
                  </label>
                  <input
                    id="ob-farm"
                    className="field-input ob-input"
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
                    className="field-input ob-input"
                    value={farmLocation}
                    onChange={(e) => setFarmLocation(e.target.value)}
                    placeholder="Contoh: Ciawi, Bogor"
                  />
                </div>
              </div>

              <div className="ob-actions">
                <button
                  type="button"
                  className="btn-ghost ob-back-btn"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} /> Kembali
                </button>
                <button
                  type="button"
                  className="btn-primary ob-pill-btn"
                  onClick={() => setStep(3)}
                >
                  <span>Lanjut tambah tanaman</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div key="ob-step-3" className="ob-step-body step-transition">
              <header className="ob-step-header">
                <h1 className="ob-heading">
                  Catat satu tanaman <span>untuk dipantau</span>
                </h1>
                <p className="ob-lead">
                  Setiap hasil scan akan tersimpan di timeline tanaman agar perkiraan panen makin
                  akurat.
                </p>
              </header>

              <div className="ob-fields">
                <div className="ob-field-row-2">
                  <div className="field-group">
                    <label htmlFor="ob-plant" className="field-label">
                      Nama tanaman / petak
                    </label>
                    <input
                      id="ob-plant"
                      className="field-input ob-input"
                      value={plantName}
                      onChange={(e) => setPlantName(e.target.value)}
                      placeholder="Contoh: Cabai Rawit #01 atau Selada #01"
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="ob-var" className="field-label">
                      Jenis / varietas tanaman
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
                      placeholder="Cari atau ketik bebas (Cabai, Tomat, Padi...)"
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
                    className="field-input ob-input"
                    value={tanggalTanam}
                    onChange={(e) => setTanggalTanam(e.target.value)}
                  />
                </div>
              </div>

              <div className="ob-actions ob-actions--final">
                <button
                  type="button"
                  className="btn-ghost ob-back-btn"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={16} /> Kembali
                </button>
                <div className="ob-actions-group">
                  <button
                    type="button"
                    className="btn-secondary ob-pill-btn"
                    onClick={() => handleFinish(false)}
                  >
                    <Sprout size={17} /> Buka dasbor
                  </button>
                  <button
                    type="button"
                    className="btn-tomato ob-pill-btn"
                    onClick={() => handleFinish(true)}
                  >
                    <Camera size={17} /> Selesai &amp; scan sekarang
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
