'use client';

import React from 'react';

/* Ilustrasi datar bergradasi lembut tanpa teks (DESIGN.md §9):
   Bukit hijau berlapis, pohon cemara, kincir angin, sawah berundak, langit biru muda */
export const GardenLandscapeIllustration: React.FC<{ height?: number; className?: string }> = ({
  height = 176,
  className = '',
}) => (
  <svg
    viewBox="0 0 360 190"
    width="100%"
    height={height}
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ display: 'block', borderRadius: '20px' }}
  >
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="190" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#CBEBFB" />
        <stop offset="100%" stopColor="#EBF8F0" />
      </linearGradient>
      <linearGradient id="hillBack" x1="0" y1="70" x2="0" y2="190" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#75CB8E" />
        <stop offset="100%" stopColor="#43A868" />
      </linearGradient>
      <linearGradient id="hillMid" x1="0" y1="100" x2="0" y2="190" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2FA862" />
        <stop offset="100%" stopColor="#17803F" />
      </linearGradient>
      <linearGradient id="hillFront" x1="0" y1="130" x2="0" y2="190" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#146949" />
        <stop offset="100%" stopColor="#0E4F43" />
      </linearGradient>
    </defs>

    {/* Langit biru muda */}
    <rect width="360" height="190" fill="url(#skyGrad)" />

    {/* Matahari lembut */}
    <circle cx="294" cy="44" r="22" fill="#FFB63D" fillOpacity="0.92" />
    <circle cx="294" cy="44" r="32" fill="#FFB63D" fillOpacity="0.2" />

    {/* Awan lembut */}
    <path
      d="M44 48C44 42 49 38 55 38C58 32 65 29 72 32C78 30 85 34 86 40C91 40 95 44 95 48H44Z"
      fill="#FFFFFF"
      fillOpacity="0.82"
    />
    <path
      d="M178 36C178 32 182 29 186 29C189 24 196 23 201 26C206 25 211 29 212 34H178Z"
      fill="#FFFFFF"
      fillOpacity="0.75"
    />

    {/* Bukit belakang */}
    <path d="M0 112C54 74 118 76 178 106C236 134 294 82 360 100V190H0V112Z" fill="url(#hillBack)" />

    {/* Kincir angin di bukit kanan */}
    <g transform="translate(248, 52)">
      <path d="M12 18L6 58H18L12 18Z" fill="#FFFFFF" />
      <path d="M12 18L18 58H14L12 18Z" fill="#DCEBE1" />
      <rect x="9" y="45" width="6" height="13" rx="2" fill="#0E4F43" fillOpacity="0.45" />
      <g style={{ transformOrigin: '12px 18px', animation: 'sunRotate 16s linear infinite' }}>
        <line x1="12" y1="18" x2="12" y2="-4" stroke="#F2562B" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="18" x2="32" y2="28" stroke="#F2562B" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="18" x2="-8" y2="28" stroke="#F2562B" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="12" cy="18" r="3.5" fill="#14302A" />
    </g>

    {/* Bukit tengah & sawah berundak */}
    <path d="M0 132C78 96 164 116 238 134C294 148 332 126 360 120V190H0V132Z" fill="url(#hillMid)" />
    <path d="M14 144C74 126 136 134 196 146" stroke="#D8F36A" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
    <path d="M6 158C76 142 152 148 228 160" stroke="#D8F36A" strokeOpacity="0.32" strokeWidth="3" strokeLinecap="round" />

    {/* Pohon cemara */}
    <g transform="translate(48, 86)">
      <rect x="8" y="34" width="4" height="10" rx="1" fill="#6E4E37" />
      <path d="M10 4L0 24H20L10 4Z" fill="#0E4F43" />
      <path d="M10 14L-2 36H22L10 14Z" fill="#17803F" />
    </g>
    <g transform="translate(76, 94) scale(0.8)">
      <rect x="8" y="34" width="4" height="10" rx="1" fill="#6E4E37" />
      <path d="M10 4L0 24H20L10 4Z" fill="#146949" />
      <path d="M10 14L-2 36H22L10 14Z" fill="#1F9D55" />
    </g>
    <g transform="translate(306, 92) scale(0.85)">
      <rect x="8" y="34" width="4" height="10" rx="1" fill="#6E4E37" />
      <path d="M10 4L0 24H20L10 4Z" fill="#0E4F43" />
      <path d="M10 14L-2 36H22L10 14Z" fill="#17803F" />
    </g>

    {/* Bukit depan dengan titik buah tomat kecil */}
    <path d="M0 162C96 138 222 144 360 164V190H0V162Z" fill="url(#hillFront)" />
    <circle cx="132" cy="172" r="4.5" fill="#F2562B" />
    <circle cx="148" cy="177" r="3.5" fill="#FFB63D" />
    <circle cx="212" cy="174" r="4.5" fill="#F2562B" />
    <circle cx="228" cy="178" r="3.5" fill="#5DBB63" />
  </svg>
);

