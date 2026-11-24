'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type SimLayer3D = 'normal' | 'kelembapan' | 'kesehatan' | 'panen';
export type WeatherMode3D = 'cerah' | 'berawan' | 'hujan' | 'kering';
export type HotspotId3D = 'bedengan' | 'tandon' | 'pompa' | 'surya' | null;
export type CameraPreset3D = 'overview' | 'tanaman' | 'irigasi' | 'surya';

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
}

export interface ProjectedLabel3D {
  id: Exclude<HotspotId3D, null>;
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
}

/* ============================================================================
   GENERATOR TEKSTUR PROSEDURAL PBR (0 KB aset eksternal, dibuat 1x < 8ms)
   ============================================================================ */

function createSoilTexture(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#5c4028';
  ctx.fillRect(0, 0, 256, 256);

  // Alur garukan bedengan + butiran tanah organik
  for (let y = 0; y < 256; y += 8) {
    ctx.fillStyle = y % 16 === 0 ? 'rgba(30,18,10,0.22)' : 'rgba(130,98,66,0.14)';
    ctx.fillRect(0, y, 256, 4);
  }
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.8 + Math.random() * 2.2;
    const shade = Math.random() > 0.5 ? 'rgba(145,108,74,0.28)' : 'rgba(32,20,12,0.34)';
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 1.2);
  map.colorSpace = THREE.SRGBColorSpace;

  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(3, 1.2);
  return { map, bump };
}

function createGrassTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#4c7c44';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const h = 3 + Math.random() * 6;
    const palette = ['#5c924f', '#3d6b38', '#6ca456', '#335d31', '#78ac5e'];
    ctx.fillStyle = palette[i % palette.length];
    ctx.fillRect(x, y, 1.6, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWoodTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#8b5e34';
  ctx.fillRect(0, 0, 256, 128);

  for (let i = 0; i < 60; i++) {
    const y = (i / 60) * 128;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(60,36,16,0.22)' : 'rgba(176,130,84,0.14)';
    ctx.fillRect(0, y, 256, 2);
  }
  // Garis sambungan papan kayu
  ctx.fillStyle = 'rgba(42,24,10,0.45)';
  ctx.fillRect(0, 62, 256, 3);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSolarTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#0f2d6b');
  grad.addColorStop(0.5, '#17439c');
  grad.addColorStop(1, '#0b214f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Grid sel monokristalin + busbar perak tipis
  ctx.strokeStyle = 'rgba(210, 232, 255, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    const p = (i / 6) * 256;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 256);
    ctx.stroke();
  }
  for (let j = 1; j < 4; j++) {
    const p = (j / 4) * 256;
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(256, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(147, 197, 253, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 8; x < 256; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkyTexture(topHex: string, midHex: string, botHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, topHex);
  g.addColorStop(0.52, midHex);
  g.addColorStop(1, botHex);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================================
   KOMPONEN CANVAS WEBGL THREE.JS (PBR + SHADOWS + INSTANCED MESH 60 FPS)
   ============================================================================ */

const Farm3DWebGLCanvas: React.FC<Farm3DWebGLCanvasProps> = ({
  liveStateRef,
  cameraPreset,
  zoomCommand,
  onLabelsUpdate,
  onHotspotSelect,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraObjRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetGoalRef = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);
  const onLabelsRef = useRef(onLabelsUpdate);
  const onHotspotRef = useRef(onHotspotSelect);

  useEffect(() => {
    onLabelsRef.current = onLabelsUpdate;
    onHotspotRef.current = onHotspotSelect;
  }, [onLabelsUpdate, onHotspotSelect]);

  // Preset terbang kamera 3D halus
  useEffect(() => {
    if (cameraPreset.seq === 0) return;
    const presets: Record<CameraPreset3D, { pos: [number, number, number]; look: [number, number, number] }> = {
      overview: { pos: [9.8, 7.6, 10.6], look: [0.2, 0.8, 0.1] },
      tanaman: { pos: [4.8, 3.6, 5.4], look: [0.5, 1.1, 0.0] },
      irigasi: { pos: [-7.2, 4.4, 5.8], look: [-3.9, 1.5, -0.8] },
      surya: { pos: [7.6, 3.8, 5.8], look: [4.5, 1.3, 1.6] },
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
    const nextLen = Math.max(5.5, Math.min(22, len * (zoomCommand.delta > 0 ? 0.84 : 1.18)));
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
    const fog = new THREE.FogExp2('#b9e0dc', 0.017);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 140);
    camera.position.set(9.8, 7.6, 10.6);
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
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileGpu ? 1.25 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 5.5;
    controls.maxDistance = 21;
    controls.minPolarAngle = 0.34;
    controls.maxPolarAngle = Math.PI / 2.22;
    controls.target.set(0.2, 0.8, 0.1);
    controls.update();
    controlsRef.current = controls;

    // Hentikan animasi preset jika user mulai drag manual
    const onControlStart = () => {
      targetGoalRef.current = null;
    };
    controls.addEventListener('start', onControlStart);

    // ------------------------------------------------------------------------
    // 1. LANGIT 360°, MATAHARI, AWAN & PERBUKITAN DATARAN TINGGI
    // ------------------------------------------------------------------------
    const skyTextures: Record<WeatherMode3D, THREE.CanvasTexture> = {
      cerah: createSkyTexture('#2c82c9', '#8ed1ec', '#e5f5ec'),
      kering: createSkyTexture('#3b7da8', '#f0c67c', '#f5e2ba'),
      berawan: createSkyTexture('#4c6573', '#8ca3ab', '#cad9d8'),
      hujan: createSkyTexture('#213640', '#44606b', '#7b9499'),
    };
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTextures.cerah,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(68, 24, 16), skyMat);
    scene.add(skyDome);

    // Cahaya Alami 3-Titik + Bayangan Lembut
    const hemiLight = new THREE.HemisphereLight('#cbeeff', '#46613e', 0.95);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fff4d6', 2.25);
    sunLight.position.set(14, 18, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 48;
    const d = 11.5;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#9ad3f5', 0.45);
    fillLight.position.set(-10, 7, -9);
    scene.add(fillLight);

    // Bola matahari bercahaya di langit
    const sunDiscMat = new THREE.MeshBasicMaterial({ color: '#fff7d1', fog: false });
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(1.65, 16, 16), sunDiscMat);
    sunDisc.position.set(26, 24, -18);
    scene.add(sunDisc);

    // Awan 3D melayang lembut
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.84 });
    const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
    const cloudPositions: [number, number, number, number][] = [
      [-14, 13, -18, 2.2],
      [-11.5, 13.5, -18, 1.7],
      [-16.2, 12.8, -17.5, 1.4],
      [8, 15, -22, 2.5],
      [10.8, 15.4, -21.5, 1.8],
      [5.5, 14.7, -22, 1.6],
      [-4, 14.5, 19, 2.1],
      [-1.8, 14.9, 19.2, 1.5],
    ];
    cloudPositions.forEach(([cx, cy, cz, s]) => {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.position.set(cx, cy, cz);
      puff.scale.set(s * 1.4, s * 0.65, s * 0.9);
      cloudGroup.add(puff);
    });
    scene.add(cloudGroup);

    // Tekstur Prosedural PBR
    const grassTex = createGrassTexture();
    const soilTex = createSoilTexture();
    const woodTex = createWoodTexture();
    const solarTex = createSolarTexture();

    // Dataran rumput kebun luas + perbukitan hijau melingkar di kejauhan
    const terrainMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.92,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(46, 48), terrainMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Cincin perbukitan dataran tinggi Ciawi/Lembang di sekeliling cakrawala
    const hillMatFar = new THREE.MeshStandardMaterial({ color: '#3b6e4c', roughness: 0.96 });
    const hillMatMid = new THREE.MeshStandardMaterial({ color: '#4b8252', roughness: 0.95 });
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const dist = 28 + (i % 3) * 5;
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(9 + (i % 4) * 2.5, 6 + (i % 3) * 3.5, 8),
        i % 2 === 0 ? hillMatFar : hillMatMid
      );
      hill.position.set(Math.cos(ang) * dist, 1.6, Math.sin(ang) * dist);
      hill.scale.set(1.5, 0.72, 1.2);
      scene.add(hill);
    }

    // Jalan setapak batu alam di antara fasilitas kebun
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#9ca39f', roughness: 0.86 });
    const stoneGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.08, 7);
    const stones: [number, number][] = [
      [-2.5, 2.8], [-1.5, 3.1], [-0.4, 3.2], [0.8, 3.2], [2.0, 3.1], [3.2, 2.6],
      [-2.8, 1.6], [-2.9, 0.4], [-2.8, -0.8],
    ];
    stones.forEach(([sx, sz], idx) => {
      const st = new THREE.Mesh(stoneGeo, stoneMat);
      st.position.set(sx, 0.04, sz);
      st.rotation.y = idx * 0.7;
      st.scale.set(1.0 + (idx % 2) * 0.25, 1, 0.85);
      st.receiveShadow = true;
      scene.add(st);
    });

    // Pagar kayu kebun estetis di belakang & sisi kanan-kiri
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.84,
      metalness: 0.02,
    });
    const fencePostGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);
    const fenceRailGeo = new THREE.BoxGeometry(2.2, 0.09, 0.06);
    for (let fx = -6; fx <= 6; fx += 2.0) {
      const post = new THREE.Mesh(fencePostGeo, woodMat);
      post.position.set(fx, 0.47, -4.6);
      post.castShadow = true;
      post.receiveShadow = true;
      scene.add(post);
      if (fx < 6) {
        const rail1 = new THREE.Mesh(fenceRailGeo, woodMat);
        rail1.position.set(fx + 1, 0.72, -4.6);
        rail1.castShadow = true;
        scene.add(rail1);
        const rail2 = new THREE.Mesh(fenceRailGeo, woodMat);
        rail2.position.set(fx + 1, 0.36, -4.6);
        rail2.castShadow = true;
        scene.add(rail2);
      }
    }

    // Semak hijau lembut di pojok pagar (memberi nuansa kebun nyata)
    const bushGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const bushMat = new THREE.MeshStandardMaterial({ color: '#2f7241', roughness: 0.88 });
    [[-5.8, -4.2], [-4.9, -4.3], [5.4, -4.1], [6.1, -3.5], [5.9, -1.8]].forEach(([bx, bz], i) => {
      const b = new THREE.Mesh(bushGeo, bushMat);
      b.position.set(bx, 0.38, bz);
      b.scale.set(1.1 + (i % 2) * 0.3, 0.78, 1.0);
      b.castShadow = true;
      b.receiveShadow = true;
      scene.add(b);
    });

    // ------------------------------------------------------------------------
    // 2. 3 BEDENGAN KAYU 3D + TANAH PBR + PIPA TETES + 15 TANAMAN TOMAT 3D
    // ------------------------------------------------------------------------
    const soilMat = new THREE.MeshStandardMaterial({
      map: soilTex.map,
      bumpMap: soilTex.bump,
      bumpScale: 0.08,
      color: new THREE.Color('#7c5a3c'),
      roughness: 0.82,
      metalness: 0.04,
    });

    const bedZPositions = [-2.2, 0.0, 2.2];
    const bedCenterX = 0.65;
    const bedLen = 5.8;
    const bedWid = 1.45;
    const bedH = 0.42;

    const dripPipeMat = new THREE.MeshStandardMaterial({
      color: '#1f2937',
      roughness: 0.48,
      metalness: 0.15,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#d4a13e',
      roughness: 0.32,
      metalness: 0.75,
    });

    const emitterPoints: THREE.Vector3[] = [];

    bedZPositions.forEach((bz) => {
      // Bingkai papan kayu bedengan (4 sisi)
      const longSide = new THREE.BoxGeometry(bedLen + 0.16, bedH, 0.11);
      const shortSide = new THREE.BoxGeometry(0.11, bedH, bedWid);
      const sFront = new THREE.Mesh(longSide, woodMat);
      sFront.position.set(bedCenterX, bedH / 2, bz + bedWid / 2);
      sFront.castShadow = sFront.receiveShadow = true;
      scene.add(sFront);

      const sBack = new THREE.Mesh(longSide, woodMat);
      sBack.position.set(bedCenterX, bedH / 2, bz - bedWid / 2);
      sBack.castShadow = sBack.receiveShadow = true;
      scene.add(sBack);

      const sLeft = new THREE.Mesh(shortSide, woodMat);
      sLeft.position.set(bedCenterX - bedLen / 2, bedH / 2, bz);
      sLeft.castShadow = sLeft.receiveShadow = true;
      scene.add(sLeft);

      const sRight = new THREE.Mesh(shortSide, woodMat);
      sRight.position.set(bedCenterX + bedLen / 2, bedH / 2, bz);
      sRight.castShadow = sRight.receiveShadow = true;
      scene.add(sRight);

      // Tanah gundukan PBR di dalam bedengan
      const soilMesh = new THREE.Mesh(new THREE.BoxGeometry(bedLen - 0.06, bedH - 0.04, bedWid - 0.06), soilMat);
      soilMesh.position.set(bedCenterX, (bedH - 0.04) / 2, bz);
      soilMesh.receiveShadow = true;
      soilMesh.userData = { hotspot: 'bedengan' };
      scene.add(soilMesh);

      // Pipa irigasi tetes di tengah bedengan
      const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, bedLen + 0.4, 8), dripPipeMat);
      drip.rotation.z = Math.PI / 2;
      drip.position.set(bedCenterX - 0.15, bedH + 0.02, bz);
      drip.castShadow = true;
      scene.add(drip);

      // Ajir horizontal bambu menghubungkan 5 tanaman
      const bambooMat = new THREE.MeshStandardMaterial({ color: '#c4a46c', roughness: 0.78 });
      const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, bedLen - 0.5, 6), bambooMat);
      crossBar.rotation.z = Math.PI / 2;
      crossBar.position.set(bedCenterX, 1.55, bz - 0.18);
      crossBar.castShadow = true;
      scene.add(crossBar);

      for (let slot = 0; slot < 5; slot++) {
        const px = bedCenterX - 2.25 + slot * 1.12;
        // Nozzle emitter kuningan
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), brassMat);
        noz.position.set(px + 0.15, bedH + 0.05, bz);
        scene.add(noz);
        emitterPoints.push(new THREE.Vector3(px + 0.15, bedH + 0.09, bz));

        // Ajir bambu vertikal
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 1.55, 6), bambooMat);
        stake.position.set(px - 0.14, bedH + 0.72, bz - 0.14);
        stake.castShadow = true;
        scene.add(stake);
      }
    });

    // 15 Tanaman Tomat 3D Berkelompok (InstancedMesh -> Draw call super hemat!)
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
          x: bedCenterX - 2.25 + slotIdx * 1.12,
          y: bedH - 0.02,
          z: bz + 0.04,
          bedIdx,
          slotIdx,
          phase: bedIdx * 1.7 + slotIdx * 0.9,
        });
      }
    });

    // Batang utama (15 instans)
    const stemGeo = new THREE.CylinderGeometry(0.032, 0.052, 1.18, 7);
    stemGeo.translate(0, 0.59, 0);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#2b7a3d', roughness: 0.76 });
    const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, plants.length);
    stemInst.castShadow = true;
    stemInst.receiveShadow = true;
    scene.add(stemInst);

    // Daun rimbun berlapis (15 tanaman × 14 kelompok daun = 210 instans daun!)
    const leafGeo = new THREE.DodecahedronGeometry(0.24, 1);
    leafGeo.scale(1.35, 0.48, 0.85);
    const leafMat = new THREE.MeshStandardMaterial({
      color: '#2d9349',
      roughness: 0.62,
      metalness: 0.02,
    });
    const leavesPerPlant = 14;
    const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, plants.length * leavesPerPlant);
    leafInst.castShadow = true;
    leafInst.receiveShadow = true;
    scene.add(leafInst);

    // Pre-generate offset lokal setiap daun agar deterministik & alami
    const leafLocal = Array.from({ length: leavesPerPlant }, (_, i) => {
      const h = 0.34 + (i / leavesPerPlant) * 0.88;
      const ang = i * 2.39996; // sudut emas filotaksis botani nyata!
      const rad = 0.18 + (1 - i / leavesPerPlant) * 0.2;
      const sc = 0.72 + (1 - Math.abs(i / leavesPerPlant - 0.45)) * 0.48;
      return { h, ang, rad, sc };
    });

    // Buah tomat 3D mengilap PBR (15 tanaman × 4 buah = 60 tomat!)
    const tomatoGeo = new THREE.SphereGeometry(0.115, 12, 10);
    tomatoGeo.scale(1.04, 0.92, 1.04);
    const tomatoMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.18,
      metalness: 0.06,
    });
    const fruitsPerPlant = 4;
    const fruitInst = new THREE.InstancedMesh(tomatoGeo, tomatoMat, plants.length * fruitsPerPlant);
    fruitInst.castShadow = true;
    scene.add(fruitInst);

    const fruitLocal = Array.from({ length: fruitsPerPlant }, (_, i) => ({
      h: 0.48 + (i % 3) * 0.22,
      ang: i * 1.6 + 0.4,
      rad: 0.22 + (i % 2) * 0.07,
      stage: i % 3, // 0=matang, 1=setengah, 2=mentah
    }));

    // ------------------------------------------------------------------------
    // 3. MENARA TANDON AIR 500L 3D TRANSPARAN + AIR BERGELOMBANG (Kiri Belakang)
    // ------------------------------------------------------------------------
    const tankGroup = new THREE.Group();
    tankGroup.position.set(-4.35, 0, -2.35);
    scene.add(tankGroup);

    // Pondasi beton
    const concreteMat = new THREE.MeshStandardMaterial({ color: '#9aa5a0', roughness: 0.92 });
    const tankPad = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 2.1), concreteMat);
    tankPad.position.y = 0.08;
    tankPad.receiveShadow = true;
    tankGroup.add(tankPad);

    // Rangka menara besi 4 kaki + palang penyangga
    const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.72 });
    const legGeo = new THREE.BoxGeometry(0.11, 1.25, 0.11);
    [[-0.78, -0.78], [0.78, -0.78], [-0.78, 0.78], [0.78, 0.78]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(lx, 0.74, lz);
      leg.castShadow = true;
      tankGroup.add(leg);
    });
    const tankDeck = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.1, 1.82), steelMat);
    tankDeck.position.y = 1.38;
    tankDeck.castShadow = true;
    tankDeck.receiveShadow = true;
    tankGroup.add(tankDeck);

    // Isi air 3D di dalam tandon (tinggi dinamis sesuai levelTandonPersen)
    const waterMaxH = 1.95;
    const waterGeo = new THREE.CylinderGeometry(0.76, 0.76, waterMaxH, 24);
    waterGeo.translate(0, waterMaxH / 2, 0);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: '#1da1f2',
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.86,
      emissive: new THREE.Color('#074469'),
      emissiveIntensity: 0.25,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 1.46;
    tankGroup.add(waterMesh);

    // Dinding tandon kaca/polietilen transparan berusuk realistis
    const tankShellMat = new THREE.MeshPhysicalMaterial({
      color: '#d8f1ff',
      roughness: 0.14,
      metalness: 0.05,
      transparent: true,
      opacity: 0.34,
      clearcoat: 0.8,
      depthWrite: false,
    });
    const tankShell = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.86, 2.18, 24), tankShellMat);
    tankShell.position.y = 2.52;
    tankShell.castShadow = true;
    tankShell.userData = { hotspot: 'tandon' };
    tankGroup.add(tankShell);

    // Cincin penguat tabung tandon
    const ringGeo = new THREE.TorusGeometry(0.85, 0.032, 8, 28);
    [1.82, 2.48, 3.16].forEach((ry) => {
      const r = new THREE.Mesh(ringGeo, steelMat);
      r.rotation.x = Math.PI / 2;
      r.position.y = ry;
      tankGroup.add(r);
    });

    // Tutup hitam tandon + modul sensor ultrasonik di puncak
    const capMat = new THREE.MeshStandardMaterial({ color: '#142925', roughness: 0.5 });
    const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.12, 24), capMat);
    tankCap.position.y = 3.64;
    tankCap.castShadow = true;
    tankGroup.add(tankCap);

    const ultraBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.26), steelMat);
    ultraBox.position.y = 3.78;
    tankGroup.add(ultraBox);

    // ------------------------------------------------------------------------
    // 4. POMPA IRIGASI 3D + PIPA PVC MANIFOLD (Kiri Depan — Jauh dari Surya!)
    // ------------------------------------------------------------------------
    const pumpGroup = new THREE.Group();
    pumpGroup.position.set(-4.1, 0, 0.85);
    scene.add(pumpGroup);

    const pumpPad = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.1), concreteMat);
    pumpPad.position.y = 0.07;
    pumpPad.receiveShadow = true;
    pumpGroup.add(pumpPad);

    const pumpBodyMat = new THREE.MeshStandardMaterial({
      color: '#155e75',
      roughness: 0.34,
      metalness: 0.58,
    });
    const motorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.78, 18), pumpBodyMat);
    motorMesh.rotation.z = Math.PI / 2;
    motorMesh.position.set(-0.08, 0.46, 0);
    motorMesh.castShadow = true;
    motorMesh.userData = { hotspot: 'pompa' };
    pumpGroup.add(motorMesh);

    // Kepala impeller pompa
    const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 16), steelMat);
    headMesh.rotation.z = Math.PI / 2;
    headMesh.position.set(0.4, 0.46, 0);
    headMesh.castShadow = true;
    pumpGroup.add(headMesh);

    // LED status pompa bercahaya
    const pumpLedMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const pumpLed = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), pumpLedMat);
    pumpLed.position.set(-0.08, 0.84, 0);
    pumpGroup.add(pumpLed);

    // Jaringan Pipa PVC 3D (Tandon -> Pompa -> Header Bedengan)
    const pvcMat = new THREE.MeshStandardMaterial({
      color: '#cfd8dc',
      roughness: 0.35,
      metalness: 0.1,
    });
    const addPipeSegment = (a: THREE.Vector3, b: THREE.Vector3, radius = 0.055) => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), pvcMat);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    };

    const pipeA = new THREE.Vector3(-4.35, 1.45, -1.65);
    const pipeB = new THREE.Vector3(-4.35, 0.46, -1.65);
    const pipeC = new THREE.Vector3(-4.1, 0.46, 0.85);
    const pipeD = new THREE.Vector3(-2.55, 0.46, 0.85);
    const pipeE = new THREE.Vector3(-2.55, 0.46, -2.2);
    const pipeF = new THREE.Vector3(-2.55, 0.46, 2.2);
    addPipeSegment(pipeA, pipeB);
    addPipeSegment(pipeB, pipeC);
    addPipeSegment(pipeC, pipeD);
    addPipeSegment(pipeE, pipeF);

    // ------------------------------------------------------------------------
    // 5. PANEL SURYA 3D + STASIUN CUACA ESP32-S3 (Kanan Depan — Terpisah Jauh!)
    // ------------------------------------------------------------------------
    const solarGroup = new THREE.Group();
    solarGroup.position.set(4.75, 0, 1.85);
    scene.add(solarGroup);

    const solarPad = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.4), concreteMat);
    solarPad.position.y = 0.07;
    solarPad.receiveShadow = true;
    solarGroup.add(solarPad);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 1.95, 12), steelMat);
    mast.position.y = 1.05;
    mast.castShadow = true;
    solarGroup.add(mast);

    // Panel surya miring + bingkai aluminium
    const panelHolder = new THREE.Group();
    panelHolder.position.set(0, 2.02, 0);
    panelHolder.rotation.x = 0.42;
    panelHolder.rotation.y = -0.35;
    solarGroup.add(panelHolder);

    const aluMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.28, metalness: 0.82 });
    const panelFrame = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.07, 1.32), aluMat);
    panelFrame.castShadow = true;
    panelFrame.userData = { hotspot: 'surya' };
    panelHolder.add(panelFrame);

    const panelGlassMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      roughness: 0.14,
      metalness: 0.55,
    });
    const panelFace = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 1.2), panelGlassMat);
    panelFace.rotation.x = -Math.PI / 2;
    panelFace.position.y = 0.038;
    panelFace.userData = { hotspot: 'surya' };
    panelHolder.add(panelFace);

    // Kotak ESP32-S3 + INA219 IP65 & layar status kecil di tiang
    const espBoxMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.45 });
    const espBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.34), espBoxMat);
    espBox.position.set(0.28, 1.02, 0.14);
    espBox.castShadow = true;
    solarGroup.add(espBox);

    const oledMat = new THREE.MeshStandardMaterial({
      color: '#22c55e',
      emissive: new THREE.Color('#22c55e'),
      emissiveIntensity: 1.3,
    });
    const oled = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), oledMat);
    oled.position.set(0.28, 1.08, 0.315);
    solarGroup.add(oled);

    // Antena WiFi ESP32 + cincin sinyal telemetri
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.42, 6), capMat);
    ant.position.set(0.42, 1.5, 0.14);
    solarGroup.add(ant);

    const signalRingMat = new THREE.MeshBasicMaterial({
      color: '#d8f36a',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const signalRing = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.18, 24), signalRingMat);
    signalRing.rotation.x = -Math.PI / 2;
    signalRing.position.set(0.42, 1.72, 0.14);
    solarGroup.add(signalRing);

    // Partikel energi surya mengalir dari panel ke ESP32 (8 instans)
    const orbGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const orbMat = new THREE.MeshBasicMaterial({ color: '#d8f36a' });
    const orbCount = 8;
    const orbInst = new THREE.InstancedMesh(orbGeo, orbMat, orbCount);
    solarGroup.add(orbInst);

    // ------------------------------------------------------------------------
    // 6. PARTIKEL 3D: PERCIKAN AIR IRIGASI + HUJAN 3D (InstancedMesh 60 FPS)
    // ------------------------------------------------------------------------
    const dropGeo = new THREE.SphereGeometry(0.042, 6, 6);
    dropGeo.scale(0.85, 1.5, 0.85);
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: '#7dd3fc',
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
    });
    const dropsPerEmitter = 6;
    const totalDrops = emitterPoints.length * dropsPerEmitter;
    const dropInst = new THREE.InstancedMesh(dropGeo, dropMat, totalDrops);
    scene.add(dropInst);

    const dropSeeds = Array.from({ length: totalDrops }, (_, i) => ({
      emitterIdx: i % emitterPoints.length,
      phase: Math.random(),
      angle: Math.random() * Math.PI * 2,
      spread: 0.14 + Math.random() * 0.24,
      heightPeak: 0.22 + Math.random() * 0.18,
      speed: 1.1 + Math.random() * 0.55,
    }));

    // Hujan 3D adaptif ringan (120 tetes di HP, 240 di desktop — hanya tampil saat cuaca = 'hujan')
    const rainCount = isMobileGpu ? 120 : 240;
    const rainGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.55, 4);
    const rainMat = new THREE.MeshBasicMaterial({
      color: '#bae6fd',
      transparent: true,
      opacity: 0.58,
    });
    const rainInst = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
    rainInst.visible = false;
    scene.add(rainInst);

    const rainSeeds = Array.from({ length: rainCount }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: Math.random() * 12,
      z: (Math.random() - 0.5) * 16,
      speed: 11 + Math.random() * 5,
    }));

    // ------------------------------------------------------------------------
    // 7. RAYCASTER KLIK OBJEK 3D + PROYEKSI LABEL NON-OVERLAP
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

    // Titik jangkar 3D untuk label HTML (dipisah jauh di 4 kuadran agar tak pernah bertabrakan)
    const labelAnchors: Record<Exclude<HotspotId3D, null>, THREE.Vector3> = {
      tandon: new THREE.Vector3(-4.35, 4.15, -2.35),
      pompa: new THREE.Vector3(-4.1, 1.38, 0.85),
      bedengan: new THREE.Vector3(0.65, 2.05, -0.35),
      surya: new THREE.Vector3(4.75, 2.85, 1.85),
    };

    // ResizeObserver & IntersectionObserver (hemat CPU/GPU otomatis)
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

    // Variabel kerja reusable (ZERO alokasi objek dalam loop animasi!)
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    const drySoilCol = new THREE.Color('#9e744c');
    const wetSoilCol = new THREE.Color('#3b2617');
    const moistHeatLow = new THREE.Color('#c9873c');
    const moistHeatHigh = new THREE.Color('#1a7ec4');
    const projVec = new THREE.Vector3();

    let currentWeatherKey: WeatherMode3D = 'cerah';
    let rafId = 0;
    let lastNow = performance.now();
    let elapsed = 0;
    let labelFrameCounter = 0;

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      if (!isVisible || document.hidden) return;

      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      elapsed += dt;

      const st = liveStateRef.current;

      // Transisi mulus ke preset kamera bila dipilih
      if (targetGoalRef.current) {
        camera.position.lerp(targetGoalRef.current.pos, 0.08);
        controls.target.lerp(targetGoalRef.current.look, 0.08);
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
        sunLight.intensity = 0.72;
        sunLight.color.set('#b6cad6');
        hemiLight.intensity = 0.75;
        fog.color.set('#647c82');
        fog.density = 0.028;
        sunDisc.visible = false;
      } else if (st.weather === 'berawan') {
        sunLight.intensity = 1.05;
        sunLight.color.set('#d5e3e8');
        hemiLight.intensity = 0.85;
        fog.color.set('#a8bec2');
        fog.density = 0.022;
        sunDisc.visible = false;
      } else if (st.weather === 'kering') {
        sunLight.intensity = 2.65;
        sunLight.color.set('#ffe09e');
        hemiLight.intensity = 0.9;
        fog.color.set('#ebd5ad');
        fog.density = 0.015;
        sunDisc.visible = true;
      } else {
        sunLight.intensity = 2.25;
        sunLight.color.set('#fff4d6');
        hemiLight.intensity = 0.98;
        fog.color.set('#c4e5e0');
        fog.density = 0.014;
        sunDisc.visible = true;
      }

      // Awan melayang pelan
      cloudGroup.position.x = Math.sin(elapsed * 0.05) * 4.5;

      // Warna & kilap tanah PBR sesuai kelembapan + layer aktif
      const mNorm = Math.max(0, Math.min(1, (st.moisture - 15) / 65));
      if (st.layer === 'kelembapan') {
        soilMat.color.copy(moistHeatLow).lerp(moistHeatHigh, mNorm);
        soilMat.roughness = 0.55;
      } else if (st.layer === 'kesehatan') {
        soilMat.color.set(st.humidity >= st.diseaseRh ? '#8c5a2b' : '#4a6b3d');
        soilMat.roughness = 0.75;
      } else {
        soilMat.color.copy(drySoilCol).lerp(wetSoilCol, mNorm);
        soilMat.roughness = 0.94 - mNorm * 0.62; // makin lembap makin basah mengilap!
      }

      // Update animasi angin & layu pada 15 tanaman tomat (batang, 210 daun, 60 buah)
      const windAmp = st.weather === 'hujan' ? 0.08 : 0.032;
      const droopFactor = st.moisture < 30 ? 0.22 : 0;
      const isRiskLeaf = st.layer === 'kesehatan' && st.humidity >= st.diseaseRh;
      leafMat.color.set(isRiskLeaf ? '#a39134' : st.moisture < 28 ? '#659442' : '#2c9147');

      let leafIdx = 0;
      let fruitIdx = 0;

      for (let i = 0; i < plants.length; i++) {
        const p = plants[i];
        const swayX = Math.sin(elapsed * 1.9 + p.phase) * windAmp;
        const swayZ = Math.cos(elapsed * 1.5 + p.phase) * windAmp * 0.6;

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(swayZ + droopFactor * 0.2, p.phase, -swayX);
        dummy.scale.set(1, 1 - droopFactor * 0.12, 1);
        dummy.updateMatrix();
        stemInst.setMatrixAt(i, dummy.matrix);

        for (let l = 0; l < leavesPerPlant; l++) {
          const lf = leafLocal[l];
          const lx = p.x + Math.cos(lf.ang) * lf.rad + swayX * lf.h * 1.4;
          const ly = p.y + lf.h * (1 - droopFactor * 0.14);
          const lz = p.z + Math.sin(lf.ang) * lf.rad + swayZ * lf.h * 1.4;
          dummy.position.set(lx, ly, lz);
          dummy.rotation.set(0.28 + droopFactor * 0.8 + swayZ, lf.ang, swayX);
          dummy.scale.setScalar(lf.sc);
          dummy.updateMatrix();
          leafInst.setMatrixAt(leafIdx++, dummy.matrix);
        }

        for (let f = 0; f < fruitsPerPlant; f++) {
          const fr = fruitLocal[f];
          const fx = p.x + Math.cos(fr.ang) * fr.rad + swayX * fr.h;
          const fy = p.y + fr.h * (1 - droopFactor * 0.1);
          const fz = p.z + Math.sin(fr.ang) * fr.rad + swayZ * fr.h;
          dummy.position.set(fx, fy, fz);
          dummy.rotation.set(0, fr.ang, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          fruitInst.setMatrixAt(fruitIdx, dummy.matrix);

          const stg = st.layer === 'panen' ? p.bedIdx : (fr.stage + p.bedIdx + p.slotIdx) % 3;
          tmpColor.set(stg === 0 ? '#e83e1c' : stg === 1 ? '#f59e0b' : '#52b859');
          fruitInst.setColorAt(fruitIdx, tmpColor);
          fruitIdx++;
        }
      }
      stemInst.instanceMatrix.needsUpdate = true;
      leafInst.instanceMatrix.needsUpdate = true;
      fruitInst.instanceMatrix.needsUpdate = true;
      if (fruitInst.instanceColor) fruitInst.instanceColor.needsUpdate = true;

      // Update air di tandon 3D + indikator kritis
      const isTankCrit = st.tank < st.tankLow;
      const targetWaterScale = Math.max(0.05, st.tank / 100);
      waterMesh.scale.y += (targetWaterScale - waterMesh.scale.y) * 0.1;
      waterMesh.position.y = 1.46 + Math.sin(elapsed * 2.4) * 0.014;
      waterMat.color.set(isTankCrit ? '#ef4444' : '#1ea7f5');
      waterMat.emissive.set(isTankCrit ? '#7f1d1d' : '#084b73');

      // Update Pompa & percikan tetes air irigasi 3D
      const isFlowing = st.pumpOn && !isTankCrit;
      motorMesh.position.x = -0.08 + (isFlowing ? Math.sin(elapsed * 45) * 0.012 : 0);
      pumpLedMat.color.set(isTankCrit ? '#ef4444' : isFlowing ? '#38bdf8' : '#94a3b8');
      pumpLedMat.emissive.set(isTankCrit ? '#ef4444' : isFlowing ? '#38bdf8' : '#334155');
      pumpLedMat.emissiveIntensity = isFlowing || isTankCrit ? 1.4 + Math.sin(elapsed * 8) * 0.6 : 0.3;

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
      oledMat.color.set(isPowerSave ? '#f59e0b' : '#22c55e');
      oledMat.emissive.set(isPowerSave ? '#f59e0b' : '#22c55e');

      orbInst.visible = isCharging;
      if (isCharging) {
        for (let i = 0; i < orbCount; i++) {
          const p = ((elapsed * 0.55 + i / orbCount) % 1);
          dummy.position.set(
            THREE.MathUtils.lerp(0, 0.28, p),
            THREE.MathUtils.lerp(1.92, 1.12, p),
            THREE.MathUtils.lerp(0, 0.14, p)
          );
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.85 + Math.sin(p * Math.PI) * 0.4);
          dummy.updateMatrix();
          orbInst.setMatrixAt(i, dummy.matrix);
        }
        orbInst.instanceMatrix.needsUpdate = true;
      }

      const sigP = (elapsed * 0.8) % 1;
      signalRing.scale.setScalar(0.6 + sigP * 2.4);
      signalRingMat.opacity = (1 - sigP) * 0.72;

      // Hujan 3D saat skenario hujan
      rainInst.visible = st.weather === 'hujan';
      if (st.weather === 'hujan') {
        for (let i = 0; i < rainCount; i++) {
          const r = rainSeeds[i];
          r.y -= dt * r.speed;
          r.x -= dt * 1.8;
          if (r.y < 0.1) {
            r.y = 11.5;
            r.x = (Math.random() - 0.5) * 20;
            r.z = (Math.random() - 0.5) * 16;
          }
          dummy.position.set(r.x, r.y, r.z);
          dummy.rotation.set(0, 0, -0.15);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          rainInst.setMatrixAt(i, dummy.matrix);
        }
        rainInst.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // Proyeksikan label HTML tiap 2 frame (anti-tabrakan otomatis!)
      labelFrameCounter++;
      if (labelFrameCounter % 2 === 0) {
        const cw = mount.clientWidth;
        const ch = mount.clientHeight;
        const projected: ProjectedLabel3D[] = (
          Object.entries(labelAnchors) as [Exclude<HotspotId3D, null>, THREE.Vector3][]
        ).map(([id, vec]) => {
          projVec.copy(vec).project(camera);
          const visible = projVec.z < 1 && projVec.x > -1.05 && projVec.x < 1.05 && projVec.y > -1.05 && projVec.y < 1.05;
          return {
            id,
            x: Math.max(66, Math.min(cw - 66, (projVec.x * 0.5 + 0.5) * cw)),
            y: Math.max(54, Math.min(ch - 54, (-projVec.y * 0.5 + 0.5) * ch)),
            visible,
          };
        });

        // Resolusi anti-tabrakan sederhana antar label (jarak vertikal min 32px jika X berdekatan)
        for (let i = 0; i < projected.length; i++) {
          for (let j = i + 1; j < projected.length; j++) {
            const a = projected[i];
            const b = projected[j];
            if (Math.abs(a.x - b.x) < 118 && Math.abs(a.y - b.y) < 32) {
              const push = (32 - Math.abs(a.y - b.y)) / 2 + 2;
              if (a.y <= b.y) {
                a.y = Math.max(50, a.y - push);
                b.y = Math.min(ch - 50, b.y + push);
              } else {
                a.y = Math.min(ch - 50, a.y + push);
                b.y = Math.max(50, b.y - push);
              }
            }
          }
        }
        onLabelsRef.current(projected);
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

      // Bersihkan memori WebGL total agar nol memory leak saat berpindah halaman
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      Object.values(skyTextures).forEach((t) => t.dispose());
      grassTex.dispose();
      soilTex.map.dispose();
      soilTex.bump.dispose();
      woodTex.dispose();
      solarTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
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
      aria-label="Kanvas 3D WebGL kebun CermatTani"
    />
  );
};

export default Farm3DWebGLCanvas;
