'use client';

import React, { useState } from 'react';
import { PakCermatMascot, PakCermatPose } from './PakCermatMascot';

export type CermoPose =
  | 'wave'
  | 'scan'
  | 'happy'
  | 'worried'
  | 'water'
  | 'thinking'
  | 'sleep'
  | PakCermatPose;

interface CermoMascotProps {
  pose?: CermoPose;
  size?: number;
  interactive?: boolean;
  tipOverride?: string;
  className?: string;
  label?: string;
  /** Posisi gelembung tips: tengah maskot (bawaan) atau rata kiri (untuk ruang sempit seperti sidebar) */
  tipAlign?: 'center' | 'start';
  /** Lebar maks gelembung tips */
  tipMaxWidth?: number;
}

const POSE_TO_FARMER: Record<CermoPose, PakCermatPose> = {
  wave: 'tomat',
  scan: 'inspeksi',
  happy: 'jempol',
  worried: 'analisis',
  water: 'tanah',
  thinking: 'catat',
  sleep: 'bibit',
  analisis: 'analisis',
  inspeksi: 'inspeksi',
  tomat: 'tomat',
  cabai: 'cabai',
  bibit: 'bibit',
  tanah: 'tanah',
  catat: 'catat',
  jempol: 'jempol',
};

const MASCOT_TIPS = [
  'Halo! Foto tanaman di tempat terang biar analisis AI makin tepat.',
  'Cek bagian bawah daun juga ya, bercak sering mulai dari sana.',
  'Siram pagi atau sore di pangkal batang supaya air tidak cepat menguap.',
  'Tomat setengah matang biasanya siap panen 2 sampai 4 hari lagi.',
  'Kalau hasil scan kurang yakin, foto ulang atau konfirmasi ke penyuluh ya!',
  'Bersihkan daun tua yang menyentuh tanah agar jamur tidak naik.',
];

/* Seluruh maskot di aplikasi memakai karakter petani resmi (8 pose transparan dari ZIP pengguna) */
export const CermoMascot: React.FC<CermoMascotProps> = ({
  pose = 'wave',
  size = 96,
  interactive = true,
  tipOverride,
  className = '',
  label = 'Maskot Pak Cermat',
  tipAlign = 'center',
  tipMaxWidth = 220,
}) => {
  const safeSize = Math.max(32, size);
  const [isJumping, setIsJumping] = useState(false);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  const farmerPose = POSE_TO_FARMER[pose] || 'tomat';
  const isSleep = pose === 'sleep';

  const handleClick = () => {
    if (!interactive) return;
    setIsJumping(true);
    setTipIndex((prev) => (prev === null ? 0 : (prev + 1) % MASCOT_TIPS.length));
    window.setTimeout(() => setIsJumping(false), 450);
    window.setTimeout(() => setTipIndex(null), 4200);
  };

  const activeTip =
    tipIndex !== null ? tipOverride || MASCOT_TIPS[tipIndex] : null;

  const wrapperStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: interactive ? 'pointer' : 'default',
    borderRadius: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Math.max(32, Math.round(safeSize * 0.78)),
    minHeight: safeSize,
    opacity: isSleep ? 0.78 : 1,
    transform: isJumping ? 'translateY(-7px) scale(1.06)' : 'none',
    transition: 'transform 260ms var(--ease-spring), opacity 220ms var(--ease-out)',
  };

  const mascotImg = (
    <PakCermatMascot
      pose={farmerPose}
      height={safeSize}
    />
  );

  return (
    <div
      className={`cermo-mascot-root ${className}`.trim()}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      {activeTip && (
        <div
          role="status"
          className={tipAlign === 'start' ? 'tip-bubble-in tip-bubble-in--start' : 'tip-bubble-in'}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            ...(tipAlign === 'start'
              ? { left: -10, transform: 'none', textAlign: 'left' as const }
              : { left: '50%', transform: 'translateX(-50%)', textAlign: 'center' as const }),
            background: 'var(--surface)',
            color: 'var(--ink)',
            padding: '8px 12px',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-2)',
            fontSize: '0.8rem',
            fontWeight: 600,
            lineHeight: 1.4,
            width: 'max-content',
            maxWidth: tipMaxWidth,
            zIndex: 35,
            border: '1px solid var(--line)',
            pointerEvents: 'none',
          }}
        >
          {activeTip}
        </div>
      )}

      {interactive ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label={`${label} — klik untuk tips singkat`}
          className="mascot-interactive-btn"
          style={wrapperStyle}
        >
          {mascotImg}
        </button>
      ) : (
        <span role="img" aria-label={label} style={wrapperStyle}>
          {mascotImg}
        </span>
      )}
    </div>
  );
};