/* Visualisasi Pompa & Tetes Air ke Tanah (DESIGN.md §10: 1.2s loop, tanah menggelap) */
export const IrrigationSoilVisual: React.FC<{ pumpOn: boolean; moisture: number }> = ({
  pumpOn,
  moisture,
}) => {
  const soilDarkness = pumpOn ? '#4B3222' : moisture > 55 ? '#5E402C' : '#8A6345';
  return (
    <svg viewBox="0 0 240 120" width="100%" height="120" fill="none" aria-hidden="true">
      <rect width="240" height="120" rx="16" fill="var(--surface-2)" />
      {/* Pipa tetes */}
      <rect x="20" y="18" width="200" height="10" rx="5" fill="#5B746B" />
      <rect x="64" y="26" width="8" height="8" rx="2" fill="#2B8FD9" />
      <rect x="116" y="26" width="8" height="8" rx="2" fill="#2B8FD9" />
      <rect x="168" y="26" width="8" height="8" rx="2" fill="#2B8FD9" />

      {/* Tetes air beranimasi saat pompa menyala */}
      {pumpOn && (
        <g>
          {[68, 120, 172].map((cx, i) => (
            <path
              key={cx}
              d={`M${cx} 36C${cx} 36 ${cx - 5} 44 ${cx - 5} 48C${cx - 5} 51 ${cx - 2.8} 53 ${cx} 53C${cx + 2.8} 53 ${cx + 5} 51 ${cx + 5} 48C${cx + 5} 44 ${cx} 36 ${cx} 36Z`}
              fill="#2B8FD9"
              style={{
                animation: `waterDropFall 1.2s ease-in ${i * 0.35}s infinite`,
              }}
            />
          ))}
        </g>
      )}

      {/* Tunas tomat di tanah */}
      <path d="M120 82V58" stroke="#1F9D55" strokeWidth="4" strokeLinecap="round" />
      <path d="M120 68C110 60 98 63 96 71C106 73 114 72 120 68Z" fill="#3DBE74" />
      <path d="M120 64C130 56 142 59 144 67C134 69 126 68 120 64Z" fill="#17803F" />

      {/* Lapisan tanah yang menggelap saat disiram */}
      <path
        d="M0 84C60 76 180 76 240 84V120H0V84Z"
        fill={soilDarkness}
        style={{ transition: 'fill 500ms ease' }}
      />
      <ellipse cx="68" cy="92" rx="18" ry="5" fill="#2B8FD9" fillOpacity={pumpOn ? 0.35 : 0.08} />
      <ellipse cx="120" cy="94" rx="22" ry="6" fill="#2B8FD9" fillOpacity={pumpOn ? 0.4 : 0.1} />
      <ellipse cx="172" cy="92" rx="18" ry="5" fill="#2B8FD9" fillOpacity={pumpOn ? 0.35 : 0.08} />
    </svg>
  );
};

