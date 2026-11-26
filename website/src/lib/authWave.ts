/**
 * Bentuk gelombang pemisah panel ilustrasi & panel form di halaman login.
 *
 * Koordinat berada di ruang viewBox 0..100 (lebar) x 0..620 (tinggi) yang
 * di-stretch ke lebar `width` px dan tinggi penuh panel. Area di KIRI kurva
 * adalah bagian panel ilustrasi; titik pertama selalu y=0 dan terakhir y=620.
 */

export type WavePoint = { x: number; y: number };
export type WaveNode = WavePoint & { in?: WavePoint; out?: WavePoint };
export type AuthWave = { width: number; nodes: WaveNode[] };

export const AUTH_WAVE_VIEW_W = 100;
export const AUTH_WAVE_VIEW_H = 620;

export const AUTH_WAVE_DEFAULT: AuthWave = {
  width: 72,
  nodes: [
    { x: 0, y: 0, out: { x: 16.5, y: 20.2 } },
    { x: 35, y: 52.8, in: { x: 25, y: 32.3 }, out: { x: 48.6, y: 80.6 } },
    { x: 47.4, y: 117.1, in: { x: 50.1, y: 103.4 }, out: { x: 40.4, y: 155.1 } },
    { x: 11.6, y: 225.5, in: { x: 6.2, y: 175.5 }, out: { x: 26.6, y: 277.5 } },
    { x: 54.8, y: 334, in: { x: 59.7, y: 294.7 }, out: { x: 49.1, y: 379.2 } },
    { x: 16.5, y: 429, in: { x: 12.5, y: 395.6 }, out: { x: 20.2, y: 459.7 } },
    { x: 49.8, y: 535.5, in: { x: 52.5, y: 493.5 }, out: { x: 47.2, y: 577.6 } },
    { x: 0, y: 620, in: { x: 6, y: 612 } },
  ],
};

const round = (value: number) => Math.round(value * 10) / 10;

export function cloneWave(wave: AuthWave): AuthWave {
  return {
    width: wave.width,
    nodes: wave.nodes.map((node) => ({
      ...node,
      in: node.in && { ...node.in },
      out: node.out && { ...node.out },
    })),
  };
}

/** Path tertutup: dari tepi kiri (x=0) sampai kurva gelombang. */
export function buildWavePath(nodes: WaveNode[]): string {
  let d = `M0 0H${round(nodes[0].x)}`;
  for (let i = 1; i < nodes.length; i += 1) {
    const prev = nodes[i - 1];
    const cur = nodes[i];
    const c1 = prev.out ?? prev;
    const c2 = cur.in ?? cur;
    d += `C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(cur.x)} ${round(cur.y)}`;
  }
  return `${d}H0Z`;
}

/** Nilai CSS `url(...)` untuk mask-image; `flip` untuk mode daftar (gelombang di sisi kiri). */
export function buildWaveMask(nodes: WaveNode[], flip: boolean): string {
  const transform = flip ? ` transform="matrix(-1 0 0 1 ${AUTH_WAVE_VIEW_W} 0)"` : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${AUTH_WAVE_VIEW_W} ${AUTH_WAVE_VIEW_H}" preserveAspectRatio="none">` +
    `<path d="${buildWavePath(nodes)}"${transform}/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
