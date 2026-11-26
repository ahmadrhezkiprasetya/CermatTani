'use client';

/**
 * TOOLS SEMENTARA — editor gelombang pemisah halaman login.
 * Aktif hanya jika URL memuat `?wave-editor` (mis. /login?wave-editor).
 * Hapus file ini + pemakaiannya di LoginScreen setelah bentuk final ditetapkan.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AUTH_WAVE_DEFAULT,
  AUTH_WAVE_VIEW_H as VH,
  AUTH_WAVE_VIEW_W as VW,
  buildWavePath,
  cloneWave,
  type AuthWave,
  type WaveNode,
  type WavePoint,
} from '@/lib/authWave';

const STORAGE_KEY = 'ct-auth-wave-editor';

/** Kembalikan draft awal bila editor aktif lewat `?wave-editor`, selain itu null. */
export function loadWaveEditorDraft(): AuthWave | null {
  if (typeof window === 'undefined') return null;
  if (!new URLSearchParams(window.location.search).has('wave-editor')) return null;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AuthWave;
      if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length >= 2) return parsed;
    }
  } catch {
    /* abaikan storage yang tidak tersedia */
  }
  return cloneWave(AUTH_WAVE_DEFAULT);
}

type Part = 'anchor' | 'in' | 'out';
type Target = { index: number; part: Part };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const r1 = (value: number) => Math.round(value * 10) / 10;
const lerp = (a: WavePoint, b: WavePoint, t = 0.5): WavePoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function formatOutput(wave: AuthWave): string {
  const pt = (p: WavePoint) => `{ x: ${r1(p.x)}, y: ${r1(p.y)} }`;
  const lines = wave.nodes.map((n) => {
    const parts = [`x: ${r1(n.x)}`, `y: ${r1(n.y)}`];
    if (n.in) parts.push(`in: ${pt(n.in)}`);
    if (n.out) parts.push(`out: ${pt(n.out)}`);
    return `    { ${parts.join(', ')} },`;
  });
  return [
    '// CermatTani — koordinat gelombang login (tempel ke Claude)',
    'export const AUTH_WAVE_DEFAULT: AuthWave = {',
    `  width: ${Math.round(wave.width)},`,
    '  nodes: [',
    ...lines,
    '  ],',
    '};',
    `// path: ${buildWavePath(wave.nodes)}`,
  ].join('\n');
}

type Props = {
  wave: AuthWave;
  onChange: (wave: AuthWave) => void;
  /** true pada mode daftar: gelombang dicerminkan di sisi kiri panel ilustrasi. */
  flipped: boolean;
};

