'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type SimLayer3D = 'normal' | 'kelembapan' | 'kesehatan' | 'panen';
export type WeatherMode3D = 'cerah' | 'berawan' | 'hujan' | 'kering';
export type HotspotId3D = 'bedengan' | 'tandon' | 'pompa' | 'surya' | null;
export type CameraPreset3D = 'overview' | 'tanaman' | 'irigasi' | 'surya' | 'contoh';

/** Tingkat keparahan tiap tanaman pada mode "Contoh tanaman busuk" (bedengan depan, kiri → kanan). */
export const ROT_SHOWCASE_LEVELS = [0, 0.3, 0.56, 0.84, 1.2] as const;

export interface LiveSimState3D {
  moisture: number;
  humidity: number;
  temp: number;
  lux: number;
  tank: number;
  battery: number;
  pumpOn: boolean;
  lowSoil: number;
  tankLow: number;
  diseaseRh: number;
  battLow: number;
  plantCount: number;
  layer: SimLayer3D;
  weather: WeatherMode3D;
  selectedHotspot: HotspotId3D;
  autoOrbit?: boolean;
  /** Simulasi busuk buah (0–1): fraksi buah terserang kapang/busuk. */
  fruitRot?: number;
  /** Simulasi busuk daun (0–1): fraksi helai daun bercak/hawar, mulai dari daun bawah. */
  leafRot?: number;
  /** Mode contoh: 5 tanaman bedengan depan berjajar dari sehat sampai mati busuk. */
  rotShowcase?: boolean;
}

export interface ProjectedLabel3D {
  id: Exclude<HotspotId3D, null>;
  x: number;
  y: number;
  visible: boolean;
}

export interface ShowcaseLabel3D {
  x: number;
  y: number;
  visible: boolean;
}

interface Farm3DWebGLCanvasProps {
  liveStateRef: React.MutableRefObject<LiveSimState3D>;
  cameraPreset: { id: CameraPreset3D; seq: number };
  zoomCommand: { delta: number; seq: number };
  onLabelsUpdate: (labels: ProjectedLabel3D[]) => void;
  onHotspotSelect: (id: HotspotId3D) => void;
  /** Posisi layar label tahap busuk (hanya terisi saat mode contoh aktif). */
  onShowcaseLabels?: (labels: ShowcaseLabel3D[]) => void;
}

/* ============================================================================
   DETERMINISTIK NOISE & GENERATOR TEKSTUR PBR HD (0 KB aset eksternal)
   ============================================================================ */

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Hash deterministik 0..1 per (tanaman, organ) agar pola busuk stabil antar frame */
function organHash(a: number, b: number): number {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function terrainHeightAt(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  // Dataran rata untuk seluruh area kebun (radius <= 9.2m)
  if (dist <= 9.2) return 0;
  const t = Math.min(1, (dist - 9.2) / 14);
  const smooth = t * t * (3 - 2 * t);
  const rolling =
    Math.sin(x * 0.085 + 0.6) * Math.cos(z * 0.075 - 0.3) * 3.8 +
    Math.sin(x * 0.17 - z * 0.13) * 1.65 +
    Math.cos(x * 0.045 + z * 0.055) * 4.4 +
    2.6;
  // Sedikit cekungan lembut di sisi depan-kanan agar kamera overview tak terhalang bukit
  const frontClear = z > 8 && x > -2 ? Math.max(0.28, 1 - (z - 8) * 0.03) : 1;
  return Math.max(0, rolling * smooth * frontClear);
}

function createMeadowTexture(maxAniso: number): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(4207);

  // Dasar hijau padang rumput tropis lembut
  ctx.fillStyle = '#538a45';
  ctx.fillRect(0, 0, 512, 512);

  // Bercak variasi tanah & warna rumput organik (menghilangkan kesan kotak berulang)
  for (let i = 0; i < 180; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 18 + rand() * 52;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    const tone = i % 3 === 0 ? 'rgba(116,164,84,0.22)' : i % 3 === 1 ? 'rgba(54,96,48,0.24)' : 'rgba(138,158,76,0.16)';
    g.addColorStop(0, tone);
    g.addColorStop(1, 'rgba(83,138,69,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Helai rumput halus multi-arah
  const bladeColors = ['#66a151', '#45763b', '#76b15c', '#3c6835', '#87ba66'];
  for (let i = 0; i < 6500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const len = 3 + rand() * 7;
    const ang = (rand() - 0.5) * 1.1;
    ctx.strokeStyle = bladeColors[i % bladeColors.length];
    ctx.lineWidth = 0.8 + rand() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(ang) * len, y - Math.cos(ang) * len);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(14, 14);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(14, 14);
  bump.anisotropy = maxAniso;
  return { map, bump };
}

function createGravelCourtyardTexture(maxAniso: number): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(9131);

  ctx.fillStyle = '#c8baa0';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 90; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 16 + rand() * 44;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(170,152,126,0.22)' : 'rgba(226,216,196,0.24)');
    g.addColorStop(1, 'rgba(200,186,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kerikil halus & pasir taman agritech
  const pebblePalette = ['#b2a38a', '#dfd5c3', '#998b74', '#cbbda4', '#857863'];
  for (let i = 0; i < 5500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 0.9 + rand() * 2.4;
    ctx.fillStyle = pebblePalette[i % pebblePalette.length];
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.2, r * 0.85, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  // ExtrudeGeometry menggunakan koordinat dunia (~12.4m × 8.8m), jadi skala 0.36 menghasilkan ubin kerikil yang tajam & proporsional
  map.repeat.set(0.36, 0.36);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(0.36, 0.36);
  bump.anisotropy = maxAniso;
  return { map, bump };
}

function createSoilTexture(maxAniso: number): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(3319);

  ctx.fillStyle = '#5c4028';
  ctx.fillRect(0, 0, 512, 512);

  // Alur guludan gembur
  for (let y = 0; y < 512; y += 14) {
    ctx.fillStyle = y % 28 === 0 ? 'rgba(24,14,8,0.24)' : 'rgba(136,102,68,0.16)';
    ctx.fillRect(0, y, 512, 6);
  }
  // Remah tanah organik, sekam bakar & kompos
  for (let i = 0; i < 6500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1 + rand() * 3.1;
    const p = i % 5;
    ctx.fillStyle =
      p === 0
        ? 'rgba(155,116,80,0.34)'
        : p === 1
          ? 'rgba(26,16,9,0.42)'
          : p === 2
            ? 'rgba(110,80,50,0.35)'
            : p === 3
              ? 'rgba(182,148,104,0.22)'
              : 'rgba(46,30,18,0.38)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3.5, 1.4);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(3.5, 1.4);
  bump.anisotropy = maxAniso;
  return { map, bump };
}

function createWoodTexture(maxAniso: number): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(7741);

  ctx.fillStyle = '#926137';
  ctx.fillRect(0, 0, 512, 256);

  // Serat kayu cedar alami bergelombang
  for (let y = 0; y < 256; y += 2) {
    const wave = Math.sin(y * 0.14) * 10;
    ctx.fillStyle =
      y % 6 === 0
        ? 'rgba(62,36,15,0.22)'
        : y % 4 === 0
          ? 'rgba(188,140,92,0.16)'
          : 'rgba(112,72,38,0.14)';
    ctx.fillRect(0, y + (wave % 2), 512, 2);
  }
  // Mata kayu halus
  for (let k = 0; k < 5; k++) {
    const kx = 40 + rand() * 430;
    const ky = 25 + rand() * 205;
    ctx.strokeStyle = 'rgba(54,30,12,0.32)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 16 + rand() * 12, 5 + rand() * 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Alur sambungan 2 papan horizontal + paku sekrup
  ctx.fillStyle = 'rgba(34,18,7,0.58)';
  ctx.fillRect(0, 125, 512, 5);
  ctx.fillStyle = 'rgba(210,168,120,0.22)';
  ctx.fillRect(0, 130, 512, 2);

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.5, 1);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2.5, 1);
  bump.anisotropy = maxAniso;
  return { map, bump };
}

function createSolarTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#0a1f52');
  grad.addColorStop(0.45, '#133a8a');
  grad.addColorStop(0.75, '#0e2d6e');
  grad.addColorStop(1, '#081a42');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Sel monokristalin 6×10 dengan sudut chamfer putih + fine busbar perak
  const cols = 6;
  const rows = 4;
  const cw = 512 / cols;
  const ch = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw;
      const y = r * ch;
      // Sedikit beda kilau antar sel silikon
      ctx.fillStyle = (r + col) % 2 === 0 ? 'rgba(59,130,246,0.08)' : 'rgba(15,23,42,0.12)';
      ctx.fillRect(x + 3, y + 3, cw - 6, ch - 6);

      // Fine horizontal collector fingers
      ctx.strokeStyle = 'rgba(186,230,253,0.16)';
      ctx.lineWidth = 1;
      for (let fy = y + 10; fy < y + ch - 4; fy += 10) {
        ctx.beginPath();
        ctx.moveTo(x + 3, fy);
        ctx.lineTo(x + cw - 3, fy);
        ctx.stroke();
      }
      // 3 busbar vertikal per sel
      ctx.strokeStyle = 'rgba(226,238,255,0.42)';
      ctx.lineWidth = 1.4;
      for (let b = 1; b <= 3; b++) {
        const bx = x + (b * cw) / 4;
        ctx.beginPath();
        ctx.moveTo(bx, y + 2);
        ctx.lineTo(bx, y + ch - 2);
        ctx.stroke();
      }
    }
  }

  // Garis pemisah sel terang + sudut diamond monokristalin
  ctx.strokeStyle = 'rgba(224,242,254,0.75)';
  ctx.lineWidth = 3;
  for (let i = 1; i < cols; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cw, 0);
    ctx.lineTo(i * cw, 512);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * ch);
    ctx.lineTo(512, j * ch);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(241,245,249,0.88)';
  for (let i = 1; i < cols; i++) {
    for (let j = 1; j < rows; j++) {
      const cx = i * cw;
      const cy = j * ch;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx, cy + 6);
      ctx.lineTo(cx - 6, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/* ---------------------------------------------------------------------------
   DAUN MAJEMUK TOMAT HD: 1 anak daun ujung + 3 pasang anak daun bergerigi di
   tangkai (rachis). Latar transparan → dipotong alphaTest jadi siluet daun asli.
   --------------------------------------------------------------------------- */
const LEAF_TEX = 512;

interface LeafletSpec {
  x: number;
  y: number;
  ang: number;
  len: number;
  wid: number;
}

const LEAFLETS: LeafletSpec[] = [
  { x: 256, y: 176, ang: 0, len: 156, wid: 62 },
  { x: 256, y: 236, ang: -0.95, len: 150, wid: 52 },
  { x: 256, y: 236, ang: 0.95, len: 150, wid: 52 },
  { x: 256, y: 344, ang: -1.08, len: 128, wid: 46 },
  { x: 256, y: 344, ang: 1.08, len: 128, wid: 46 },
  { x: 256, y: 432, ang: -1.22, len: 62, wid: 24 },
  { x: 256, y: 432, ang: 1.22, len: 62, wid: 24 },
];

function leafletHalfWidth(t: number, wid: number): number {
  const body = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.78) * wid;
  // Tepi bergerigi halus khas daun tomat
  return body * (1 - 0.085 * Math.abs(Math.sin(t * Math.PI * 8.5)));
}

/** Path satu anak daun di koordinat lokal: pangkal (0,0), ujung (0,-len). */
function traceLeaflet(ctx: CanvasRenderingContext2D, len: number, wid: number, wobble: () => number) {
  const N = 46;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 1; i < N; i++) {
    const t = i / N;
    ctx.lineTo(leafletHalfWidth(t, wid) * (0.97 + wobble() * 0.05), -t * len);
  }
  ctx.lineTo(0, -len);
  for (let i = N - 1; i >= 1; i--) {
    const t = i / N;
    ctx.lineTo(-leafletHalfWidth(t, wid) * (0.97 + wobble() * 0.05), -t * len);
  }
  ctx.closePath();
}

function drawLeafVeins(ctx: CanvasRenderingContext2D, len: number, wid: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len * 0.94);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  for (let t = 0.14; t < 0.86; t += 0.11) {
    const w = leafletHalfWidth(t + 0.08, wid) * 0.82;
    ctx.beginPath();
    ctx.moveTo(0, -t * len);
    ctx.quadraticCurveTo(w * 0.45, -(t + 0.03) * len, w, -(t + 0.1) * len);
    ctx.moveTo(0, -t * len);
    ctx.quadraticCurveTo(-w * 0.45, -(t + 0.03) * len, -w, -(t + 0.1) * len);
    ctx.stroke();
  }
}

function createLeafTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = LEAF_TEX;
  c.height = LEAF_TEX;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(911);

  // Tangkai daun (rachis)
  ctx.strokeStyle = '#3f8a3c';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(256, 508);
  ctx.lineTo(256, 160);
  ctx.stroke();

  LEAFLETS.forEach((lf, idx) => {
    ctx.save();
    ctx.translate(lf.x, lf.y);
    ctx.rotate(lf.ang);
    traceLeaflet(ctx, lf.len, lf.wid, rand);
    const g = ctx.createLinearGradient(-lf.wid, 0, lf.wid, -lf.len);
    g.addColorStop(0, idx % 2 ? '#2f8a40' : '#338f44');
    g.addColorStop(0.5, '#3f9e4c');
    g.addColorStop(1, '#2a7a39');
    ctx.fillStyle = g;
    ctx.fill();
    // Mikro-tekstur jaringan daun (bintik stomata/rambut halus)
    ctx.save();
    ctx.clip();
    for (let s = 0; s < 260; s++) {
      ctx.fillStyle = s % 2 ? 'rgba(18, 70, 30, 0.10)' : 'rgba(170, 225, 140, 0.08)';
      ctx.fillRect((rand() - 0.5) * lf.wid * 2, -rand() * lf.len, 2, 2);
    }
    // Bayangan lembut sepanjang tulang daun (permukaan daun sedikit berlekuk)
    const sh = ctx.createLinearGradient(-lf.wid, 0, lf.wid, 0);
    sh.addColorStop(0, 'rgba(10, 50, 20, 0.18)');
    sh.addColorStop(0.45, 'rgba(10, 50, 20, 0)');
    sh.addColorStop(0.55, 'rgba(10, 50, 20, 0)');
    sh.addColorStop(1, 'rgba(10, 50, 20, 0.14)');
    ctx.fillStyle = sh;
    ctx.fillRect(-lf.wid, -lf.len, lf.wid * 2, lf.len);
    drawLeafVeins(ctx, lf.len, lf.wid, 'rgba(176, 230, 150, 0.6)');
    ctx.restore();
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createSkyTexture(
  zenith: string,
  mid: string,
  horizon: string,
  groundBounce: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, zenith);
  g.addColorStop(0.32, mid);
  g.addColorStop(0.5, horizon);
  g.addColorStop(0.56, horizon);
  g.addColorStop(1.0, groundBounce);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSunGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 124);
  g.addColorStop(0, 'rgba(255, 253, 232, 1)');
  g.addColorStop(0.22, 'rgba(255, 241, 184, 0.85)');
  g.addColorStop(0.5, 'rgba(255, 226, 140, 0.25)');
  g.addColorStop(1, 'rgba(255, 226, 140, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createOledTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 80;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#071b14';
  ctx.fillRect(0, 0, 128, 80);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 120, 72);
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('ESP32-S3', 14, 24);
  ctx.fillStyle = '#d8f36a';
  ctx.fillRect(14, 34, 72, 9);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(14, 50, 94, 9);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Tekstur daun busuk/hawar: siluet daun majemuk yang sama, tetapi menguning-coklat,
   tepi gosong (nekrosis tepi), bercak konsentris "target spot" berhalo kuning, dan
   jaringan mati yang sobek berlubang. */
function createRotLeafTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = LEAF_TEX;
  c.height = LEAF_TEX;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(4242);

  ctx.strokeStyle = '#6b5326';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(256, 508);
  ctx.lineTo(256, 160);
  ctx.stroke();

  LEAFLETS.forEach((lf, idx) => {
    // Anak daun busuk mengerut & menyempit
    const wid = lf.wid * (0.78 + rand() * 0.14);
    const len = lf.len * (0.9 + rand() * 0.08);
    ctx.save();
    ctx.translate(lf.x, lf.y);
    ctx.rotate(lf.ang + (rand() - 0.5) * 0.12);
    traceLeaflet(ctx, len, wid, rand);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, idx % 3 === 0 ? '#9a8a3a' : '#a8953f');
    g.addColorStop(0.55, '#b59a43');
    g.addColorStop(1, '#8a6a2a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();

    // Tepi daun gosong coklat tua
    traceLeaflet(ctx, len, wid, rand);
    ctx.strokeStyle = 'rgba(62, 38, 14, 0.85)';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120, 82, 30, 0.6)';
    ctx.lineWidth = 30;
    ctx.stroke();

    // Bercak konsentris (hawar awal / Alternaria) dengan halo kuning
    const spots = 2 + Math.floor(rand() * 3);
    for (let s = 0; s < spots; s++) {
      const sx = (rand() - 0.5) * wid * 0.9;
      const sy = -(0.18 + rand() * 0.66) * len;
      const r = 9 + rand() * 14;
      const halo = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 1.9);
      halo.addColorStop(0, 'rgba(232, 210, 80, 0.75)');
      halo.addColorStop(1, 'rgba(232, 210, 80, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2410';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 84, 40, 0.9)';
      ctx.lineWidth = 1.6;
      for (let ring = 0.35; ring < 1; ring += 0.22) {
        ctx.beginPath();
        ctx.arc(sx, sy, r * ring, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    drawLeafVeins(ctx, len, wid, 'rgba(70, 48, 18, 0.55)');
    ctx.restore();

    // Jaringan mati sobek berlubang (transparan → tembus pandang di 3D)
    ctx.globalCompositeOperation = 'destination-out';
    const holes = 1 + Math.floor(rand() * 3);
    for (let h = 0; h < holes; h++) {
      ctx.beginPath();
      ctx.ellipse(
        (rand() - 0.5) * wid * 0.8,
        -(0.25 + rand() * 0.6) * len,
        5 + rand() * 9,
        4 + rand() * 7,
        rand() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/** Geometri daun HD: grid 7×12 melengkung (cekung di tengah, ujung terkulai) untuk tekstur alpha daun majemuk. */
function createCurvedLeafGeometry(): THREE.BufferGeometry {
  const cols = 7;
  const rows = 12;
  const W = 0.36;
  const L = 0.46;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let col = 0; col <= cols; col++) {
      const u = col / cols;
      const v = r / rows;
      const x = (u - 0.5) * W;
      const z = v * L;
      // Lengkung: punggung daun naik di tengah panjang, ujung terkulai, tepi sedikit menangkup
      const y = Math.sin(Math.PI * v) * 0.05 - v * v * 0.075 + x * x * 1.3;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const a = r * (cols + 1) + col;
      const b = a + 1;
      const cIdx = a + cols + 1;
      const d = cIdx + 1;
      indices.push(a, cIdx, b, b, cIdx, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* ---------------------------------------------------------------------------
   BUAH HD: tomat bergelombang (5 ruang biji) dengan cekungan pangkal, kelopak
   bintang hijau, buah busuk keriput & kapang Botrytis berbulu.
   --------------------------------------------------------------------------- */
function createTomatoGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.105, 40, 28);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ny = v.y / 0.105;
    const theta = Math.atan2(v.z, v.x);
    const side = 1 - ny * ny;
    const rib = 1 + 0.045 * Math.cos(theta * 5) * side;
    v.x *= rib * 1.06;
    v.z *= rib * 1.06;
    v.y *= 0.9;
    // Cekungan pangkal tangkai di bahu atas
    if (ny > 0.78) v.y -= ((ny - 0.78) / 0.22) * 0.024;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Bola bergelombang acak (buah keriput / gumpalan kapang). */
function createLumpySphere(radius: number, seed: number, amp: number, wrinkle: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, 36, 26);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const k1 = 3 + (seed % 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const lump =
      Math.sin(n.x * k1 * 2.1 + seed) * Math.cos(n.y * 4.3 - seed * 0.7) * 0.55 +
      Math.sin(n.z * 5.7 + n.y * 3.1 + seed * 1.3) * 0.45;
    const fine = Math.sin(n.x * 17 + n.z * 13) * Math.sin(n.y * 15 + seed) * wrinkle;
    v.multiplyScalar(1 + lump * amp + fine);
    v.y *= 0.88;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Kelopak (calyx) bintang 5 helai + tangkai pendek, menempel di puncak buah. */
function createCalyxGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const points = 10;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 0.072 : 0.016;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const star = new THREE.ShapeGeometry(shape, 3);
  star.rotateX(-Math.PI / 2);
  const sp = star.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const d = Math.hypot(sp.getX(i), sp.getZ(i));
    // Helai kelopak melengkung turun memeluk bahu buah
    sp.setY(i, -d * d * 5.2);
  }
  star.translate(0, 0.078, 0);
  star.computeVertexNormals();
  const stalk = new THREE.CylinderGeometry(0.008, 0.011, 0.05, 8, 1, false);
  stalk.translate(0, 0.1, 0);
  // Samakan atribut sebelum digabung
  const starNi = star.toNonIndexed();
  const stalkNi = stalk.toNonIndexed();
  const merged = new THREE.BufferGeometry();
  const total = starNi.attributes.position.count + stalkNi.attributes.position.count;
  const mPos = new Float32Array(total * 3);
  const mNor = new Float32Array(total * 3);
  mPos.set(starNi.attributes.position.array as Float32Array, 0);
  mPos.set(stalkNi.attributes.position.array as Float32Array, starNi.attributes.position.count * 3);
  mNor.set(starNi.attributes.normal.array as Float32Array, 0);
  mNor.set(stalkNi.attributes.normal.array as Float32Array, starNi.attributes.position.count * 3);
  merged.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mNor, 3));
  [star, stalk, starNi, stalkNi].forEach((gg) => gg.dispose());
  return merged;
}

/** Kulit buah busuk: lesi cekung coklat-hitam bercincin, kulit keriput & retak. Warna dasar terang agar warna instance tetap terbaca. */
function createRotFruitTexture(maxAniso: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const W = 512;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const b = document.createElement('canvas');
  b.width = W;
  b.height = H;
  const bctx = b.getContext('2d')!;
  const rand = seededRand(777);

  ctx.fillStyle = '#e9dcc6';
  ctx.fillRect(0, 0, W, H);
  bctx.fillStyle = '#9a9a9a';
  bctx.fillRect(0, 0, W, H);

  // Keriput kulit
  for (let i = 0; i < 140; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const l = 10 + rand() * 30;
    const a = rand() * Math.PI;
    ctx.strokeStyle = 'rgba(90, 60, 30, 0.18)';
    bctx.strokeStyle = 'rgba(40, 40, 40, 0.55)';
    [ctx, bctx].forEach((cc) => {
      cc.lineWidth = 1.4;
      cc.beginPath();
      cc.moveTo(x, y);
      cc.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      cc.stroke();
    });
  }

  // Lesi cekung bercincin (antraknosa) — digambar 2× di tepi agar menyambung di jahitan UV
  const lesions = 9;
  for (let i = 0; i < lesions; i++) {
    const x = rand() * W;
    const y = 40 + rand() * (H - 80);
    const r = 16 + rand() * 30;
    [x, x - W, x + W].forEach((lx) => {
      const halo = ctx.createRadialGradient(lx, y, r * 0.7, lx, y, r * 1.6);
      halo.addColorStop(0, 'rgba(120, 80, 40, 0.55)');
      halo.addColorStop(1, 'rgba(120, 80, 40, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, y, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b1a0c';
      ctx.beginPath();
      ctx.arc(lx, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 110, 60, 0.75)';
      ctx.lineWidth = 2;
      for (let ring = 0.3; ring < 1; ring += 0.24) {
        ctx.beginPath();
        ctx.arc(lx, y, r * ring, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Titik spora oranye-merah muda di tengah lesi
      for (let s = 0; s < 14; s++) {
        ctx.fillStyle = 'rgba(214, 120, 70, 0.8)';
        ctx.fillRect(lx + (rand() - 0.5) * r, y + (rand() - 0.5) * r, 2, 2);
      }
      const bg = bctx.createRadialGradient(lx, y, 0, lx, y, r * 1.2);
      bg.addColorStop(0, '#202020');
      bg.addColorStop(0.8, '#505050');
      bg.addColorStop(1, 'rgba(154,154,154,0)');
      bctx.fillStyle = bg;
      bctx.beginPath();
      bctx.arc(lx, y, r * 1.2, 0, Math.PI * 2);
      bctx.fill();
    });
  }

  // Retakan kulit
  ctx.strokeStyle = 'rgba(40, 22, 8, 0.85)';
  bctx.strokeStyle = '#111111';
  for (let i = 0; i < 6; i++) {
    let x = rand() * W;
    let y = 30 + rand() * (H - 60);
    [ctx, bctx].forEach((cc) => {
      cc.lineWidth = 2;
      cc.beginPath();
      cc.moveTo(x, y);
    });
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.5) * 22;
      y += 6 + rand() * 8;
      ctx.lineTo(x, y);
      bctx.lineTo(x, y);
    }
    ctx.stroke();
    bctx.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;
  map.wrapS = THREE.RepeatWrapping;
  const bump = new THREE.CanvasTexture(b);
  bump.anisotropy = maxAniso;
  bump.wrapS = THREE.RepeatWrapping;
  return { map, bump };
}

/** Kapang Botrytis: miselium abu-abu keputihan berbulu, bergerombol (alpha-cut). */
function createMoldTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(1337);
  const clusters = 22;
  for (let k = 0; k < clusters; k++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const spread = 20 + rand() * 34;
    for (let i = 0; i < 420; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.pow(rand(), 0.7) * spread;
      const x = (cx + Math.cos(a) * d + W) % W;
      const y = cy + Math.sin(a) * d * 0.8;
      const shade = 190 + Math.floor(rand() * 60);
      ctx.fillStyle = `rgba(${shade}, ${shade - 4}, ${shade - 14}, ${0.65 + rand() * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + rand() * 2.4, 0, Math.PI * 2);
      ctx.fill();
      // Hifa halus (rambut) mencuat
      if (i % 9 === 0) {
        ctx.strokeStyle = `rgba(${shade}, ${shade}, ${shade - 10}, 0.8)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8);
        ctx.stroke();
      }
      // Kepala spora gelap kecil
      if (i % 23 === 0) {
        ctx.fillStyle = 'rgba(95, 92, 84, 0.9)';
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}


/* ============================================================================
   KOMPONEN CANVAS WEBGL THREE.JS — AGRITECH DIORAMA HD 60 FPS
   ============================================================================ */

const Farm3DWebGLCanvas: React.FC<Farm3DWebGLCanvasProps> = ({
  liveStateRef,
  cameraPreset,
  zoomCommand,
  onLabelsUpdate,
  onHotspotSelect,
  onShowcaseLabels,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraObjRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetGoalRef = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);
  const onLabelsRef = useRef(onLabelsUpdate);
  const onHotspotRef = useRef(onHotspotSelect);
  const onShowcaseRef = useRef(onShowcaseLabels);

  useEffect(() => {
    onLabelsRef.current = onLabelsUpdate;
    onHotspotRef.current = onHotspotSelect;
    onShowcaseRef.current = onShowcaseLabels;
  }, [onLabelsUpdate, onHotspotSelect, onShowcaseLabels]);

  // Preset terbang kamera 3D halus
  useEffect(() => {
    if (cameraPreset.seq === 0) return;
    const presets: Record<CameraPreset3D, { pos: [number, number, number]; look: [number, number, number] }> = {
      overview: { pos: [10.4, 7.2, 11.4], look: [0.25, 0.9, 0.0] },
      tanaman: { pos: [4.6, 3.1, 5.1], look: [0.65, 1.05, 0.0] },
      irigasi: { pos: [-7.6, 4.1, 5.4], look: [-4.05, 1.65, -0.75] },
      surya: { pos: [8.1, 3.5, 5.4], look: [4.8, 1.35, 1.75] },
      // Dekat bedengan depan: 5 tanaman contoh tahap busuk berjajar kiri → kanan
      contoh: { pos: [0.65, 2.75, 7.7], look: [0.65, 0.95, 2.25] },
    };
    const p = presets[cameraPreset.id];
    targetGoalRef.current = {
      pos: new THREE.Vector3(...p.pos),
      look: new THREE.Vector3(...p.look),
    };
  }, [cameraPreset]);

  // Zoom +/- dari tombol UI
  useEffect(() => {
    if (zoomCommand.seq === 0 || !cameraObjRef.current || !controlsRef.current) return;
    const cam = cameraObjRef.current;
    const ctrl = controlsRef.current;
    const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target);
    const len = dir.length();
    const nextLen = Math.max(3.2, Math.min(23, len * (zoomCommand.delta > 0 ? 0.84 : 1.18)));
    dir.setLength(nextLen);
    targetGoalRef.current = {
      pos: ctrl.target.clone().add(dir),
      look: ctrl.target.clone(),
    };
  }, [zoomCommand]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = Math.max(300, mount.clientWidth);
    const height = Math.max(260, mount.clientHeight);

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2('#cdeae5', 0.0145);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 180);
    camera.position.set(10.4, 7.2, 11.4);
    cameraObjRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      return;
    }

    const isMobileGpu = width < 640;
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    renderer.setSize(width, height);
    // Resolusi mengikuti layar (maks 1.25×); tepi tetap halus lewat MSAA. Diturunkan otomatis ke 1× bila GPU berat.
    const dpr = window.devicePixelRatio || 1;
    const pixelRatio = Math.min(dpr, 1.25);
    renderer.setPixelRatio(pixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Peta bayangan tidak dihitung ulang tiap frame (diatur manual di loop: tiap 2 frame)
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    mount.appendChild(renderer.domElement);

    // Environment Map PBR Prosedural (memberi pantulan langit nyata di panel surya, air, logam & buah!)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#8ecae6');
    const envSky = new THREE.Mesh(
      new THREE.SphereGeometry(20, 16, 12),
      new THREE.MeshBasicMaterial({
        map: createSkyTexture('#2f80c8', '#98d8f2', '#eef9f4', '#567a48'),
        side: THREE.BackSide,
      })
    );
    envScene.add(envSky);
    const envSun = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#fff8db' })
    );
    envSun.position.set(12, 10, 8);
    envScene.add(envSun);
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();
    (envSky.material as THREE.MeshBasicMaterial).map?.dispose();
    envSky.geometry.dispose();
    (envSky.material as THREE.Material).dispose();
    envSun.geometry.dispose();
    (envSun.material as THREE.Material).dispose();

    // Kualitas adaptif: 1 = resolusi penuh, 0 = resolusi 1× (bila fps rata-rata < ~45)
    let qualityLevel = pixelRatio > 1 ? 1 : 0;
    mount.dataset.quality = String(qualityLevel);
    let perfFrames = 0;
    let perfTime = 0;
    let warmupFrames = 0;
    const lowerQuality = () => {
      if (qualityLevel === 1) {
        renderer.setPixelRatio(1);
        renderer.setSize(Math.max(280, mount.clientWidth), Math.max(240, mount.clientHeight));
        qualityLevel = 0;
        mount.dataset.quality = '0';
      }
    };
    // Batasi 60 fps: monitor 120/144 Hz tidak merender dua kali lebih banyak tanpa beda terlihat
    const MIN_FRAME_MS = 1000 / 60 - 2;
    let frameCount = 0;
    let lastLabelKey = '';
    let lastShowcaseKey = '';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 22.5;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.autoRotateSpeed = 0.55;
    controls.target.set(0.25, 0.9, 0.0);
    controls.update();
    controlsRef.current = controls;

    const onControlStart = () => {
      targetGoalRef.current = null;
    };
    controls.addEventListener('start', onControlStart);

    // ------------------------------------------------------------------------
    // 1. LANGIT ATMOSFERIK 360°, MATAHARI BERCAHAYA, AWAN LEMBUT & PENCAHAYAAN PBR
    // ------------------------------------------------------------------------
    const skyTextures: Record<WeatherMode3D, THREE.CanvasTexture> = {
      cerah: createSkyTexture('#2572ba', '#7ec8eb', '#e4f5ef', '#4c7544'),
      kering: createSkyTexture('#2d6da3', '#e7ba72', '#f7e5c3', '#756847'),
      berawan: createSkyTexture('#4c6573', '#8ca3ab', '#cfdddc', '#445e47'),
      hujan: createSkyTexture('#1e323d', '#3e5864', '#728c92', '#2b4036'),
    };
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTextures.cerah,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(84, 32, 20), skyMat);
    scene.add(skyDome);

    // Pencahayaan 3-titik hangat + bayangan beresolusi tinggi
    const hemiLight = new THREE.HemisphereLight('#d6f1ff', '#4b6c40', 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fff2cf', 2.35);
    sunLight.position.set(16, 20, 11);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = isMobileGpu ? 1024 : 2048;
    sunLight.shadow.mapSize.height = isMobileGpu ? 1024 : 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 54;
    const shadowBound = 12.8;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#9ad8fa', 0.42);
    rimLight.position.set(-14, 9, -12);
    scene.add(rimLight);

    // Matahari + halo glow lembut di langit
    const sunGroup = new THREE.Group();
    sunGroup.position.set(34, 28, -24);
    const sunGlowTex = createSunGlowTexture();
    const sunHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunGlowTex,
        color: '#fff6cc',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    sunHalo.scale.set(15, 15, 1);
    sunGroup.add(sunHalo);
    scene.add(sunGroup);

    // Awan 3D berlapis halus melayang
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
      fog: false,
    });
    const puffGeo = new THREE.SphereGeometry(1, 14, 10);
    const cloudSpecs: [number, number, number, number][] = [
      [-20, 15.5, -24, 2.5], [-17.2, 16.2, -23.5, 2.0], [-22.6, 15.2, -23.8, 1.7], [-19.4, 15.0, -22.2, 1.6],
      [9, 17.2, -28, 2.9], [12.3, 17.8, -27.2, 2.2], [6.0, 16.8, -27.5, 1.9], [9.8, 16.7, -26.0, 1.7],
      [25, 15.8, -10, 2.3], [27.5, 16.3, -9.5, 1.7], [22.8, 15.4, -10.5, 1.5],
      [-14, 16.4, 22, 2.4], [-11.4, 16.8, 22.3, 1.8], [-16.3, 16.0, 21.8, 1.5],
    ];
    cloudSpecs.forEach(([cx, cy, cz, s]) => {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set(cx, cy, cz);
      puff.scale.set(s * 1.48, s * 0.58, s * 0.96);
      cloudGroup.add(puff);
    });
    scene.add(cloudGroup);

    // ------------------------------------------------------------------------
    // 2. MEDAN LEMBAH BERBUKIT HALUS + PELATARAN KERIKIL KEBUN + POHON & RUMPUT
    // ------------------------------------------------------------------------
    const meadowTex = createMeadowTexture(maxAniso);
    const gravelTex = createGravelCourtyardTexture(maxAniso);
    const soilTex = createSoilTexture(maxAniso);
    const woodTex = createWoodTexture(maxAniso);
    const solarTex = createSolarTexture(maxAniso);
    const leafTex = createLeafTexture(maxAniso);
    const oledTex = createOledTexture();

    // Medan bukit lembah kontinu (96×96 segmen + vertex color alami — 0 kerucut kaku!)
    const terrainGeo = new THREE.PlaneGeometry(116, 116, isMobileGpu ? 64 : 92, isMobileGpu ? 64 : 92);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const cMeadow = new THREE.Color('#6ca655');
    const cHillMid = new THREE.Color('#4c854e');
    const cRidge = new THREE.Color('#3d6f4f');
    const cTmp = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = terrainHeightAt(x, z);
      posAttr.setY(i, y);

      const hNorm = Math.min(1, y / 7.5);
      cTmp.copy(cMeadow).lerp(cHillMid, Math.min(1, hNorm * 1.35));
      if (hNorm > 0.55) {
        cTmp.lerp(cRidge, (hNorm - 0.55) / 0.45);
      }
      colors[i * 3] = cTmp.r;
      colors[i * 3 + 1] = cTmp.g;
      colors[i * 3 + 2] = cTmp.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: meadowTex.map,
      bumpMap: meadowTex.bump,
      bumpScale: 0.06,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.0,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Pegunungan kabut jauh melingkar (siluet lembut dataran tinggi Lembang/Ciawi)
    const ridgeGeo = new THREE.CylinderGeometry(58, 62, 16, 64, 1, true);
    const rPos = ridgeGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < rPos.count; i++) {
      const y = rPos.getY(i);
      if (y > 0) {
        const ang = Math.atan2(rPos.getZ(i), rPos.getX(i));
        const peak = 3.5 + Math.sin(ang * 5) * 4.2 + Math.cos(ang * 9 + 1.1) * 2.1 + Math.sin(ang * 3 - 0.5) * 2.8;
        rPos.setY(i, y + peak);
      }
    }
    ridgeGeo.computeVertexNormals();
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: '#5a8a78',
      roughness: 1.0,
      side: THREE.BackSide,
    });
    const ridgeMesh = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridgeMesh.position.y = 4.5;
    scene.add(ridgeMesh);

    // Pelataran kerikil hangat kebun pintar + bingkai batu taman
    const courtyardShape = new THREE.Shape();
    const cw = 6.2;
    const ch = 4.4;
    const cr = 0.85;
    courtyardShape.moveTo(-cw + cr, -ch);
    courtyardShape.lineTo(cw - cr, -ch);
    courtyardShape.quadraticCurveTo(cw, -ch, cw, -ch + cr);
    courtyardShape.lineTo(cw, ch - cr);
    courtyardShape.quadraticCurveTo(cw, ch, cw - cr, ch);
    courtyardShape.lineTo(-cw + cr, ch);
    courtyardShape.quadraticCurveTo(-cw, ch, -cw, ch - cr);
    courtyardShape.lineTo(-cw, -ch + cr);
    courtyardShape.quadraticCurveTo(-cw, -ch, -cw + cr, -ch);

    const courtyardGeo = new THREE.ExtrudeGeometry(courtyardShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    courtyardGeo.rotateX(Math.PI / 2);
    const courtyardMat = new THREE.MeshStandardMaterial({
      map: gravelTex.map,
      bumpMap: gravelTex.bump,
      bumpScale: 0.05,
      roughness: 0.92,
      metalness: 0.0,
    });
    const courtyard = new THREE.Mesh(courtyardGeo, courtyardMat);
    courtyard.position.set(0.2, 0.06, -0.1);
    courtyard.receiveShadow = true;
    scene.add(courtyard);

    // Batu pijakan alami menuju bedengan & tandon
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#9aa49e', roughness: 0.85, metalness: 0.04 });
    const stoneGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.07, 9);
    const steppingStones: [number, number][] = [
      [-2.6, 3.35], [-1.5, 3.55], [-0.4, 3.62], [0.75, 3.62], [1.9, 3.55], [3.0, 3.25],
      [-2.9, 2.2], [-2.95, 1.0], [-2.95, -0.2], [-2.95, -1.4],
    ];
    steppingStones.forEach(([sx, sz], idx) => {
      const st = new THREE.Mesh(stoneGeo, stoneMat);
      st.position.set(sx, 0.085, sz);
      st.rotation.y = idx * 0.85;
      st.scale.set(1.05 + (idx % 2) * 0.22, 1, 0.82);
      st.castShadow = true;
      st.receiveShadow = true;
      scene.add(st);
    });

    // Pagar kayu kebun dengan topi tiang & gapura pintu kebun
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex.map,
      bumpMap: woodTex.bump,
      bumpScale: 0.035,
      roughness: 0.82,
      metalness: 0.02,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      map: woodTex.map,
      color: '#7a5230',
      roughness: 0.84,
      metalness: 0.02,
    });

    const addFenceRun = (points: [number, number][]) => {
      const postGeo = new THREE.BoxGeometry(0.14, 1.02, 0.14);
      const capGeo = new THREE.BoxGeometry(0.19, 0.055, 0.19);
      for (let i = 0; i < points.length; i++) {
        const [px, pz] = points[i];
        const post = new THREE.Mesh(postGeo, darkWoodMat);
        post.position.set(px, 0.51, pz);
        post.castShadow = post.receiveShadow = true;
        scene.add(post);

        const cap = new THREE.Mesh(capGeo, woodMat);
        cap.position.set(px, 1.04, pz);
        cap.castShadow = true;
        scene.add(cap);

        if (i < points.length - 1) {
          const [nx, nz] = points[i + 1];
          const len = Math.hypot(nx - px, nz - pz);
          const ang = Math.atan2(nx - px, nz - pz);
          [0.36, 0.76].forEach((ry) => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.095, len), woodMat);
            rail.position.set((px + nx) / 2, ry, (pz + nz) / 2);
            rail.rotation.y = ang;
            rail.castShadow = rail.receiveShadow = true;
            scene.add(rail);
          });
        }
      }
    };
    addFenceRun([
      [-6.3, -4.8], [-4.2, -4.8], [-2.1, -4.8], [0.0, -4.8], [2.1, -4.8], [4.2, -4.8], [6.4, -4.8],
      [6.4, -2.8], [6.4, -0.8], [6.4, 1.2],
    ]);

    // Pohon rindang bertingkat alami di sekeliling kebun (pengganti bola semak!)
    const randEnv = seededRand(8821);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4930', roughness: 0.92 });
    const treeLeafMats = [
      new THREE.MeshStandardMaterial({ color: '#2f7a3e', roughness: 0.84 }),
      new THREE.MeshStandardMaterial({ color: '#3f8f47', roughness: 0.82 }),
      new THREE.MeshStandardMaterial({ color: '#559e4c', roughness: 0.8 }),
    ];
    const treePositions: [number, number, number][] = [
      [-9.6, -7.8, 1.25], [-6.8, -8.9, 1.05], [-1.8, -9.8, 1.35], [4.2, -9.2, 1.15],
      [8.9, -7.2, 1.28], [10.4, -2.5, 1.12], [9.6, 2.2, 0.96], [-10.4, -2.2, 1.18],
      [-9.8, 3.6, 1.02], [12.5, -10.5, 1.45], [-13.2, -11.4, 1.5], [0.8, -14.2, 1.6],
    ];
    const crownGeo = new THREE.IcosahedronGeometry(1, 2);
    treePositions.forEach(([tx, tz, sc], idx) => {
      const ty = terrainHeightAt(tx, tz);
      const tree = new THREE.Group();
      tree.position.set(tx, ty - 0.1, tz);

      // Batang sedikit melengkung alami
      const trunkH = 2.0 * sc;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11 * sc, 0.22 * sc, trunkH, 7),
        trunkMat
      );
      trunk.position.y = trunkH * 0.5;
      trunk.rotation.z = (randEnv() - 0.5) * 0.1;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      // 4 gugus tajuk asimetris berlapis
      const puffs: [number, number, number, number][] = [
        [0, trunkH + 0.55 * sc, 0, 1.15 * sc],
        [-0.55 * sc, trunkH + 0.25 * sc, 0.35 * sc, 0.85 * sc],
        [0.58 * sc, trunkH + 0.32 * sc, -0.28 * sc, 0.88 * sc],
        [0.1 * sc, trunkH + 1.12 * sc, 0.12 * sc, 0.78 * sc],
      ];
      puffs.forEach(([px, py, pz, pr], pi) => {
        const c = new THREE.Mesh(crownGeo, treeLeafMats[(idx + pi) % treeLeafMats.length]);
        c.position.set(px, py, pz);
        c.scale.set(pr, pr * 0.78, pr * 0.94);
        c.rotation.y = randEnv() * Math.PI;
        c.castShadow = true;
        c.receiveShadow = true;
        tree.add(c);
      });
      scene.add(tree);
    });

    // Rumpun rumput 3D & bunga liar kuning/putih bergoyang (InstancedMesh hemat GPU)
    const tuftCount = isMobileGpu ? 180 : 340;
    const tuftGeo = new THREE.ConeGeometry(0.06, 0.36, 4);
    tuftGeo.translate(0, 0.18, 0);
    const tuftMat = new THREE.MeshStandardMaterial({ color: '#5fa34d', roughness: 0.85 });
    const tuftInst = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
    const tuftDummy = new THREE.Object3D();
    const tuftColor = new THREE.Color();
    for (let i = 0; i < tuftCount; i++) {
      const ang = randEnv() * Math.PI * 2;
      const rad = 7.4 + randEnv() * 14.5;
      const gx = Math.cos(ang) * rad;
      const gz = Math.sin(ang) * rad;
      const gy = terrainHeightAt(gx, gz);
      tuftDummy.position.set(gx, gy - 0.02, gz);
      tuftDummy.rotation.set((randEnv() - 0.5) * 0.3, randEnv() * Math.PI * 2, (randEnv() - 0.5) * 0.3);
      const s = 0.7 + randEnv() * 0.95;
      tuftDummy.scale.set(s, s * (0.8 + randEnv() * 0.6), s);
      tuftDummy.updateMatrix();
      tuftInst.setMatrixAt(i, tuftDummy.matrix);
      tuftColor.set(i % 4 === 0 ? '#79ba58' : i % 4 === 1 ? '#4e8a42' : '#65a44d');
      tuftInst.setColorAt(i, tuftColor);
    }
    tuftInst.instanceMatrix.needsUpdate = true;
    if (tuftInst.instanceColor) tuftInst.instanceColor.needsUpdate = true;
    scene.add(tuftInst);

    // Bunga liar kecil di padang rumput
    const flowerCount = isMobileGpu ? 45 : 90;
    const flowerGeo = new THREE.SphereGeometry(0.055, 6, 5);
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
    const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    for (let i = 0; i < flowerCount; i++) {
      const ang = randEnv() * Math.PI * 2;
      const rad = 7.6 + randEnv() * 11.5;
      const fx = Math.cos(ang) * rad;
      const fz = Math.sin(ang) * rad;
      const fy = terrainHeightAt(fx, fz);
      tuftDummy.position.set(fx, fy + 0.16, fz);
      tuftDummy.rotation.set(0, 0, 0);
      tuftDummy.scale.setScalar(0.8 + randEnv() * 0.55);
      tuftDummy.updateMatrix();
      flowerInst.setMatrixAt(i, tuftDummy.matrix);
      tuftColor.set(i % 3 === 0 ? '#fef08a' : i % 3 === 1 ? '#ffffff' : '#fed7aa');
      flowerInst.setColorAt(i, tuftColor);
    }
    flowerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
    scene.add(flowerInst);

    // Meja panen & peti kayu berisi hasil kebun (pojok kanan belakang pagar — detail hangat!)
    const benchGroup = new THREE.Group();
    benchGroup.position.set(5.15, 0.08, -3.75);
    benchGroup.rotation.y = -0.35;
    scene.add(benchGroup);

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.72), woodMat);
    tableTop.position.y = 0.78;
    tableTop.castShadow = tableTop.receiveShadow = true;
    benchGroup.add(tableTop);

    [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]].forEach(([lx, lz]) => {
      const tLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), darkWoodMat);
      tLeg.position.set(lx, 0.39, lz);
      tLeg.castShadow = true;
      benchGroup.add(tLeg);
    });

    // Peti panen kayu berisi tomat/cabai merah + gembor penyiram logam hijau
    const crateMat = new THREE.MeshStandardMaterial({ color: '#b8834b', roughness: 0.85 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.4), crateMat);
    crate.position.set(-0.32, 0.94, 0);
    crate.castShadow = true;
    benchGroup.add(crate);

    const crateFruitMat = new THREE.MeshStandardMaterial({ color: '#e63e22', roughness: 0.2, metalness: 0.05 });
    for (let f = 0; f < 6; f++) {
      const cf = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), crateFruitMat);
      cf.position.set(-0.46 + (f % 3) * 0.14, 1.06, -0.07 + Math.floor(f / 3) * 0.14);
      cf.castShadow = true;
      benchGroup.add(cf);
    }

    const canMat = new THREE.MeshStandardMaterial({ color: '#2b8a5b', roughness: 0.35, metalness: 0.5 });
    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.28, 12), canMat);
    canBody.position.set(0.36, 0.96, 0.02);
    canBody.castShadow = true;
    benchGroup.add(canBody);
    const canSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.32, 8), canMat);
    canSpout.position.set(0.54, 1.02, 0.02);
    canSpout.rotation.z = -0.78;
    benchGroup.add(canSpout);

    // ------------------------------------------------------------------------
    // 3. 3 BEDENGAN KAYU CEDAR + TANAH GEMBUR + AJIR BAMBU A-FRAME + TANAMAN BOTANIS
    // ------------------------------------------------------------------------
    const soilMat = new THREE.MeshStandardMaterial({
      map: soilTex.map,
      bumpMap: soilTex.bump,
      bumpScale: 0.09,
      color: new THREE.Color('#7a5739'),
      roughness: 0.86,
      metalness: 0.03,
    });

    const bedZPositions = [-2.25, 0.0, 2.25];
    const bedCenterX = 0.65;
    const bedLen = 5.85;
    const bedWid = 1.48;
    const bedH = 0.44;
    // Tinggi permukaan tanah gundukan bedengan (selaras dengan lengkung moundGeo di bawah)
    const soilTopAt = (x: number, z: number, bedZ: number) => {
      const lz = (z - bedZ) / ((bedWid - 0.08) / 2);
      return bedH + 0.02 + Math.max(0, 1 - lz * lz) * 0.09 + Math.sin((x - bedCenterX) * 3.1) * 0.015;
    };

    const dripPipeMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.42,
      metalness: 0.18,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#d9a441',
      roughness: 0.28,
      metalness: 0.82,
    });
    const bambooMat = new THREE.MeshStandardMaterial({ color: '#ccb072', roughness: 0.72, metalness: 0.02 });
    const twineMat = new THREE.MeshStandardMaterial({ color: '#4a3d2d', roughness: 0.95 });

    const emitterPoints: THREE.Vector3[] = [];
    const wetRings: THREE.Mesh[] = [];
    const wetRingMat = new THREE.MeshStandardMaterial({
      color: '#2b1b0f',
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.0,
    });
    const wetRingGeo = new THREE.CircleGeometry(0.25, 16);
    wetRingGeo.rotateX(-Math.PI / 2);

    bedZPositions.forEach((bz) => {
      // 4 papan sisi kayu bedengan + 4 tiang sudut tebal
      const longSide = new THREE.BoxGeometry(bedLen + 0.14, bedH, 0.11);
      const shortSide = new THREE.BoxGeometry(0.11, bedH, bedWid);
      [bz + bedWid / 2, bz - bedWid / 2].forEach((sz) => {
        const s = new THREE.Mesh(longSide, woodMat);
        s.position.set(bedCenterX, bedH / 2 + 0.06, sz);
        s.castShadow = s.receiveShadow = true;
        scene.add(s);
      });
      [bedCenterX - bedLen / 2, bedCenterX + bedLen / 2].forEach((sx) => {
        const s = new THREE.Mesh(shortSide, woodMat);
        s.position.set(sx, bedH / 2 + 0.06, bz);
        s.castShadow = s.receiveShadow = true;
        scene.add(s);
      });
      [
        [bedCenterX - bedLen / 2 - 0.02, bz - bedWid / 2 - 0.02],
        [bedCenterX + bedLen / 2 + 0.02, bz - bedWid / 2 - 0.02],
        [bedCenterX - bedLen / 2 - 0.02, bz + bedWid / 2 + 0.02],
        [bedCenterX + bedLen / 2 + 0.02, bz + bedWid / 2 + 0.02],
      ].forEach(([cx, cz]) => {
        const cp = new THREE.Mesh(new THREE.BoxGeometry(0.16, bedH + 0.08, 0.16), darkWoodMat);
        cp.position.set(cx, (bedH + 0.08) / 2 + 0.06, cz);
        cp.castShadow = cp.receiveShadow = true;
        scene.add(cp);
      });

      // Gundukan tanah melengkung alami (kontur tinggi di tengah bedengan!)
      const moundGeo = new THREE.BoxGeometry(bedLen - 0.08, bedH - 0.04, bedWid - 0.08, 18, 1, 6);
      const mPos = moundGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < mPos.count; i++) {
        if (mPos.getY(i) > 0) {
          const lz = mPos.getZ(i) / ((bedWid - 0.08) / 2);
          const lx = mPos.getX(i);
          const arch = Math.max(0, 1 - lz * lz) * 0.09 + Math.sin(lx * 3.1) * 0.015;
          mPos.setY(i, mPos.getY(i) + arch);
        }
      }
      moundGeo.computeVertexNormals();
      const soilMesh = new THREE.Mesh(moundGeo, soilMat);
      soilMesh.position.set(bedCenterX, (bedH - 0.04) / 2 + 0.06, bz);
      soilMesh.receiveShadow = true;
      soilMesh.userData = { hotspot: 'bedengan' };
      scene.add(soilMesh);

      // Pipa irigasi tetes hitam + 2 palang ajir bambu horizontal (tinggi & tengah)
      const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, bedLen + 0.36, 10), dripPipeMat);
      drip.rotation.z = Math.PI / 2;
      drip.position.set(bedCenterX - 0.16, bedH + 0.13, bz);
      drip.castShadow = true;
      scene.add(drip);

      [1.08, 1.66].forEach((barY) => {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, bedLen - 0.45, 7), bambooMat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(bedCenterX, barY, bz - 0.18);
        bar.castShadow = true;
        scene.add(bar);
      });

      for (let slot = 0; slot < 5; slot++) {
        const px = bedCenterX - 2.24 + slot * 1.12;
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.065, 10), brassMat);
        noz.position.set(px + 0.18, bedH + 0.16, bz);
        scene.add(noz);
        emitterPoints.push(new THREE.Vector3(px + 0.18, bedH + 0.2, bz));

        // Cincin basah di sekitar emitter saat pompa menyala
        const wr = new THREE.Mesh(wetRingGeo, wetRingMat);
        wr.position.set(px + 0.18, bedH + 0.118, bz);
        scene.add(wr);
        wetRings.push(wr);

        // Ajir bambu vertikal + ikatan tali gelap
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 1.56, 7), bambooMat);
        stake.position.set(px - 0.12, bedH + 0.78, bz - 0.18);
        stake.castShadow = true;
        scene.add(stake);

        const knot = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.011, 6, 10), twineMat);
        knot.position.set(px - 0.12, 1.66, bz - 0.18);
        knot.rotation.y = Math.PI / 4;
        scene.add(knot);
      }
    });

    // 15 Tanaman Botanikal Berdaun Nyata (Helai daun melengkung + batang bercabang + buah + bunga!)
    interface PlantAnchor {
      x: number;
      y: number;
      z: number;
      bedIdx: number;
      slotIdx: number;
      phase: number;
    }
    const plants: PlantAnchor[] = [];
    bedZPositions.forEach((bz, bedIdx) => {
      for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
        plants.push({
          x: bedCenterX - 2.24 + slotIdx * 1.12,
          y: bedH + 0.11,
          z: bz + 0.03,
          bedIdx,
          slotIdx,
          phase: bedIdx * 1.85 + slotIdx * 0.95,
        });
      }
    });

    // Batang utama + cabang samping (15 batang utama + 75 cabang samping), warna per-tanaman (layu → coklat)
    const stemGeo = new THREE.CylinderGeometry(0.022, 0.044, 1.18, 12, 6);
    stemGeo.translate(0, 0.59, 0);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78 });
    const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, plants.length);
    stemInst.castShadow = true;
    stemInst.receiveShadow = true;
    scene.add(stemInst);

    const branchGeo = new THREE.CylinderGeometry(0.011, 0.02, 0.36, 8);
    branchGeo.translate(0, 0.18, 0);
    const branchesPerPlant = 5;
    const branchInst = new THREE.InstancedMesh(branchGeo, stemMat, plants.length * branchesPerPlant);
    branchInst.castShadow = true;
    scene.add(branchInst);
    const stemHealthyCol = new THREE.Color('#2f7a3a');
    const stemDeadCol = new THREE.Color('#5e4a2a');

    // Daun majemuk tomat HD alpha-cut (15 tanaman × 28 helai). Bayangan ikut siluet daun (customDepthMaterial).
    const curvedLeafGeo = createCurvedLeafGeometry();
    const leafMat = new THREE.MeshStandardMaterial({
      map: leafTex,
      color: '#ffffff',
      roughness: 0.58,
      metalness: 0.0,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    const leafDepthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: leafTex,
      alphaTest: 0.5,
    });
    const leavesPerPlant = isMobileGpu ? 22 : 28;
    const leafInst = new THREE.InstancedMesh(curvedLeafGeo, leafMat, plants.length * leavesPerPlant);
    leafInst.customDepthMaterial = leafDepthMat;
    leafInst.castShadow = true;
    leafInst.receiveShadow = true;
    scene.add(leafInst);

    // Daun busuk dirender di mesh terpisah bertekstur hawar (tekstur daun sehat hijau tak bisa diwarnai coklat)
    const rotLeafTex = createRotLeafTexture(maxAniso);
    const rotLeafMat = new THREE.MeshStandardMaterial({
      map: rotLeafTex,
      color: '#ffffff',
      roughness: 0.86,
      metalness: 0,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    // Tiap daun busuk punya slot cadangan untuk "rontok ke tanah" — jumlah instance sama dengan daun sehat
    const rotLeafInst = new THREE.InstancedMesh(curvedLeafGeo, rotLeafMat, plants.length * leavesPerPlant);
    rotLeafInst.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: rotLeafTex,
      alphaTest: 0.5,
    });
    rotLeafInst.castShadow = true;
    rotLeafInst.receiveShadow = true;
    rotLeafInst.visible = false;
    scene.add(rotLeafInst);
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    const leafLocal = Array.from({ length: leavesPerPlant }, (_, i) => {
      const frac = i / leavesPerPlant;
      const h = 0.24 + frac * 0.94;
      const ang = i * 2.399963; // sudut emas filotaksis botani
      const rad = 0.035 + (1 - frac * 0.6) * 0.12;
      // Daun bawah melengkung keluar, daun pucuk atas lebih tegak ke cahaya
      const pitch = 0.16 + (1 - frac) * 0.36;
      const sc = (0.78 + (1 - Math.abs(frac - 0.42)) * 0.6) * (i % 3 === 0 ? 1.12 : 0.96);
      const shade = i % 3 === 0 ? '#9fe0a0' : i % 3 === 1 ? '#d8f2cf' : '#ffffff';
      const roll = (organHash(i + 3, 17) - 0.5) * 0.5;
      return { h, ang, rad, pitch, sc, shade, roll };
    });

    // Inisialisasi warna variasi tiap helai daun satu kali (deterministik di semua frame)
    {
      const initLeafCol = new THREE.Color();
      let initIdx = 0;
      for (let pi = 0; pi < plants.length; pi++) {
        for (let li = 0; li < leavesPerPlant; li++) {
          initLeafCol.set(leafLocal[li].shade);
          leafInst.setColorAt(initIdx++, initLeafCol);
        }
      }
      if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
    }

    // Bunga kuning kecil di tajuk atas (15 tanaman × 3 bunga = 45 bunga)
    const blossomGeo = new THREE.OctahedronGeometry(0.042, 0);
    const blossomMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#ca8a04',
      emissiveIntensity: 0.25,
      roughness: 0.45,
    });
    const blossomsPerPlant = 3;
    const blossomInst = new THREE.InstancedMesh(blossomGeo, blossomMat, plants.length * blossomsPerPlant);
    scene.add(blossomInst);

    // Buah PBR HD: tomat beralur 5 ruang + clearcoat kulit mengilap (15 tanaman × 5 buah = 75 buah)
    const fruitGeo = createTomatoGeometry();
    const fruitMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 0.25,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#ffd9c9'),
    });
    const fruitsPerPlant = 5;
    const fruitInst = new THREE.InstancedMesh(fruitGeo, fruitMat, plants.length * fruitsPerPlant);
    fruitInst.castShadow = true;
    fruitInst.receiveShadow = true;
    scene.add(fruitInst);

    // Kelopak bintang hijau + tangkai di puncak tiap buah (layu coklat saat busuk)
    const calyxMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide });
    const calyxInst = new THREE.InstancedMesh(createCalyxGeometry(), calyxMat, plants.length * fruitsPerPlant);
    calyxInst.castShadow = true;
    scene.add(calyxInst);
    const calyxGreen = new THREE.Color('#3f8f3a');
    const calyxDead = new THREE.Color('#4b3a1e');

    // Buah busuk: kulit keriput kusam dengan lesi cekung bercincin & retak (mesh terpisah, tanpa kilap)
    const rotFruitTex = createRotFruitTexture(maxAniso);
    const rotFruitMat = new THREE.MeshStandardMaterial({
      map: rotFruitTex.map,
      bumpMap: rotFruitTex.bump,
      bumpScale: 2.2,
      color: '#ffffff',
      roughness: 0.74,
      metalness: 0,
    });
    const rotFruitInst = new THREE.InstancedMesh(
      createLumpySphere(0.105, 5, 0.075, 0.018),
      rotFruitMat,
      plants.length * fruitsPerPlant
    );
    rotFruitInst.castShadow = true;
    rotFruitInst.receiveShadow = true;
    rotFruitInst.visible = false;
    scene.add(rotFruitInst);

    const fruitLocal = Array.from({ length: fruitsPerPlant }, (_, i) => ({
      h: 0.38 + (i % 3) * 0.22 + Math.floor(i / 3) * 0.08,
      ang: i * 1.38 + 0.5,
      rad: 0.21 + (i % 2) * 0.09,
      stage: i % 3, // 0=matang, 1=setengah, 2=mentah
    }));

    // Kapang Botrytis abu-abu berbulu: gumpalan bergelombang ber-alpha yang "menyembul" dari kulit buah
    // seiring keparahan (skala tumbuh dari dalam buah → menutupi sebagian lalu seluruh buah)
    const moldTex = createMoldTexture();
    const moldGeo = createLumpySphere(0.108, 11, 0.09, 0.03);
    const moldMat = new THREE.MeshStandardMaterial({
      map: moldTex,
      color: '#ddd6c6',
      emissive: '#4a4234',
      emissiveIntensity: 0.35,
      envMapIntensity: 0.25,
      roughness: 1,
      metalness: 0,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
    });
    const moldInst = new THREE.InstancedMesh(moldGeo, moldMat, plants.length * fruitsPerPlant);
    moldInst.visible = false;
    scene.add(moldInst);

    // Kunci busuk per organ: daun bawah & buah tua terserang lebih dulu (realistis untuk hawar/busuk)
    const leafRotKey = plants.map((_, pi) =>
      Array.from({ length: leavesPerPlant }, (__, li) => 0.55 * organHash(pi + 1, li + 1) + 0.45 * (li / leavesPerPlant))
    );
    const fruitRotKey = plants.map((_, pi) =>
      Array.from({ length: fruitsPerPlant }, (__, fi) => 0.7 * organHash(pi + 31, fi + 7) + 0.3 * (fruitLocal[fi].stage / 2))
    );
    const leafHealthyCol = new THREE.Color();
    const leafChloroticCol = new THREE.Color('#f2e27a');
    const leafNecroticCol = new THREE.Color('#4a3216');
    const fruitRotCol = new THREE.Color('#6b4524');
    let lastRotSig = '';
    let lastPlantLayer: SimLayer3D | null = null;

    // ------------------------------------------------------------------------
    // 4. MENARA TANDON AIR 500L BERANGKA SILANG BESI + TANGGA + PIPA KATUP
    // ------------------------------------------------------------------------
    const tankGroup = new THREE.Group();
    tankGroup.position.set(-4.35, 0.06, -2.35);
    scene.add(tankGroup);

    const concreteMat = new THREE.MeshStandardMaterial({ color: '#a3ada8', roughness: 0.9, metalness: 0.03 });
    const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.36, metalness: 0.78 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.42, metalness: 0.72 });
    const valveRedMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35, metalness: 0.35 });

    // Pondasi beton bertingkat
    const tankPad = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.18, 2.25), concreteMat);
    tankPad.position.y = 0.09;
    tankPad.castShadow = tankPad.receiveShadow = true;
    tankGroup.add(tankPad);

    // 4 kaki besi + palang X-bracing 4 sisi (terlihat kokoh & industrial!)
    const towerH = 1.48;
    const legOff = 0.82;
    const legGeo = new THREE.BoxGeometry(0.1, towerH, 0.1);
    const corners: [number, number][] = [
      [-legOff, -legOff],
      [legOff, -legOff],
      [legOff, legOff],
      [-legOff, legOff],
    ];
    corners.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(lx, 0.18 + towerH / 2, lz);
      leg.castShadow = true;
      tankGroup.add(leg);
    });

    const addStrut = (parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r = 0.026, mat = darkSteelMat) => {
      const dVec = new THREE.Vector3().subVectors(b, a);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dVec.length(), 7), mat);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dVec.normalize());
      mesh.castShadow = true;
      parent.add(mesh);
    };

    for (let s = 0; s < 4; s++) {
      const [x1, z1] = corners[s];
      const [x2, z2] = corners[(s + 1) % 4];
      // X-brace diagonal
      addStrut(tankGroup, new THREE.Vector3(x1, 0.24, z1), new THREE.Vector3(x2, 1.56, z2));
      addStrut(tankGroup, new THREE.Vector3(x2, 0.24, z2), new THREE.Vector3(x1, 1.56, z1));
      // Palang horizontal tengah
      addStrut(tankGroup, new THREE.Vector3(x1, 0.9, z1), new THREE.Vector3(x2, 0.9, z2), 0.03, steelMat);
    }

    // Platform atas + tangga servis besi di sisi kanan tandon
    const tankDeck = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.1, 1.94), steelMat);
    tankDeck.position.y = 1.66;
    tankDeck.castShadow = tankDeck.receiveShadow = true;
    tankGroup.add(tankDeck);

    // Tangga servis 6 anak tangga
    addStrut(tankGroup, new THREE.Vector3(0.98, 0.16, -0.22), new THREE.Vector3(0.98, 2.25, -0.22), 0.024, steelMat);
    addStrut(tankGroup, new THREE.Vector3(0.98, 0.16, 0.22), new THREE.Vector3(0.98, 2.25, 0.22), 0.024, steelMat);
    for (let r = 0; r < 6; r++) {
      const ry = 0.36 + r * 0.32;
      addStrut(tankGroup, new THREE.Vector3(0.98, ry, -0.22), new THREE.Vector3(0.98, ry, 0.22), 0.016, steelMat);
    }

    // Isi air 3D dinamis + cincin permukaan air mengilap (meniscus)
    const waterMaxH = 1.92;
    const waterGeo = new THREE.CylinderGeometry(0.77, 0.77, waterMaxH, 28);
    waterGeo.translate(0, waterMaxH / 2, 0);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: '#1da1f2',
      roughness: 0.08,
      metalness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.88,
      emissive: new THREE.Color('#074d78'),
      emissiveIntensity: 0.28,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 1.74;
    waterMesh.scale.y = Math.max(0.05, liveStateRef.current.tank / 100);
    tankGroup.add(waterMesh);

    const waterTopRingMat = new THREE.MeshBasicMaterial({
      color: '#bae6fd',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const waterTopRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.76, 28), waterTopRingMat);
    waterTopRing.rotation.x = -Math.PI / 2;
    waterTopRing.position.y = 2.6;
    tankGroup.add(waterTopRing);

    // Dinding tandon polietilen transparan + bahu kubah realistis (LatheGeometry!)
    const tankPoints = [
      new THREE.Vector2(0.84, 0.0),
      new THREE.Vector2(0.86, 0.15),
      new THREE.Vector2(0.86, 1.95),
      new THREE.Vector2(0.82, 2.12),
      new THREE.Vector2(0.54, 2.26),
      new THREE.Vector2(0.42, 2.34),
    ];
    const tankShellGeo = new THREE.LatheGeometry(tankPoints, 32);
    const tankShellMat = new THREE.MeshPhysicalMaterial({
      color: '#e0f4ff',
      roughness: 0.1,
      metalness: 0.05,
      transparent: true,
      opacity: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      depthWrite: false,
    });
    const tankShell = new THREE.Mesh(tankShellGeo, tankShellMat);
    tankShell.position.y = 1.72;
    tankShell.castShadow = true;
    tankShell.userData = { hotspot: 'tandon' };
    tankGroup.add(tankShell);

    // Rusuk penguat tabung tandon
    const ribGeo = new THREE.TorusGeometry(0.865, 0.026, 10, 32);
    [2.12, 2.62, 3.12, 3.55].forEach((ry) => {
      const r = new THREE.Mesh(ribGeo, steelMat);
      r.rotation.x = Math.PI / 2;
      r.position.y = ry;
      tankGroup.add(r);
    });

    // Tutup manhole atas + modul sensor ultrasonik HC-SR04 / JSN-SR04T
    const capMat = new THREE.MeshStandardMaterial({ color: '#142925', roughness: 0.45, metalness: 0.25 });
    const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.47, 0.12, 24), capMat);
    tankCap.position.y = 4.08;
    tankCap.castShadow = true;
    tankGroup.add(tankCap);

    const ultraBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.24), darkSteelMat);
    ultraBox.position.y = 4.22;
    ultraBox.castShadow = true;
    tankGroup.add(ultraBox);

    // Katup merah & kaca indikator level di depan tandon
    const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 16), valveRedMat);
    valveWheel.position.set(0.0, 1.38, 0.88);
    tankGroup.add(valveWheel);

    // ------------------------------------------------------------------------
    // 5. STASIUN POMPA SENTRIFUGAL + TABUNG TEKAN + MANIFOLD PVC BERKATUP
    // ------------------------------------------------------------------------
    const pumpGroup = new THREE.Group();
    pumpGroup.position.set(-4.15, 0.06, 0.85);
    scene.add(pumpGroup);

    const pumpPad = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 1.3), concreteMat);
    pumpPad.position.y = 0.07;
    pumpPad.castShadow = pumpPad.receiveShadow = true;
    pumpGroup.add(pumpPad);

    const pumpBodyMat = new THREE.MeshStandardMaterial({
      color: '#0e627a',
      roughness: 0.28,
      metalness: 0.68,
    });
    const motorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.74, 20), pumpBodyMat);
    motorMesh.rotation.z = Math.PI / 2;
    motorMesh.position.set(-0.14, 0.48, 0.12);
    motorMesh.castShadow = true;
    motorMesh.userData = { hotspot: 'pompa' };
    pumpGroup.add(motorMesh);

    // Sirip pendingin motor pompa (6 cincin sirip realistis!)
    for (let fin = -2; fin <= 2; fin++) {
      const fRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.016, 6, 18), pumpBodyMat);
      fRing.rotation.y = Math.PI / 2;
      fRing.position.set(-0.14 + fin * 0.11, 0.48, 0.12);
      pumpGroup.add(fRing);
    }

    // Rumah impeller + kotak terminal + tabung tekan (pressure tank)
    const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 18), steelMat);
    headMesh.rotation.z = Math.PI / 2;
    headMesh.position.set(0.36, 0.48, 0.12);
    headMesh.castShadow = true;
    headMesh.userData = { hotspot: 'pompa' };
    pumpGroup.add(headMesh);

    const pressureTank = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 0.32, 8, 16),
      new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.24, metalness: 0.45 })
    );
    pressureTank.position.set(0.36, 0.94, -0.26);
    pressureTank.castShadow = true;
    pressureTank.userData = { hotspot: 'pompa' };
    pumpGroup.add(pressureTank);

    const pumpLedMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 1.5,
      roughness: 0.18,
    });
    const pumpLed = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), pumpLedMat);
    pumpLed.position.set(-0.14, 0.86, 0.12);
    pumpGroup.add(pumpLed);

    // Jaringan Pipa PVC + sambungan siku + katup merah per bedengan
    const pvcMat = new THREE.MeshStandardMaterial({
      color: '#dce4e8',
      roughness: 0.32,
      metalness: 0.08,
    });
    const addPipeSegment = (a: THREE.Vector3, b: THREE.Vector3, radius = 0.056) => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12), pvcMat);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      mesh.castShadow = true;
      scene.add(mesh);
      // Sambungan siku di ujung
      const joint = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.24, 10, 8), pvcMat);
      joint.position.copy(b);
      scene.add(joint);
    };

    const pipeA = new THREE.Vector3(-4.35, 1.72, -1.62);
    const pipeB = new THREE.Vector3(-4.35, 0.54, -1.62);
    const pipeC = new THREE.Vector3(-4.15, 0.54, 0.97);
    const pipeD = new THREE.Vector3(-2.52, 0.54, 0.97);
    const pipeE = new THREE.Vector3(-2.52, 0.54, -2.25);
    const pipeF = new THREE.Vector3(-2.52, 0.54, 2.25);
    addPipeSegment(pipeA, pipeB);
    addPipeSegment(pipeB, pipeC);
    addPipeSegment(pipeC, pipeD);
    addPipeSegment(pipeE, pipeF);

    // Katup merah di setiap cabang bedengan
    bedZPositions.forEach((bz) => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.04), valveRedMat);
      handle.position.set(-2.52, 0.64, bz);
      scene.add(handle);
    });

    // ------------------------------------------------------------------------
    // 6. PANEL SURYA MONOKRISTALIN + KABINET ESP32-S3 IP65 + SENSOR CUACA
    // ------------------------------------------------------------------------
    const solarGroup = new THREE.Group();
    solarGroup.position.set(4.85, 0.06, 1.78);
    scene.add(solarGroup);

    const solarPad = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 1.55), concreteMat);
    solarPad.position.y = 0.07;
    solarPad.castShadow = solarPad.receiveShadow = true;
    solarGroup.add(solarPad);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.088, 2.02, 14), steelMat);
    mast.position.y = 1.08;
    mast.castShadow = true;
    solarGroup.add(mast);

    // Pelat dasar baut tiang
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.36), darkSteelMat);
    basePlate.position.y = 0.16;
    solarGroup.add(basePlate);

    // Panel surya miring + bingkai aluminium anodized + kaca clearcoat
    const panelHolder = new THREE.Group();
    panelHolder.position.set(0, 2.12, 0);
    panelHolder.rotation.x = 0.44;
    panelHolder.rotation.y = -0.34;
    solarGroup.add(panelHolder);

    const aluMat = new THREE.MeshStandardMaterial({ color: '#d8e2ec', roughness: 0.24, metalness: 0.88 });
    const panelFrame = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.075, 1.44), aluMat);
    panelFrame.castShadow = true;
    panelFrame.userData = { hotspot: 'surya' };
    panelHolder.add(panelFrame);

    const panelGlassMat = new THREE.MeshPhysicalMaterial({
      map: solarTex,
      roughness: 0.08,
      metalness: 0.38,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });
    const panelFace = new THREE.Mesh(new THREE.PlaneGeometry(1.98, 1.3), panelGlassMat);
    panelFace.rotation.x = -Math.PI / 2;
    panelFace.position.y = 0.041;
    panelFace.userData = { hotspot: 'surya' };
    panelHolder.add(panelFace);

    // Braket penopang belakang panel
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.08), darkSteelMat);
    strut.position.set(0, 1.82, -0.24);
    strut.rotation.x = 0.45;
    solarGroup.add(strut);

    // Kabinet IP65 ESP32-S3 + layar OLED bertekstur + sensor iklim Stevenson putih
    const espBoxMat = new THREE.MeshStandardMaterial({ color: '#edf2f7', roughness: 0.38, metalness: 0.12 });
    const espBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.64, 0.36), espBoxMat);
    espBox.position.set(0.3, 1.04, 0.14);
    espBox.castShadow = true;
    espBox.userData = { hotspot: 'surya' };
    solarGroup.add(espBox);

    const oledMat = new THREE.MeshStandardMaterial({
      map: oledTex,
      emissiveMap: oledTex,
      emissive: new THREE.Color('#4ade80'),
      emissiveIntensity: 1.05,
      roughness: 0.2,
    });
    const oled = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), oledMat);
    oled.position.set(0.3, 1.12, 0.325);
    solarGroup.add(oled);

    // Stevenson Screen mini (sensor suhu/RH DHT22 putih berpiring 4 lapis) di lengan kiri tiang
    addStrut(solarGroup, new THREE.Vector3(0, 1.38, 0), new THREE.Vector3(-0.46, 1.38, 0), 0.02, steelMat);
    for (let plate = 0; plate < 4; plate++) {
      const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.025, 14), espBoxMat);
      pMesh.position.set(-0.46, 1.32 + plate * 0.045, 0);
      pMesh.castShadow = true;
      solarGroup.add(pMesh);
    }

    // Antena WiFi/LoRa + cincin sinyal telemetri
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.46, 8), capMat);
    ant.position.set(0.45, 1.56, 0.14);
    solarGroup.add(ant);

    const signalRingMat = new THREE.MeshBasicMaterial({
      color: '#d8f36a',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const signalRing = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.185, 28), signalRingMat);
    signalRing.rotation.x = -Math.PI / 2;
    signalRing.position.set(0.45, 1.82, 0.14);
    solarGroup.add(signalRing);

    // Partikel energi surya mengalir dari panel ke ESP32
    const orbGeo = new THREE.SphereGeometry(0.052, 10, 10);
    const orbMat = new THREE.MeshBasicMaterial({ color: '#e9ff70' });
    const orbCount = 8;
    const orbInst = new THREE.InstancedMesh(orbGeo, orbMat, orbCount);
    solarGroup.add(orbInst);

    // ------------------------------------------------------------------------
    // 7. PARTIKEL HIDUP: PERCIKAN IRIGASI + HUJAN 3D + KUPU-KUPU TAMAN + KABUT RH
    // ------------------------------------------------------------------------
    const dropGeo = new THREE.SphereGeometry(0.04, 7, 7);
    dropGeo.scale(0.82, 1.55, 0.82);
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: '#7dd3fc',
      roughness: 0.06,
      metalness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.9,
    });
    const dropsPerEmitter = 7;
    const totalDrops = emitterPoints.length * dropsPerEmitter;
    const dropInst = new THREE.InstancedMesh(dropGeo, dropMat, totalDrops);
    scene.add(dropInst);

    const dropSeeds = Array.from({ length: totalDrops }, (_, i) => ({
      emitterIdx: i % emitterPoints.length,
      phase: Math.random(),
      angle: Math.random() * Math.PI * 2,
      spread: 0.14 + Math.random() * 0.25,
      heightPeak: 0.24 + Math.random() * 0.18,
      speed: 1.15 + Math.random() * 0.55,
    }));

    // Hujan 3D
    const rainCount = isMobileGpu ? 90 : 170;
    const rainGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.62, 4);
    const rainMat = new THREE.MeshBasicMaterial({
      color: '#cfefff',
      transparent: true,
      opacity: 0.55,
    });
    const rainInst = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
    rainInst.visible = false;
    scene.add(rainInst);

    const rainSeeds = Array.from({ length: rainCount }, () => ({
      x: (Math.random() - 0.5) * 22,
      y: Math.random() * 13,
      z: (Math.random() - 0.5) * 18,
      speed: 12 + Math.random() * 5,
    }));

    // 3 Kupu-kupu taman berterbangan lembut saat cuaca cerah (bikin kebun terasa hidup!)
    const wingGeo = new THREE.PlaneGeometry(0.11, 0.08);
    wingGeo.translate(0.055, 0, 0);
    const butterflyMat = new THREE.MeshBasicMaterial({
      color: '#fef08a',
      side: THREE.DoubleSide,
    });
    const butterflies = Array.from({ length: 3 }, (_, idx) => {
      const g = new THREE.Group();
      const leftW = new THREE.Mesh(wingGeo, butterflyMat);
      leftW.scale.x = -1;
      const rightW = new THREE.Mesh(wingGeo, butterflyMat);
      g.add(leftW, rightW);
      scene.add(g);
      return { g, leftW, rightW, phase: idx * 2.1, r: 1.6 + idx * 0.85, baseY: 1.9 + idx * 0.32 };
    });

    // ------------------------------------------------------------------------
    // 8. RAYCASTER KLIK OBJEK 3D + PROYEKSI LABEL NON-OVERLAP
    // ------------------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        const hs = hit.object.userData?.hotspot as HotspotId3D | undefined;
        if (hs) {
          onHotspotRef.current(hs);
          return;
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const labelAnchors: Record<Exclude<HotspotId3D, null>, THREE.Vector3> = {
      tandon: new THREE.Vector3(-4.35, 4.58, -2.35),
      pompa: new THREE.Vector3(-4.15, 1.56, 0.85),
      bedengan: new THREE.Vector3(0.65, 2.18, -0.25),
      surya: new THREE.Vector3(4.85, 3.0, 1.78),
    };

    let isVisible = true;
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              isVisible = Boolean(entries[0]?.isIntersecting);
            },
            { threshold: 0.05 }
          )
        : null;
    io?.observe(mount);

    const ro = new ResizeObserver(() => {
      const w = Math.max(280, mount.clientWidth);
      const h = Math.max(240, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    const drySoilCol = new THREE.Color('#a0744c');
    const wetSoilCol = new THREE.Color('#392415');
    const moistHeatLow = new THREE.Color('#ca8639');
    const moistHeatHigh = new THREE.Color('#1a7ec4');
    const projVec = new THREE.Vector3();

    let currentWeatherKey: WeatherMode3D = 'cerah';
    let rafId = 0;
    let lastNow = performance.now();
    let elapsed = 0;
    let labelFrameCounter = 0;
    let showcaseLabelsSent = false;
    const showcaseAnchors = plants
      .filter((pl) => pl.bedIdx === 2)
      .sort((a, b) => a.slotIdx - b.slotIdx)
      .map((pl) => new THREE.Vector3(pl.x, pl.y + 1.45, pl.z));

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      if (!isVisible || document.hidden) {
        lastNow = now;
        return;
      }
      if (now - lastNow < MIN_FRAME_MS) return;

      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      frameCount++;
      elapsed += dt;

      const st = liveStateRef.current;

      controls.autoRotate = Boolean(st.autoOrbit) && !targetGoalRef.current;
      if (targetGoalRef.current) {
        camera.position.lerp(targetGoalRef.current.pos, 0.085);
        controls.target.lerp(targetGoalRef.current.look, 0.085);
        if (camera.position.distanceTo(targetGoalRef.current.pos) < 0.06) {
          targetGoalRef.current = null;
        }
      }
      controls.update();

      // Update atmosfer langit, fog & pencahayaan matahari
      if (st.weather !== currentWeatherKey) {
        currentWeatherKey = st.weather;
        skyMat.map = skyTextures[st.weather];
        skyMat.needsUpdate = true;
      }

      if (st.weather === 'hujan') {
        sunLight.intensity = 0.78;
        sunLight.color.set('#b8cdd9');
        hemiLight.intensity = 0.72;
        fog.color.set('#668087');
        fog.density = 0.025;
        sunGroup.visible = false;
      } else if (st.weather === 'berawan') {
        sunLight.intensity = 1.15;
        sunLight.color.set('#dce8ee');
        hemiLight.intensity = 0.84;
        fog.color.set('#aec5c9');
        fog.density = 0.019;
        sunGroup.visible = false;
      } else if (st.weather === 'kering') {
        sunLight.intensity = 2.75;
        sunLight.color.set('#ffdf9c');
        hemiLight.intensity = 0.88;
        fog.color.set('#edd7b0');
        fog.density = 0.0135;
        sunGroup.visible = true;
      } else {
        sunLight.intensity = 2.35;
        sunLight.color.set('#fff2cf');
        hemiLight.intensity = 0.9;
        fog.color.set('#cdeae5');
        fog.density = 0.013;
        sunGroup.visible = true;
      }

      cloudGroup.position.x = Math.sin(elapsed * 0.045) * 5.2;

      // Warna & kilap tanah PBR sesuai kelembapan + layer aktif
      const mNorm = Math.max(0, Math.min(1, (st.moisture - 15) / 65));
      if (st.layer === 'kelembapan') {
        soilMat.color.copy(moistHeatLow).lerp(moistHeatHigh, mNorm);
        soilMat.roughness = 0.52;
      } else if (st.layer === 'kesehatan') {
        soilMat.color.set(st.humidity >= st.diseaseRh ? '#8c5a2b' : '#4a6b3d');
        soilMat.roughness = 0.75;
      } else {
        soilMat.color.copy(drySoilCol).lerp(wetSoilCol, mNorm);
        soilMat.roughness = 0.92 - mNorm * 0.64;
      }

      // Animasi angin & layu pada 15 tanaman (batang, cabang, 420 daun majemuk, bunga, 75 buah) + simulasi busuk per tanaman
      const windAmp = st.weather === 'hujan' ? 0.085 : 0.032;
      const droopFactor = st.moisture < 30 ? 0.24 : 0;
      const isRiskLeaf = st.layer === 'kesehatan' && st.humidity >= st.diseaseRh;
      leafMat.color.set(isRiskLeaf ? '#c4b144' : st.moisture < 28 ? '#8cb858' : '#ffffff');

      let branchIdx = 0;
      let leafIdx = 0;
      let blossomIdx = 0;
      let fruitIdx = 0;
      const showcase = Boolean(st.rotShowcase);
      const leafRotG = Math.max(0, Math.min(1, st.leafRot ?? 0));
      const fruitRotG = Math.max(0, Math.min(1, st.fruitRot ?? 0));
      const rotSig = showcase ? 'contoh' : `${leafRotG.toFixed(3)}|${fruitRotG.toFixed(3)}`;
      const rotChanged = rotSig !== lastRotSig;
      const anyLeafRot = showcase || leafRotG > 0;
      const anyFruitRot = showcase || fruitRotG > 0;

      // Tanaman dianimasikan 30×/detik (gerak angin tetap halus), render tetap 60 fps → beban CPU separuh
      const updatePlants = frameCount % 2 === 0 || rotChanged || st.layer !== lastPlantLayer;
      if (updatePlants) {
      lastPlantLayer = st.layer;
        for (let i = 0; i < plants.length; i++) {
          const p = plants[i];
          // Mode contoh: hanya bedengan depan, tingkat busuk naik dari kiri (sehat) ke kanan (mati)
          const showLv = showcase && p.bedIdx === 2 ? ROT_SHOWCASE_LEVELS[p.slotIdx] : 0;
          const pLeafRot = showcase ? showLv : leafRotG;
          const pFruitRot = showcase ? showLv : fruitRotG;
          // Keparahan tanaman keseluruhan → batang coklat, melemah, condong & tak lagi bergoyang segar
          const plantSev = Math.max(0, Math.min(1, (Math.max(pLeafRot, pFruitRot) - 0.45) / 0.6));
          const leanAng = p.phase * 2.3;
          const vigor = 1 - plantSev * 0.7;
          const swayX = Math.sin(elapsed * 1.85 + p.phase) * windAmp * vigor + Math.cos(leanAng) * plantSev * 0.26;
          const swayZ = Math.cos(elapsed * 1.45 + p.phase) * windAmp * 0.62 * vigor + Math.sin(leanAng) * plantSev * 0.16;

          // Batang utama
          dummy.rotation.order = 'XYZ';
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(swayZ + droopFactor * 0.16, p.phase, -swayX);
          dummy.scale.set(1, 1 - droopFactor * 0.1 - plantSev * 0.12, 1);
          dummy.updateMatrix();
          stemInst.setMatrixAt(i, dummy.matrix);
          if (rotChanged) {
            tmpColor.copy(stemHealthyCol).lerp(stemDeadCol, plantSev);
            stemInst.setColorAt(i, tmpColor);
            for (let b = 0; b < branchesPerPlant; b++) branchInst.setColorAt(i * branchesPerPlant + b, tmpColor);
          }

          // Cabang samping (urutan YXZ: yaw radial dulu, baru miring keluar)
          dummy.rotation.order = 'YXZ';
          for (let b = 0; b < branchesPerPlant; b++) {
            const bh = 0.34 + b * 0.18;
            const bang = b * 2.4 + p.phase;
            dummy.position.set(p.x + swayX * bh, p.y + bh, p.z + swayZ * bh);
            dummy.rotation.set(0.62 + droopFactor * 0.35 + plantSev * 0.5 + swayZ, Math.PI / 2 - bang, swayX);
            dummy.scale.setScalar(0.85 + (1 - b / branchesPerPlant) * 0.35);
            dummy.updateMatrix();
            branchInst.setMatrixAt(branchIdx++, dummy.matrix);
          }

          // Daun majemuk (yaw PI/2 - ang agar ujung daun +Z selalu mekar keluar dari batang)
          for (let l = 0; l < leavesPerPlant; l++) {
            const lf = leafLocal[l];
            // Tingkat keparahan busuk daun 0..1 (0 = sehat)
            const leafSev = pLeafRot > 0 ? Math.max(0, Math.min(1, (pLeafRot - leafRotKey[i][l]) / 0.12)) : 0;
            const isRotLeaf = leafSev >= 0.3;
            // Daun mati kering sebagian rontok & tergeletak di permukaan bedengan
            const fallenLeaf = leafSev >= 0.98 && organHash(i + 7, l + 5) < 0.42;
            if (fallenLeaf) {
              const fa = lf.ang * 1.7 + organHash(i + 2, l + 9) * 2;
              const fd = 0.2 + organHash(l + 4, i + 3) * 0.24;
              const fx = p.x + Math.cos(fa) * fd;
              const fz = p.z + Math.sin(fa) * fd;
              dummy.position.set(fx, soilTopAt(fx, fz, p.z - 0.03) + 0.012, fz);
              dummy.rotation.set(-0.06 + organHash(l, i) * 0.12, fa, (organHash(i, l + 1) - 0.5) * 0.3);
              dummy.scale.setScalar(lf.sc * 0.78);
            } else {
              const lx = p.x + Math.cos(lf.ang) * lf.rad + swayX * lf.h * 1.35;
              const ly = p.y + lf.h * (1 - droopFactor * 0.14 - plantSev * 0.1) - leafSev * 0.03;
              const lz = p.z + Math.sin(lf.ang) * lf.rad + swayZ * lf.h * 1.35;
              const flutter = Math.sin(elapsed * 2.8 + lf.ang + p.phase) * (windAmp * 1.8) * (1 - leafSev * 0.8);
              dummy.position.set(lx, ly, lz);
              // Daun busuk terkulai lemas & menggulung (pitch naik, roll bertambah, ukuran menyusut)
              dummy.rotation.set(
                lf.pitch + droopFactor * 0.78 + leafSev * 0.85 + flutter,
                Math.PI / 2 - lf.ang,
                swayX + lf.roll * (1 + leafSev * 1.6)
              );
              dummy.scale.setScalar(lf.sc * (1 - leafSev * 0.22));
            }
            dummy.updateMatrix();
            if (rotChanged) {
              // Awal serangan: daun sehat sedikit menguning (klorosis)
              leafHealthyCol.set(lf.shade);
              if (leafSev > 0 && !isRotLeaf) leafHealthyCol.lerp(leafChloroticCol, leafSev / 0.3);
              leafInst.setColorAt(leafIdx, leafHealthyCol);
              // Busuk lanjut: makin gelap (nekrosis) seiring keparahan
              tmpColor.set('#ffffff').lerp(leafNecroticCol, Math.max(0, (leafSev - 0.3) / 0.7) * 0.6);
              rotLeafInst.setColorAt(leafIdx, tmpColor);
            }
            if (isRotLeaf) {
              leafInst.setMatrixAt(leafIdx, zeroMatrix);
              rotLeafInst.setMatrixAt(leafIdx, dummy.matrix);
            } else {
              leafInst.setMatrixAt(leafIdx, dummy.matrix);
              if (anyLeafRot) rotLeafInst.setMatrixAt(leafIdx, zeroMatrix);
            }
            leafIdx++;
          }

          dummy.rotation.order = 'XYZ';

          // Bunga kuning kecil di tajuk atas (rontok pada tanaman busuk parah)
          for (let bl = 0; bl < blossomsPerPlant; bl++) {
            const ba = bl * 2.1 + p.phase;
            const bh = 0.96 + (bl % 2) * 0.16;
            dummy.position.set(
              p.x + Math.cos(ba) * 0.2 + swayX * bh,
              p.y + bh * (1 - plantSev * 0.1),
              p.z + Math.sin(ba) * 0.2 + swayZ * bh
            );
            dummy.rotation.set(0.3, ba + elapsed * 0.4 * vigor, 0.2);
            dummy.scale.setScalar(plantSev > 0.35 ? 0 : 0.9);
            dummy.updateMatrix();
            blossomInst.setMatrixAt(blossomIdx++, dummy.matrix);
          }

          // Buah (+ simulasi busuk: bercak → keriput berlesi → berkapang abu-abu → rontok ke bedengan)
          for (let f = 0; f < fruitsPerPlant; f++) {
            const fr = fruitLocal[f];
            const fruitSev = pFruitRot > 0 ? Math.max(0, Math.min(1, (pFruitRot - fruitRotKey[i][f]) / 0.16)) : 0;
            const fallen = fruitSev > 0.9;
            const isRotFruit = fruitSev >= 0.22;
            let fx = p.x + Math.cos(fr.ang) * fr.rad + swayX * fr.h;
            let fy = p.y + fr.h * (1 - droopFactor * 0.1 - plantSev * 0.1) - fruitSev * 0.05;
            let fz = p.z + Math.sin(fr.ang) * fr.rad + swayZ * fr.h;
            if (fallen) {
              // Buah busuk parah rontok & tergeletak di permukaan bedengan
              fx = p.x + Math.cos(fr.ang) * (fr.rad + 0.14);
              fz = p.z + Math.sin(fr.ang) * (fr.rad + 0.14);
              fy = soilTopAt(fx, fz, p.z - 0.03) + 0.055;
            }
            dummy.position.set(fx, fy, fz);
            dummy.rotation.set(fallen ? 1.2 : fruitSev * 0.4, fr.ang, fallen ? 0.4 : 0);
            const shrink = 1 - fruitSev * 0.22;
            // Bedengan tengah berbentuk cabai lonjong, bedengan 1 & 3 buah tomat bulat
            if (p.bedIdx === 1) {
              dummy.scale.set(0.56 * shrink, 1.32 * shrink * (1 - fruitSev * 0.14), 0.56 * shrink);
            } else {
              const base = (0.95 + (f % 2) * 0.14) * shrink;
              dummy.scale.set(base, base * (1 - fruitSev * 0.2), base);
            }
            dummy.updateMatrix();
            if (isRotFruit) {
              fruitInst.setMatrixAt(fruitIdx, zeroMatrix);
              rotFruitInst.setMatrixAt(fruitIdx, dummy.matrix);
            } else {
              fruitInst.setMatrixAt(fruitIdx, dummy.matrix);
              if (anyFruitRot) rotFruitInst.setMatrixAt(fruitIdx, zeroMatrix);
            }
            calyxInst.setMatrixAt(fruitIdx, dummy.matrix);

            // Kapang menyembul dari kulit buah busuk sedang–parah lalu menyelimuti
            const moldAmt = fruitSev > 0.4 ? (fruitSev - 0.4) / 0.6 : 0;
            if (moldAmt > 0) {
              dummy.scale.multiplyScalar(0.9 + moldAmt * 0.17);
              dummy.updateMatrix();
              moldInst.setMatrixAt(fruitIdx, dummy.matrix);
            } else if (anyFruitRot) {
              moldInst.setMatrixAt(fruitIdx, zeroMatrix);
            }

            const stg = st.layer === 'panen' ? p.bedIdx : (fr.stage + p.bedIdx + p.slotIdx) % 3;
            tmpColor.set(stg === 0 ? '#d92d14' : stg === 1 ? '#f08c0a' : '#5cb85a');
            if (isRotFruit) {
              tmpColor.lerp(fruitRotCol, 0.3 + fruitSev * 0.6);
              rotFruitInst.setColorAt(fruitIdx, tmpColor);
            } else {
              // Gejala awal: bercak pudar kecoklatan
              if (fruitSev > 0) tmpColor.lerp(fruitRotCol, fruitSev * 1.4);
              fruitInst.setColorAt(fruitIdx, tmpColor);
            }
            tmpColor.copy(calyxGreen).lerp(calyxDead, Math.min(1, fruitSev * 1.5 + plantSev * 0.6));
            calyxInst.setColorAt(fruitIdx, tmpColor);
            fruitIdx++;
          }
        }
        stemInst.instanceMatrix.needsUpdate = true;
        branchInst.instanceMatrix.needsUpdate = true;
        leafInst.instanceMatrix.needsUpdate = true;
        blossomInst.instanceMatrix.needsUpdate = true;
        fruitInst.instanceMatrix.needsUpdate = true;
        calyxInst.instanceMatrix.needsUpdate = true;
        if (fruitInst.instanceColor) fruitInst.instanceColor.needsUpdate = true;
        if (calyxInst.instanceColor) calyxInst.instanceColor.needsUpdate = true;
        rotFruitInst.visible = anyFruitRot;
        moldInst.visible = anyFruitRot;
        if (anyFruitRot) {
          rotFruitInst.instanceMatrix.needsUpdate = true;
          moldInst.instanceMatrix.needsUpdate = true;
          if (rotFruitInst.instanceColor) rotFruitInst.instanceColor.needsUpdate = true;
        }
        rotLeafInst.visible = anyLeafRot;
        if (anyLeafRot) rotLeafInst.instanceMatrix.needsUpdate = true;
        if (rotChanged) {
          if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
          if (rotLeafInst.instanceColor) rotLeafInst.instanceColor.needsUpdate = true;
          if (stemInst.instanceColor) stemInst.instanceColor.needsUpdate = true;
          if (branchInst.instanceColor) branchInst.instanceColor.needsUpdate = true;
          lastRotSig = rotSig;
        }
      }

      // Update air di tandon 3D + cincin permukaan meniscus
      const isTankCrit = st.tank < st.tankLow;
      const targetWaterScale = Math.max(0.05, st.tank / 100);
      waterMesh.scale.y += (targetWaterScale - waterMesh.scale.y) * 0.1;
      const waterWave = Math.sin(elapsed * 2.4) * 0.014;
      waterMesh.position.y = 1.74 + waterWave;
      waterTopRing.position.y = 1.74 + waterMaxH * waterMesh.scale.y + waterWave + 0.008;
      waterMat.color.set(isTankCrit ? '#ef4444' : '#1ea7f5');
      waterMat.emissive.set(isTankCrit ? '#7f1d1d' : '#084b73');
      waterTopRingMat.color.set(isTankCrit ? '#fca5a5' : '#bae6fd');

      // Update Pompa, cincin basah tanah & percikan air 3D
      const isFlowing = st.pumpOn && !isTankCrit;
      motorMesh.position.x = -0.14 + (isFlowing ? Math.sin(elapsed * 46) * 0.011 : 0);
      pumpLedMat.color.set(isTankCrit ? '#ef4444' : isFlowing ? '#38bdf8' : '#94a3b8');
      pumpLedMat.emissive.set(isTankCrit ? '#ef4444' : isFlowing ? '#38bdf8' : '#334155');
      pumpLedMat.emissiveIntensity = isFlowing || isTankCrit ? 1.5 + Math.sin(elapsed * 8) * 0.6 : 0.3;

      const targetWetOpacity = isFlowing ? 0.58 : Math.max(0, (mNorm - 0.55) * 0.45);
      wetRingMat.opacity += (targetWetOpacity - wetRingMat.opacity) * 0.08;
      wetRings.forEach((wr, idx) => {
        const pulse = isFlowing ? 0.92 + Math.sin(elapsed * 4 + idx) * 0.1 : 1;
        wr.scale.setScalar(pulse);
      });

      dropInst.visible = isFlowing;
      if (isFlowing) {
        for (let i = 0; i < totalDrops; i++) {
          const dSeed = dropSeeds[i];
          dSeed.phase = (dSeed.phase + dt * dSeed.speed) % 1;
          const t = dSeed.phase;
          const origin = emitterPoints[dSeed.emitterIdx];
          const arcY = Math.sin(t * Math.PI) * dSeed.heightPeak;
          dummy.position.set(
            origin.x + Math.cos(dSeed.angle) * dSeed.spread * t,
            origin.y + arcY - t * 0.08,
            origin.z + Math.sin(dSeed.angle) * dSeed.spread * t
          );
          dummy.rotation.set(0, dSeed.angle, 0);
          dummy.scale.setScalar(1 - t * 0.35);
          dummy.updateMatrix();
          dropInst.setMatrixAt(i, dummy.matrix);
        }
        dropInst.instanceMatrix.needsUpdate = true;
      }

      // Aliran energi surya & sinyal ESP32
      const isPowerSave = st.battery <= st.battLow;
      const isCharging = st.weather === 'cerah' || st.weather === 'kering';
      oledMat.emissive.set(isPowerSave ? '#f59e0b' : '#4ade80');

      orbInst.visible = isCharging;
      if (isCharging) {
        for (let i = 0; i < orbCount; i++) {
          const pr = (elapsed * 0.58 + i / orbCount) % 1;
          dummy.position.set(
            THREE.MathUtils.lerp(0, 0.3, pr),
            THREE.MathUtils.lerp(2.0, 1.15, pr),
            THREE.MathUtils.lerp(0, 0.14, pr)
          );
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.85 + Math.sin(pr * Math.PI) * 0.42);
          dummy.updateMatrix();
          orbInst.setMatrixAt(i, dummy.matrix);
        }
        orbInst.instanceMatrix.needsUpdate = true;
      }

      const sigP = (elapsed * 0.8) % 1;
      signalRing.scale.setScalar(0.6 + sigP * 2.5);
      signalRingMat.opacity = (1 - sigP) * 0.72;

      // Kupu-kupu berterbangan saat cerah
      const showButterflies = st.weather === 'cerah' || st.weather === 'kering';
      butterflies.forEach((bf) => {
        bf.g.visible = showButterflies;
        if (!showButterflies) return;
        const a = elapsed * 0.55 + bf.phase;
        bf.g.position.set(
          0.65 + Math.cos(a) * bf.r,
          bf.baseY + Math.sin(elapsed * 2.4 + bf.phase) * 0.25,
          Math.sin(a * 1.3) * (bf.r * 0.85)
        );
        bf.g.rotation.y = -a + Math.PI / 2;
        const flap = Math.sin(elapsed * 18 + bf.phase) * 0.85;
        bf.leftW.rotation.y = flap;
        bf.rightW.rotation.y = -flap;
      });

      // Hujan 3D
      rainInst.visible = st.weather === 'hujan';
      if (st.weather === 'hujan') {
        for (let i = 0; i < rainCount; i++) {
          const r = rainSeeds[i];
          r.y -= dt * r.speed;
          r.x -= dt * 2.0;
          if (r.y < 0.1) {
            r.y = 12.5;
            r.x = (Math.random() - 0.5) * 22;
            r.z = (Math.random() - 0.5) * 18;
          }
          dummy.position.set(r.x, r.y, r.z);
          dummy.rotation.set(0, 0, -0.15);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          rainInst.setMatrixAt(i, dummy.matrix);
        }
        rainInst.instanceMatrix.needsUpdate = true;
      }

      if (frameCount % 2 === 0) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);

      // Pantau fps terus-menerus (lewati 60 frame awal saat shader dikompilasi):
      // rata-rata < ~45 fps selama 1,5 detik → turunkan kualitas satu tingkat
      if (warmupFrames < 60) {
        warmupFrames++;
      } else if (qualityLevel > 0) {
        perfFrames++;
        perfTime += dt;
        if (perfFrames >= 90) {
          if (perfTime / perfFrames > 1 / 45) lowerQuality();
          perfFrames = 0;
          perfTime = 0;
        }
      }

      // Proyeksikan label HTML tiap 2 frame (anti-tabrakan otomatis)
      labelFrameCounter++;
      if (labelFrameCounter % 2 === 0) {
        const cwNow = mount.clientWidth;
        const chNow = mount.clientHeight;
        const projected: ProjectedLabel3D[] = (
          Object.entries(labelAnchors) as [Exclude<HotspotId3D, null>, THREE.Vector3][]
        ).map(([id, vec]) => {
          projVec.copy(vec).project(camera);
          const visible =
            projVec.z < 1 &&
            projVec.x > -1.05 &&
            projVec.x < 1.05 &&
            projVec.y > -1.05 &&
            projVec.y < 1.05;
          return {
            id,
            x: Math.max(66, Math.min(cwNow - 66, (projVec.x * 0.5 + 0.5) * cwNow)),
            y: Math.max(54, Math.min(chNow - 54, (-projVec.y * 0.5 + 0.5) * chNow)),
            visible,
          };
        });

        for (let i = 0; i < projected.length; i++) {
          for (let j = i + 1; j < projected.length; j++) {
            const a = projected[i];
            const b = projected[j];
            if (Math.abs(a.x - b.x) < 118 && Math.abs(a.y - b.y) < 32) {
              const push = (32 - Math.abs(a.y - b.y)) / 2 + 2;
              if (a.y <= b.y) {
                a.y = Math.max(50, a.y - push);
                b.y = Math.min(chNow - 50, b.y + push);
              } else {
                a.y = Math.min(chNow - 50, a.y + push);
                b.y = Math.max(50, b.y - push);
              }
            }
          }
        }
        // Kirim ke React hanya bila posisi berubah (kamera diam = tidak ada render ulang panel)
        const labelKey = projected.map((l) => `${l.x | 0},${l.y | 0},${l.visible ? 1 : 0}`).join('|');
        if (labelKey !== lastLabelKey) {
          lastLabelKey = labelKey;
          onLabelsRef.current(projected);
        }

        // Label tahap busuk di atas 5 tanaman contoh
        if (showcase) {
          const stageLabels: ShowcaseLabel3D[] = showcaseAnchors.map((vec) => {
            projVec.copy(vec).project(camera);
            return {
              x: (projVec.x * 0.5 + 0.5) * cwNow,
              y: (-projVec.y * 0.5 + 0.5) * chNow,
              visible: projVec.z < 1 && Math.abs(projVec.x) < 1 && Math.abs(projVec.y) < 1,
            };
          });
          const showcaseKey = stageLabels.map((l) => `${l.x | 0},${l.y | 0},${l.visible ? 1 : 0}`).join('|');
          if (showcaseKey !== lastShowcaseKey || !showcaseLabelsSent) {
            lastShowcaseKey = showcaseKey;
            onShowcaseRef.current?.(stageLabels);
          }
          showcaseLabelsSent = true;
        } else if (showcaseLabelsSent) {
          onShowcaseRef.current?.([]);
          showcaseLabelsSent = false;
          lastShowcaseKey = '';
        }
      }
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      io?.disconnect();
      ro.disconnect();
      controls.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      Object.values(skyTextures).forEach((t) => t.dispose());
      meadowTex.map.dispose();
      meadowTex.bump.dispose();
      gravelTex.map.dispose();
      gravelTex.bump.dispose();
      soilTex.map.dispose();
      soilTex.bump.dispose();
      woodTex.map.dispose();
      woodTex.bump.dispose();
      solarTex.dispose();
      leafTex.dispose();
      rotLeafTex.dispose();
      rotFruitTex.map.dispose();
      rotFruitTex.bump.dispose();
      moldTex.dispose();
      leafDepthMat.dispose();
      (rotLeafInst.customDepthMaterial as THREE.Material | undefined)?.dispose();
      oledTex.dispose();
      sunGlowTex.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [liveStateRef]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'grab',
        touchAction: 'none',
      }}
      aria-label="Kebun 3D interaktif"
    />
  );
};

export default Farm3DWebGLCanvas;
