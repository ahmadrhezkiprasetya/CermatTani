'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Droplets,
  Leaf,
  LogIn,
  MessageCircle,
  Moon,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { PakCermatMascot, PakCermatPose } from '../components/PakCermatMascot';
import { StackedBarChart, StripedProgressBar } from '../components/Charts';
import { Reveal } from '../components/Reveal';
import { BedMapPreview } from '../components/BedMapPreview';
import { SiteFooter } from '../components/SiteFooter';
import GlassFolder, { type FolderFile } from '@/components/ui/glass-folder-cards';
import { ScreenId } from '../types/cermattani';

const NAV_SECTIONS = [
  { id: 'jalan-kami', label: 'Tentang' },
  { id: 'bukti-angka', label: 'Bukti Data' },
  { id: 'cara-kerja', label: 'Cara Kerja' },
  { id: 'fitur-unggulan', label: 'Fitur' },
] as const;

const FEATURE_CARDS: {
  id: string;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  target: 'scan' | 'dashboard';
  icon: 'camera' | 'sprout' | 'calendar' | 'sun' | 'chat' | 'droplets';
}[] = [
  {
    id: 'scan-ai',
    tag: 'Computer Vision',
    title: 'Scan Kematangan & Penyakit AI',
    desc: 'Periksa buah, daun, atau batang dari 1 foto untuk mengetahui kesiapan panen, 3 kemungkinan penyakit teratas, dan dugaan unsur hara.',
    cta: 'Coba Scan',
    target: 'scan',
    icon: 'camera',
  },
  {
    id: 'lahan-3d',
    tag: 'IoT & Visualisasi',
    title: 'Simulasi Lahan 3D & Sensor Tanah',
    desc: 'Pantau kelembapan tanah, suhu udara, intensitas cahaya, level air tandon, serta status pompa dalam peta lahan 3D interaktif.',
    cta: 'Lihat Lahan',
    target: 'dashboard',
    icon: 'sprout',
  },
  {
    id: 'kalender-panen',
    tag: 'Jadwal Otomatis',
    title: 'Kalender Panen & Pengingat Siram',
    desc: 'Perkiraan tanggal panen otomatis diperbarui dari riwayat scan, lengkap dengan jadwal siram pagi/sore dan cek bercak daun.',
    cta: 'Buka Kalender',
    target: 'dashboard',
    icon: 'calendar',
  },
  {
    id: 'energi-surya',
    tag: 'Panel Surya',
    title: 'Energi Surya & Pengaman Pompa',
    desc: 'Lacak daya baterai panel surya, aktifkan mode hemat otomatis saat mendung, dan lindungi pompa bila air tandon menipis.',
    cta: 'Cek Energi',
    target: 'dashboard',
    icon: 'sun',
  },
  {
    id: 'asisten-cermo',
    tag: 'Asisten Kebun',
    title: 'Tanya Cermo Berbasis Organik',
    desc: 'Diskusikan gejala tanaman dan takaran pupuk per fase tumbuh dengan anjuran sanitasi kebun serta bahan organik lebih dulu.',
    cta: 'Tanya Cermo',
    target: 'dashboard',
    icon: 'chat',
  },
  {
    id: 'notifikasi-telegram',
    tag: 'Integrasi Bot',
    title: 'Pengingat & Laporan via Telegram',
    desc: 'Hubungkan akun kebun ke bot Telegram untuk menerima pengingat jadwal harian, peringatan sensor kritis, dan ringkasan scan.',
    cta: 'Hubungkan Bot',
    target: 'dashboard',
    icon: 'droplets',
  },
];

const PAK_CERMAT_SHOWCASE: { pose: PakCermatPose; label: string; desc: string }[] = [
  { pose: 'tomat', label: 'Amati Tomat', desc: 'Menilai kematangan buah merah, setengah matang, hingga mentah.' },
  { pose: 'inspeksi', label: 'Inspeksi Daun', desc: 'Memeriksa bercak daun & tanda awal penyakit bersama kaca pembesar.' },
  { pose: 'bibit', label: 'Tanam Bibit', desc: 'Menyambut petani baru saat onboarding dan menambah tanaman pertama.' },
  { pose: 'tanah', label: 'Uji Tanah', desc: 'Memantau kelembapan tanah serta unsur hara N, P, K lahan.' },
  { pose: 'cabai', label: 'Multi-Tanaman', desc: 'Mendukung pencatatan tomat, cabai, selada, bayam, dan tanaman kebun.' },
  { pose: 'catat', label: 'Catat Timeline', desc: 'Menyusun jejak pertumbuhan, kalender panen, dan laporan CSV.' },
  { pose: 'analisis', label: 'Evaluasi Kebun', desc: 'Membantu menimbang keputusan panen dan pencegahan di musim lembap.' },
  { pose: 'jempol', label: 'Siap Panen', desc: 'Menandai hasil pemeriksaan sehat dan jadwal panen yang tersimpan.' },
];

