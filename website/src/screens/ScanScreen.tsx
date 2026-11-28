'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
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
  Zap,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { ScanPhotoExamples } from '../components/ScanPhotoExamples';
import { FertilizerRecommendation } from '../components/FertilizerRecommendation';
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

  // '' = "Tanaman lain / tidak ada di kebun" (default) — AI mengenali jenisnya sendiri
  const [selectedPlantId, setSelectedPlantId] = useState<string>(scanPreselectPlantId || '');
  const [stage, setStage] = useState<'pick' | 'camera' | 'scanning' | 'result'>('pick');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [previewFoto, setPreviewFoto] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [queueNotice, setQueueNotice] = useState<string>('');
  const [result, setResult] = useState<ScanRecord | null>(null);
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
    () => state.plants.find((p) => p.id === selectedPlantId) || null,
    [state.plants, selectedPlantId]
  );

  const startAnalysis = async (params: {
    fotoUrl: string;
    originalKb?: number;
    compressedKb?: number;
    /** Abaikan tanaman target (dipakai tombol "Pindai ulang tanpa tanaman target"). */
    noTarget?: boolean;
  }) => {
    const scanPlant = params.noTarget ? null : targetPlant;

    stopCameraStream();
    setUploadError('');
    setQueueNotice('');
    setSavedToTimeline(false);
    setTemuanVisual([]);
    setFollowUpQuestion('');

    if (isOffline) {
      if (!scanPlant) {
        setUploadError('Saat offline, pilih tanaman kebun dulu agar foto bisa masuk antrean analisis.');
        return;
      }
      enqueueOfflineScan({
        plantId: scanPlant.id,
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

    const prevScans = scanPlant ? state.scans.filter((s) => s.plantId === scanPlant.id) : [];

    try {
      const output = await runSmartPlantScan({
        plant: scanPlant,
        bagian: 'auto',
        fotoUrl: params.fotoUrl,
        originalKb: params.originalKb,
        compressedKb: params.compressedKb,
        sensorAvailable: state.sensor.sensorTersedia,
        lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
        previousPlantScans: prevScans,
      });

      setResult(output.record);
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
      // TypeError = jaringan putus ("Failed to fetch"): tampilkan pemberitahuan ramah, bukan pesan teknis
      setUploadError(
        err instanceof Error && !(err instanceof TypeError)
          ? err.message
          : 'Cermo belum bisa dihubungi. Periksa koneksi internetmu lalu coba pindai ulang ya.'
      );
    }
  };

  const handleCaptureCamera = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setUploadError('Kamera belum siap menampilkan gambar. Tunggu sebentar lalu coba klik "Ambil foto" lagi.');
      return;
    }

    // Potong frame persis seperti yang terlihat di preview (object-fit: cover, posisi tengah),
    // supaya objek yang dipaskan di kotak panduan tetap berada di posisi yang sama pada foto.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const viewW = video.clientWidth || vw;
    const viewH = video.clientHeight || vh;
    const viewRatio = viewW / viewH;
    const videoRatio = vw / vh;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (videoRatio > viewRatio) {
      sw = Math.round(vh * viewRatio);
      sx = Math.round((vw - sw) / 2);
    } else if (videoRatio < viewRatio) {
      sh = Math.round(vw / viewRatio);
      sy = Math.round((vh - sh) / 2);
    }

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCameraStream();

    const compressed = await compressDataUrlClient(rawDataUrl);
    await startAnalysis({
      fotoUrl: compressed.dataUrl,
      originalKb: compressed.originalKb,
      compressedKb: compressed.compressedKb,
    });
  };

  /* Foto ulang dari halaman hasil: bersihkan hasil lama lalu langsung buka kamera / pemilih file */
  const handleRetake = (mode: 'camera' | 'upload') => {
    setResult(null);
    setTemuanVisual([]);
    setFollowUpQuestion('');
    setTgShareStatus(null);
    setShowConfetti(false);
    setStage('pick');
    if (mode === 'camera') {
      void openLiveCamera(facingMode);
    } else {
      window.setTimeout(() => fileInputRef.current?.click(), 50);
    }
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
    if (!result || savedToTimeline || !result.plantId) return;
    saveScan(result);
    setSavedToTimeline(true);
  };

  // Kirim pertanyaan lanjutan + bawa seluruh data hasil scan langsung ke Chatbot Cermo
  const handleAskFollowUp = (questionText?: string) => {
    if (!result) return;
    if (!savedToTimeline && result.plantId) handleSave();
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
    if (result.jenisTidakSesuai) {
      const jenisTarget = (targetPlant?.varietas || targetPlant?.nama || 'tanaman pilihan').split(' ')[0].toLowerCase();
      const objek = (result.objekTeridentifikasi || 'tanaman lain').toLowerCase();
      return `Bukan ${jenisTarget}, ini ${objek}`;
    }
    if (focus === 'tidak_terdeteksi') {
      return result.diluarKonteksTanaman ? 'Foto bukan objek tanaman' : 'Objek belum terlihat jelas';
    }
    if (focus === 'penyakit') {
      if (result.penyakitUtamaId === 'sehat') {
        const panen = result.laporanKondisi?.kesiapanPanen;
        return panen && panen.status !== 'tidak_dinilai' && panen.label ? `Sehat · ${panen.label}` : 'Tanaman sehat';
      }
      return diseaseInfo?.penyakit || result.penyakitUtamaNama;
    }
    if (focus === 'hara') {
      return nutrientInfo?.dugaan || result.dugaanHaraNama;
    }
    return result.anjuranPanen === 'Panen sekarang'
      ? 'Panen sekarang'
      : `Tunggu ${result.estimasiHariMin}–${result.estimasiHariMax} hari`;
  }, [result, focus, diseaseInfo, nutrientInfo, targetPlant]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920, margin: '0 auto', width: '100%' }}>
      {/* STEP 1: Langsung pilih tanaman & ambil/unggah foto (tanpa perlu memilih bagian manual) */}
      {stage === 'pick' && (
        <section
          className="card stagger-card"
          style={{
            background:
              'radial-gradient(circle at 96% 8%, rgba(216,243,106,0.18), transparent 44%), var(--surface)',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
            <CermoMascot pose="scan" size={58} />
            <div style={{ flex: '1 1 260px' }}>
              <h2 className="t-h2" style={{ marginTop: 2 }}>Scan foto tanaman</h2>
              <p className="t-small t-soft" style={{ marginTop: 2 }}>
                Foto buah, daun, atau batang, lalu Cermo memeriksanya dengan panduan dataset agronomi.
              </p>
            </div>
          </div>

          {/* Pilih tanaman target */}
          <div className="field-group" style={{ marginBottom: 14 }}>
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
                <option value="">Tanaman lain / tidak ada di kebun</option>
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

          {/* Ambil foto: area drag & drop berisi tombol kamera/unggah (kiri) · contoh foto (kanan) */}
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Ambil foto tanaman
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
            />

            <div className="scan-pick-grid">
              <div
                className={`scan-drop ${dragActive ? 'scan-drop--active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDropFile}
              >
                <span className="scan-drop-icon" aria-hidden="true">
                  <Upload size={24} />
                </span>
                <div className="scan-drop-title">
                  {dragActive ? 'Lepaskan foto di sini' : 'Tarik & lepas foto ke sini'}
                </div>
                <p className="scan-drop-sub">atau pilih salah satu cara berikut</p>
                <div className="scan-drop-actions">
                  <button type="button" className="btn-tomato" onClick={() => void openLiveCamera(facingMode)}>
                    <Camera size={19} /> Buka kamera
                  </button>
                  <button type="button" className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={19} /> Unggah foto
                  </button>
                </div>
                <p className="scan-drop-meta">JPG, PNG, WebP, HEIC · maks 10 MB</p>
              </div>

              <ScanPhotoExamples />
            </div>

            {/* Keterangan AI hemat token (ringkas satu baris) */}
            <p className="scan-token-note" role="note">
              <span className="scan-token-note-icon" aria-hidden="true">
                <Zap size={14} />
              </span>
              <span>
                <strong>AI hemat token:</strong> foto dikompres di perangkat · mode gambar hemat · foto yang sama tidak
                dianalisis ulang (0 token) · jawaban JSON ringkas.
              </span>
            </p>
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
          {(() => {
            const isMismatch = Boolean(result.jenisTidakSesuai);
            const needsRetake = focus === 'tidak_terdeteksi' || result.keyakinanRendah;
            const isHealthy = focus === 'penyakit' && result.penyakitUtamaId === 'sehat';
            const tone = isMismatch || focus === 'tidak_terdeteksi' || focus === 'hara'
              ? 'warn'
              : focus === 'penyakit' && !isHealthy
                ? 'bad'
                : result.anjuranPanen === 'Panen sekarang'
                  ? 'harvest'
                  : 'ok';
            const kicker = isMismatch
              ? 'Jenis tanaman tidak sesuai'
              : isHealthy
                ? 'Hasil pemeriksaan kesehatan'
                : focus === 'penyakit'
                ? 'Hasil pemeriksaan penyakit'
                : focus === 'hara'
                  ? 'Hasil pemeriksaan hara'
                  : focus === 'tidak_terdeteksi'
                    ? result.diluarKonteksTanaman
                      ? 'Foto bukan tanaman'
                      : 'Foto kurang jelas'
                    : 'Anjuran panen Cermo';
            const StatusIcon = tone === 'warn' ? AlertTriangle : tone === 'bad' ? ShieldAlert : CheckCircle2;
            const explanation = isMismatch
              ? result.penjelasanJenis || result.ringkasanAi
              : focus === 'tidak_terdeteksi'
                ? result.ringkasanAi ||
                  'Arahkan kamera 20–40 cm pada buah, daun, atau batang di tempat terang lalu pindai ulang.'
                : !result.plantId && result.penjelasanJenis
                  ? result.penjelasanJenis
                  : result.ringkasanAi;
            const showConfidence = !isMismatch && focus !== 'tidak_terdeteksi';
            const jenisTarget = (targetPlant?.varietas || targetPlant?.nama || 'tanaman pilihan').split(' ')[0].toLowerCase();
            const objekLabel = (result.objekTeridentifikasi || 'tanaman lain').toLowerCase();
            const compareRows = isMismatch ? result.perbandinganJenis || [] : [];
            const report = !isMismatch && focus !== 'tidak_terdeteksi' ? result.laporanKondisi : null;
            const PANEN_LABEL = {
              siap: 'Siap panen',
              hampir: 'Hampir siap panen',
              belum: 'Belum siap panen',
              lewat: 'Lewat masa panen',
              tidak_dinilai: 'Belum bisa dinilai',
            } as const;
            const reportCards = report
              ? [
                  {
                    key: 'panen',
                    title: 'Kesiapan panen',
                    icon: <CalendarDays size={16} />,
                    tone:
                      report.kesiapanPanen.status === 'siap'
                        ? 'ok'
                        : report.kesiapanPanen.status === 'lewat'
                          ? 'bad'
                          : report.kesiapanPanen.status === 'tidak_dinilai'
                            ? 'neutral'
                            : 'warn',
                    label: report.kesiapanPanen.label || PANEN_LABEL[report.kesiapanPanen.status],
                    alasan: report.kesiapanPanen.alasan,
                  },
                  {
                    key: 'penyakit',
                    title: 'Risiko penyakit',
                    icon: <ShieldAlert size={16} />,
                    tone: report.risikoPenyakit.level === 'rendah' ? 'ok' : report.risikoPenyakit.level === 'sedang' ? 'warn' : 'bad',
                    label:
                      report.risikoPenyakit.label ||
                      `Risiko ${report.risikoPenyakit.level}`,
                    alasan: report.risikoPenyakit.alasan,
                  },
                  {
                    key: 'hara',
                    title: 'Kondisi hara',
                    icon: <FlaskConical size={16} />,
                    tone: report.kondisiHara.status === 'cukup' ? 'ok' : 'warn',
                    label: report.kondisiHara.label || (report.kondisiHara.status === 'cukup' ? 'Hara cukup' : 'Diduga kurang hara'),
                    alasan: report.kondisiHara.alasan,
                  },
                ]
              : [];

            return (
              <section className={`card scan-result scan-result--${tone}`}>
                <TomatoConfetti active={showConfetti} />

                <div className="scan-result-grid">
                  {/* Foto + kotak deteksi (hanya untuk buah segar / kematangan) */}
                  <div className="scan-result-photo">
                    {/* Frame mengikuti ukuran asli foto (tanpa crop) agar koordinat kotak (% foto) pas */}
                    <div className="scan-result-photo-frame">
                    <img src={result.fotoUrl} alt={`Foto ${targetPlant?.nama || 'tanaman'}`} />
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
                                top: box.y < 10 ? 4 : -26,
                                left: box.y < 10 ? 4 : -2,
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
                  </div>

                  {/* Ringkasan */}
                  <div className="scan-result-body">
                    <span className="scan-result-status">
                      <StatusIcon size={15} /> {kicker}
                    </span>

                    <h2 className="scan-result-title">{headlineTitle}</h2>

                    <div className="scan-result-tags">
                      <span className="scan-result-tag">
                        <span>Dipilih</span> {targetPlant?.nama || 'Tanaman lain'}
                      </span>
                      {result.objekTeridentifikasi && (
                        <span className={`scan-result-tag ${isMismatch ? 'scan-result-tag--warn' : ''}`}>
                          <span>Terdeteksi</span> {result.objekTeridentifikasi}
                        </span>
                      )}
                    </div>

                    {showConfidence && (
                      <div className="scan-result-confidence">
                        <span>Keyakinan Cermo</span>
                        <div className="scan-result-meter" aria-hidden="true">
                          <i style={{ width: `${result.keyakinan}%` }} />
                        </div>
                        <strong className="tabular-nums">{result.keyakinan}%</strong>
                      </div>
                    )}

                    {explanation && <p className="scan-result-text">{explanation}</p>}

                    {temuanVisual.length > 0 && !isMismatch && (
                      <div className="scan-result-findings">
                        <span className="scan-result-findings-title">Yang dilihat Cermo</span>
                        <ul>
                          {temuanVisual.map((t, idx) => (
                            <li key={idx}>
                              <Check size={13} />
                              <FormattedText text={t} className="t-small" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.keyakinanRendah && focus !== 'tidak_terdeteksi' && !isMismatch && (
                      <p className="scan-result-note" role="alert">
                        <ShieldAlert size={15} /> Cermo belum cukup yakin ({result.keyakinan}% &lt;{' '}
                        {state.settings.ambangKeyakinanRendah}%). Foto ulang di tempat terang dan konfirmasi ke penyuluh
                        setempat sebelum bertindak.
                      </p>
                    )}

                    <div className="scan-result-actions">
                      {isMismatch && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => {
                            setSelectedPlantId('');
                            void startAnalysis({
                              fotoUrl: result.fotoUrl,
                              originalKb: result.fotoUkuranAsliKb,
                              compressedKb: result.fotoUkuranKompresKb,
                              noTarget: true,
                            });
                          }}
                        >
                          <RefreshCw size={15} /> Pindai sebagai tanaman lain
                        </button>
                      )}
                      <button
                        type="button"
                        className={needsRetake && !isMismatch ? 'btn-tomato' : 'btn-secondary'}
                        onClick={() => handleRetake('camera')}
                      >
                        <Camera size={15} /> Foto ulang
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => handleRetake('upload')}>
                        <Upload size={15} /> Unggah foto lain
                      </button>
                    </div>

                    <div className="scan-result-foot">
                      <Sparkles size={12} />
                      {result.fotoUkuranAsliKb && result.fotoUkuranKompresKb
                        ? ` Foto ${result.fotoUkuranAsliKb} KB → ${result.fotoUkuranKompresKb} KB`
                        : ' Hemat token'}
                      {result.dariCache
                        ? ' · 0 token (hasil tersimpan)'
                        : result.tokenAi
                          ? ` · ${result.tokenAi.toLocaleString('id-ID')} token`
                          : ''}
                    </div>
                  </div>

                  {/* Laporan kondisi tanaman: panen · penyakit · hara · catatan lain (lebar penuh di bawah foto) */}
                  {report && (
                    <div className="scan-result-wide scan-report">
                      <span className="scan-result-findings-title">Laporan kondisi tanaman</span>
                      <div className="scan-report-grid">
                        {reportCards.map((card) => (
                          <div key={card.key} className={`scan-report-card scan-report-card--${card.tone}`}>
                            <span className="scan-report-head">
                              <span className="scan-report-icon">{card.icon}</span>
                              {card.title}
                            </span>
                            <strong className="scan-report-label">{card.label}</strong>
                            {card.alasan && <p className="scan-report-reason">{card.alasan}</p>}
                          </div>
                        ))}
                      </div>
                      {report.catatanLain.length > 0 && (
                        <div className="scan-report-notes">
                          <span className="scan-report-notes-title">
                            <Info size={14} /> Catatan lain
                          </span>
                          <ul>
                            {report.catatanLain.map((note, idx) => (
                              <li key={idx}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Jenis tidak sesuai: tabel perbandingan ciri + langkah selanjutnya (lebar penuh di bawah foto) */}
                  {isMismatch && (
                    <div className="scan-result-wide">
                      {compareRows.length > 0 && (
                        <div className="scan-compare" role="table" aria-label={`Perbandingan ${objekLabel} dan ${jenisTarget}`}>
                          <div className="scan-compare-row scan-compare-head" role="row">
                            <span role="columnheader">Ciri</span>
                            <span role="columnheader" className="scan-compare-photo">
                              Di foto: {objekLabel}
                            </span>
                            <span role="columnheader" className="scan-compare-target">
                              Ciri {jenisTarget}
                            </span>
                          </div>
                          {compareRows.map((row) => (
                            <div key={row.aspek} className="scan-compare-row" role="row">
                              <span role="cell" className="scan-compare-aspect">
                                {row.aspek}
                              </span>
                              <span role="cell" className="scan-compare-photo">
                                {row.diFoto || '—'}
                              </span>
                              <span role="cell" className="scan-compare-target">
                                {row.tanamanTarget || '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="scan-next">
                        <span className="scan-result-findings-title">Langkah selanjutnya</span>
                        <ol>
                          <li>
                            Ingin tahu kondisi {objekLabel} ini? Klik <strong>Pindai sebagai tanaman lain</strong>.
                          </li>
                          <li>
                            Ingin memeriksa {jenisTarget}? <strong>Foto ulang</strong> {jenisTarget} dari jarak 20–40 cm di
                            tempat terang.
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

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

          {/* 2C. REKOMENDASI PUPUK — tampil di setiap hasil scan tanaman (dari dataset, tanpa token AI tambahan) */}
          {!result.jenisTidakSesuai && focus !== 'tidak_terdeteksi' && (
            <FertilizerRecommendation
              haraId={result.adaGejalaHara && result.dugaanHaraId ? result.dugaanHaraId : 'cukup'}
              defaultPhase={
                targetPlant?.fase ||
                (result.bagian === 'buah' ? (result.tahapDominan === 'matang' ? 'Panen' : 'Berbuah') : 'Vegetatif')
              }
              plantName={targetPlant?.nama || (result.objekTeridentifikasi || 'tanaman').toLowerCase()}
              diseaseName={
                focus === 'penyakit' && result.penyakitUtamaId !== 'sehat'
                  ? diseaseInfo?.penyakit || result.penyakitUtamaNama
                  : null
              }
              withSensor={Boolean(result.pakaiDataSensor)}
            />
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
              disabled={savedToTimeline || !result.plantId}
              title={!result.plantId ? 'Pilih tanaman kebun saat memindai agar hasil bisa disimpan ke timeline' : undefined}
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
                    msg: 'Telegram belum tertaut. Sambungkan dulu di menu Pengaturan → Pengingat Telegram.',
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
                  onClick={() => setActiveScreen('pengaturan')}
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
