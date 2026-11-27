'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

/* Satu contoh foto benar & satu contoh foto salah sebelum memindai.
   Contoh salah memakai gambar kartun karena itu yang memang ditolak AI (bukan tanaman asli). */
export const ScanPhotoExamples: React.FC = () => (
  <section className="scan-examples" aria-label="Contoh foto yang benar dan salah">
    <div className="scan-examples-title">Contoh foto</div>

    <figure className="scan-ex scan-ex--good">
      <div className="scan-ex-img">
        <img
          src="/images/farmer-tomato-hands.jpg"
          alt="Contoh foto benar: buah tomat asli difoto dekat dan fokus"
          loading="lazy"
          style={{ transform: 'scale(2.3)', transformOrigin: '44% 60%' }}
        />
      </div>
      <figcaption>
        <span className="scan-ex-title">
          <span className="scan-ex-badge">
            <Check size={12} strokeWidth={3} />
          </span>
          Benar
        </span>
        <span>Tanaman asli, dekat 20–40 cm, fokus, dan terang.</span>
      </figcaption>
    </figure>

    <figure className="scan-ex scan-ex--bad">
      <div className="scan-ex-img scan-ex-img--plain">
        <img
          src="/mascot/pak-cermat/03_petani_mengamati_tomat.png"
          alt="Contoh foto salah: gambar kartun, bukan tanaman asli"
          loading="lazy"
        />
      </div>
      <figcaption>
        <span className="scan-ex-title">
          <span className="scan-ex-badge">
            <X size={12} strokeWidth={3} />
          </span>
          Salah
        </span>
        <span>Gambar kartun, foto dari layar, atau foto buram & gelap.</span>
      </figcaption>
    </figure>
  </section>
);
