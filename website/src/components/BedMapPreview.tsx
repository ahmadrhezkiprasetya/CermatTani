'use client';

import React, { useState } from 'react';

type PlantStatus = 'siap' | 'setengah' | 'mentah' | 'cek';

const STATUS_INFO: Record<PlantStatus, { label: string; saran: string }> = {
  siap: { label: 'Siap petik', saran: 'Petik besok pagi sebelum 09.00.' },
  setengah: { label: 'Setengah matang', saran: 'Perkiraan siap 3–5 hari lagi.' },
  mentah: { label: 'Masih mentah', saran: 'Jaga kelembapan tanah, cek lagi minggu depan.' },
  cek: { label: 'Perlu dicek', saran: 'Ada bercak di daun bawah — foto & scan daunnya.' },
};

/* Contoh kebun percontohan: 3 bedengan × 5 tanaman */
const BEDS: PlantStatus[][] = [
  ['siap', 'siap', 'setengah', 'siap', 'mentah'],
  ['siap', 'cek', 'siap', 'siap', 'setengah'],
  ['siap', 'siap', 'setengah', 'cek', 'siap'],
];

/* Peta bedengan interaktif di landing page — sorot/ketuk tanaman untuk melihat status & saran */
export const BedMapPreview: React.FC = () => {
  const [active, setActive] = useState<{ bed: number; slot: number } | null>({ bed: 1, slot: 1 });
  const all = BEDS.flat();
  const count = (s: PlantStatus) => all.filter((x) => x === s).length;
  const current = active ? BEDS[active.bed][active.slot] : null;

  return (
    <div className="lp-bedmap" aria-label="Contoh peta bedengan kebun">
      <div className="lp-bedmap-head">
        <span>
          <strong>Peta bedengan · Kebun Blok A</strong>
          <small>Sorot atau ketuk tanaman untuk melihat statusnya</small>
        </span>
        <span className="lp-bedmap-badge">Contoh</span>
      </div>

      <div className="lp-bedmap-beds">
        {BEDS.map((bed, b) => (
          <div key={b} className="lp-bedmap-row">
            <span className="lp-bedmap-bed-label">B{b + 1}</span>
            <div className="lp-bedmap-soil">
              {bed.map((status, i) => {
                const isActive = active?.bed === b && active.slot === i;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`lp-bedmap-plant lp-bedmap-plant--${status} ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => setActive({ bed: b, slot: i })}
                    onFocus={() => setActive({ bed: b, slot: i })}
                    onClick={() => setActive({ bed: b, slot: i })}
                    aria-label={`Bedengan ${b + 1} tanaman ${i + 1}: ${STATUS_INFO[status].label}`}
                  >
                    <span className="lp-bedmap-fruit" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="lp-bedmap-info" aria-live="polite">
        {current && active ? (
          <>
            <span className={`lp-bedmap-dot lp-bedmap-dot--${current}`} />
            <span>
              <strong>
                B{active.bed + 1} · Tanaman {active.slot + 1}: {STATUS_INFO[current].label}
              </strong>
              <small>{STATUS_INFO[current].saran}</small>
            </span>
          </>
        ) : null}
      </div>

      <div className="lp-bedmap-legend">
        <span>
          <i className="lp-bedmap-dot lp-bedmap-dot--siap" /> Siap petik <b>{count('siap')}</b>
        </span>
        <span>
          <i className="lp-bedmap-dot lp-bedmap-dot--setengah" /> Setengah <b>{count('setengah')}</b>
        </span>
        <span>
          <i className="lp-bedmap-dot lp-bedmap-dot--mentah" /> Mentah <b>{count('mentah')}</b>
        </span>
        <span>
          <i className="lp-bedmap-dot lp-bedmap-dot--cek" /> Perlu dicek <b>{count('cek')}</b>
        </span>
      </div>
    </div>
  );
};
