'use client';

import React from 'react';

/* Peta Zona Kebun Minimalis Arsitektural (menggantikan ilustrasi kartun) */
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
    style={{ display: 'block', borderRadius: '14px' }}
  >
    <defs>
      <linearGradient id="mapBg" x1="0" y1="0" x2="360" y2="190" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0A332B" />
        <stop offset="100%" stopColor="#135246" />
      </linearGradient>
      <pattern id="mapGrid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      </pattern>
    </defs>

    <rect width="360" height="190" fill="url(#mapBg)" />
    <rect width="360" height="190" fill="url(#mapGrid)" />

    {/* Garis kontur topografi tipis */}
    <path d="M-10 145 Q 90 112, 185 132 T 370 118" stroke="rgba(216,243,106,0.14)" strokeWidth="1.2" fill="none" />
    <path d="M-10 92 Q 110 68, 210 94 T 370 76" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" fill="none" />

    {/* Petak blok budidaya (minimalis terukur) */}
    <rect x="20" y="20" width="136" height="64" rx="10" fill="rgba(31, 157, 85, 0.24)" stroke="rgba(216,243,106,0.34)" strokeWidth="1.2" />
    <rect x="172" y="20" width="168" height="64" rx="10" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
    <rect x="20" y="98" width="204" height="72" rx="10" fill="rgba(2, 132, 199, 0.16)" stroke="rgba(125, 211, 252, 0.34)" strokeWidth="1.2" />
    <rect x="240" y="98" width="100" height="72" rx="10" fill="rgba(234, 88, 12, 0.18)" stroke="rgba(251, 146, 60, 0.38)" strokeWidth="1.2" />

    {/* Garis bedengan tipis di dalam petak */}
    {[34, 48, 62, 74].map((y) => (
      <line key={y} x1="30" y1={y} x2="146" y2={y} stroke="rgba(216,243,106,0.22)" strokeWidth="1.5" strokeDasharray="6 4" />
    ))}
    {[114, 130, 146, 160].map((y) => (
      <line key={y} x1="32" y1={y} x2="212" y2={y} stroke="rgba(125,211,252,0.25)" strokeWidth="1.5" strokeDasharray="8 5" />
    ))}

    {/* Titik node sensor halus */}
    <circle cx="88" cy="52" r="4" fill="#D8F36A" />
    <circle cx="88" cy="52" r="10" fill="#D8F36A" fillOpacity="0.18" />
    <circle cx="122" cy="134" r="4" fill="#38BDF8" />
    <circle cx="122" cy="134" r="10" fill="#38BDF8" fillOpacity="0.2" />
    <circle cx="290" cy="134" r="4" fill="#FB923C" />
    <circle cx="290" cy="134" r="10" fill="#FB923C" fillOpacity="0.2" />
  </svg>
);

export interface FloatingPlotPin {
  id: string;
  label: string;
  dotColor: string;
  top: string;
  left: string;
  onClick?: () => void;
}

/* Panel Peta Kebun Interaktif ala Agrova (DESIGN.md v2.0 §6.7):
   Pil lapisan "Peta ▾", tombol layar penuh, pin kaca melayang, minimap, kontrol zoom */