/* Visualisasi Tandon Air Ultrasonik (F12) */
export const WaterTankVisual: React.FC<{ levelPercent: number; isLow: boolean }> = ({
  levelPercent,
  isLow,
}) => {
  const clamped = Math.max(0, Math.min(100, levelPercent));
  const fillHeight = (clamped / 100) * 96;
  const fillY = 122 - fillHeight;
  const waterColor = isLow ? '#E5484D' : '#2B8FD9';

  return (
    <svg viewBox="0 0 150 144" width="144" height="138" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="tankClip">
          <rect x="26" y="26" width="98" height="96" rx="16" />
        </clipPath>
      </defs>
      {/* Sensor ultrasonik di atas */}
      <rect x="56" y="8" width="38" height="14" rx="5" fill="#0E4F43" />
      <circle cx="67" cy="15" r="3" fill="#D8F36A" />
      <circle cx="83" cy="15" r="3" fill="#D8F36A" />
      {/* Gelombang ultrasonik */}
      <path d="M68 25C71 29 79 29 82 25" stroke="#5B746B" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 3" />

      {/* Badan tandon */}
      <rect x="24" y="24" width="102" height="100" rx="18" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="3" />

      {/* Air di dalam tandon */}
      <g clipPath="url(#tankClip)">
        <rect
          x="26"
          y={fillY}
          width="98"
          height={fillHeight + 4}
          fill={waterColor}
          fillOpacity="0.78"
          style={{ transition: 'y 400ms ease, height 400ms ease, fill 300ms ease' }}
        />
        <path
          d={`M16 ${fillY} Q40 ${fillY - 6} 64 ${fillY} T112 ${fillY} T160 ${fillY} V130 H16 Z`}
          fill={waterColor}
          fillOpacity="0.45"
          style={{ animation: 'batteryWave 3s linear infinite' }}
        />
      </g>

      {/* Garis batas 20% kritis */}
      <line x1="28" y1="103" x2="122" y2="103" stroke="#E5484D" strokeWidth="1.6" strokeDasharray="4 4" />
    </svg>
  );
};

/* Indikator Baterai Surya Bergelombang + Matahari Berputar 8s (DESIGN.md §7 & §10) */
export const SolarBatteryVisual: React.FC<{ batteryPercent: number; powerSave: boolean }> = ({
  batteryPercent,
  powerSave,
}) => {
  const clamped = Math.max(0, Math.min(100, batteryPercent));
  const fillWidth = (clamped / 100) * 106;
  const fillColor = powerSave ? '#FFB63D' : '#1F9D55';

  return (
    <svg viewBox="0 0 220 110" width="220" height="110" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="battClip">
          <rect x="84" y="28" width="106" height="54" rx="12" />
        </clipPath>
      </defs>

      {/* Matahari berputar 8s */}
      <g transform="translate(38, 55)">
        <g style={{ animation: 'sunRotate 8s linear infinite' }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="0"
              y1="-22"
              x2="0"
              y2="-30"
              stroke="#FFB63D"
              strokeWidth="3.5"
              strokeLinecap="round"
              transform={`rotate(${deg})`}
            />
          ))}
        </g>
        <circle cx="0" cy="0" r="16" fill="#FFB63D" />
      </g>

      {/* Badan baterai */}
      <rect x="80" y="24" width="114" height="62" rx="15" fill="var(--surface-2)" stroke="var(--ink-soft)" strokeWidth="3" />
      <rect x="195" y="42" width="10" height="26" rx="4" fill="var(--ink-soft)" />

      {/* Isi bergelombang */}
      <g clipPath="url(#battClip)">
        <rect
          x="84"
          y="28"
          width={fillWidth}
          height="54"
          fill={fillColor}
          style={{ transition: 'width 500ms ease, fill 300ms ease' }}
        />
        <rect
          x="84"
          y="28"
          width={fillWidth}
          height="24"
          fill="#FFFFFF"
          fillOpacity="0.18"
        />
      </g>
    </svg>
  );
};

/* Konfeti tomat kecil 1.2s sekali saat panen siap (DESIGN.md §10) */
export const TomatoConfetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const pieces = [
    { left: '10%', color: '#F2562B', delay: '0ms' },
    { left: '22%', color: '#D8F36A', delay: '80ms' },
    { left: '35%', color: '#FFB63D', delay: '140ms' },
    { left: '50%', color: '#F2562B', delay: '40ms' },
    { left: '64%', color: '#1F9D55', delay: '110ms' },
    { left: '78%', color: '#F2562B', delay: '60ms' },
    { left: '89%', color: '#FFB63D', delay: '160ms' },
  ];
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 15,
      }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '8px',
            left: p.left,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: p.color,
            animation: `confettiDrop 1.2s cubic-bezier(.2,.8,.2,1) ${p.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
};