const STACKED_DEMO = [
  { label: 'Mgg 1', matang: 6, setengah: 9, mentah: 14 },
  { label: 'Mgg 2', matang: 11, setengah: 12, mentah: 10 },
  { label: 'Mgg 3', matang: 15, setengah: 10, mentah: 8 },
  { label: 'Mgg 4', matang: 21, setengah: 11, mentah: 7 },
  { label: 'Mgg 5', matang: 24, setengah: 9, mentah: 6 },
];

type WorkflowSheetDetail = FolderFile & {
  detail: string;
  highlights: string[];
  ctaLabel: string;
  ctaTarget: 'scan' | 'dashboard';
};

const WORKFLOW_STEPS: {
  num: string;
  title: string;
  body: string;
  files: WorkflowSheetDetail[];
}[] = [
  {
    num: '01',
    title: 'Pilih Bagian & Foto',
    body: 'Pilih Buah, Daun, atau Batang lalu buka kamera langsung atau unggah foto. Gambar dikompres otomatis di ponsel.',
    files: [
      {
        name: 'Buah · Daun · Batang',
        meta: '3 fokus',
        detail:
          'Sebelum memotret, pilih bagian tanaman yang ingin diperiksa agar analisis AI tepat sasaran sesuai gejalanya.',
        highlights: [
          'Buah: menilai proporsi matang, setengah matang, dan mentah',
          'Daun: mendeteksi bercak jamur, virus, dan dugaan kurang hara',
          'Batang: memeriksa tanda layu atau busuk pangkal batang',
        ],
        ctaLabel: 'Coba pilih bagian & scan',
        ctaTarget: 'scan',
      },
      {
        name: 'Kamera / Unggah',
        meta: '20–30 cm',
        detail:
          'Ambil foto langsung dari kamera HP di bedengan atau unggah foto yang sudah tersimpan di galeri.',
        highlights: [
          'Jarak bidik ideal 20–30 cm agar warna dan bercak terlihat tajam',
          'Gunakan cahaya alami pagi atau sore tanpa bayangan menutupi daun',
          'Jika sinyal kebun putus, foto masuk antrean offline otomatis',
        ],
        ctaLabel: 'Buka kamera scan',
        ctaTarget: 'scan',
      },
      {
        name: 'Kompresi Otomatis',
        meta: '≤ 1,5 MB',
        detail:
          'Foto dari kamera ponsel otomatis diperkecil di perangkat sebelum diunggah sehingga proses tetap cepat dan hemat kuota.',
        highlights: [
          'Ukuran berkas ditekan hingga ≤ 1,5 MB tanpa menghilangkan detail bercak',
          'Tetap ringan dipakai pada jaringan 3G/4G di area lahan pertanian',
          'Riwayat foto tetap tersimpan rapi di akun kebunmu',
        ],
        ctaLabel: 'Coba unggah foto',
        ctaTarget: 'scan',
      },
    ],
  },
  {
    num: '02',
    title: 'Pak Cermat Memeriksa',
    body: 'AI menilai tahap kematangan, 3 kemungkinan penyakit teratas, dan dugaan kekurangan hara sambil menyebut tingkat keyakinan.',
    files: [
      {
        name: 'Tahap Kematangan',
        meta: 'Buah',
        detail:
          'Sistem mengelompokkan buah yang tertangkap kamera ke dalam tahap matang, setengah matang, dan mentah.',
        highlights: [
          'Menghitung jumlah buah tiap tahap kematangan dalam satu bidikan',
          'Memperkirakan rentang hari menuju panen optimal',
          'Menghitung estimasi bobot panen berdasarkan varietas tanaman',
        ],
        ctaLabel: 'Coba scan kematangan',
        ctaTarget: 'scan',
      },
      {
        name: '3 Penyakit Teratas',
        meta: 'Keyakinan %',
        detail:
          'Menampilkan 3 kemungkinan penyakit yang paling sesuai dengan gejala visual lengkap dengan tingkat keyakinannya.',
        highlights: [
          'Menyebutkan persentase keyakinan secara transparan pada setiap diagnosis',
          'Bila keyakinan rendah, sistem menyarankan foto ulang atau cek penyuluh',
          'Mempertimbangkan kelembapan udara sekitar untuk risiko jamur',
        ],
        ctaLabel: 'Periksa gejala daun',
        ctaTarget: 'scan',
      },
      {
        name: 'Dugaan Unsur Hara',
        meta: 'N · P · K',
        detail:
          'Membantu mengenali tanda awal kekurangan Nitrogen, Fosfor, atau Kalium dari pola warna daun sesuai fase tumbuh.',
        highlights: [
          'Menyesuaikan anjuran pupuk dengan fase vegetatif, berbunga, atau berbuah',
          'Mengutamakan bahan organik seperti kompos matang dan pupuk hayati',
          'Selalu mengingatkan bahwa AI bukan pengganti uji tanah laboratorium',
        ],
        ctaLabel: 'Cek kebutuhan hara',
        ctaTarget: 'scan',
      },
    ],
  },
  {
    num: '03',
    title: 'Aksi Organik & Jadwal Siram',
    body: 'Dapatkan anjuran panen besar, langkah organik lebih dulu, simpan ke timeline, dan aktifkan pengingat jadwal otomatis.',
    files: [
      {
        name: 'Anjuran Panen Besar',
        meta: 'Siap petik',
        detail:
          'Rangkuman keputusan panen yang langsung bisa diterapkan di kebun tanpa istilah teknis yang rumit.',
        highlights: [
          'Menampilkan status jelas: Siap Petik, Tunggu 2–4 Hari, atau Belum Siap',
          'Saran waktu petik pagi hari agar buah lebih segar dan tahan simpan',
          'Hasil panen aktual bisa dicatat untuk memperhalus estimasi berikutnya',
        ],
        ctaLabel: 'Lihat dasbor panen',
        ctaTarget: 'dashboard',
      },
      {
        name: 'Langkah Organik Dulu',
        meta: 'Sanitasi',
        detail:
          'Setiap rekomendasi penanganan penyakit disusun bertahap mulai dari cara paling aman bagi tanah dan lingkungan.',
        highlights: [
          'Tahap 1: sanitasi kebun, pangkas daun sakit, dan perbaiki sirkulasi udara',
          'Tahap 2: aplikasi agen hayati (Trichoderma) atau pestisida nabati',
          'Tahap 3: opsi kimiawi hanya sebagai langkah terakhir sesuai label produk',
        ],
        ctaLabel: 'Coba rekomendasi organik',
        ctaTarget: 'scan',
      },
      {
        name: 'Timeline & Pengingat',
        meta: 'Otomatis',
        detail:
          'Setiap hasil pemeriksaan otomatis tercatat di timeline tanaman, memperbarui kalender panen, dan dapat mengirim pengingat berkala.',
        highlights: [
          'Riwayat foto & kondisi tanaman tersusun kronologis per petak/tanaman',
          'Kalender panen otomatis menghitung jadwal petik dari hasil scan terbaru',
          'Pengingat siram pagi/sore & peringatan sensor kritis bisa terhubung ke Telegram',
        ],
        ctaLabel: 'Buka dasbor & jadwal',
        ctaTarget: 'dashboard',
      },
    ],
  },
];

