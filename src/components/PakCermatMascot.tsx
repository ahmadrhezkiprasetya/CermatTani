'use client';

import React from 'react';

export type PakCermatPose =
  | 'analisis'
  | 'inspeksi'
  | 'tomat'
  | 'cabai'
  | 'bibit'
  | 'tanah'
  | 'catat'
  | 'jempol';

const POSE_ASSETS: Record<
  PakCermatPose,
  { src: string; alt: string; trimLeft?: number }
> = {
  analisis: {
    src: '/mascot/pak-cermat/01_petani_menganalisis_daun.png',
    alt: 'Pak Cermat sedang menganalisis kondisi tanaman',
  },
  inspeksi: {
    src: '/mascot/pak-cermat/02_petani_memeriksa_tanaman.png',
    alt: 'Pak Cermat memeriksa daun dengan kaca pembesar',
  },
  tomat: {
    src: '/mascot/pak-cermat/03_petani_mengamati_tomat.png',
    alt: 'Pak Cermat mengamati buah tomat segar',
  },
  cabai: {
    src: '/mascot/pak-cermat/04_petani_menganalisis_cabai.png',
    alt: 'Pak Cermat mengamati tanaman cabai',
  },
  bibit: {
    src: '/mascot/pak-cermat/05_petani_memeriksa_bibit.png',
    alt: 'Pak Cermat memegang bibit tanaman berakar',
  },
  tanah: {
    src: '/mascot/pak-cermat/06_petani_menguji_sampel_tanah.png',
    alt: 'Pak Cermat menguji sampel kesuburan tanah',
    trimLeft: 12,
  },
  catat: {
    src: '/mascot/pak-cermat/07_petani_mencatat_hasil_pengamatan.png',
    alt: 'Pak Cermat mencatat pengamatan di papan klip',
    trimLeft: 8,
  },
  jempol: {
    src: '/mascot/pak-cermat/08_petani_pose_jempol.png',
    alt: 'Pak Cermat memberi jempol semangat',
  },
};

/* Maskot resmi CermatTani (Pak Cermat — 8 pose PNG transparan bersih)
   Digunakan secara konsisten di seluruh website: Landing Page, Onboarding, Sidebar, Dashboard, Scan, Chat, dan semua halaman fitur. */
export const PakCermatMascot: React.FC<{
  pose?: PakCermatPose;
  height?: number;
  className?: string;
  stickerBorder?: boolean;
}> = ({ pose = 'tomat', height = 160, className = '', stickerBorder = false }) => {
  const asset = POSE_ASSETS[pose];
  return (
    <img
      src={asset.src}
      alt={asset.alt}
      loading="eager"
      decoding="async"
      className={className}
      style={{
        height,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
        clipPath: asset.trimLeft ? `inset(0 0 0 ${asset.trimLeft}px)` : undefined,
        transition: 'transform 280ms var(--ease-out), filter 280ms var(--ease-out)',
        filter: stickerBorder
          ? 'drop-shadow(0 6px 12px rgba(36,62,50,0.12))'
          : 'drop-shadow(0 8px 16px rgba(36,62,50,0.12))',
      }}
    />
  );
};
