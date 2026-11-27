'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Cloud, Clock, Droplets, Moon, Sun, Sunrise, Sunset } from 'lucide-react';

/* Jam terbit/terbenam rata-rata Jawa Barat (menit sejak 00.00) */
const SUNRISE = 5 * 60 + 45;
const SUNSET = 17 * 60 + 55;
const DAY_SPAN = SUNSET - SUNRISE;
/* Malam: dari terbenam sampai terbit esok hari (busur yang sama dipakai bulan) */
const NIGHT_SPAN = 24 * 60 - DAY_SPAN;
/** Menit sejak matahari terbenam (0 … NIGHT_SPAN). */
const nightElapsed = (m: number) => (m >= SUNSET ? m - SUNSET : m + 24 * 60 - SUNSET);

/* Posisi bintang di kubah malam (persen) */
const STARS = [
  { x: 14, y: 30, d: 0 },
  { x: 27, y: 14, d: 1.2 },
  { x: 41, y: 36, d: 0.6 },
  { x: 58, y: 10, d: 1.8 },
  { x: 69, y: 32, d: 0.3 },
  { x: 82, y: 18, d: 1.5 },
  { x: 90, y: 40, d: 0.9 },
];

/* Busur matahari: Bezier kuadrat (16,130) → kontrol (200,-40) → (384,130) pada viewBox 400×150 */
const ARC_PATH = 'M 16 130 Q 200 -40 384 130';
const bez = (t: number) => ({
  x: (1 - t) * (1 - t) * 16 + 2 * (1 - t) * t * 200 + t * t * 384,
  y: (1 - t) * (1 - t) * 130 + 2 * (1 - t) * t * -40 + t * t * 130,
});
/** Potongan kurva dari terbit sampai t (de Casteljau). */
const subPath = (t: number) => {
  const end = bez(t);
  const cx = 16 + (200 - 16) * t;
  const cy = 130 + (-40 - 130) * t;
  return `M 16 130 Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
};
/** Balikkan x → t (x monoton naik terhadap t). */
const tFromX = (x: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid).x < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const fmtDur = (m: number) => `${Math.floor(m / 60)} j ${m % 60} m`;
const fmtClock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`;

/** Fase cahaya untuk keputusan menyiram. */
function lightPhase(m: number): { label: string; tone: 'water' | 'sun' | 'hot' | 'night' } {
  if (m < SUNRISE || m > SUNSET) return { label: 'Malam · pompa siaga', tone: 'night' };
  if (m < 9 * 60) return { label: 'Pagi · waktu siram ideal', tone: 'water' };
  if (m < 11 * 60) return { label: 'Cahaya naik · fotosintesis aktif', tone: 'sun' };
  if (m < 14 * 60) return { label: 'Terik puncak · hindari menyiram', tone: 'hot' };
  if (m < 16 * 60) return { label: 'Cahaya mulai turun', tone: 'sun' };
  return { label: 'Sore · waktu siram ideal', tone: 'water' };
}

/* Kotak "Matahari hari ini": animasi matahari meluncur, jam berjalan, awan melayang & geser untuk melihat fase cahaya */
export const SunArcPanel: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const mins = now.getHours() * 60 + now.getMinutes();
  const isDay = mins >= SUNRISE && mins <= SUNSET;
  // Siang: matahari di busur terbit→terbenam. Malam: bulan di busur terbenam→terbit.
  const targetT = isDay ? clamp01((mins - SUNRISE) / DAY_SPAN) : clamp01(nightElapsed(mins) / NIGHT_SPAN);

  // Animasi masuk: matahari meluncur dari titik terbit ke posisi sekarang saat kotak terlihat
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const animTRef = useRef(0);
  const [animT, setAnimT] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      animTRef.current = targetT;
      setAnimT(targetT);
      return;
    }
    const from = animTRef.current;
    const start = performance.now();
    const dur = from === 0 ? 1700 : 600;
    let raf = 0;
    const step = (ts: number) => {
      const k = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = from + (targetT - from) * eased;
      animTRef.current = v;
      setAnimT(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, targetT]);

  // Interaksi: geser kursor / jari di busur → matahari bayangan + jam & fase cahaya
  const [hoverT, setHoverT] = useState<number | null>(null);
  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 400;
    if (x < 16 || x > 384) {
      setHoverT(null);
      return;
    }
    setHoverT(tFromX(x));
  };

  const sun = bez(animT);
  const hover = hoverT !== null ? bez(hoverT) : null;
  const hoverMins =
    hoverT !== null
      ? isDay
        ? Math.round(SUNRISE + hoverT * DAY_SPAN)
        : Math.round(SUNSET + hoverT * NIGHT_SPAN) % (24 * 60)
      : null;
  const hoverPhase = hoverMins !== null ? lightPhase(hoverMins) : null;
  const phaseNow = lightPhase(mins);

  const remainLabel = isDay ? fmtDur(Math.max(0, SUNSET - mins)) : fmtDur(NIGHT_SPAN - nightElapsed(mins));
  const remainCaption = isDay ? 'sisa siang hari ini' : 'menuju matahari terbit';
  const ticks = isDay ? [6, 9, 12, 15] : [18, 21, 0, 3];

  return (
    <div className={`dash-sun-panel ${isDay ? '' : 'dash-sun-panel--night'}`}>
      <div className="dash-sun-info">
        <span className="dash-sun-title">
          {isDay ? (
            <>
              <Sun size={15} className="dash-sun-title-icon" /> Matahari hari ini
            </>
          ) : (
            <>
              <Moon size={15} className="dash-moon-title-icon" /> Malam hari ini
            </>
          )}
        </span>
        <div className="dash-sun-remain">
          <strong className="tabular-nums">{remainLabel}</strong>
          <span>{remainCaption}</span>
        </div>
        <dl className="dash-sun-stats">
          <div>
            <dt>
              <Sunrise size={14} /> Terbit
            </dt>
            <dd className="tabular-nums">{fmtClock(SUNRISE)}</dd>
          </div>
          <div>
            <dt>
              <Sunset size={14} /> Terbenam
            </dt>
            <dd className="tabular-nums">{fmtClock(SUNSET)}</dd>
          </div>
          <div>
            <dt>
              <Clock size={14} /> Panjang siang
            </dt>
            <dd className="tabular-nums">{fmtDur(DAY_SPAN)}</dd>
          </div>
        </dl>
      </div>

      <div className="dash-sun-sky">
        <div className="dash-sun-sky-head">
          <span className={`dash-sun-phase dash-sun-phase--${phaseNow.tone}`}>
            Sekarang {fmtClock(mins)} · {phaseNow.label}
          </span>
          <span className="dash-sun-hint">Geser di busur untuk melihat jam lain</span>
        </div>

        <div
          ref={wrapRef}
          className="dash-sun-arc-wrap"
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHoverT(null)}
          role="img"
          aria-label={`Posisi ${isDay ? 'matahari' : 'bulan'} pukul ${fmtClock(mins)}, ${phaseNow.label}`}
        >
          {isDay ? (
            <>
              {/* Awan tipis melayang pelan */}
              <span className="dash-sun-cloud dash-sun-cloud--a" aria-hidden="true">
                <Cloud size={30} strokeWidth={1.4} />
              </span>
              <span className="dash-sun-cloud dash-sun-cloud--b" aria-hidden="true">
                <Cloud size={22} strokeWidth={1.4} />
              </span>
            </>
          ) : (
            /* Bintang berkelip di langit malam */
            STARS.map((st) => (
              <span
                key={`${st.x}-${st.y}`}
                className="dash-night-star"
                style={{ left: `${st.x}%`, top: `${st.y}%`, animationDelay: `${st.d}s` }}
                aria-hidden="true"
              />
            ))
          )}

          <svg className="dash-sun-arc" viewBox="0 0 400 150" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="ctSkyDome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDay ? '#F5B82E' : '#3B4A8C'} stopOpacity={isDay ? 0.16 : 0.3} />
                <stop offset="100%" stopColor={isDay ? '#F5B82E' : '#3B4A8C'} stopOpacity={isDay ? 0.02 : 0.05} />
              </linearGradient>
              <linearGradient id="ctArcStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isDay ? '#F5B82E' : '#9FB0F0'} stopOpacity="0.25" />
                <stop offset="100%" stopColor={isDay ? '#F5B82E' : '#C9D3FF'} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path d={`${ARC_PATH} Z`} fill="url(#ctSkyDome)" />
            <path
              className="dash-sun-track"
              d={ARC_PATH}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.28"
              strokeWidth="1.4"
              strokeDasharray="2 6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {animT > 0.005 && (
              <path
                d={subPath(animT)}
                fill="none"
                stroke="url(#ctArcStroke)"
                strokeWidth="3"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {hover && (
              <line
                x1={hover.x}
                y1={hover.y}
                x2={hover.x}
                y2="130"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <line
              x1="0"
              y1="130"
              x2="400"
              y2="130"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Siang: matahari · Malam: bulan sabit */}
          <span
            className={isDay ? 'dash-sun-dot' : 'dash-moon-dot'}
            style={{ left: `${(sun.x / 400) * 100}%`, top: `${(sun.y / 150) * 100}%` }}
            aria-hidden="true"
          />

          {hover && hoverPhase && hoverMins !== null && (
            <>
              <span
                className="dash-sun-ghost"
                style={{ left: `${(hover.x / 400) * 100}%`, top: `${(hover.y / 150) * 100}%` }}
                aria-hidden="true"
              />
              <span
                className={`dash-sun-tooltip dash-sun-tooltip--${hoverPhase.tone}`}
                style={{
                  left: `${Math.max(14, Math.min(86, (hover.x / 400) * 100))}%`,
                  top: `${(hover.y / 150) * 100}%`,
                }}
              >
                <strong className="tabular-nums">{fmtClock(hoverMins)}</strong> {hoverPhase.label}
              </span>
            </>
          )}

          {ticks.map((h) => {
            const t = isDay ? (h * 60 - SUNRISE) / DAY_SPAN : nightElapsed(h * 60) / NIGHT_SPAN;
            return (
              <span key={h} className="dash-sun-tick" style={{ left: `${(bez(t).x / 400) * 100}%` }} aria-hidden="true">
                {String(h).padStart(2, '0')}.00
              </span>
            );
          })}
        </div>

        <p className="dash-sun-tip">
          <Droplets size={14} />
          <span>
            {isDay ? (
              <>
                Waktu siram terbaik <strong>sebelum 09.00</strong> atau <strong>setelah 16.00</strong>, saat penguapan
                masih rendah.
              </>
            ) : (
              <>
                Malam hari pompa siaga. Siram lagi besok <strong>sebelum 09.00</strong> agar daun tidak lembap
                semalaman.
              </>
            )}
          </span>
        </p>
      </div>
    </div>
  );
};
