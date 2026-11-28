'use client';

import React, { useEffect, useId, useState } from 'react';

export const StripedProgressBar: React.FC<{
  label: string;
  valueLabel: string;
  percent: number;
  color: string;
  darkBg?: boolean;
}> = ({ label, valueLabel, percent, color, darkBg = false }) => {
  const clamped = Math.max(4, Math.min(100, percent));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span
          className="t-small"
          style={{
            color: darkBg ? 'rgba(234, 245, 238, 0.86)' : 'var(--ink-soft)',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <strong
          className="t-small tabular-nums"
          style={{ color: darkBg ? '#FFFFFF' : 'var(--ink)', fontWeight: 700 }}
        >
          {valueLabel}
        </strong>
      </div>
      <div className={`striped-track ${darkBg ? 'striped-track--dark' : ''}`}>
        <div
          className="striped-fill"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

/* Angka menghitung naik 800ms (DESIGN.md §10) */
export const AnimatedCounter: React.FC<{ value: number; suffix?: string; decimals?: number }> = ({
  value,
  suffix = '',
  decimals = 0,
}) => {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 260;
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals).replace('.', ',')
      : Math.round(display).toString();

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
};

/* Cincin persentase Agri-cultur: stroke 8px, animasi isi 900ms (DESIGN.md §7 & §10) */
export const PercentageRing: React.FC<{
  percent: number;
  label: string;
  color?: string;
  size?: number;
  darkBg?: boolean;
}> = ({ percent, label, color = '#D8F36A', size = 82, darkBg = false }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const [animatedPct, setAnimatedPct] = useState(0);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - animatedPct / 100);

  useEffect(() => {
    const t = window.setTimeout(() => setAnimatedPct(clamped), 60);
    return () => window.clearTimeout(t);
  }, [clamped]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={darkBg ? 'rgba(255,255,255,0.16)' : 'var(--line)'}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 900ms ease-out' }}
          />
        </svg>
        <div
          className="font-display tabular-nums"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: darkBg ? '#FFFFFF' : 'var(--ink)',
          }}
        >
          {Math.round(clamped)}%
        </div>
      </div>
      <span
        className="t-micro"
        style={{
          color: darkBg ? 'rgba(234,245,238,0.85)' : 'var(--ink-soft)',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
};

/* Gauge setengah lingkaran gradien merah -> kuning -> hijau + jarum beranimasi (Plant Monitor) */
export const HealthSemiGauge: React.FC<{ value: number; subtitle?: string }> = ({
  value,
  subtitle = 'Kesehatan kebun',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const [needleValue, setNeedleValue] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setNeedleValue(clamped), 80);
    return () => window.clearTimeout(t);
  }, [clamped]);

  // -90 deg (left, 0%) to +90 deg (right, 100%)
  const angleDeg = -90 + (needleValue / 100) * 180;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 220 128" width="100%" style={{ maxWidth: 230 }} aria-label={`${subtitle} ${clamped}%`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="20" y1="110" x2="200" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E5484D" />
            <stop offset="50%" stopColor="#FFB63D" />
            <stop offset="100%" stopColor="#3DBE74" />
          </linearGradient>
        </defs>
        <path
          d="M 24 110 A 86 86 0 0 1 196 110"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 24 110 A 86 86 0 0 1 196 110"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Jarum beranimasi 900ms ease-out */}
        <g
          style={{
            transformOrigin: '110px 110px',
            transform: `rotate(${angleDeg}deg)`,
            transition: 'transform 900ms ease-out',
          }}
        >
          <line x1="110" y1="110" x2="110" y2="38" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
          <circle cx="110" cy="110" r="9" fill="#D8F36A" stroke="#0E4F43" strokeWidth="3" />
        </g>
      </svg>
      <div className="font-display tabular-nums" style={{ fontSize: '2rem', lineHeight: 1.1, marginTop: -4 }}>
        <AnimatedCounter value={clamped} suffix="%" />
      </div>
      <span className="t-small" style={{ color: 'rgba(234,245,238,0.82)' }}>
        {subtitle}
      </span>
    </div>
  );
};