export const AuthWaveEditor: React.FC<Props> = ({ wave, onChange, flipped }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Target | null>(null);
  const waveRef = useRef(wave);
  waveRef.current = wave;

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const [mirror, setMirror] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [hidePoints, setHidePoints] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const update = () => setSize({ w: box.clientWidth, h: box.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wave));
    } catch {
      /* abaikan */
    }
  }, [wave]);

  const toPx = (p: WavePoint) => ({
    x: ((flipped ? VW - p.x : p.x) / VW) * size.w,
    y: (p.y / VH) * size.h,
  });

  const fromClient = (clientX: number, clientY: number): WavePoint => {
    const rect = boxRef.current!.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * VW;
    if (flipped) x = VW - x;
    return { x, y: ((clientY - rect.top) / rect.height) * VH };
  };

  const applyMove = (target: Target, point: WavePoint) => {
    const next = cloneWave(waveRef.current);
    const nodes = next.nodes;
    const node = nodes[target.index];
    const last = nodes.length - 1;

    if (target.part === 'anchor') {
      const nx = clamp(point.x, 0, VW);
      const ny = target.index === 0 ? 0 : target.index === last ? VH : clamp(point.y, 0, VH);
      const dx = nx - node.x;
      const dy = ny - node.y;
      node.x = nx;
      node.y = ny;
      if (node.in) node.in = { x: clamp(node.in.x + dx, 0, VW), y: node.in.y + dy };
      if (node.out) node.out = { x: clamp(node.out.x + dx, 0, VW), y: node.out.y + dy };
    } else {
      const handle = { x: clamp(point.x, 0, VW), y: point.y };
      node[target.part] = handle;
      const other: 'in' | 'out' = target.part === 'in' ? 'out' : 'in';
      const opposite = node[other];
      if (mirror && opposite) {
        const length = Math.hypot(opposite.x - node.x, opposite.y - node.y);
        const angle = Math.atan2(node.y - handle.y, node.x - handle.x);
        node[other] = {
          x: clamp(node.x + Math.cos(angle) * length, 0, VW),
          y: node.y + Math.sin(angle) * length,
        };
      }
    }
    onChange(next);
  };

  const startDrag = (event: React.PointerEvent, target: Target) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = target;
    setSelected(target.index);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    applyMove(dragRef.current, fromClient(event.clientX, event.clientY));
  };

  const endDrag = (event: React.PointerEvent) => {
    dragRef.current = null;
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
  };

  // Tombol H = sembunyikan/tampilkan titik untuk preview.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'h' || event.key === 'H') setHidePoints((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Geser titik terpilih pakai panah keyboard (Shift = 10 unit).
  useEffect(() => {
    if (selected === null || hidePoints) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const step = event.shiftKey ? 10 : 1;
      const delta: Record<string, WavePoint> = {
        ArrowLeft: { x: flipped ? step : -step, y: 0 },
        ArrowRight: { x: flipped ? -step : step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      };
      const d = delta[event.key];
      if (!d) return;
      event.preventDefault();
      const node = waveRef.current.nodes[selected];
      if (!node) return;
      applyMove({ index: selected, part: 'anchor' }, { x: node.x + d.x, y: node.y + d.y });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, flipped, mirror, hidePoints]);

  const addPoint = () => {
    const next = cloneWave(wave);
    const nodes = next.nodes;
    // Pecah segmen setelah titik terpilih; kalau tidak ada, segmen terpanjang.
    let i = selected !== null && selected < nodes.length - 1 ? selected : 0;
    if (selected === null || selected >= nodes.length - 1) {
      let best = -1;
      for (let k = 0; k < nodes.length - 1; k += 1) {
        const len = Math.hypot(nodes[k + 1].x - nodes[k].x, nodes[k + 1].y - nodes[k].y);
        if (len > best) {
          best = len;
          i = k;
        }
      }
    }
    const prev = nodes[i];
    const after = nodes[i + 1];
    const p0: WavePoint = { x: prev.x, y: prev.y };
    const p1 = prev.out ?? p0;
    const p3: WavePoint = { x: after.x, y: after.y };
    const p2 = after.in ?? p3;
    const a = lerp(p0, p1);
    const b = lerp(p1, p2);
    const c = lerp(p2, p3);
    const d = lerp(a, b);
    const e = lerp(b, c);
    const m = lerp(d, e);
    prev.out = a;
    after.in = c;
    const inserted: WaveNode = { x: m.x, y: m.y, in: d, out: e };
    nodes.splice(i + 1, 0, inserted);
    onChange(next);
    setSelected(i + 1);
  };

  const removePoint = () => {
    if (selected === null || selected === 0 || selected === wave.nodes.length - 1) return;
    const next = cloneWave(wave);
    next.nodes.splice(selected, 1);
    onChange(next);
    setSelected(null);
  };

  const reset = () => {
    onChange(cloneWave(AUTH_WAVE_DEFAULT));
    setSelected(null);
    setStatus('Direset ke bentuk awal.');
  };

  const output = formatOutput(wave);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setStatus('Tersalin! Tempel ke Claude.');
    } catch {
      outputRef.current?.select();
      const ok = document.execCommand?.('copy');
      setStatus(ok ? 'Tersalin! Tempel ke Claude.' : 'Gagal menyalin otomatis — blok teks di bawah lalu Ctrl+C.');
    }
  };

  // ---------- gambar overlay ----------
  const nodesPx = wave.nodes.map((n) => ({
    a: toPx(n),
    in: n.in ? toPx(n.in) : null,
    out: n.out ? toPx(n.out) : null,
  }));
  let curve = '';
  if (size.w > 0) {
    curve = `M${nodesPx[0].a.x} ${nodesPx[0].a.y}`;
    for (let i = 1; i < nodesPx.length; i += 1) {
      const c1 = nodesPx[i - 1].out ?? nodesPx[i - 1].a;
      const c2 = nodesPx[i].in ?? nodesPx[i].a;
      const p = nodesPx[i].a;
      curve += `C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p.x} ${p.y}`;
    }
  }

  const selectedNode = selected !== null ? wave.nodes[selected] : null;

  const panel = (
    <div style={styles.panel}>
      <div style={styles.panelHead}>
        <strong>Wave Editor · sementara</strong>
        <button type="button" style={styles.ghost} onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? 'Buka' : 'Kecilkan'}
        </button>
      </div>
      {!collapsed && (
        <>
          <p style={styles.hint}>
            Drag <b>titik besar</b> (anchor) dan <b>titik kecil</b> (handle lengkung). Klik titik lalu pakai
            panah keyboard untuk geser halus (Shift = 10). Tekan <b>H</b> untuk sembunyikan/tampilkan titik.
          </p>

          <label style={styles.row}>
            <span>Lebar gelombang</span>
            <input
              type="range"
              min={40}
              max={200}
              value={wave.width}
              onChange={(e) => onChange({ ...cloneWave(wave), width: Number(e.target.value) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={20}
              max={260}
              value={wave.width}
              onChange={(e) => onChange({ ...cloneWave(wave), width: clamp(Number(e.target.value) || 0, 20, 260) })}
              style={styles.num}
            />
            <span>px</span>
          </label>

          <button
            type="button"
            style={{ ...styles.btn, ...(hidePoints ? styles.primary : null), width: '100%', marginBottom: 8 }}
            onClick={() => setHidePoints((v) => !v)}
          >
            {hidePoints ? '👁 Tampilkan titik lagi (H)' : '🙈 Sembunyikan titik — lihat hasil (H)'}
          </button>

          <label style={styles.check}>
            <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} />
            Handle simetris (lengkung tetap mulus)
          </label>
          <label style={styles.check}>
            <input type="checkbox" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} />
            Tampilkan garis bantu
          </label>

          <div style={styles.info}>
            {selectedNode
              ? `Titik #${selected! + 1} dari ${wave.nodes.length} → x ${r1(selectedNode.x)}, y ${r1(selectedNode.y)}`
              : `${wave.nodes.length} titik · klik titik untuk memilih`}
          </div>

          <div style={styles.buttons}>
            <button type="button" style={styles.btn} onClick={addPoint}>+ Titik</button>
            <button
              type="button"
              style={styles.btn}
              onClick={removePoint}
              disabled={selected === null || selected === 0 || selected === wave.nodes.length - 1}
            >
              − Titik
            </button>
            <button type="button" style={styles.btn} onClick={reset}>Reset</button>
            <button type="button" style={{ ...styles.btn, ...styles.primary }} onClick={copy}>
              Salin koordinat
            </button>
          </div>
          {status && <div style={styles.status}>{status}</div>}
          <textarea ref={outputRef} readOnly value={output} style={styles.output} onFocus={(e) => e.target.select()} />
        </>
      )}
    </div>
  );

  return (
    <>
      <div ref={boxRef} className="ct-auth-wave-editor-box">
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'visible',
            touchAction: 'none',
            pointerEvents: hidePoints ? 'none' : undefined,
            visibility: hidePoints ? 'hidden' : undefined,
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerDown={() => setSelected(null)}
        >
          {showLines && (
            <rect x={0} y={0} width={size.w} height={size.h} fill="none" stroke="#e8ac44" strokeDasharray="4 4" strokeOpacity={0.7} />
          )}
          <path d={curve} fill="none" stroke="#ff4d8d" strokeWidth={2} strokeDasharray="6 4" />
          {showLines &&
            nodesPx.map((n, i) => (
              <g key={`l${i}`} stroke="#1f392d" strokeOpacity={0.55} strokeWidth={1}>
                {n.in && <line x1={n.a.x} y1={n.a.y} x2={n.in.x} y2={n.in.y} />}
                {n.out && <line x1={n.a.x} y1={n.a.y} x2={n.out.x} y2={n.out.y} />}
              </g>
            ))}
          {nodesPx.map((n, i) => (
            <g key={`h${i}`}>
              {n.in && (
                <circle
                  cx={n.in.x}
                  cy={n.in.y}
                  r={5}
                  fill="#e8ac44"
                  stroke="#1f392d"
                  strokeWidth={1.5}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => startDrag(e, { index: i, part: 'in' })}
                />
              )}
              {n.out && (
                <circle
                  cx={n.out.x}
                  cy={n.out.y}
                  r={5}
                  fill="#e8ac44"
                  stroke="#1f392d"
                  strokeWidth={1.5}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => startDrag(e, { index: i, part: 'out' })}
                />
              )}
              <circle
                cx={n.a.x}
                cy={n.a.y}
                r={selected === i ? 9 : 7.5}
                fill={selected === i ? '#ff4d8d' : '#fff'}
                stroke="#1f392d"
                strokeWidth={2}
                style={{ cursor: 'move' }}
                onPointerDown={(e) => startDrag(e, { index: i, part: 'anchor' })}
              />
            </g>
          ))}
        </svg>
      </div>
      {mounted && createPortal(panel, document.body)}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    right: 16,
    bottom: 16,
    zIndex: 99999,
    width: 'min(360px, calc(100vw - 32px))',
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
    padding: 14,
    borderRadius: 14,
    background: 'rgba(20, 40, 30, 0.94)',
    color: '#eef6ef',
    font: '12px/1.45 system-ui, sans-serif',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  panelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 },
  hint: { margin: '8px 0 10px', opacity: 0.8 },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  num: { width: 56, padding: '2px 4px', borderRadius: 6, border: '1px solid #4c9d70', background: '#0f2219', color: '#fff' },
  check: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' },
  info: { margin: '8px 0', padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', fontVariantNumeric: 'tabular-nums' },
  buttons: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  btn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #4c9d70', background: '#1d5235', color: '#fff', cursor: 'pointer', font: 'inherit' },
  primary: { background: '#e8ac44', borderColor: '#e8ac44', color: '#1f392d', fontWeight: 700 },
  ghost: { padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: '#eef6ef', cursor: 'pointer', font: 'inherit' },
  status: { marginTop: 8, color: '#c3f0d2' },
  output: { width: '100%', height: 120, marginTop: 8, padding: 6, borderRadius: 8, border: '1px solid #4c9d70', background: '#0f2219', color: '#d5ecd9', font: '11px/1.4 ui-monospace, monospace', resize: 'vertical' },
};
