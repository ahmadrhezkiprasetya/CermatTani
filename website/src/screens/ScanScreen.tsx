'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  CloudOff,
  FlaskConical,
  Leaf,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sprout,
  SwitchCamera,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { TomatoConfetti } from '../components/Illustrations';
import { StripedProgressBar } from '../components/Charts';
import {
  KNOWLEDGE_DISEASES,
  KNOWLEDGE_NUTRIENTS,
  RIPENESS_REFERENCE,
} from '../data/knowledgeBase';
import {
  compressDataUrlClient,
  compressImageClient,
  runSmartPlantScan,
} from '../utils/scanAnalyzer';
import { PlantPart, ScanRecord } from '../types/cermattani';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { cermatSupabaseRepo } from '@/lib/supabase/repository';

/* Layar 3 & 4: Scan (pilih bagian -> kamera langsung / unggah foto -> proses AI -> hasil 3 tab) */
export const ScanScreen: React.FC = () => {
  const {
    state,
    activeFarmPlants,
    scanPreselectPart,
    scanPreselectPlantId,
    saveScan,
    enqueueOfflineScan,
    isOffline,
    openChatWithPlant,
    setActiveScreen,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedPart, setSelectedPart] = useState<PlantPart>(scanPreselectPart || 'buah');
  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    scanPreselectPlantId || activeFarmPlants[0]?.id || state.plants[0]?.id || ''
  );
  const [stage, setStage] = useState<'pick' | 'camera' | 'scanning' | 'result'>('pick');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [previewFoto, setPreviewFoto] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [queueNotice, setQueueNotice] = useState<string>('');
  const [result, setResult] = useState<ScanRecord | null>(null);
  const [aiModel, setAiModel] = useState<string>('');
  const [aiNote, setAiNote] = useState<string>('');
  const [temuanVisual, setTemuanVisual] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'kematangan' | 'penyakit' | 'pupuk'>('kematangan');
  const [savedToTimeline, setSavedToTimeline] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (scanPreselectPart) setSelectedPart(scanPreselectPart);
    if (scanPreselectPlantId) setSelectedPlantId(scanPreselectPlantId);
  }, [scanPreselectPart, scanPreselectPlantId]);

  // Hentikan stream kamera secara bersih agar lampu kamera langsung mati
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setCameraStarting(false);
  }, []);

  useEffect(() => {
    return () => stopCameraStream();
  }, [stopCameraStream]);

  // Buka kamera nyata via MediaDevices API (bekerja di webcam laptop & kamera HP)
  const openLiveCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      setUploadError('');
      setQueueNotice('');
      stopCameraStream();

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setUploadError(
          'Browser ini belum mendukung akses kamera langsung (atau butuh HTTPS/localhost). Gunakan tombol "Unggah foto" sebagai gantinya.'
        );
        return;
      }

      setCameraStarting(true);
      setStage('camera');

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback jika perangkat hanya punya 1 kamera (mis. webcam laptop)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
        setCameraStarting(false);
      } catch (err) {
        stopCameraStream();
        setStage('pick');
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setUploadError(
            'Izin kamera ditolak oleh browser. Izinkan akses kamera di bilah alamat browser, lalu klik "Buka kamera" lagi.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setUploadError(
            'Perangkat kamera tidak ditemukan. Kamu bisa memakai tombol "Unggah foto" untuk memilih gambar dari perangkat.'
          );
        } else {
          setUploadError(
            'Kamera sedang dipakai aplikasi lain atau tidak dapat dibuka. Tutup aplikasi kamera lain atau pakai "Unggah foto".'
          );
        }
      }
    },
    [facingMode, stopCameraStream]
  );

  // Pasang ulang stream saat elemen <video> baru ter-render
  useEffect(() => {
    if (stage === 'camera' && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [stage]);

  const targetPlant = useMemo(
    () =>
      state.plants.find((p) => p.id === selectedPlantId) ||
      activeFarmPlants[0] ||
      state.plants[0],
    [state.plants, activeFarmPlants, selectedPlantId]
  );

  const startAnalysis = async (params: {
    fotoUrl: string;
    part: PlantPart;
    originalKb?: number;
    compressedKb?: number;
  }) => {
    if (!targetPlant) {
      setUploadError('Tambahkan minimal satu tanaman di menu Tanaman sebelum memindai.');
      return;
    }

    stopCameraStream();
    setUploadError('');
    setQueueNotice('');
    setSavedToTimeline(false);
    setAiNote('');
    setTemuanVisual([]);

    if (isOffline) {
      enqueueOfflineScan({
        plantId: targetPlant.id,
        bagian: params.part,
        fotoUrl: params.fotoUrl,
      });
      setStage('pick');
      setQueueNotice(
        'Koneksi sedang offline. Foto sudah dikompres dan masuk antrean — akan otomatis dianalisis dengan Gemini AI saat jaringan kembali.'
      );
      return;
    }

    setPreviewFoto(params.fotoUrl);
    setStage('scanning');

    const prevScans = state.scans.filter((s) => s.plantId === targetPlant.id);

    try {
      const output = await runSmartPlantScan({
        plant: targetPlant,
        bagian: params.part,
        fotoUrl: params.fotoUrl,
        originalKb: params.originalKb,
        compressedKb: params.compressedKb,
        sensorAvailable: state.sensor.sensorTersedia,
        lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
        previousPlantScans: prevScans,
      });

      setResult(output.record);
      setAiModel(output.aiModel);
      setAiNote(output.aiNote || '');
      setTemuanVisual(output.temuanVisual || []);
      setActiveTab(params.part === 'buah' ? 'kematangan' : 'penyakit');
      setStage('result');

      if (output.record.anjuranPanen === 'Panen sekarang') {
        setShowConfetti(true);
        window.setTimeout(() => setShowConfetti(false), 1400);
      }
    } catch (err) {
      setStage('pick');
      setResult(null);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Analisis Gemini AI gagal diproses. Pastikan internet aktif dan coba unggah atau foto ulang.'
      );
    }
  };

  // Jepret frame nyata dari kamera langsung
  const handleCaptureCamera = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setUploadError('Kamera belum siap menampilkan gambar. Tunggu sebentar lalu coba klik "Ambil foto" lagi.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCameraStream();

    const compressed = await compressDataUrlClient(rawDataUrl);
    await startAnalysis({
      fotoUrl: compressed.dataUrl,
      part: selectedPart,
      originalKb: compressed.originalKb,
      compressedKb: compressed.compressedKb,
    });
  };

  const handleToggleFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    void openLiveCamera(next);
  };

  const processUploadedFile = async (file: File) => {
    try {
      const compressed = await compressImageClient(file);
      await startAnalysis({
        fotoUrl: compressed.dataUrl,
        part: selectedPart,
        originalKb: compressed.originalKb,
        compressedKb: compressed.compressedKb,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Foto belum bisa diproses. Pastikan format JPG/PNG/HEIC/WebP dan ukuran ≤ 10 MB.'
      );
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleDropFile = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleSave = () => {
    if (!result || savedToTimeline) return;
    saveScan(result);
    setSavedToTimeline(true);

    // Sinkron non-blocking ke Supabase jika pengguna sudah login
    if (isSupabaseConfigured) {
      void (async () => {
        try {
          const session = await cermatSupabaseRepo.getCurrentSession();
          if (!session) return;
          const fotoPath = await cermatSupabaseRepo.uploadScanPhotoDataUrl(
            result.plantId,
            result.fotoUrl
          );
          await cermatSupabaseRepo.insertScan(result, fotoPath);
        } catch {
          // Tetap aman tersimpan lokal bila ID tanaman masih mode demo
        }
      })();
    }
  };

  const detectionAltText = useMemo(() => {
    if (!result) return 'Foto tanaman';
    if (result.boxes.length === 0) {
      return `Foto ${result.bagian} tanaman: ${result.penyakitUtamaNama}`;
    }
    const raw = result.boxes.filter((b) => b.stage === 'mentah').length;
    const half = result.boxes.filter((b) => b.stage === 'setengah_matang').length;
    const ripe = result.boxes.filter((b) => b.stage === 'matang').length;
    return `${result.boxes.length} buah terdeteksi: ${raw} mentah, ${half} setengah matang, ${ripe} matang`;
  }, [result]);

  const diseaseInfo = result
    ? KNOWLEDGE_DISEASES[result.penyakitUtamaId] || KNOWLEDGE_DISEASES.sehat
    : null;
  const nutrientInfo = result
    ? KNOWLEDGE_NUTRIENTS[result.dugaanHaraId] || KNOWLEDGE_NUTRIENTS.cukup
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920, margin: '0 auto', width: '100%' }}>
      {/* STEP 1 & 2: Pilih bagian tanaman -> Buka kamera / Unggah foto */}
      {stage === 'pick' && (
        <>
          <section
            className="card stagger-card"
            style={{
              background:
                'radial-gradient(circle at 96% 8%, rgba(216,243,106,0.18), transparent 44%), var(--surface)',
              padding: '24px 26px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
              <CermoMascot pose="wave" size={76} />
              <div style={{ flex: '1 1 260px' }}>
                <span className="t-micro" style={{ color: 'var(--leaf-600)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={13} /> Gemini Vision AI · Dataset Agronomi Khusus
                </span>
                <h2 className="t-h2" style={{ marginTop: 2 }}>Scan kondisi tanaman</h2>
                <p className="t-small t-soft" style={{ marginTop: 3 }}>
                  Pilih tanaman dan bagian yang ingin diperiksa, lalu ambil foto langsung atau unggah dari galeri.
                </p>
              </div>
            </div>

            {/* Pilih tanaman target */}
            <div className="field-group" style={{ marginBottom: 20 }}>
              <label htmlFor="scan-plant-select" className="field-label">
                Tanaman yang dipindai
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  id="scan-plant-select"
                  className="field-select"
                  style={{ flex: '1 1 240px' }}
                  value={targetPlant?.id || ''}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                >
                  {state.plants.map((p) => {
                    const farm = state.farms.find((f) => f.id === p.farmId);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.varietas} · Fase {p.fase}) — {farm?.nama}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveScreen('tanaman')}
                >
                  + Kelola tanaman
                </button>
              </div>
            </div>

            {/* F2.1: Pilihan bagian tanaman dengan ikon besar */}
            <div style={{ marginBottom: 22 }}>
              <div className="field-label" style={{ marginBottom: 10 }}>
                1. Pilih bagian tanaman
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: 12,
                }}
              >
                {(
                  [
                    {
                      id: 'buah',
                      title: 'Buah',
                      desc: 'Cek kematangan, hari panen & perkiraan hasil',
                      color: 'var(--fruit-ripe)',
                      icon: Sparkles,
                    },
                    {
                      id: 'daun',
                      title: 'Daun',
                      desc: 'Kenali bercak/penyakit & dugaan kekurangan pupuk',
                      color: 'var(--leaf-500)',
                      icon: Leaf,
                    },
                    {
                      id: 'batang',
                      title: 'Batang',
                      desc: 'Deteksi gejala layu batang & pangkal tanaman',
                      color: 'var(--forest-900)',
                      icon: Sprout,
                    },
                  ] as const
                ).map((part) => {
                  const Icon = part.icon;
                  const active = selectedPart === part.id;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => setSelectedPart(part.id)}
                      aria-pressed={active}
                      className="card-interactive"
                      style={{
                        border: active ? '2px solid var(--leaf-600)' : '1px solid var(--line)',
                        background: active ? 'var(--ok-bg)' : 'var(--surface-2)',
                        borderRadius: 16,
                        padding: 16,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        transition: 'transform 160ms ease, border-color 160ms ease, background 160ms ease',
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: active ? part.color : 'var(--surface)',
                          color: active ? '#FFFFFF' : part.color,
                          border: active ? 'none' : '1px solid var(--line)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon size={21} strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="t-h3" style={{ fontSize: '1rem' }}>{part.title}</div>
                        <p className="t-micro t-soft" style={{ marginTop: 3, fontWeight: 500 }}>
                          {part.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* F1.1: Buka Kamera Langsung vs Unggah Foto (Drag & Drop + File Picker) */}
            <div>
              <div className="field-label" style={{ marginBottom: 10 }}>
                2. Buka kamera atau unggah foto (JPG, PNG, WebP, HEIC · maks 10 MB)
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <button
                  type="button"
                  className="btn-tomato"
                  onClick={() => void openLiveCamera(facingMode)}
                >
                  <Camera size={20} /> Buka kamera
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} /> Unggah foto
                </button>
              </div>

              {/* Zona tarik & lepas foto (drag & drop upload) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--leaf-600)' : 'var(--line)'}`,
                  background: dragActive ? 'var(--ok-soft)' : 'var(--surface-2)',
                  borderRadius: 18,
                  padding: '18px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, background 150ms ease',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  Tarik foto ke sini atau klik untuk memilih file dari galeri/komputer
                </div>
                <p className="t-micro t-soft" style={{ marginTop: 4 }}>
                  Foto dikompres otomatis di sisi klien. Tips: cahaya terang, jarak 20–40 cm dari
                  bagian {selectedPart}.
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="alert-card alert-card--bad" style={{ marginTop: 14 }} role="alert">
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>{uploadError}</div>
              </div>
            )}

            {queueNotice && (
              <div className="alert-card alert-card--warn" style={{ marginTop: 14 }} role="status">
                <CloudOff size={20} style={{ flexShrink: 0 }} />
                <div>{queueNotice}</div>
              </div>
            )}
          </section>
        </>
      )}

      {/* LIVE CAMERA VIEWFINDER (getUserMedia — benar-benar membuka kamera!) */}
      {stage === 'camera' && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="t-h2">Kamera langsung</h2>
                <span className="pill pill-ok">Bagian: {selectedPart}</span>
              </div>
              <p className="t-small t-soft">
                Arahkan kamera ke {selectedPart} {targetPlant?.nama || 'tanaman'} dengan cahaya cukup.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                stopCameraStream();
                setStage('pick');
              }}
            >
              <X size={18} /> Tutup kamera
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: 20,
              overflow: 'hidden',
              background: '#0C1713',
              aspectRatio: '16 / 10',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Bingkai bidik viewfinder */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '10%',
                border: '2px dashed rgba(216, 243, 106, 0.75)',
                borderRadius: 18,
                pointerEvents: 'none',
              }}
            />

            {cameraStarting && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(12, 23, 19, 0.72)',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 600,
                }}
              >
                Menyalakan kamera...
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-tomato"
              onClick={() => void handleCaptureCamera()}
              disabled={!cameraReady}
              style={{ minWidth: 190 }}
            >
              <Camera size={20} /> Ambil foto & pindai
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleToggleFacing}
              disabled={cameraStarting}
            >
              <SwitchCamera size={18} /> Ganti kamera
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                stopCameraStream();
                setStage('pick');
                window.setTimeout(() => fileInputRef.current?.click(), 50);
              }}
            >
              <Upload size={18} /> Unggah foto saja
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: Proses animasi memindai (DESIGN.md §10) */}
      {stage === 'scanning' && (
        <section
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            textAlign: 'center',
            padding: '32px 24px',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 'min(480px, 100%)',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <img
              src={previewFoto}
              alt="Sedang memindai foto tanaman"
              style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 4,
                background: '#D8F36A',
                boxShadow: '0 0 18px 6px rgba(31, 157, 85, 0.72)',
                animation: 'scanBeam 1.6s ease-in-out infinite',
              }}
            />
          </div>

          <CermoMascot pose="scan" size={104} interactive={false} />

          <div>
            <h2 className="t-h2">Cermo sedang memeriksa fotomu...</h2>
            <p className="t-body t-soft" style={{ marginTop: 6 }}>
              Menganalisis kondisi {selectedPart}, kematangan, tanda penyakit, serta gejala hara.
            </p>
          </div>
        </section>
      )}

      {/* STEP 4 (Layar 4): Hasil Scan dengan 3 Tab (Kematangan / Penyakit / Pupuk) */}
      {stage === 'result' && result && diseaseInfo && nutrientInfo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <TomatoConfetti active={showConfetti} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
                gap: 20,
                alignItems: 'center',
              }}
            >
              {/* Foto + Detection Boxes */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: '#12241C',
                }}
              >
                <img
                  src={result.fotoUrl}
                  alt={detectionAltText}
                  style={{ width: '100%', display: 'block', aspectRatio: '16 / 10.5', objectFit: 'cover' }}
                />
                {result.boxes.map((box, idx) => {
                  const ref = RIPENESS_REFERENCE[box.stage];
                  return (
                    <div
                      key={box.id}
                      style={{
                        position: 'absolute',
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`,
                        border: `3px solid ${ref.color}`,
                        borderRadius: 12,
                        boxShadow: '0 0 0 1px #FFFFFF, 0 2px 10px rgba(0,0,0,0.35)',
                        animation: `boxPopIn 360ms cubic-bezier(.2,.8,.2,1) ${idx * 160}ms both`,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: -26,
                          left: -2,
                          background: ref.color,
                          color: box.stage === 'setengah_matang' ? '#14302A' : '#FFFFFF',
                          padding: '2px 9px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
                        }}
                      >
                        {ref.label} {box.confidence}%
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Ringkasan keputusan utama */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CermoMascot
                    pose={
                      result.tanpaBuahTerdeteksi || result.keyakinanRendah || result.penyakitUtamaId !== 'sehat'
                        ? 'worried'
                        : 'happy'
                    }
                    size={76}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="pill pill-neutral">
                        {targetPlant?.nama} · Bagian {result.bagian}
                      </span>
                      <span className="pill pill-ok">
                        Gemini AI · {aiModel || result.aiModel || 'Vision'}
                      </span>
                      <span className="pill pill-neutral">Dataset Agronomi Khusus</span>
                    </div>
                    {result.fotoUkuranAsliKb && result.fotoUkuranKompresKb && (
                      <div className="t-micro t-soft">
                        Kompresi klien: {result.fotoUkuranAsliKb} KB → {result.fotoUkuranKompresKb} KB
                      </div>
                    )}
                  </div>
                </div>

                {/* Keputusan besar */}
                <div
                  className="card-subtle"
                  style={{
                    borderLeft: `5px solid ${
                      result.tanpaBuahTerdeteksi
                        ? 'var(--warn)'
                        : result.anjuranPanen === 'Panen sekarang'
                          ? 'var(--tomato-500)'
                          : result.penyakitUtamaId !== 'sehat'
                            ? 'var(--bad)'
                            : 'var(--leaf-600)'
                    }`,
                  }}
                >
                  <div className="t-micro t-soft" style={{ fontWeight: 700 }}>
                    Anjuran utama Cermo
                  </div>
                  <div className="t-display" style={{ marginTop: 4 }}>
                    {result.tanpaBuahTerdeteksi
                      ? 'Objek belum terlihat jelas'
                      : result.bagian === 'buah'
                        ? result.anjuranPanen === 'Panen sekarang'
                          ? 'Panen sekarang'
                          : `Tunggu ${result.estimasiHariMin}–${result.estimasiHariMax} hari`
                        : result.penyakitUtamaNama}
                  </div>
                  <div className="t-small t-soft" style={{ marginTop: 6 }}>
                    Seberapa yakin Cermo: <strong className="tabular-nums">{result.keyakinan}%</strong>
                  </div>
                  {aiNote && (
                    <p className="t-small" style={{ marginTop: 8 }}>
                      {aiNote}
                    </p>
                  )}
                  {temuanVisual.length > 0 && (
                    <ul
                      style={{
                        margin: '10px 0 0',
                        paddingLeft: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {temuanVisual.map((t, idx) => (
                        <li key={idx} className="t-micro t-soft">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {result.tanpaBuahTerdeteksi && (
                  <div className="alert-card alert-card--warn">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>
                        {result.diluarKonteksTanaman
                          ? 'Foto ini terdeteksi bukan objek tanaman kebun.'
                          : 'Foto terlalu gelap atau bagian tanaman tidak tampak jelas.'}
                      </strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        {result.diluarKonteksTanaman
                          ? `CermatTani hanya menganalisis foto buah, daun, atau batang tanaman pertanian. Arahkan kamera ke bagian ${result.bagian} tanamanmu lalu pindai ulang.`
                          : `Coba dekat jendela atau nyalakan cahaya tambahan, arahkan kamera 20–40 cm ke bagian ${result.bagian}, dan pastikan tidak tertutup bayangan.`}
                      </p>
                    </div>
                  </div>
                )}

                {result.keyakinanRendah && !result.tanpaBuahTerdeteksi && (
                  <div className="alert-card alert-card--warn" role="alert">
                    <ShieldAlert size={22} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>
                        Cermo belum cukup yakin ({result.keyakinan}% &lt; {state.settings.ambangKeyakinanRendah}%).
                      </strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        Coba ambil foto ulang di tempat terang, dan konfirmasi juga ke penyuluh
                        pertanian setempat sebelum mengambil tindakan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3 Tab Hasil Scan: Kematangan / Penyakit / Pupuk */}
          <section className="card">
            <div className="tabs-bar" role="tablist" aria-label="Tab hasil scan">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'kematangan'}
                className={`tab-btn ${activeTab === 'kematangan' ? 'active' : ''}`}
                onClick={() => setActiveTab('kematangan')}
              >
                <Sparkles size={18} /> Kematangan &amp; panen
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'penyakit'}
                className={`tab-btn ${activeTab === 'penyakit' ? 'active' : ''}`}
                onClick={() => setActiveTab('penyakit')}
              >
                <ShieldAlert size={18} /> Penyakit &amp; solusi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'pupuk'}
                className={`tab-btn ${activeTab === 'pupuk' ? 'active' : ''}`}
                onClick={() => setActiveTab('pupuk')}
              >
                <FlaskConical size={18} /> Rekomendasi pupuk
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              {activeTab === 'kematangan' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {result.bagian !== 'buah' ? (
                    <div className="card-subtle">
                      <p className="t-body">
                        Kamu memindai bagian <strong>{result.bagian}</strong>. Untuk melihat tahap
                        kematangan buah dan perkiraan hasil panen, pilih bagian <strong>Buah</strong>{' '}
                        saat memindai.
                      </p>
                    </div>
                  ) : result.tanpaBuahTerdeteksi ? (
                    <div className="card-subtle">
                      <p className="t-body">
                        Tidak ada buah yang terdeteksi pada foto ini. Klik &ldquo;Scan lagi&rdquo; di
                        bawah dengan pencahayaan yang lebih jelas.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: 14,
                        }}
                      >
                        <div className="card-subtle">
                          <div className="t-micro t-soft">Tahap dominan</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <span
                              className="ripeness-dot"
                              style={{
                                width: 14,
                                height: 14,
                                background: result.tahapDominan
                                  ? RIPENESS_REFERENCE[result.tahapDominan].color
                                  : '#5DBB63',
                              }}
                            />
                            <span className="t-h2">
                              {result.tahapDominan ? RIPENESS_REFERENCE[result.tahapDominan].label : '-'}
                            </span>
                          </div>
                          <p className="t-small t-soft" style={{ marginTop: 6 }}>
                            {result.tahapDominan ? RIPENESS_REFERENCE[result.tahapDominan].ringkasan : ''}
                          </p>
                        </div>

                        <div className="card-subtle">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <span className="t-micro t-soft">Perkiraan hasil (foto ini)</span>
                            <span className="pill pill-warn">Estimasi kasar</span>
                          </div>
                          <div className="t-h2 tabular-nums" style={{ marginTop: 6 }}>
                            {result.jumlahBuah} buah ≈ {result.estimasiBobotGram} gram
                          </div>
                          <p className="t-small t-soft" style={{ marginTop: 6 }}>
                            Dihitung dari {result.jumlahBuah} kotak deteksi × bobot rata-rata{' '}
                            {targetPlant?.bobotRataBuahGram || 85} g ({targetPlant?.varietas}). Angka ini
                            estimasi kasar karena foto hanya menangkap sebagian tanaman.
                          </p>
                        </div>
                      </div>

                      {result.estimasiDisesuaikanRiwayat && (
                        <div className="alert-card alert-card--ok">
                          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                          <div className="t-small">
                            <strong>Estimasi disesuaikan dengan riwayat tanaman.</strong> Karena{' '}
                            {targetPlant?.nama} sudah memiliki ≥ 2 scan, rentang hari panen menghitung
                            laju perubahan warna buah sebelumnya.
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'penyakit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="card-subtle">
                    <div className="t-small" style={{ fontWeight: 700, marginBottom: 10 }}>
                      3 kemungkinan teratas (termasuk kelas Sehat)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {result.penyakitTop3.map((item, idx) => (
                        <StripedProgressBar
                          key={item.id}
                          label={`${idx + 1}. ${item.nama}`}
                          valueLabel={`${item.confidence}%`}
                          percent={item.confidence}
                          color={
                            item.id === 'sehat'
                              ? '#1F9D55'
                              : idx === 0
                                ? '#E5484D'
                                : '#FFB63D'
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <h3 className="t-h3">{diseaseInfo.penyakit}</h3>
                      <p className="t-small t-soft" style={{ marginTop: 4 }}>
                        <strong>Penyebab:</strong> {diseaseInfo.penyebab}
                      </p>
                      <p className="t-small t-soft" style={{ marginTop: 4 }}>
                        <strong>Gejala pembanding:</strong> {diseaseInfo.gejala}
                      </p>
                    </div>

                    <div className="alert-card alert-card--ok">
                      <Leaf size={22} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <strong>Solusi organik &amp; budidaya</strong>
                          <span className="pill pill-ok">Organik lebih dulu</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {diseaseInfo.solusiOrganik.map((s, i) => (
                            <li key={i} className="t-small">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="alert-card alert-card--warn">
                      <AlertTriangle size={22} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <strong>Opsi kimiawi (pilihan terakhir)</strong>
                          <span className="pill pill-warn">Baca label produk</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {diseaseInfo.solusiKimia.map((s, i) => (
                            <li key={i} className="t-small">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="card-subtle">
                      <strong className="t-small">Langkah pencegahan:</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {diseaseInfo.pencegahan.map((p, i) => (
                          <li key={i} className="t-small t-soft">
                            {p}
                          </li>
                        ))}
                      </ul>
                      <p className="t-micro t-soft" style={{ marginTop: 10 }}>
                        Sumber: {diseaseInfo.sumber} · Konfirmasi ke penyuluh pertanian bila ragu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pupuk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 className="t-h3">{nutrientInfo.dugaan}</h3>
                    {result.pakaiDataSensor ? (
                      <>
                        <span className="pill pill-ok">Dengan data sensor</span>
                        <span className="pill pill-sim">Simulasi</span>
                      </>
                    ) : (
                      <span className="pill pill-warn">Dugaan visual</span>
                    )}
                  </div>

                  <p className="t-small t-soft">
                    <strong>Gejala acuan:</strong> {nutrientInfo.gejala}
                  </p>

                  <div className="alert-card alert-card--ok">
                    <Leaf size={22} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
                    <div>
                      <strong>Pilihan organik lebih dulu</strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        {nutrientInfo.rekomendasiOrganik}
                      </p>
                    </div>
                  </div>

                  <div className="card-subtle">
                    <strong className="t-small">
                      Dosis umum untuk fase aktif ({targetPlant?.fase || 'Berbuah'})
                    </strong>
                    <p className="t-body" style={{ marginTop: 4, fontWeight: 600 }}>
                      {nutrientInfo.dosisPerFase[targetPlant?.fase || 'Berbuah']}
                    </p>
                    <p className="t-micro t-soft" style={{ marginTop: 10 }}>
                      Sumber: {nutrientInfo.sumber}
                    </p>
                  </div>

                  <div className="alert-card alert-card--warn" role="note">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div className="t-small">
                      <strong>Bukan pengganti uji tanah.</strong> Takaran pupuk di atas adalah acuan
                      umum dan sebaiknya disesuaikan dengan kondisi lahan serta arahan penyuluh
                      pertanian.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Aksi bawah hasil scan */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={savedToTimeline}
            >
              {savedToTimeline ? (
                <>
                  <Check size={18} /> Tersimpan di timeline &amp; kalender
                </>
              ) : (
                'Simpan ke timeline'
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!savedToTimeline) handleSave();
                openChatWithPlant(result.plantId);
              }}
            >
              <MessageCircle size={18} /> Tanya Cermo tentang hasil ini
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setStage('pick');
                setResult(null);
              }}
            >
              <RefreshCw size={18} /> Scan lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
