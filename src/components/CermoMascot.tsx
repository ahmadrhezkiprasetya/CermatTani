'use client';

import React, { useEffect, useRef, useState } from 'react';

export type CermoPose =
  | 'wave'
  | 'scan'
  | 'happy'
  | 'worried'
  | 'water'
  | 'thinking'
  | 'sleep';

interface CermoMascotProps {
  pose?: CermoPose;
  size?: number;
  interactive?: boolean;
  tipOverride?: string;
  className?: string;
  label?: string;
}

const CERMO_TIPS = [
  'Halo! Foto tomat di tempat terang biar Cermo makin cermat.',
  'Cek bagian bawah daun juga ya, bercak sering mulai dari sana.',
  'Siram pagi atau sore supaya air tidak cepat menguap.',
  'Tomat setengah matang biasanya siap panen 2 sampai 4 hari lagi.',
  'Kalau hasil scan kurang yakin, jangan ragu tanya penyuluh ya!',
  'Bersihkan daun tua yang menyentuh tanah agar jamur tidak naik.',
];

export const CermoMascot: React.FC<CermoMascotProps> = ({
  pose = 'wave',
  size = 96,
  interactive = true,
  tipOverride,
  className = '',
  label = 'Cermo si Tomat',
}) => {
  const safeSize = Math.max(40, size);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [tipIndex, setTipIndex] = useState<number | null>(null);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Kedip acak setiap 4–6 detik (DESIGN.md §8)
  useEffect(() => {
    if (pose === 'sleep' || reducedMotion) return;
    let timer: number;
    let closeTimer: number;
    const scheduleBlink = () => {
      const delay = 4000 + Math.random() * 2000;
      timer = window.setTimeout(() => {
        setIsBlinking(true);
        closeTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };
    scheduleBlink();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(closeTimer);
    };
  }, [pose, reducedMotion]);

  // Mata mengikuti kursor / sentuhan maks 4px (DESIGN.md §8)
  useEffect(() => {
    if (pose === 'sleep' || reducedMotion) return;
    const handleMove = (clientX: number, clientY: number) => {
      const el = svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const mag = Math.min(4, dist / 45);
      setEyeOffset({
        x: (dx / dist) * mag,
        y: (dy / dist) * mag,
      });
    };

    const onPointerMove = (e: PointerEvent) => handleMove(e.clientX, e.clientY);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [pose, reducedMotion]);

  const handleClick = () => {
    if (!interactive) return;
    setIsJumping(true);
    setTipIndex((prev) => (prev === null ? 0 : (prev + 1) % CERMO_TIPS.length));
    window.setTimeout(() => setIsJumping(false), 500);
    window.setTimeout(() => setTipIndex(null), 4200);
  };

  const activeTip =
    tipIndex !== null ? tipOverride || CERMO_TIPS[tipIndex] : null;

  return (
    <div
      className={className}
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
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            padding: '8px 12px',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-card)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            lineHeight: 1.4,
            width: 'max-content',
            maxWidth: '220px',
            textAlign: 'center',
            zIndex: 25,
            border: '1px solid var(--line)',
            pointerEvents: 'none',
          }}
        >
          {activeTip}
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        aria-label={interactive ? `${label} — klik untuk sapa dan tips singkat` : label}
        disabled={!interactive}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: interactive ? 'pointer' : 'default',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          minWidth: Math.max(40, safeSize),
          minHeight: Math.max(40, safeSize),
        }}
      >
        <svg
          ref={svgRef}
          width={safeSize}
          height={safeSize}
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            overflow: 'visible',
            animation: isJumping
              ? 'cermoJump 500ms cubic-bezier(.2,.8,.2,1)'
              : pose === 'happy'
                ? 'cermoJump 1.8s ease-in-out infinite'
                : 'cermoBreathe 3s ease-in-out infinite',
            transformOrigin: '70px 118px',
          }}
        >
          {/* Bayangan tanah lembut */}
          <ellipse cx="70" cy="126" rx="34" ry="7" fill="#14302A" fillOpacity="0.14" />

          {/* Kaki: dua bulatan kecil putih-krem (sepatu bot) */}
          <ellipse cx="54" cy="117" rx="11" ry="7.5" fill="#F8F1E1" stroke="#14302A" strokeWidth="2.4" />
          <ellipse cx="86" cy="117" rx="11" ry="7.5" fill="#F8F1E1" stroke="#14302A" strokeWidth="2.4" />

          {/* Tangan kiri */}
          <g
            style={{
              transformOrigin: '34px 78px',
              animation: pose === 'wave' ? 'cermoWave 1.6s ease-in-out infinite' : undefined,
            }}
          >
            <circle
              cx={pose === 'wave' ? '22' : '26'}
              cy={pose === 'wave' ? '62' : '82'}
              r="9.5"
              fill="#F2562B"
              stroke="#D8431C"
              strokeWidth="2"
            />
            {pose === 'water' && (
              <path
                d="M16 54C16 54 9 63 9 68C9 72 12 75 16 75C20 75 23 72 23 68C23 63 16 54 16 54Z"
                fill="#2B8FD9"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            )}
          </g>

          {/* Badan tomat bulat (#F2562B + bayangan #D8431C + sorot putih kiri atas) */}
          <circle cx="70" cy="76" r="42" fill="#F2562B" />
          <path
            d="M101 50C108 62 110 78 102 94C93 110 75 119 56 116C76 114 95 101 101 81C104 71 104 60 101 50Z"
            fill="#D8431C"
          />
          <ellipse
            cx="50"
            cy="56"
            rx="11"
            ry="6.5"
            transform="rotate(-26 50 56)"
            fill="#FFFFFF"
            fillOpacity="0.45"
          />

          {/* Tunas: 3 daun hijau (#1F9D55, #3DBE74) + tangkai kecil melengkung */}
          <g
            style={{
              transformOrigin: '70px 36px',
              animation: 'cermoLeafSway 3.4s ease-in-out infinite',
            }}
          >
            <path d="M70 36C70 24 76 17 84 15" stroke="#1F9D55" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M70 37C57 25 42 27 37 37C49 41 60 40 70 37Z" fill="#1F9D55" />
            <path d="M70 37C82 23 98 25 103 36C91 40 80 40 70 37Z" fill="#3DBE74" />
            <path d="M70 37C65 21 73 14 82 18C81 27 76 33 70 37Z" fill="#17803F" />
          </g>

          {/* Wajah */}
          <g>
            {/* Pipi merah muda */}
            <ellipse cx="46" cy="83" rx="6.5" ry="3.8" fill="#FF98A3" fillOpacity="0.72" />
            <ellipse cx="94" cy="83" rx="6.5" ry="3.8" fill="#FF98A3" fillOpacity="0.72" />

            {/* Mata */}
            {pose === 'sleep' ? (
              <>
                <path d="M51 73C54 77 60 77 63 73" stroke="#14302A" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M77 73C80 77 86 77 89 73" stroke="#14302A" strokeWidth="3.2" strokeLinecap="round" />
              </>
            ) : isBlinking ? (
              <>
                <line x1="51" y1="73" x2="63" y2="73" stroke="#14302A" strokeWidth="3.2" strokeLinecap="round" />
                <line x1="77" y1="73" x2="89" y2="73" stroke="#14302A" strokeWidth="3.2" strokeLinecap="round" />
              </>
            ) : pose === 'happy' ? (
              <>
                <circle cx={57 + eyeOffset.x * 0.5} cy={72 + eyeOffset.y * 0.5} r="5.5" fill="#14302A" />
                <circle cx={83 + eyeOffset.x * 0.5} cy={72 + eyeOffset.y * 0.5} r="5.5" fill="#14302A" />
                <path d="M55 69L57 66L59 69L57 71Z" fill="#FFFFFF" />
                <path d="M81 69L83 66L85 69L83 71Z" fill="#FFFFFF" />
                <circle cx="59" cy="74" r="1.4" fill="#FFFFFF" />
                <circle cx="85" cy="74" r="1.4" fill="#FFFFFF" />
              </>
            ) : (
              <>
                <circle cx={57 + eyeOffset.x} cy={72 + eyeOffset.y} r="5.4" fill="#14302A" />
                <circle cx={83 + eyeOffset.x} cy={72 + eyeOffset.y} r="5.4" fill="#14302A" />
                <circle cx={58.6 + eyeOffset.x} cy={70 + eyeOffset.y} r="2" fill="#FFFFFF" />
                <circle cx={84.6 + eyeOffset.x} cy={70 + eyeOffset.y} r="2" fill="#FFFFFF" />
              </>
            )}

            {/* Alis miring + keringat untuk pose khawatir */}
            {pose === 'worried' && (
              <>
                <path d="M49 62L63 65" stroke="#14302A" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M91 62L77 65" stroke="#14302A" strokeWidth="2.8" strokeLinecap="round" />
                <path
                  d="M103 55C103 55 98 62 98 65.5C98 68.5 100.3 70.5 103 70.5C105.7 70.5 108 68.5 108 65.5C108 62 103 55 103 55Z"
                  fill="#78C6F7"
                />
              </>
            )}

            {/* Mulut per ekspresi */}
            {pose === 'worried' ? (
              <path d="M60 90C64 85 76 85 80 90" stroke="#14302A" strokeWidth="3.4" strokeLinecap="round" />
            ) : pose === 'sleep' ? (
              <circle cx="70" cy="87" r="3.4" fill="#14302A" />
            ) : pose === 'thinking' ? (
              <path d="M62 87C66 86 73 86 78 88" stroke="#14302A" strokeWidth="3.4" strokeLinecap="round" />
            ) : (
              <path d="M58 84C63 92 77 92 82 84" stroke="#14302A" strokeWidth="3.6" strokeLinecap="round" />
            )}
          </g>

          {/* Tangan kanan memegang kaca pembesar bergagang hijau */}
          <g
            style={{
              transformOrigin: '108px 82px',
              animation: pose === 'scan' ? 'cermoScanGlass 1.4s ease-in-out infinite' : undefined,
            }}
          >
            <circle cx="112" cy="82" r="9.5" fill="#F2562B" stroke="#D8431C" strokeWidth="2" />
            {/* Gagang kaca pembesar */}
            <line x1="114" y1="81" x2="122" y2="69" stroke="#17803F" strokeWidth="5.5" strokeLinecap="round" />
            {/* Bingkai & lensa kaca pembesar */}
            <circle cx="126" cy="60" r="11" fill="#D8F36A" fillOpacity="0.45" stroke="#1F9D55" strokeWidth="3.5" />
            <path d="M121 56C122.5 53.5 125.5 52.5 128 53.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          </g>

          {/* Elemen pose tambahan: Berpikir (...) */}
          {pose === 'thinking' && (
            <g>
              <circle cx="105" cy="30" r="3.2" fill="#1F9D55" />
              <circle cx="115" cy="24" r="4" fill="#17803F" />
              <circle cx="126" cy="20" r="4.6" fill="#0E4F43" />
            </g>
          )}

          {/* Elemen pose tambahan: Tidur (zZz) */}
          {pose === 'sleep' && (
            <g style={{ animation: 'floatZzz 2.6s ease-in-out infinite' }}>
              <text x="102" y="34" fill="#7A6CF0" fontFamily="Fredoka, sans-serif" fontWeight="600" fontSize="14">
                z
              </text>
              <text x="112" y="25" fill="#7A6CF0" fontFamily="Fredoka, sans-serif" fontWeight="600" fontSize="18">
                Z
              </text>
              <text x="124" y="16" fill="#7A6CF0" fontFamily="Fredoka, sans-serif" fontWeight="600" fontSize="13">
                z
              </text>
            </g>
          )}
        </svg>
      </button>
    </div>
  );
};