export const AgrovaFarmMap: React.FC<{
  moisture: number;
  healthyPercent: number;
  attentionCount: number;
  ripeLabel: string;
  onPinClick?: (target: 'lahan' | 'tanaman' | 'scan') => void;
}> = ({ moisture, healthyPercent, attentionCount, ripeLabel, onPinClick }) => {
  const [layer, setLayer] = React.useState<'kelembapan' | 'kesehatan' | 'panen'>('kelembapan');
  const [zoom, setZoom] = React.useState<number>(1);
  const [expanded, setExpanded] = React.useState(false);

  const layerLabels = {
    kelembapan: 'Lapisan: Kelembapan',
    kesehatan: 'Lapisan: Kesehatan',
    panen: 'Lapisan: Kesiapan Panen',
  };

  const nextLayer = () => {
    setLayer((prev) =>
      prev === 'kelembapan' ? 'kesehatan' : prev === 'kesehatan' ? 'panen' : 'kelembapan'
    );
  };

  const pins: FloatingPlotPin[] =
    layer === 'kelembapan'
      ? [
          {
            id: 'm1',
            label: `Kelembapan Tanah: ${moisture}%`,
            dotColor: '#1F76BD',
            top: '28%',
            left: '10%',
            onClick: () => onPinClick?.('lahan'),
          },
          {
            id: 'm2',
            label: attentionCount > 0 ? `${attentionCount} petak perlu cek` : 'Semua petak stabil',
            dotColor: attentionCount > 0 ? '#FFB63D' : '#1F9D55',
            top: '58%',
            left: '26%',
            onClick: () => onPinClick?.('tanaman'),
          },
        ]
      : layer === 'kesehatan'
        ? [
            {
              id: 'h1',
              label: `Kebun Sehat: ${healthyPercent}%`,
              dotColor: '#1F9D55',
              top: '26%',
              left: '12%',
              onClick: () => onPinClick?.('tanaman'),
            },
            {
              id: 'h2',
              label: attentionCount > 0 ? `${attentionCount} gejala daun` : 'Bebas bercak',
              dotColor: attentionCount > 0 ? '#C62F36' : '#5DBB63',
              top: '56%',
              left: '22%',
              onClick: () => onPinClick?.('scan'),
            },
          ]
        : [
            {
              id: 'p1',
              label: ripeLabel,
              dotColor: '#F2562B',
              top: '30%',
              left: '14%',
              onClick: () => onPinClick?.('scan'),
            },
            {
              id: 'p2',
              label: `Tanah ${moisture}% · Siap petik`,
              dotColor: '#FFB63D',
              top: '58%',
              left: '18%',
              onClick: () => onPinClick?.('lahan'),
            },
          ];

  return (
    <div className="agrova-map-panel" style={{ height: expanded ? 320 : 224, transition: 'height 200ms ease' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 200ms ease',
        }}
      >
        <GardenLandscapeIllustration height={expanded ? 340 : 252} />
      </div>

      {/* Kiri atas: Pil lapisan "Peta ▾" + lencana Simulasi WCAG AA */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 54,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          zIndex: 4,
        }}
      >
        <button
          type="button"
          onClick={nextLayer}
          className="glass-surface"
          style={{
            borderRadius: 999,
            padding: '5px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {layerLabels[layer]} ▾
        </button>
        <span className="pill pill-sim" style={{ fontSize: '0.7rem', padding: '3px 9px' }}>
          Simulasi
        </span>
      </div>

      {/* Kanan atas: tombol layar penuh / perbesar */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Perkecil peta kebun' : 'Perbesar peta kebun'}
        className="glass-surface"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 34,
          height: 34,
          borderRadius: 10,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          zIndex: 4,
        }}
      >
        {expanded ? '⤡' : '⤢'}
      </button>

      {/* Pin kaca melayang */}
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          onClick={pin.onClick}
          className="floating-pin glass-surface"
          style={{ top: pin.top, left: pin.left, zIndex: 3 }}
        >
          <span className="floating-pin-dot" style={{ background: pin.dotColor }} />
          <span>{pin.label}</span>
        </button>
      ))}

      {/* Kiri bawah: Minimap 74×54 (§6.7) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          width: 74,
          height: 52,
          borderRadius: 10,
          background: 'rgba(18, 36, 31, 0.84)',
          border: '1.5px solid rgba(255,255,255,0.45)',
          padding: 5,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 3,
          zIndex: 4,
        }}
      >
        <div style={{ background: 'rgba(216,243,106,0.45)', borderRadius: 3 }} />
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 3 }} />
        <div style={{ background: 'rgba(43,143,217,0.45)', borderRadius: 3 }} />
        <div style={{ background: 'rgba(242,86,43,0.45)', borderRadius: 3 }} />
      </div>

      {/* Kanan bawah: Kontrol zoom (§6.7) */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          display: 'flex',
          gap: 4,
          zIndex: 4,
        }}
      >
        <button
          type="button"
          className="glass-surface"
          aria-label="Perkecil peta"
          onClick={() => setZoom((z) => Math.max(1, Number((z - 0.15).toFixed(2))))}
          style={{ width: 32, height: 32, borderRadius: 9, fontWeight: 700, cursor: 'pointer' }}
        >
          −
        </button>
        <button
          type="button"
          className="glass-surface"
          aria-label="Perbesar peta"
          onClick={() => setZoom((z) => Math.min(1.45, Number((z + 0.15).toFixed(2))))}
          style={{ width: 32, height: 32, borderRadius: 9, fontWeight: 700, cursor: 'pointer' }}
        >
          +
        </button>
      </div>
    </div>
  );
};