/* Halaman Publik Terpadu — Palet Botanical Forest & Soft Mint selaras 100% dengan Dasbor Pengguna */
export const LandingScreen: React.FC = () => {
  const {
    setActiveScreen,
    openScanWith,
    openLogin,
    authUser,
    state,
    completeOnboarding,
    updateSettings,
  } = useApp();
  const [selectedPoseIdx, setSelectedPoseIdx] = useState(0);
  const [openStepIdx, setOpenStepIdx] = useState<number | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<{
    stepIdx: number;
    fileIdx: number;
  } | null>(null);
  const [activeNavId, setActiveNavId] = useState<string>('jalan-kami');

  // Popup info lembar: tutup dengan Esc & kunci scroll halaman selama terbuka
  useEffect(() => {
    if (!selectedSheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSheet(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedSheet]);
  const [isDarkTone, setIsDarkTone] = useState(false);
  const [featurePaused, setFeaturePaused] = useState(false);
  const featureTrackRef = useRef<HTMLDivElement | null>(null);
  const featureHoverRef = useRef(false);

  // Auto-scroll horizontal halus & tak terputus untuk daftar kartu fitur
  useEffect(() => {
    const el = featureTrackRef.current;
    if (!el || featurePaused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();
    const speedPxPerSec = 42;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (!featureHoverRef.current && el) {
        el.scrollLeft += speedPxPerSec * dt;
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [featurePaused]);

  const scrollFeaturesBy = (delta: number) => {
    const el = featureTrackRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (delta < 0 && el.scrollLeft <= 12 && half > 0) {
      el.scrollLeft += half;
    }
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    const syncTone = () => {
      const dark =
        state.settings.tema === 'dark' ||
        (state.settings.tema === 'system' &&
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-color-scheme: dark)').matches);
      setIsDarkTone(Boolean(dark));
    };
    syncTone();
  }, [state.settings.tema]);

  // Scroll-spy halus untuk menyorot menu aktif di bilah navigasi
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveNavId(visible.target.id);
        }
      },
      { threshold: [0.2, 0.45], rootMargin: '-18% 0px -48% 0px' }
    );

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const isDark =
      state.settings.tema === 'dark' ||
      (state.settings.tema === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    updateSettings({ tema: isDark ? 'light' : 'dark' });
  };

  const enterDashboard = () => {
    if (!authUser) {
      openLogin('beranda');
      return;
    }
    if (!state.onboarded) {
      completeOnboarding({ goToScan: false });
    } else {
      setActiveScreen('beranda');
    }
  };

  const enterScan = () => {
    if (!authUser) {
      openLogin('scan');
      return;
    }
    if (!state.onboarded) {
      completeOnboarding({ goToScan: true });
    } else {
      openScanWith('buah');
    }
  };

  const activePose = PAK_CERMAT_SHOWCASE[selectedPoseIdx] || PAK_CERMAT_SHOWCASE[0];

  const renderFeatureIcon = (icon: (typeof FEATURE_CARDS)[number]['icon']) => {
    switch (icon) {
      case 'camera':
        return <Camera size={20} />;
      case 'sprout':
        return <Sprout size={20} />;
      case 'calendar':
        return <CalendarDays size={20} />;
      case 'sun':
        return <Sun size={20} />;
      case 'chat':
        return <MessageCircle size={20} />;
      case 'droplets':
      default:
        return <Droplets size={20} />;
    }
  };

  return (
    <div className="landing-shell">
      <a href="#konten-utama" className="skip-link">
        Lewati ke isi utama
      </a>

      {/* Navigasi Pil Bersih (Konsisten dengan Topbar Aplikasi) */}
      <header className="landing-nav-bar">
        <div className="landing-container landing-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PakCermatMascot pose="tomat" height={44} />
            <div>
              <div className="font-display" style={{ fontSize: '1.28rem', fontWeight: 600, lineHeight: 1.05, color: 'var(--ink)' }}>
                CermatTani
              </div>
              <div className="t-micro t-soft landing-brand-tagline">
                Cermat memeriksa, tepat memutuskan
              </div>
            </div>
          </div>

          <nav className="landing-nav-pills" aria-label="Navigasi halaman utama">
            {NAV_SECTIONS.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveNavId(sec.id)}
                className={`landing-nav-link ${activeNavId === sec.id ? 'active' : ''}`}
              >
                {sec.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Ganti mode terang atau gelap"
              title="Ganti tema terang/gelap"
            >
              {state.settings.tema === 'dark' ? (
                <Sun size={18} strokeWidth={1.75} />
              ) : (
                <Moon size={18} strokeWidth={1.75} />
              )}
            </button>
            <button type="button" className="ct-btn-dark" onClick={enterDashboard}>
              <span>{authUser ? 'Buka Dasbor' : 'Login'}</span>
              <span className="ct-btn-dark-circle">
                {authUser ? <ArrowUpRight size={18} /> : <LogIn size={16} />}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main id="konten-utama">
        {/* SEKSI 1: HERO — Editorial Foto Lahan + Strip Metrik Tanpa Kotak + Kartu Pengamatan Kebun */}
        <section className="landing-section" style={{ paddingTop: 22, paddingBottom: 38 }}>
          <div className="landing-container">
            <div className="landing-hero-card">
              <img
                src="/images/hero-tomato-farm.jpg"
                alt="Kebun tomat sehat di pagi hari dengan sinar matahari hangat"
                className="landing-hero-bg"
              />
              <div className="landing-hero-scrim" aria-hidden="true" />

              {/* Bar Atas Editorial */}
              <div className="lp-hero-topbar hero-stagger-1">
                <span className="lp-hero-kicker">
                  <i className="lp-hero-dot" aria-hidden="true" />
                  CermatTani · Budidaya Tomat &amp; Hortikultura
                </span>
                <span className="lp-hero-stamp">
                  Kamera Ponsel · IoT Surya
                </span>
              </div>

              {/* Konten Utama Kiri */}
              <div className="lp-hero-main">
                <h1 className="lp-hero-title hero-stagger-2">
                  <strong>Cermat memeriksa,</strong>
                  <span>tepat memutuskan di kebunmu.</span>
                </h1>

                <p className="lp-hero-sub hero-stagger-3">
                  Satu foto dari ponsel untuk mengetahui kapan buah siap dipanen, mengenali gejala
                  penyakit dengan solusi organik lebih dulu, dan memantau kelembapan tanah serta
                  irigasi bertenaga surya.
                </p>

                <div className="lp-hero-actions hero-stagger-4">
                  <button type="button" className="btn-tomato lp-hero-btn-primary" onClick={enterScan}>
                    <Camera size={18} /> Coba Scan Tanaman
                  </button>
                  <button type="button" className="hero-cta-ghost" onClick={enterDashboard}>
                    <span>{authUser ? 'Masuk ke Dasbor Kebun' : 'Login / Daftar Akun'}</span>
                    {authUser ? <ArrowUpRight size={17} /> : <LogIn size={16} />}
                  </button>
                </div>
              </div>

              {/* Bar Bawah: Strip Metrik Editorial (tanpa kotak-kotak) + Kartu Pengamatan Lapangan */}
              <div className="landing-hero-bottom hero-stagger-4">
                <dl className="lp-hero-metrics" aria-label="Ringkasan kemampuan lapangan">
                  <div>
                    <dt>Hasil dari 1 foto</dt>
                    <dd>±5 dtk</dd>
                  </div>
                  <div>
                    <dt>Buah, daun &amp; batang</dt>
                    <dd>3 Fokus</dd>
                  </div>
                  <div>
                    <dt>Sanitasi &amp; hayati dulu</dt>
                    <dd>Organik</dd>
                  </div>
                </dl>

                <div className="lp-hero-obs-card">
                  <div className="lp-hero-obs-head">
                    <span className="lp-hero-obs-loc">BLOK A · TOMAT SERVO F1</span>
                    <span className="lp-hero-obs-status">Siap petik 2–3 hari</span>
                  </div>

                  <div className="lp-hero-obs-bar" aria-hidden="true">
                    <i style={{ width: '64%', background: 'var(--fruit-ripe)' }} />
                    <i style={{ width: '24%', background: 'var(--fruit-mid)' }} />
                    <i style={{ width: '12%', background: 'var(--fruit-raw)' }} />
                  </div>

                  <div className="lp-hero-obs-foot">
                    <PakCermatMascot pose="tomat" height={54} />
                    <div className="lp-hero-obs-copy">
                      <strong>14 buah terdeteksi · ±1,19 kg</strong>
                      <span>Coba scan kematangan &amp; simulasi 3D</span>
                    </div>
                    <button
                      type="button"
                      onClick={enterScan}
                      aria-label="Mulai scan tanaman"
                      className="lp-hero-obs-go"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEKSI 2: JALAN KAMI — Editorial tengah + 2 kartu maskot seragam */}
        <section id="jalan-kami" className="landing-section">
          <div className="landing-container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 28,
                alignItems: 'center',
              }}
            >
              <Reveal delay={40}>
                <div
                  style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <PakCermatMascot pose="bibit" height={190} />
                  <span className="pill pill-ok">Dari bibit hingga panen</span>
                </div>
              </Reveal>

              <Reveal delay={110}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <span className="t-eyebrow" style={{ color: 'var(--leaf-600)' }}>
                    Jalan Kami · CermatTani
                  </span>
                  <h2 className="t-editorial-sub" style={{ color: 'var(--ink)' }}>
                    Teknologi kebun yang <strong>ramah, jujur, dan langsung bisa dipakai.</strong>
                  </h2>
                  <p className="t-body" style={{ color: 'var(--ink)' }}>
                    Banyak petani dan pelaku urban farming kehilangan hasil karena terlambat memetik
                    buah atau baru menyadari bercak daun setelah menyebar. CermatTani hadir untuk
                    memberi <strong>keputusan tindakan dalam 5 detik</strong> tanpa istilah teknis
                    yang membingungkan.
                  </p>
                  <p className="t-body t-soft">
                    Didukung <strong>pemantauan tanah &amp; irigasi bertenaga surya</strong>, setiap
                    data simulasi ditandai jujur dan setiap saran penyakit mendahulukan cara organik
                    serta arahan penyuluh pertanian.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={180}>
                <div
                  style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <PakCermatMascot pose="cabai" height={190} />
                  <span className="pill pill-warn">Tomat, cabai &amp; sayuran</span>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SEKSI 3: BUKTI DALAM ANGKA — Wadah Hutan Gelap Terpadu + Grafik Batang Bertumpuk + Kartu CTA Lime */}
        <section id="bukti-angka" className="landing-section">
          <div className="landing-container">
            <Reveal>
              <div className="landing-night-box">
                <div className="landing-night-grid">
                  {/* Kiri: Judul + denah kebun + batang progres cerah */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="t-eyebrow" style={{ color: 'var(--leaf-600)' }}>
                        Bukti dalam Angka
                      </span>
                      <span className="pill pill-sim">Simulasi</span>
                    </div>
                    <h2 className="t-editorial-sub" style={{ color: 'var(--ink)' }}>
                      Memantau <strong>kematangan &amp; kondisi lahan</strong> dalam satu layar.
                    </h2>
                    <p className="t-small t-soft">
                      Ringkasan contoh data kebun percontohan sebelum angka uji lapangan resmi tim
                      dipublikasikan.
                    </p>

                    {/* Peta bedengan interaktif: status tiap tanaman (sorot/ketuk untuk detail) */}
                    <BedMapPreview />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <StripedProgressBar
                        label="Kesiapan panen kebun aktif"
                        valueLabel="78%"
                        percent={78}
                        color="var(--fruit-mid)"
                      />
                      <StripedProgressBar
                        label="Kelembapan tanah ideal (sensor simulasi)"
                        valueLabel="64%"
                        percent={64}
                        color="var(--water)"
                      />
                      <StripedProgressBar
                        label="Cadangan daya baterai surya"
                        valueLabel="84%"
                        percent={84}
                        color="var(--leaf-500)"
                      />
                    </div>
                  </div>

                  {/* Kanan: Kartu Permukaan Terpadu berisi Grafik Batang Bertumpuk */}
                  <div
                    className="card"
                    style={{
                      borderRadius: 24,
                      padding: 26,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 18,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 className="t-h3">Tomat matang naik tiap minggu</h3>
                        <span className="pill pill-warn">Estimasi kasar</span>
                      </div>
                      <p className="t-small t-soft" style={{ marginTop: 4 }}>
                        Distribusi buah terdeteksi per tahap kematangan (klik batang untuk rincian).
                      </p>
                    </div>

                    <StackedBarChart data={STACKED_DEMO} unit="buah" />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10 }}>
                      <div className="card-subtle" style={{ padding: '10px 12px' }}>
                        <div className="t-micro t-soft">Target respon</div>
                        <div className="font-display" style={{ fontSize: '1.3rem', color: 'var(--ink)' }}>≤ 5 dtk</div>
                      </div>
                      <div className="card-subtle" style={{ padding: '10px 12px' }}>
                        <div className="t-micro t-soft">Kompresi foto</div>
                        <div className="font-display" style={{ fontSize: '1.3rem', color: 'var(--ink)' }}>≤ 1,5 MB</div>
                      </div>
                      <div className="card-subtle" style={{ padding: '10px 12px' }}>
                        <div className="t-micro t-soft">Mode gelap</div>
                        <div className="font-display" style={{ fontSize: '1.3rem', color: 'var(--ink)' }}>WCAG AA</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kartu CTA Lime Terpadu (serasi dengan aksen sidebar & dasbor) */}
                <div className="butter-cta-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      {(['tomat', 'bibit', 'jempol'] as const).map((pose) => (
                        <PakCermatMascot key={pose} pose={pose} height={54} />
                      ))}
                    </div>
                    <div>
                      <h3 className="t-h2" style={{ color: 'var(--ink)' }}>
                        Mulai kelola kebun atau ajak kelompok tanimu
                      </h3>
                      <p className="t-small t-soft" style={{ marginTop: 2 }}>
                        Langsung coba dasbor kebun, scan foto nyata, simulasi 3D, dan pengingat jadwal siram.
                      </p>
                    </div>
                  </div>

                  <button type="button" className="ct-btn-dark" onClick={enterDashboard}>
                    <span>Buka Dasbor CermatTani</span>
                    <span className="ct-btn-dark-circle">
                      <ArrowUpRight size={18} />
                    </span>
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* SEKSI 4: CARA KERJA — Kartu Glass Folder 1 warna solid */}
        <section id="cara-kerja" className="landing-section">
          <div className="landing-container">
            <Reveal>
              <div className="lp-workflow-card">
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
                    <div style={{ maxWidth: 560 }}>
                      <span className="t-eyebrow" style={{ color: 'var(--leaf-600)' }}>
                        Cara Kerja
                      </span>
                      <h2 className="t-editorial-sub" style={{ color: 'var(--ink)', marginTop: 6 }}>
                        Dari <strong>satu foto di kebun</strong> ke langkah perawatan yang jelas.
                      </h2>
                    </div>

                    <div
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 18,
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        boxShadow: 'var(--shadow-1)',
                      }}
                    >
                      <PakCermatMascot pose="inspeksi" height={64} />
                      <div>
                        <div className="t-micro" style={{ color: 'var(--leaf-600)' }}>Panduan Jarak Bidik</div>
                        <div className="t-small" style={{ color: 'var(--ink)', fontWeight: 700 }}>
                          20–30 cm · Cahaya terang
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3 Kartu Langkah dengan UI Glass Folder Cards (1 warna solid hijau CermatTani) */}
                  <div className="lp-folder-grid">
                    {WORKFLOW_STEPS.map((s, idx) => {
                      const isOpen = openStepIdx === idx;
                      return (
                        <div
                          key={s.num}
                          className={`lp-folder-slot ${isOpen ? 'is-open' : ''}`}
                        >
                          <div className="lp-folder-stage">
                            <GlassFolder
                              className="lp-solid-folder"
                              label={s.title}
                              meta={`Langkah ${s.num}`}
                              tone={isDarkTone ? 'dark' : 'light'}
                              art="none"
                              files={s.files}
                              action="none"
                              labelPlacement="bottom-left"
                              width={292}
                              appearDelay={idx * 120}
                              open={isOpen}
                              onOpenChange={(next) => {
                                setOpenStepIdx(next ? idx : null);
                              }}
                              onFileSelect={(_file, fileIdx) => {
                                setOpenStepIdx(idx);
                                setSelectedSheet({ stepIdx: idx, fileIdx });
                              }}
                            />
                          </div>
                          <p className="t-small t-soft lp-folder-desc">{s.body}</p>
                        </div>
                      );
                    })}
                  </div>

                  {selectedSheet &&
                    WORKFLOW_STEPS[selectedSheet.stepIdx]?.files[selectedSheet.fileIdx] && (() => {
                      const stepInfo = WORKFLOW_STEPS[selectedSheet.stepIdx];
                      const sheetInfo = stepInfo.files[selectedSheet.fileIdx];
                      // Portal ke <body>: popup selalu di tengah layar (tidak ikut transform animasi seksi)
                      return createPortal(
                        <div
                          className="modal-backdrop lp-sheet-backdrop"
                          onClick={() => setSelectedSheet(null)}
                          role="dialog"
                          aria-modal="true"
                          aria-label={`Info ${sheetInfo.name}`}
                        >
                        <div
                          key={`${selectedSheet.stepIdx}-${selectedSheet.fileIdx}`}
                          className="lp-sheet-detail-card lp-sheet-modal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="lp-sheet-detail-head">
                            <div className="lp-sheet-detail-badges">
                              <span className="pill pill-ok">
                                Langkah {stepInfo.num} · {stepInfo.title}
                              </span>
                              {sheetInfo.meta && (
                                <span className="pill pill-neutral">{sheetInfo.meta}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="lp-sheet-detail-close"
                              onClick={() => setSelectedSheet(null)}
                              aria-label="Tutup info rincian"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="lp-sheet-detail-body">
                            <div className="lp-sheet-detail-main">
                              <h3 className="t-h3" style={{ color: 'var(--ink)' }}>
                                {sheetInfo.name}
                              </h3>
                              <p className="t-small t-soft" style={{ marginTop: 4 }}>
                                {sheetInfo.detail}
                              </p>
                              <ul className="lp-sheet-detail-list">
                                {sheetInfo.highlights.map((point) => (
                                  <li key={point}>
                                    <CheckCircle2 size={15} />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="lp-sheet-detail-action">
                              <button
                                type="button"
                                className="ct-btn-dark"
                                onClick={sheetInfo.ctaTarget === 'scan' ? enterScan : enterDashboard}
                              >
                                <span>{sheetInfo.ctaLabel}</span>
                                <span className="ct-btn-dark-circle">
                                  <ArrowUpRight size={17} />
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                        </div>,
                        document.body
                      );
                    })()}

                  <p className="lp-folder-hint">
                    Sorot folder untuk mengintip · Klik folder untuk membuka · Klik lembar di dalamnya untuk melihat info
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* SEKSI 5: PAK CERMAT MENYAPA — Galeri Interaktif 8 Pose Maskot */}
        <section className="landing-section">
          <div className="landing-container">
            <Reveal>
              <div
                className="card"
                style={{
                  borderRadius: 'var(--r-hero)',
                  padding: '38px 34px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 28,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 24,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div key={activePose.pose} className="pose-swap">
                      <PakCermatMascot pose={activePose.pose} height={220} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <span className="t-eyebrow" style={{ color: 'var(--leaf-600)' }}>
                      Pak Cermat Menyapa · 8 Pose Pendamping
                    </span>
                    <h2 className="t-editorial-sub" style={{ color: 'var(--ink)' }}>
                      <strong>Pak Cermat</strong> menemani langkah awalmu hingga panen di kebun.
                    </h2>
                    <p key={`desc-${activePose.pose}`} className="t-body t-soft step-transition">
                      <strong style={{ color: 'var(--ink)' }}>{activePose.label}:</strong> {activePose.desc}
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                      <button
                        type="button"
                        className="ct-btn-dark"
                        onClick={() => {
                          if (!state.onboarded) completeOnboarding({ goToScan: false });
                          setActiveScreen('cermo');
                        }}
                      >
                        <span>Tanya Asisten CermatTani</span>
                        <span className="ct-btn-dark-circle">
                          <ArrowUpRight size={18} />
                        </span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <PakCermatMascot pose="jempol" height={190} />
                  </div>
                </div>

                {/* Pemilih 8 pose Pak Cermat */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                  {PAK_CERMAT_SHOWCASE.map((item, idx) => {
                    const active = idx === selectedPoseIdx;
                    return (
                      <button
                        key={item.pose}
                        type="button"
                        onClick={() => setSelectedPoseIdx(idx)}
                        className="pose-chip-btn"
                        style={{
                          border: active ? '2px solid var(--leaf-600)' : '1.5px solid var(--line)',
                          background: active ? 'var(--lime-300)' : 'var(--surface-2)',
                          borderRadius: 16,
                          padding: '10px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <PakCermatMascot pose={item.pose} height={66} />
                        <span
                          className="t-micro"
                          style={{
                            color: active ? 'var(--on-lime)' : 'var(--ink)',
                            textAlign: 'center',
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* SEKSI 6: FITUR-FITUR CERMATTANI — Auto-scroll horizontal halus ke samping */}
        <section id="fitur-unggulan" className="landing-section">
          <div className="landing-container">
            <Reveal>
              <div className="values-panel lp-features-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <span className="t-eyebrow" style={{ color: 'var(--leaf-600)' }}>
                      Fitur-Fitur CermatTani
                    </span>
                    <h2 className="t-editorial-sub" style={{ color: 'var(--ink)', marginTop: 4 }}>
                      Semua alat kebun untuk <strong>memantau, mendiagnosis, dan merawat</strong> tanaman.
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="carousel-circle-btn"
                      aria-label={featurePaused ? 'Lanjutkan gulir otomatis' : 'Jeda gulir otomatis'}
                      title={featurePaused ? 'Lanjutkan auto-scroll' : 'Jeda auto-scroll'}
                      onClick={() => setFeaturePaused((p) => !p)}
                    >
                      {featurePaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <button
                      type="button"
                      className="carousel-circle-btn"
                      aria-label="Geser fitur ke kiri"
                      onClick={() => scrollFeaturesBy(-340)}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="carousel-circle-btn carousel-circle-btn--active"
                      aria-label="Geser fitur ke kanan"
                      onClick={() => scrollFeaturesBy(340)}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                <div
                  ref={featureTrackRef}
                  className="lp-features-marquee"
                  onMouseEnter={() => {
                    featureHoverRef.current = true;
                  }}
                  onMouseLeave={() => {
                    featureHoverRef.current = false;
                  }}
                  onFocus={() => {
                    featureHoverRef.current = true;
                  }}
                  onBlur={() => {
                    featureHoverRef.current = false;
                  }}
                  onTouchStart={() => {
                    featureHoverRef.current = true;
                  }}
                  onTouchEnd={() => {
                    featureHoverRef.current = false;
                  }}
                  aria-label="Daftar fitur CermatTani"
                >
                  {[...FEATURE_CARDS, ...FEATURE_CARDS].map((card, i) => {
                    const isAccent = i % 2 === 1;
                    return (
                      <article
                        key={`${card.id}-${i}`}
                        className={`value-card lp-feature-slide ${isAccent ? 'value-card--dark' : ''}`}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div className="lp-feature-slide-top">
                            <span className="lp-feature-icon-box">
                              {renderFeatureIcon(card.icon)}
                            </span>
                            <span className={isAccent ? 'value-tag-dark' : 'pill pill-ok'}>
                              {card.tag}
                            </span>
                          </div>
                          <h3 className="t-h2" style={{ color: 'var(--ink)' }}>
                            {card.title}
                          </h3>
                          <p className="t-small t-soft">{card.desc}</p>
                        </div>

                        <button
                          type="button"
                          className="lp-feature-slide-link"
                          onClick={card.target === 'scan' ? enterScan : enterDashboard}
                        >
                          <span>{card.cta}</span>
                          <ArrowUpRight size={15} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter authenticated={Boolean(authUser)} onStart={enterDashboard} />
    </div>
  );
};
