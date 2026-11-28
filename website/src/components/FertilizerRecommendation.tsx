'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, FlaskConical, Leaf, Sprout } from 'lucide-react';
import { KNOWLEDGE_NUTRIENTS } from '../data/knowledgeBase';
import type { GrowthPhase } from '../types/cermattani';

const PHASES: GrowthPhase[] = ['Bibit', 'Vegetatif', 'Berbunga', 'Berbuah', 'Panen'];

interface Props {
  /** ID hara dari hasil scan ('cukup' bila seimbang). */
  haraId: string;
  /** Fase tumbuh awal (dari tanaman yang dipilih, atau perkiraan dari foto). */
  defaultPhase: GrowthPhase;
  plantName: string;
  /** Nama penyakit bila tanaman sedang sakit (null bila sehat). */
  diseaseName: string | null;
  /** Rekomendasi memakai data sensor tanah (true) atau hanya dugaan dari foto (false). */
  withSensor: boolean;
}

/* Rekomendasi pupuk pada hasil scan — diambil dari Dataset Agronomi CermatTani (0 token AI tambahan) */
export const FertilizerRecommendation: React.FC<Props> = ({
  haraId,
  defaultPhase,
  plantName,
  diseaseName,
  withSensor,
}) => {
  const [phase, setPhase] = useState<GrowthPhase>(defaultPhase);
  useEffect(() => setPhase(defaultPhase), [defaultPhase]);

  const info = KNOWLEDGE_NUTRIENTS[haraId] || KNOWLEDGE_NUTRIENTS.cukup;
  if (!info) return null;
  const isDeficient = info.id !== 'cukup';

  return (
    <section className="card scan-fert" aria-label="Rekomendasi pupuk">
      <div className="scan-fert-head">
        <h3 className="t-h3 scan-fert-title">
          <FlaskConical size={19} /> Rekomendasi pupuk
        </h3>
        <span className={`pill ${isDeficient ? 'pill-warn' : 'pill-ok'}`}>{isDeficient ? info.dugaan : 'Hara seimbang'}</span>
        <span className={`pill ${withSensor ? 'pill-ok' : 'pill-neutral'}`}>
          {withSensor ? 'Dengan data sensor' : 'Dugaan dari foto'}
        </span>
      </div>

      {isDeficient && (
        <p className="scan-fert-symptom">
          <strong>Gejala yang dicocokkan:</strong> {info.gejala}
        </p>
      )}

      <div className="scan-fert-phase">
        <span>Fase tumbuh {plantName}:</span>
        <div className="scan-fert-chips" role="radiogroup" aria-label="Pilih fase tumbuh">
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={phase === p}
              className={`scan-fert-chip ${phase === p ? 'is-active' : ''}`}
              onClick={() => setPhase(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="scan-fert-grid">
        <div className="scan-fert-card scan-fert-card--organic">
          <span className="scan-fert-card-head">
            <Leaf size={15} /> Organik lebih dulu
          </span>
          <p>{info.rekomendasiOrganik}</p>
        </div>
        <div className="scan-fert-card">
          <span className="scan-fert-card-head">
            <Sprout size={15} /> Pupuk anjuran
          </span>
          <p>{info.rekomendasiPupuk}</p>
        </div>
        <div className="scan-fert-card scan-fert-card--dose">
          <span className="scan-fert-card-head">
            <CalendarDays size={15} /> Dosis fase {phase}
          </span>
          <p>{info.dosisPerFase[phase]}</p>
        </div>
      </div>

      {diseaseName && (
        <p className="scan-fert-warning">
          <AlertTriangle size={15} /> Tanaman sedang terserang <strong>{diseaseName}</strong>. Tunda pupuk tinggi
          Nitrogen (Urea/ZA) sampai gejala terkendali; utamakan pengendalian penyakit dan pupuk organik dulu.
        </p>
      )}

      <p className="scan-fert-source">
        Sumber: {info.sumber} · Dosis umum per tanaman, <strong>bukan pengganti uji tanah</strong>.
      </p>
    </section>
  );
};
