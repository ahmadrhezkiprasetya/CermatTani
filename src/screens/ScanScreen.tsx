'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  CloudOff,
  ExternalLink,
  FlaskConical,
  Info,
  Leaf,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  SwitchCamera,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { FormattedText } from '../components/FormattedText';
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
import { ScanOutputFocus, ScanRecord } from '../types/cermattani';

/* Layar 3 & 4: Scan Otomatis (Langsung Kamera/Unggah -> Output Dataset Terfokus -> Tanya Lanjutan ke Chatbot) */
export const ScanScreen: React.FC = () => {
  const {
    state,
    activeFarmPlants,
    scanPreselectPlantId,
    saveScan,
    enqueueOfflineScan,
    isOffline,
    openChatWithScan,
    shareScanToTelegram,
    setActiveScreen,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
  const [temuanVisual, setTemuanVisual] = useState<string[]>([]);
  const [savedToTimeline, setSavedToTimeline] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [tgShareBusy, setTgShareBusy] = useState(false);
  const [tgShareStatus, setTgShareStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [externalRef, setExternalRef] = useState<{
    judul: string;
    ringkasan: string;
    sumberLabel: string;
    sumberUrl: string;
    tautanResmi?: Array<{
      label: string;
      domain: string;
      url: string;
      kategori: string;
      terverifikasiLive: boolean;
    }>;
    taksonomi?: {
      namaIlmiah: string;
      kerajaan?: string;
      famili?: string;
      gbifUrl?: string;
    };
  } | null>(null);
  const [loadingExtRef, setLoadingExtRef] = useState(false);

  useEffect(() => {
    if (scanPreselectPlantId) setSelectedPlantId(scanPreselectPlantId);
  }, [scanPreselectPlantId]);

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
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { });
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

  useEffect(() => {
    if (stage === 'camera' && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { });
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
    setTemuanVisual([]);
    setFollowUpQuestion('');

    if (isOffline) {
      enqueueOfflineScan({
        plantId: targetPlant.id,
        bagian: 'buah',
        fotoUrl: params.fotoUrl,
      });
      setStage('pick');
      setQueueNotice(
        'Koneksi sedang offline. Foto sudah dikompres dan masuk antrean — akan otomatis dianalisis saat jaringan kembali.'
      );
      return;
    }

    setPreviewFoto(params.fotoUrl);
    setStage('scanning');

    const prevScans = state.scans.filter((s) => s.plantId === targetPlant.id);

    try {
      const output = await runSmartPlantScan({
        plant: targetPlant,
        bagian: 'auto',
        fotoUrl: params.fotoUrl,
        originalKb: params.originalKb,
        compressedKb: params.compressedKb,
        sensorAvailable: state.sensor.sensorTersedia,
        lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
        previousPlantScans: prevScans,
      });

      setResult(output.record);
      setAiModel(output.aiModel);
      setTemuanVisual(output.temuanVisual || []);
      setStage('result');

      if (
        output.record.fokusOutput === 'kematangan' &&
        output.record.anjuranPanen === 'Panen sekarang'
      ) {
        setShowConfetti(true);
        window.setTimeout(() => setShowConfetti(false), 1400);
      }
    } catch (err) {
      setStage('pick');
      setResult(null);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Analisis AI gagal diproses. Pastikan internet aktif dan coba unggah atau foto ulang.'
      );
    }
  };

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
  };

  // Kirim pertanyaan lanjutan + bawa seluruh data hasil scan langsung ke Chatbot Cermo
  const handleAskFollowUp = (questionText?: string) => {
    if (!result) return;
    if (!savedToTimeline) handleSave();
    const q = (questionText ?? followUpQuestion).trim();
    openChatWithScan(result, q || undefined);
  };

  const focus: ScanOutputFocus = useMemo(() => {
    if (!result) return 'tidak_terdeteksi';
    if (result.fokusOutput) return result.fokusOutput;
    if (result.tanpaBuahTerdeteksi) return 'tidak_terdeteksi';
    if (result.tahapDominan) return 'kematangan';
    return 'penyakit';
  }, [result]);

  // Tarik pengetahuan eksternal live (Wikipedia & GBIF Taxonomy) tanpa memperlambat waktu scan
  useEffect(() => {
    if (!result || focus === 'tidak_terdeteksi' || isOffline) {
      setExternalRef(null);
      setLoadingExtRef(false);
      return;
    }
    let cancelled = false;
    setLoadingExtRef(true);
    setExternalRef(null);

    const params = new URLSearchParams();
    if (focus === 'penyakit' && result.penyakitUtamaId && result.penyakitUtamaId !== 'sehat') {
      params.set('diseaseId', result.penyakitUtamaId);
    } else if (focus === 'hara' && result.dugaanHaraId && result.dugaanHaraId !== 'cukup') {
      params.set('nutrientId', result.dugaanHaraId);
    } else if (focus === 'kematangan' && result.penyakitRinganId) {
      params.set('diseaseId', result.penyakitRinganId);
    } else if (targetPlant) {
      params.set('crop', targetPlant.varietas || targetPlant.nama);
    } else {
      params.set('crop', 'tomat');
    }

    fetch(`/api/knowledge/external?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && data.external) {
          setExternalRef(data.external);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoadingExtRef(false);
      });

    return () => {
      cancelled = true;
    };
  }, [result, focus, isOffline, targetPlant]);

  const diseaseInfo = result
    ? KNOWLEDGE_DISEASES[result.penyakitUtamaId] || KNOWLEDGE_DISEASES.sehat
    : null;
  const minorDiseaseInfo =
    result?.penyakitRinganId && KNOWLEDGE_DISEASES[result.penyakitRinganId]
      ? KNOWLEDGE_DISEASES[result.penyakitRinganId]
      : null;
  const ripenessInfo =
    result?.tahapDominan && RIPENESS_REFERENCE[result.tahapDominan]
      ? RIPENESS_REFERENCE[result.tahapDominan]
      : null;
  const nutrientInfo =
    result?.adaGejalaHara &&
      result.dugaanHaraId !== 'cukup' &&
      KNOWLEDGE_NUTRIENTS[result.dugaanHaraId]
      ? KNOWLEDGE_NUTRIENTS[result.dugaanHaraId]
      : null;

  const followUpSuggestions = useMemo(() => {
    if (!result) return [];
    if (focus === 'penyakit') {
      return [
        'Bagaimana cara mencegah ini menular ke tanaman atau buah lain?',
        'Apakah buah atau daun yang rusak boleh dijadikan kompos?',
        'Langkah organik pertama apa yang paling efektif dilakukan hari ini?',
      ];
    }
    if (focus === 'kematangan') {
      return [
        'Kapan jam paling baik untuk memetik buah ini?',
        'Bagaimana cara menyimpan hasil panen supaya tetap segar?',
        result.penyakitRinganId
          ? 'Apakah bercak kecil pada buah ini aman dan bagaimana mencegahnya?'
          : 'Bagaimana perawatan sampai buah matang sempurna?',
      ];
    }
    if (focus === 'hara') {
      return [
        'Berapa takaran pupuk organik yang aman untuk fase tanaman ini?',
        'Seberapa sering pupuk susulan perlu diberikan?',
        'Apa tanda tanaman sudah pulih setelah dipupuk?',
      ];
    }
    return ['Tips mengambil foto kebun agar hasil analisis lebih akurat?'];
  }, [result, focus]);

  const headlineTitle = useMemo(() => {
    if (!result) return '';
    if (focus === 'tidak_terdeteksi') {
      return result.diluarKonteksTanaman ? 'Foto bukan objek tanaman' : 'Objek belum terlihat jelas';
    }
    if (focus === 'penyakit') {
      return diseaseInfo?.penyakit || result.penyakitUtamaNama;
    }
    if (focus === 'hara') {
      return nutrientInfo?.dugaan || result.dugaanHaraNama;
    }
    return result.anjuranPanen === 'Panen sekarang'
      ? 'Panen sekarang'
      : `Tunggu ${result.estimasiHariMin}–${result.estimasiHariMax} hari`;
  }, [result, focus, diseaseInfo, nutrientInfo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920, margin: '0 auto', width: '100%' }}>
      {/* STEP 1: Langsung pilih tanaman & ambil/unggah foto (tanpa perlu memilih bagian manual) */}
      {stage === 'pick' && (
        <section
          className="card stagger-card"
          style={{
            background:
              'radial-gradient(circle at 96% 8%, rgba(216,243,106,0.18), transparent 44%), var(--surface)',
            padding: '24px 26px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
            <CermoMascot pose="scan" size={80} />
            <div style={{ flex: '1 1 260px' }}>
              <span className="t-micro" style={{ color: 'var(--leaf-600)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={13} /> Gemini Vision AI · Dataset Agronomi CermatTani
              </span>
              <h2 className="t-h2" style={{ marginTop: 2 }}>Scan foto tanaman</h2>
              <p className="t-small t-soft" style={{ marginTop: 3 }}>
                Langsung ambil foto buah, daun, atau batang dari kamera atau galeri. Cermo akan langsung memeriksa dan menampilkan panduan dari dataset agronomi.
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

          {/* Ambil Kamera atau Unggah Foto */}
          <div>
            <div className="field-label" style={{ marginBottom: 10 }}>
              Ambil foto langsung atau unggah dari perangkat (JPG, PNG, WebP, HEIC · maks 10 MB)
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
                background: dragActive ? 'var(--ok-bg)' : 'var(--surface-2)',
                borderRadius: 18,
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                Tarik foto ke sini atau klik untuk memilih gambar dari galeri/komputer
              </div>
              <p className="t-micro t-soft" style={{ marginTop: 4 }}>
                Tips: ambil di cahaya terang, jarak 20–40 cm, fokus pada buah, daun, atau batang yang ingin diperiksa.
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
      )}

      {/* LIVE CAMERA VIEWFINDER */}
      {stage === 'camera' && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h2 className="t-h2">Kamera langsung</h2>
              <p className="t-small t-soft">
                Arahkan kamera ke {targetPlant?.nama || 'tanaman'} dengan pencahayaan cukup.
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
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
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
              <Camera size={20} /> Ambil foto &amp; pindai
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

      {/* PROSES MEMINDAI */}
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
              Mencocokkan kondisi foto dengan dataset agronomi CermatTani.
            </p>
          </div>
        </section>
      )}

      {/* HASIL SCAN — TERFOKUS 100% DARI DATASET (TANPA MENYEBUT LOGIKA KONTEKS) */}
      {stage === 'result' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 1. Foto & Ringkasan Keputusan Utama */}
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
              {/* Foto + Kotak Deteksi (HANYA tampil untuk buah segar / kematangan) */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: 'var(--surface-milk)',
                }}
              >
                <img
                  src={result.fotoUrl}
                  alt={`Foto ${targetPlant?.nama || 'tanaman'}`}
                  style={{ width: '100%', display: 'block', aspectRatio: '16 / 10.5', objectFit: 'cover' }}
                />
                {focus === 'kematangan' &&
                  result.boxes.map((box, idx) => {
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
                          boxShadow: '0 0 0 1px #FFFFFF, 0 2px 10px rgba(0,0,0,0.3)',
                          animation: `boxPopIn 360ms cubic-bezier(.2,.8,.2,1) ${idx * 140}ms both`,
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
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          {ref.label} {box.confidence}%
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Ringkasan Utama */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CermoMascot
                    pose={
                      focus === 'penyakit' || focus === 'tidak_terdeteksi' || result.keyakinanRendah
                        ? 'worried'
                        : 'happy'
                    }
                    size={76}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="pill pill-neutral">{targetPlant?.nama}</span>
                      <span className="pill pill-ok">
                        Gemini AI · {aiModel || result.aiModel || 'Vision'}
                      </span>
                    </div>
                    {result.fotoUkuranAsliKb && result.fotoUkuranKompresKb && (
                      <div className="t-micro t-soft">
                        Kompresi foto: {result.fotoUkuranAsliKb} KB → {result.fotoUkuranKompresKb} KB
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="card-subtle"
                  style={{
                    borderLeft: `5px solid ${focus === 'tidak_terdeteksi'
                      ? 'var(--warn)'
                      : focus === 'penyakit'
                        ? 'var(--bad)'
                        : focus === 'hara'
                          ? 'var(--warn)'
                          : result.anjuranPanen === 'Panen sekarang'
                            ? 'var(--tomato-500)'
                            : 'var(--leaf-600)'
                      }`,
                  }}
                >
                  <div className="t-micro t-soft" style={{ fontWeight: 700 }}>
                    {focus === 'penyakit'
                      ? 'Hasil pemeriksaan penyakit'
                      : focus === 'hara'
                        ? 'Hasil pemeriksaan hara'
                        : 'Anjuran panen Cermo'}
                  </div>
                  <div className="t-display" style={{ marginTop: 4 }}>
                    {headlineTitle}
                  </div>
                  <div className="t-small t-soft" style={{ marginTop: 6 }}>
                    Seberapa yakin Cermo: <strong className="tabular-nums">{result.keyakinan}%</strong>
                  </div>
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
                          <FormattedText text={t} className="t-micro t-soft" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {focus === 'tidak_terdeteksi' && (
                  <div className="alert-card alert-card--warn">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>
                        {result.diluarKonteksTanaman
                          ? 'Foto ini terdeteksi bukan objek tanaman kebun.'
                          : 'Foto terlalu gelap atau objek tanaman belum tampak jelas.'}
                      </strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        {result.ringkasanAi ||
                          'Arahkan kamera 20–40 cm pada buah, daun, atau batang di tempat terang lalu pindai ulang.'}
                      </p>
                    </div>
                  </div>
                )}

                {result.keyakinanRendah && focus !== 'tidak_terdeteksi' && (
                  <div className="alert-card alert-card--warn" role="alert">
                    <ShieldAlert size={22} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>
                        Cermo belum cukup yakin ({result.keyakinan}% &lt; {state.settings.ambangKeyakinanRendah}%).
                      </strong>
                      <p className="t-small" style={{ marginTop: 4 }}>
                        Foto ulang di tempat terang dan konfirmasi juga ke penyuluh pertanian setempat sebelum bertindak.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 2A. OUTPUT KEMATANGAN BUAH (HANYA untuk buah segar: matang / setengah matang / mentah) */}
          {focus === 'kematangan' && ripenessInfo && (
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <h3 className="t-h2" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={20} color="var(--leaf-600)" /> Kematangan &amp; panen buah
                </h3>
                <span className="pill pill-ok">{ripenessInfo.anjuran}</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14,
                }}
              >
                <div className="card-subtle">
                  <div className="t-micro t-soft">Tahap kematangan</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span
                      className="ripeness-dot"
                      style={{ width: 14, height: 14, background: ripenessInfo.color }}
                    />
                    <span className="t-h2">{ripenessInfo.label}</span>
                  </div>
                  <p className="t-small t-soft" style={{ marginTop: 6 }}>
                    {ripenessInfo.ringkasan}
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
                    Dihitung dari {result.jumlahBuah} buah terdeteksi × bobot rata-rata{' '}
                    {targetPlant?.bobotRataBuahGram || 85} g ({targetPlant?.varietas}).
                  </p>
                </div>
              </div>

              <div className="alert-card alert-card--ok">
                <CheckCircle2 size={20} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
                <div>
                  <strong>Penanganan &amp; panen (Dataset Agronomi)</strong>
                  <p className="t-small" style={{ marginTop: 4 }}>
                    {ripenessInfo.penangananPascaPanen}
                  </p>
                  <p className="t-micro t-soft" style={{ marginTop: 6 }}>
                    Ciri acuan: {ripenessInfo.ciriVisual} · Sumber: {ripenessInfo.sumber}
                  </p>
                </div>
              </div>

              {result.estimasiDisesuaikanRiwayat && (
                <div className="card-subtle">
                  <div className="t-small">
                    <strong>Estimasi disesuaikan riwayat tanaman.</strong> Rentang hari panen memperhitungkan laju pematangan dari scan sebelumnya pada {targetPlant?.nama}.
                  </div>
                </div>
              )}

              {/* Info tambahan ringkas di bawah HANYA bila ada gejala penyakit kecil pada buah segar */}
              {minorDiseaseInfo && (
                <div
                  className="alert-card alert-card--warn"
                  style={{ marginTop: 4 }}
                >
                  <Info size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>Catatan tambahan: ditemukan tanda ringan {minorDiseaseInfo.penyakit}</strong>
                    </div>
                    <p className="t-small" style={{ marginTop: 4 }}>
                      {minorDiseaseInfo.gejala}
                    </p>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {minorDiseaseInfo.solusiOrganik.slice(0, 2).map((step, i) => (
                        <li key={i} className="t-micro">
                          {step}
                        </li>
                      ))}
                    </ul>
                    <p className="t-micro t-soft" style={{ marginTop: 6 }}>
                      Sumber: {minorDiseaseInfo.sumber}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 2B. OUTPUT BUSUK & PENYAKIT SAJA (HANYA untuk buah busuk / daun sakit / batang sakit — NOL kematangan!) */}
          {focus === 'penyakit' && diseaseInfo && (
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <h3 className="t-h2" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={20} color="var(--bad)" /> Diagnosa &amp; penanganan penyakit
                </h3>
                <span className="pill pill-bad">Dataset Agronomi</span>
              </div>

              <div className="card-subtle">
                <div className="t-small" style={{ fontWeight: 700, marginBottom: 10 }}>
                  3 kemungkinan teratas
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
                          ? '#419A68'
                          : idx === 0
                            ? '#D95F58'
                            : '#E8AC44'
                      }
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h4 className="t-h3">{diseaseInfo.penyakit}</h4>
                  <p className="t-small t-soft" style={{ marginTop: 4 }}>
                    <strong>Penyebab:</strong> {diseaseInfo.penyebab}
                  </p>
                  <p className="t-small t-soft" style={{ marginTop: 4 }}>
                    <strong>Gejala utama:</strong> {diseaseInfo.gejala}
                  </p>
                </div>

                <div className="alert-card alert-card--ok">
                  <Leaf size={22} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <strong>Solusi organik &amp; sanitasi kebun</strong>
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
            </section>
          )}

          {/* 2D. REFERENSI PORTAL RESMI AGRONOMI LIVE (Multi-Portal Se-Topik + Auto-Fallback) */}
          {focus !== 'tidak_terdeteksi' && (loadingExtRef || externalRef) && (
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <h3 className="t-h3" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
                  <BookOpen size={18} color="var(--leaf-600)" /> Pengetahuan Eksternal Terverifikasi
                </h3>
                {externalRef && (
                  <span className="pill pill-water">{externalRef.sumberLabel}</span>
                )}
              </div>

              {loadingExtRef && !externalRef ? (
                <p className="t-small t-soft loading-pulse">
                  Mencari &amp; memverifikasi portal resmi agronomi se-topik (UC IPM, EPPO, Cornell, OpenAlex, GBIF)...
                </p>
              ) : externalRef ? (
                <>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <strong className="t-small">{externalRef.judul}</strong>
                    {externalRef.taksonomi?.namaIlmiah && (
                      <span className="pill pill-neutral">
                        <em>{externalRef.taksonomi.namaIlmiah}</em>
                      </span>
                    )}
                    {externalRef.taksonomi?.famili && (
                      <span className="pill pill-ok">Famili: {externalRef.taksonomi.famili}</span>
                    )}
                  </div>
                  <FormattedText
                    text={externalRef.ringkasan}
                    className="t-small t-soft"
                    style={{ lineHeight: 1.55 }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(externalRef.tautanResmi && externalRef.tautanResmi.length > 0
                      ? externalRef.tautanResmi
                      : [
                          {
                            label: `Baca di ${externalRef.sumberLabel}`,
                            domain: '',
                            url: externalRef.sumberUrl,
                            kategori: 'panduan_resmi',
                            terverifikasiLive: true,
                          },
                        ]
                    ).map((link, idx) => (
                      <a
                        key={`${link.url}-${idx}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={idx === 0 ? 'btn-primary' : 'btn-secondary'}
                        style={{
                          minHeight: 36,
                          padding: '5px 12px',
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                        }}
                        title={link.domain ? `Buka portal resmi ${link.domain}` : undefined}
                      >
                        {link.label} <ExternalLink size={13} />
                      </a>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          )}

          {/* 2C. OUTPUT HARA & PUPUK (HANYA tampil otomatis jika benar-benar terdeteksi gejala kekurangan hara!) */}
          {nutrientInfo && (focus === 'hara' || result.adaGejalaHara) && (
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 className="t-h3" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <FlaskConical size={19} color="var(--leaf-600)" /> {nutrientInfo.dugaan}
                </h3>
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
                <Leaf size={20} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
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
                <p className="t-micro t-soft" style={{ marginTop: 8 }}>
                  Sumber: {nutrientInfo.sumber} · <strong>Bukan pengganti uji tanah.</strong>
                </p>
              </div>
            </section>
          )}

          {/* 3. INPUT TANYA LANJUTAN LANGSUNG KE CHATBOT CERMO (MEMBAWA DATA HASIL SCAN INI) */}
          <section
            className="card-forest"
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <CermoMascot pose="wave" size={58} interactive={false} />
              <div style={{ flex: '1 1 240px' }}>
                <h3 className="t-h3" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <MessageCircle size={18} color="var(--leaf-700)" /> Tanya lebih lanjut tentang hasil scan ini
                </h3>
                <p className="t-small t-soft" style={{ marginTop: 2 }}>
                  Tulis pertanyaanmu di bawah — data hasil scan ini otomatis dibawa ke ruang Chatbot Cermo supaya kamu bisa langsung diskusi lanjutan.
                </p>
              </div>
            </div>

            {followUpSuggestions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {followUpSuggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="btn-secondary"
                    style={{ minHeight: 36, padding: '5px 12px', fontSize: '0.82rem', borderRadius: 999 }}
                    onClick={() => handleAskFollowUp(q)}
                  >
                    {q} <ArrowRight size={13} />
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskFollowUp();
              }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
            >
              <input
                type="text"
                className="field-input"
                style={{ flex: '1 1 240px', background: 'var(--surface)' }}
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                placeholder="Contoh: Langkah apa yang harus kulakukan duluan hari ini?"
                aria-label="Tanya lanjutan ke Chatbot Cermo"
              />
              <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
                <Send size={17} /> {followUpQuestion.trim() ? 'Kirim ke Chatbot' : 'Lanjut ke Chatbot'}
              </button>
            </form>
          </section>

          {/* 4. Aksi Simpan, Kirim ke Telegram & Scan Lagi */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={savedToTimeline}
            >
              {savedToTimeline ? (
                <>
                  <Check size={18} /> Tersimpan di timeline
                </>
              ) : (
                'Simpan ke timeline'
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={tgShareBusy}
              onClick={async () => {
                if (!result) return;
                if (!state.user.telegramChatId) {
                  setTgShareStatus({
                    ok: false,
                    msg: 'Telegram belum tertaut. Sambungkan dulu di menu Kalender → tab Telegram.',
                  });
                  return;
                }
                setTgShareBusy(true);
                setTgShareStatus(null);
                const res = await shareScanToTelegram(result);
                setTgShareBusy(false);
                setTgShareStatus({ ok: res.ok, msg: res.message });
              }}
            >
              <Send size={16} />{' '}
              {tgShareBusy
                ? 'Mengirim ke Telegram...'
                : tgShareStatus?.ok
                  ? 'Terkirim ke Telegram ✓'
                  : 'Kirim ke Telegram'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setStage('pick');
                setResult(null);
                setFollowUpQuestion('');
                setTgShareStatus(null);
              }}
            >
              <RefreshCw size={18} /> Scan foto lain
            </button>
          </div>

          {tgShareStatus && (
            <div
              className={`alert-card ${tgShareStatus.ok ? 'alert-card--ok' : 'alert-card--warn'}`}
              role="status"
              style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
            >
              <div className="t-small">{tgShareStatus.msg}</div>
              {!state.user.telegramChatId && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.8rem' }}
                  onClick={() => setActiveScreen('kalender')}
                >
                  Sambungkan Telegram
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