/* Panel visual petak kebun dengan pin status interaktif */
export const GardenPlotVisualWithPins: React.FC<{
  height?: number;
  pins: FloatingPlotPin[];
}> = ({ height = 210, pins }) => (
  <div className="plot-visual-wrap">
    <GardenLandscapeIllustration height={height} />
    {pins.map((pin) => (
      <button
        key={pin.id}
        type="button"
        onClick={pin.onClick}
        className="floating-pin glass-surface"
        style={{ top: pin.top, left: pin.left }}
      >
        <span className="floating-pin-dot" style={{ background: pin.dotColor }} />
        <span>{pin.label}</span>
      </button>
    ))}
  </div>
);

/* Skema Monitor Irigasi & Kelembapan Minimalis (bukan ilustrasi kartun) */
export const IrrigationSoilVisual: React.FC<{ pumpOn: boolean; moisture: number }> = ({
  pumpOn,
  moisture,
}) => {
  const clamped = Math.max(0, Math.min(100, moisture));
  return (
    <div
      style={{
        width: '100%',
        borderRadius: 14,
        background: 'var(--surface-2)',
        border: '1px solid var(--line)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span
          className="t-small"
          style={{ fontWeight: 700, color: pumpOn ? 'var(--water-700)' : 'var(--ink)' }}
        >
          {pumpOn ? 'Aliran Tetes Aktif' : 'Saluran Siaga (Standby)'}
        </span>
        <span className="t-micro tabular-nums" style={{ color: 'var(--water)', fontWeight: 700 }}>
          Tanah {clamped}%
        </span>
      </div>

      {/* Skema saluran pipa tetes presisi */}
      <svg viewBox="0 0 280 42" width="100%" height="42" fill="none" aria-hidden="true">
        <rect x="4" y="10" width="272" height="6" rx="3" fill="var(--line)" />
        <rect
          x="4"
          y="10"
          width={pumpOn ? 272 : Math.round((clamped / 100) * 272)}
          height="6"
          rx="3"
          fill="#0284C7"
          style={{ transition: 'width 300ms ease' }}
        />
        {[48, 112, 176, 240].map((cx) => (
          <g key={cx}>
            <rect x={cx - 3} y="16" width="6" height="8" rx="2" fill={pumpOn ? '#0284C7' : 'var(--ink-soft)'} />
            <circle
              cx={cx}
              cy="32"
              r={pumpOn ? 4 : 2.5}
              fill={pumpOn ? '#38BDF8' : 'var(--line)'}
              fillOpacity={pumpOn ? 0.85 : 0.7}
            />
          </g>
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="t-micro t-soft">Kering (0%)</span>
        <span className="t-micro t-soft">Ideal (50–75%)</span>
        <span className="t-micro t-soft">Basah (100%)</span>
      </div>
    </div>
  );
};

/* Gauge Level Air Tandon Industrial Minimalis (F12) */
export const WaterTankVisual: React.FC<{ levelPercent: number; isLow: boolean }> = ({
  levelPercent,
  isLow,
}) => {
  const clamped = Math.max(0, Math.min(100, levelPercent));
  const fillHeight = (clamped / 100) * 100;
  const fillY = 118 - fillHeight;
  const waterColor = isLow ? '#DC2626' : '#0284C7';

  return (
    <svg viewBox="0 0 132 132" width="124" height="124" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="tankClipPro">
          <rect x="24" y="18" width="84" height="100" rx="12" />
        </clipPath>
      </defs>
      <rect x="22" y="16" width="88" height="104" rx="14" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" />
      <g clipPath="url(#tankClipPro)">
        <rect
          x="24"
          y={fillY}
          width="84"
          height={fillHeight + 2}
          fill={waterColor}
          fillOpacity="0.82"
          style={{ transition: 'y 300ms ease, height 300ms ease, fill 200ms ease' }}
        />
      </g>
      {/* Garis skala 25%, 50%, 75% & batas kritis 20% */}
      {[43, 68, 93].map((y) => (
        <line key={y} x1="94" y1={y} x2="106" y2={y} stroke="var(--ink-soft)" strokeOpacity="0.45" strokeWidth="1.5" />
      ))}
      <line x1="24" y1="98" x2="108" y2="98" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="4 3" />
    </svg>
  );
};

/* Indikator Baterai Surya Bentuk Baterai Solid (bukan garis-garis tersegmentasi) */
export const SolarBatteryVisual: React.FC<{ batteryPercent: number; powerSave: boolean }> = ({
  batteryPercent,
  powerSave,
}) => {
  const clamped = Math.max(0, Math.min(100, batteryPercent));
  const innerMaxWidth = 148;
  const fillWidth = Math.max(10, Math.round((clamped / 100) * innerMaxWidth));
  const fillStart = powerSave ? '#F59E0B' : clamped <= 40 ? '#EAB308' : '#2EB66B';
  const fillEnd = powerSave ? '#D97706' : clamped <= 40 ? '#CA8A04' : '#17803F';
  const frameStroke = powerSave ? '#B45309' : '#1E4635';

  return (
    <svg
      viewBox="0 0 186 78"
      width="178"
      height="74"
      fill="none"
      role="img"
      aria-label={`Level baterai surya ${clamped} persen`}
    >
      <defs>
        <linearGradient id="cermatBattFill" x1="12" y1="14" x2="160" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={fillStart} />
          <stop offset="100%" stopColor={fillEnd} />
        </linearGradient>
        <clipPath id="cermatBattClip">
          <rect x="11" y="14" width={innerMaxWidth} height="50" rx="10" />
        </clipPath>
      </defs>

      {/* Kepala kutub positif baterai (+) */}
      <rect x="169" y="26" width="11" height="26" rx="5" fill={frameStroke} />

      {/* Badan baterai solid */}
      <rect
        x="5"
        y="8"
        width="160"
        height="62"
        rx="15"
        fill="var(--surface-2)"
        stroke={frameStroke}
        strokeWidth="3"
      />

      {/* Isi baterai utuh (solid fill mulus tanpa garis-garis) */}
      <g clipPath="url(#cermatBattClip)">
        <rect
          x="11"
          y="14"
          width={fillWidth}
          height="50"
          rx="9"
          fill="url(#cermatBattFill)"
          style={{ transition: 'width 280ms cubic-bezier(.2,.8,.2,1)' }}
        />
        {/* Kilau halus di sisi atas agar tampak seperti baterai sungguhan */}
        <rect
          x="14"
          y="17"
          width={Math.max(0, fillWidth - 6)}
          height="13"
          rx="6"
          fill="rgba(255,255,255,0.22)"
          style={{ transition: 'width 280ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </g>

      {/* Ikon petir pengisian & persentase bersih di tengah baterai */}
      <g>
        <path
          d="M54 27L44 41H52L50 52L61 37H53L54 27Z"
          fill={clamped >= 42 ? '#FFFFFF' : frameStroke}
        />
        <text
          x="100"
          y="46"
          textAnchor="middle"
          fontSize="21"
          fontWeight="800"
          fontFamily="var(--font-display), system-ui, sans-serif"
          fill={clamped >= 52 ? '#FFFFFF' : frameStroke}
        >
          {clamped}%
        </text>
      </g>
    </svg>
  );
};

/* Indikator selebrasi halus saat panen siap */
export const TomatoConfetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const pieces = [
    { left: '14%', color: '#EA580C', delay: '0ms' },
    { left: '34%', color: '#D8F36A', delay: '60ms' },
    { left: '54%', color: '#16A34A', delay: '30ms' },
    { left: '74%', color: '#F59E0B', delay: '90ms' },
    { left: '88%', color: '#EA580C', delay: '50ms' },
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
            top: '6px',
            left: p.left,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: p.color,
            animation: `confettiDrop 900ms cubic-bezier(.2,.8,.2,1) ${p.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
};