/* Batang produksi pastel persik + batang aktif --tomato-500 (Plant Monitor) */
export const ProductionBarChart: React.FC<{
  data: { label: string; value: number; active?: boolean }[];
  unit?: string;
}> = ({ data, unit = 'kg' }) => {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const activeIndex = data.findIndex((d) => d.active);
    return activeIndex >= 0 ? activeIndex : data.length - 1;
  });
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
          alignItems: 'end',
          gap: 10,
          height: 164,
          paddingTop: 28,
        }}
      >
        {data.map((item, i) => {
          const isSelected = i === selectedIdx;
          const heightPct = Math.max(14, (item.value / maxVal) * 100);
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedIdx(i)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
              aria-label={`${item.label}: ${item.value} ${unit}`}
            >
              <span
                className="t-micro tabular-nums"
                style={{
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: isSelected ? 'var(--forest-900)' : 'transparent',
                  color: isSelected ? '#FFFFFF' : 'var(--ink-soft)',
                  opacity: isSelected ? 1 : 0.78,
                }}
              >
                {item.value}
                {unit}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 34,
                  height: `${heightPct}%`,
                  borderRadius: '12px 12px 6px 6px',
                  background: isSelected ? 'var(--tomato-500)' : 'var(--peach-bar)',
                  transformOrigin: 'bottom',
                  animation: `barGrowUp 600ms cubic-bezier(.2,.8,.2,1) ${i * 60}ms both`,
                  transition: 'background 180ms ease',
                }}
              />
              <span className="t-micro" style={{ color: 'var(--ink-soft)', fontWeight: isSelected ? 700 : 500 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

function buildSmoothSplinePath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  if (coords.length === 2) {
    return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)} L ${coords[1].x.toFixed(1)} ${coords[1].y.toFixed(1)}`;
  }

  const n = coords.length;
  const dx: number[] = [];
  const secant: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const d = coords[i + 1].x - coords[i].x || 1;
    dx.push(d);
    secant.push((coords[i + 1].y - coords[i].y) / d);
  }

  const m: number[] = new Array(n).fill(0);
  m[0] = secant[0];
  m[n - 1] = secant[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (secant[i - 1] * secant[i] <= 0) {
      m[i] = 0;
    } else {
      const avg = (secant[i - 1] + secant[i]) / 2;
      const limit = 2.6 * Math.min(Math.abs(secant[i - 1]), Math.abs(secant[i]));
      m[i] = Math.sign(avg) * Math.min(Math.abs(avg), limit);
    }
  }

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const segDx = dx[i];
    const cp1x = p0.x + segDx / 3;
    const cp1y = p0.y + (m[i] * segDx) / 3;
    const cp2x = p1.x - segDx / 3;
    const cp2y = p1.y - (m[i + 1] * segDx) / 3;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

/* Grafik Area Kurva Halus (Monotone Spline) — Gradien Hijau Susu Cerah & Interaktif */
export const GreenAreaChart: React.FC<{
  points: { label: string; value: number }[];
  unit?: string;
  color?: string;
  height?: number;
}> = ({ points, unit = '', color = '#45966a', height = 200 }) => {
  const rawUid = useId();
  const [hoverIdx, setHoverIdx] = useState<number>(Math.max(0, points.length - 1));

  useEffect(() => {
    setHoverIdx(Math.max(0, points.length - 1));
  }, [points.length]);

  if (points.length === 0) return null;

  const width = 520;
  const padL = 40;
  const padR = 18;
  const padT = 22;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const avgVal = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  const rawSpan = Math.max(rawMax - rawMin, 2);
  const paddedMin = Math.max(0, Math.floor(rawMin - rawSpan * 0.14));
  const paddedMax = Math.ceil(rawMax + rawSpan * 0.16);
  const span = Math.max(paddedMax - paddedMin, 1);

  const coords = points.map((p, i) => {
    const x = padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = padT + innerH - ((p.value - paddedMin) / span) * innerH;
    return { x, y, ...p };
  });

  const linePath = buildSmoothSplinePath(coords);
  const baseY = padT + innerH;
  const areaPath =
    coords.length === 1
      ? ''
      : `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${baseY.toFixed(1)} Z`;

  const safeHoverIdx = Math.min(Math.max(hoverIdx, 0), coords.length - 1);
  const active = coords[safeHoverIdx];
  const gradId = `ctAreaGrad_${rawUid.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {/* Strip Ringkas Nilai Aktif & Min / Rata-rata / Maks (tidak pernah terpotong!) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          padding: '8px 12px',
          borderRadius: 12,
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 3,
              height: 14,
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }}
          />
          <span className="t-small" style={{ fontWeight: 700, color: 'var(--ink)' }}>
            {active.label}
          </span>
          <span
            className="pill tabular-nums"
            style={{
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              padding: '2px 9px',
              fontSize: '0.78rem',
            }}
          >
            {active.value}
            {unit}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="t-micro t-soft tabular-nums">
            Min <strong style={{ color: 'var(--ink)' }}>{rawMin}{unit}</strong>
          </span>
          <span className="t-micro t-soft tabular-nums">
            Rata-rata <strong style={{ color: 'var(--ink)' }}>{avgVal}{unit}</strong>
          </span>
          <span className="t-micro t-soft tabular-nums">
            Maks <strong style={{ color: 'var(--ink)' }}>{rawMax}{unit}</strong>
          </span>
        </div>
      </div>

      {/* Kanvas SVG Kurva Lembut */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: 280, display: 'block' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1={padT} x2="0" y2={baseY} gradientUnits="userSpaceOnUse">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
              <stop offset="65%" style={{ stopColor: color, stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.01 }} />
            </linearGradient>
          </defs>

          {/* Garis bantu horizontal tipis & angka sumbu Y */}
          {[0, 0.33, 0.66, 1].map((frac) => {
            const y = padT + innerH * frac;
            const labelVal = Math.round(paddedMax - span * frac);
            return (
              <g key={frac}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth="1"
                  strokeDasharray={frac === 1 ? undefined : '4 5'}
                />
                <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--ink-soft)">
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Garis crosshair vertikal lembut pada titik aktif */}
          {active && (
            <line
              x1={active.x}
              y1={padT}
              x2={active.x}
              y2={baseY}
              stroke={color}
              strokeOpacity="0.38"
              strokeWidth="1.5"
              strokeDasharray="3 4"
            />
          )}

          {/* Area gradien lembut */}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

          {/* Garis kurva halus */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1200"
            style={{ animation: 'drawPath 900ms var(--ease-out) forwards' }}
          />

          {/* Titik interaktif */}
          {coords.map((c, i) => {
            const isEnd = i === coords.length - 1;
            const isActive = i === safeHoverIdx;
            return (
              <g
                key={`${c.label}-${i}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => setHoverIdx(i)}
              >
                <circle cx={c.x} cy={c.y} r="18" fill="transparent" />
                {isActive && (
                  <circle cx={c.x} cy={c.y} r="11" fill={color} fillOpacity="0.18" />
                )}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isActive ? 5.5 : isEnd ? 4.5 : 3.2}
                  fill={isActive ? '#FFFFFF' : color}
                  stroke={color}
                  strokeWidth={isActive ? 3 : 2}
                  style={{ transition: 'r 160ms ease' }}
                />
                {(i % Math.max(1, Math.ceil(coords.length / 6)) === 0 || isEnd) && (
                  <text
                    x={c.x}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={isActive ? '700' : '500'}
                    fill={isActive ? 'var(--ink)' : 'var(--ink-soft)'}
                  >
                    {c.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* Grafik Batang Bertumpuk Terpadu (selaras dengan palet kematangan tomat & Mode Gelap)
   Seri: --fruit-ripe (Siap panen), --fruit-mid (Setengah matang), --fruit-raw (Tumbuh/mentah) */
export const StackedBarChart: React.FC<{
  data: { label: string; matang: number; setengah: number; mentah: number }[];
  unit?: string;
}> = ({ data, unit = 'buah' }) => {
  const [activeIdx, setActiveIdx] = useState(data.length - 1);
  const maxTotal = Math.max(...data.map((d) => d.matang + d.setengah + d.mentah), 1);
  const active = data[activeIdx] || data[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span className="t-micro" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
            <span className="ripeness-dot" style={{ background: 'var(--fruit-ripe)' }} /> Siap panen
          </span>
          <span className="t-micro" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
            <span className="ripeness-dot" style={{ background: 'var(--fruit-mid)' }} /> Setengah matang
          </span>
          <span className="t-micro" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
            <span className="ripeness-dot" style={{ background: 'var(--fruit-raw)' }} /> Tumbuh / mentah
          </span>
        </div>
        {active && (
          <span
            className="pill tabular-nums"
            style={{ background: 'var(--forest-900)', color: '#FFFFFF', fontSize: '0.75rem' }}
          >
            {active.label}: {active.matang + active.setengah + active.mentah} {unit}
          </span>
        )}
      </div>

      <div
        role="img"
        aria-label="Grafik batang bertumpuk jumlah buah terdeteksi per minggu"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
          gap: 12,
          alignItems: 'end',
          height: 190,
          paddingTop: 10,
          borderBottom: '1px solid var(--line)',
        }}
      >
        {data.map((d, i) => {
          const total = d.matang + d.setengah + d.mentah;
          const totalH = Math.max(18, (total / maxTotal) * 100);
          const hMatang = (d.matang / Math.max(total, 1)) * 100;
          const hSetengah = (d.setengah / Math.max(total, 1)) * 100;
          const hMentah = (d.mentah / Math.max(total, 1)) * 100;
          const isSelected = i === activeIdx;

          return (
            <button
              key={d.label}
              type="button"
              onClick={() => setActiveIdx(i)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0 0 8px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <span
                className="t-micro tabular-nums"
                style={{
                  color: isSelected ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: isSelected ? 700 : 600,
                  transition: 'color 200ms var(--ease-out)',
                }}
              >
                {total}
              </span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 38,
                  height: `${totalH}%`,
                  borderRadius: '10px 10px 4px 4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  outline: isSelected ? '2px solid var(--leaf-600)' : 'none',
                  outlineOffset: 2,
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  transition:
                    'height 480ms var(--ease-out), transform 220ms var(--ease-out), outline-color 200ms ease',
                }}
              >
                <div style={{ height: `${hMentah}%`, background: 'var(--fruit-raw)', transition: 'height 420ms var(--ease-out)' }} />
                <div style={{ height: `${hSetengah}%`, background: 'var(--fruit-mid)', transition: 'height 420ms var(--ease-out)' }} />
                <div style={{ height: `${hMatang}%`, background: 'var(--fruit-ripe)', transition: 'height 420ms var(--ease-out)' }} />
              </div>
              <span
                className="t-micro"
                style={{
                  color: isSelected ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'color 200ms var(--ease-out)',
                }}
              >
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
