'use client';

import React, { useEffect, useState } from 'react';
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
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { PakCermatMascot, PakCermatPose } from '../components/PakCermatMascot';
import { StackedBarChart, StripedProgressBar } from '../components/Charts';
import { Reveal } from '../components/Reveal';
import { BedMapPreview } from '../components/BedMapPreview';
import { SiteFooter } from '../components/SiteFooter';
import { ScreenId } from '../types/cermattani';

const NAV_SECTIONS = [
  { id: 'jalan-kami', label: 'Tentang' },
  { id: 'bukti-angka', label: 'Bukti Data' },
  { id: 'cara-kerja', label: 'Cara Kerja' },
  { id: 'nilai-kami', label: 'Nilai Kami' },
  { id: 'fitur-lengkap', label: '13 Fitur' },
] as const;

const VALUE_CARDS = [
  {
    id: 'honest',
    title: 'Jujur Soal Batas AI & Sensor',
    desc: 'Data simulasi selalu berlabel ungu yang jelas, tingkat keyakinan rendah memicu peringatan, dan setiap rekomendasi pupuk mengingatkan bahwa sistem bukan pengganti uji tanah.',
    tags: ['Lencana Simulasi', 'Transparan', 'Konfirmasi Penyuluh'],
  },
  {
    id: 'organic',
    title: 'Solusi Organik Lebih Dulu',
    desc: 'Saat gejala penyakit daun atau kekurangan hara terdeteksi, CermatTani selalu mengutamakan sanitasi kebun, agen hayati, dan pupuk organik sebelum opsi kimiawi sebagai langkah terakhir.',
    tags: ['Organik Utama', 'Aman Lingkungan', 'Baca Label Produk'],
  },
  {
    id: 'field',
    title: 'Terbaca di Bawah Terik Matahari',
    desc: 'Dirancang dengan kontras WCAG 2.2 AA, target sentuh minimal 48 px yang nyaman di lahan, bahasa tindakan sehari-hari tanpa istilah rumit, serta antrean otomatis saat sinyal lemah.',
    tags: ['WCAG 2.2 AA', 'Target ≥ 48 px', 'Siap Sinyal Lemah'],
  },
  {
    id: 'dual',
    title: 'Pendamping Petani di Setiap Langkah',
    desc: 'Maskot Pak Cermat hadir dalam 8 pose ekspresif yang mendampingi dari halaman utama, proses scan foto, analisis penyakit & hara, hingga obrolan asisten kebun.',
    tags: ['8 Pose Maskot', 'Pak Cermat', 'Bahasa Petani'],
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

const PHOTO_FEATURES: {
  code: string;
  title: string;
  desc: string;
  target: ScreenId;
  icon: React.FC<{ size?: number }>;
}[] = [
  { code: 'F1', title: 'Kematangan & Hari Panen', desc: 'Deteksi buah mentah, setengah matang, dan matang lengkap dengan estimasi hari petik.', target: 'scan', icon: Sparkles },
  { code: 'F2', title: 'Deteksi Penyakit Daun', desc: 'Peringkat 3 kemungkinan teratas dengan solusi organik lebih dulu & opsi kimia terakhir.', target: 'scan', icon: ShieldCheck },
  { code: 'F3', title: 'Dugaan Hara & Pupuk', desc: 'Rekomendasi takaran per fase tumbuh dengan label dugaan visual vs data sensor.', target: 'scan', icon: Leaf },
  { code: 'F4', title: 'Timeline per Tanaman', desc: 'Jejak scan bergelombang per petak dengan penanda merah saat penyakit pertama muncul.', target: 'tanaman', icon: Sprout },
  { code: 'F5', title: 'Tanya Cermo AI', desc: 'Chatbot bahasa petani terhubung ke konteks scan terbaru dengan tag saran jujur.', target: 'cermo', icon: MessageCircle },
  { code: 'F6', title: 'Perkiraan Hasil Panen', desc: 'Estimasi bobot kasar per panen dari jumlah buah terdeteksi × bobot rata-rata varietas.', target: 'beranda', icon: CheckCircle2 },
  { code: 'F7', title: 'Kalender & Bot Telegram', desc: 'Jadwal panen bulanan otomatis terhubung pengingat harian via Bot Telegram.', target: 'kalender', icon: CalendarDays },
];

const LAND_FEATURES: {
  code: string;
  title: string;
  desc: string;
  target: ScreenId;
  icon: React.FC<{ size?: number }>;
}[] = [
  { code: 'F8', title: 'Sensor Iklim & Tanah IoT', desc: 'Pantau kelembapan tanah, suhu DHT22, kelembapan udara, cahaya BH1750, dan NPK.', target: 'lahan', icon: Droplets },
  { code: 'F9', title: 'Kalkulator Tenaga Surya', desc: 'Hitung kebutuhan energi harian (Wh), kapasitas baterai, dan ukuran panel surya (Wp).', target: 'energi', icon: Sun },
  { code: 'F10', title: 'Irigasi Otomatis Aman', desc: 'Pompa menyala/mati otomatis sesuai ambang bawah-atas dengan batas durasi aman.', target: 'lahan', icon: Droplets },
  { code: 'F11', title: 'Peringatan Risiko Jamur', desc: 'Peringatan dini saat kelembapan udara tinggi rawan memicu busuk daun Phytophthora.', target: 'lahan', icon: ShieldCheck },
  { code: 'F12', title: 'Monitor Level Air Tandon', desc: 'Sensor ultrasonik mencegah pompa berjalan kering saat air tandon turun < 20%.', target: 'lahan', icon: Droplets },
  { code: 'F13', title: 'Monitor Daya INA219', desc: 'Pembacaan tegangan, arus, daya, dan mode hemat baterai otomatis saat mendung.', target: 'energi', icon: Sun },
];

const STACKED_DEMO = [
  { label: 'Mgg 1', matang: 6, setengah: 9, mentah: 14 },
  { label: 'Mgg 2', matang: 11, setengah: 12, mentah: 10 },
  { label: 'Mgg 3', matang: 15, setengah: 10, mentah: 8 },
  { label: 'Mgg 4', matang: 21, setengah: 11, mentah: 7 },
  { label: 'Mgg 5', matang: 24, setengah: 9, mentah: 6 },
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
  const [valueOffset, setValueOffset] = useState(0);
  const [selectedPoseIdx, setSelectedPoseIdx] = useState(0);
  const [activeNavId, setActiveNavId] = useState<string>('jalan-kami');

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

  const enterFeature = (target: ScreenId) => {
    if (!authUser) {
      openLogin(target);
      return;
    }
    if (!state.onboarded) {
      completeOnboarding({ goToScan: target === 'scan' });
    }
    setActiveScreen(target);
  };

  const visibleValues = [
    VALUE_CARDS[valueOffset % VALUE_CARDS.length],
    VALUE_CARDS[(valueOffset + 1) % VALUE_CARDS.length],
    VALUE_CARDS[(valueOffset + 2) % VALUE_CARDS.length],
  ];

  const activePose = PAK_CERMAT_SHOWCASE[selectedPoseIdx] || PAK_CERMAT_SHOWCASE[0];

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
        {/* SEKSI 1: HERO — Foto kebun lebar penuh, judul editorial dua bobot, 3 chip statistik, kartu pratinjau kaca */}
        <section className="landing-section" style={{ paddingTop: 26, paddingBottom: 38 }}>
          <div className="landing-container">
            <div className="landing-hero-card">
              <img
                src="/images/hero-tomato-farm.jpg"
                alt="Kebun tomat sehat di pagi hari dengan sinar matahari hangat"
                className="landing-hero-bg"
              />
              <div className="landing-hero-scrim" aria-hidden="true" />

              <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="hero-stagger-1" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    className="pill"
                    style={{
                      background: 'rgba(250, 245, 232, 0.92)',
                      color: 'var(--leaf-700)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    Computer Vision + IoT Surya
                  </span>
                  <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>
                    Untuk Petani Lahan &amp; Urban Farming
                  </span>
                </div>

                <h1 className="t-editorial hero-stagger-2" style={{ color: '#FFFFFF' }}>
                  <strong>Cermat memeriksa,</strong> tepat memutuskan di kebunmu.
                </h1>

                <p className="t-body hero-stagger-3" style={{ color: 'rgba(255,255,255,0.88)', maxWidth: 560 }}>
                  Satu foto dari kamera ponsel untuk mengetahui kapan buah siap dipanen, mengenali
                  gejala penyakit dengan solusi organik lebih dulu, dan memantau kelembapan tanah
                  serta irigasi bertenaga surya.
                </p>

                <div className="hero-stagger-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                  <button type="button" className="ct-btn-dark" onClick={enterDashboard}>
                    <span>{authUser ? 'Masuk ke Dasbor Kebun' : 'Login / Daftar Akun'}</span>
                    <span className="ct-btn-dark-circle">
                      {authUser ? <ArrowUpRight size={18} /> : <LogIn size={16} />}
                    </span>
                  </button>
                  <button type="button" className="btn-tomato" onClick={enterScan}>
                    <Camera size={19} /> Coba Scan Tanaman
                  </button>
                </div>
              </div>

              {/* Bawah Hero: 3 Chip Statistik Kiri (sorot --lime-300) + Kartu Pratinjau Kaca Kanan */}
              <div className="landing-hero-bottom hero-stagger-4">
                <div className="stat-chip-row">
                  <div className="stat-chip stat-chip--butter">
                    <span className="stat-chip-num">5 dtk</span>
                    <span className="t-micro t-soft">
                      Keputusan dari 1 foto
                    </span>
                  </div>
                  <div className="stat-chip">
                    <span className="stat-chip-num">13</span>
                    <span className="t-micro t-soft">
                      Fitur AI &amp; IoT surya
                    </span>
                  </div>
                  <div className="stat-chip">
                    <span className="stat-chip-num">100%</span>
                    <span className="t-micro t-soft">
                      Solusi organik lebih dulu
                    </span>
                  </div>
                </div>

                <div className="glass-preview-card ambient-float">
                  <PakCermatMascot pose="tomat" height={86} />
                  <div style={{ flex: 1 }}>
                    <div className="t-micro" style={{ color: 'var(--leaf-600)' }}>
                      Siap dicoba langsung
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, marginTop: 2, color: 'var(--ink)' }}>
                      Lihat hasil scan kematangan &amp; simulasi kebun 3D
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={enterScan}
                    aria-label="Mulai scan tanaman"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'var(--leaf-600)',
                      color: '#FFFFFF',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <ArrowUpRight size={18} />
                  </button>
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

        {/* SEKSI 4: CARA KERJA — Kartu cerah berkaca di atas foto kebun pagi */}
        <section id="cara-kerja" className="landing-section">
          <div className="landing-container">
            <Reveal>
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--r-hero)',
                  overflow: 'hidden',
                  padding: '44px 38px',
                  background: 'var(--surface-panel)',
                  color: 'var(--ink)',
                  boxShadow: 'var(--shadow-1)',
                  border: '1px solid var(--line)',
                }}
              >
                <img
                  src="/images/farmer-tomato-hands.jpg"
                  alt="Tangan petani memeriksa buah tomat segar di kebun"
                  className="landing-hero-bg"
                  style={{ opacity: 0.2 }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(125deg, color-mix(in srgb, var(--surface) 92%, transparent) 0%, color-mix(in srgb, var(--surface-panel) 84%, transparent) 60%, color-mix(in srgb, var(--lime-soft) 72%, transparent) 100%)',
                  }}
                />

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
                        background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                        backdropFilter: 'blur(12px)',
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

                  {/* 3 Kartu Langkah Cerah Berkaca */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    {[
                      {
                        num: '01',
                        title: 'Pilih Bagian & Foto',
                        body: 'Pilih Buah, Daun, atau Batang lalu buka kamera langsung atau unggah foto. Gambar dikompres otomatis di ponsel.',
                      },
                      {
                        num: '02',
                        title: 'Pak Cermat Memeriksa',
                        body: 'AI menilai tahap kematangan, 3 kemungkinan penyakit teratas, dan dugaan kekurangan hara sambil menyebut tingkat keyakinan.',
                      },
                      {
                        num: '03',
                        title: 'Aksi Organik & Jadwal Siram',
                        body: 'Dapatkan anjuran panen besar, langkah organik lebih dulu, simpan ke timeline, dan aktifkan pengingat jadwal otomatis.',
                      },
                    ].map((s) => (
                      <div
                        key={s.num}
                        className="card-interactive"
                        style={{
                          background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
                          backdropFilter: 'blur(14px)',
                          border: '1px solid var(--line)',
                          borderRadius: 22,
                          padding: '22px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          boxShadow: 'var(--shadow-1)',
                        }}
                      >
                        <span
                          className="font-display"
                          style={{
                            fontSize: '1.08rem',
                            color: '#FFFFFF',
                            background: 'var(--leaf-600)',
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          {s.num}
                        </span>
                        <h3 className="t-h3" style={{ color: 'var(--ink)' }}>{s.title}</h3>
                        <p className="t-small t-soft">{s.body}</p>
                      </div>
                    ))}
                  </div>
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

        {/* SEKSI 6: NILAI KAMI — Panel Sage Lembut + 3 Kartu Nilai (Permukaan · Hutan Gelap · Permukaan) */}
        <section id="nilai-kami" className="landing-section">
          <div className="landing-container">
            <Reveal>
              <div className="values-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <span className="t-eyebrow" style={{ color: 'var(--leaf-600)' }}>
                      Nilai &amp; Prinsip Kami
                    </span>
                    <h2 className="t-editorial-sub" style={{ color: 'var(--ink)', marginTop: 4 }}>
                      Dirancang agar <strong>aman, jujur, dan mudah dibaca</strong> di kebun.
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="carousel-circle-btn"
                      aria-label="Nilai sebelumnya"
                      onClick={() => setValueOffset((v) => (v - 1 + VALUE_CARDS.length) % VALUE_CARDS.length)}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="carousel-circle-btn carousel-circle-btn--active"
                      aria-label="Nilai berikutnya"
                      onClick={() => setValueOffset((v) => (v + 1) % VALUE_CARDS.length)}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                <div key={valueOffset} className="values-grid-3 step-transition">
                  {visibleValues.map((card, i) => {
                    const isMiddleDark = i === 1;
                    return (
                      <article
                        key={card.id}
                        className={`value-card ${isMiddleDark ? 'value-card--dark' : ''}`}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {card.tags.map((tag) => (
                              <span
                                key={tag}
                                className={isMiddleDark ? 'value-tag-dark' : 'pill pill-ok'}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <h3 className="t-h2" style={{ color: 'var(--ink)' }}>
                            {card.title}
                          </h3>
                          <p className="t-small t-soft">
                            {card.desc}
                          </p>
                        </div>
                        <div className="t-micro" style={{ color: 'var(--leaf-600)' }}>
                          Standar CermatTani
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* SEKSI 7: 13 FITUR LENGKAP — Bento Seragam: Foto (F1–F7) & Lahan (F8–F13) */}
        <section id="fitur-lengkap" className="landing-section">
          <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Reveal>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span className="t-eyebrow" style={{ color: 'var(--leaf-600)' }}>
                    Ekosistem Fitur Lengkap
                  </span>
                  <h2 className="t-editorial-sub" style={{ color: 'var(--ink)', marginTop: 4 }}>
                    <strong>13 fitur terpadu</strong> dari kamera ponsel hingga sensor surya.
                  </h2>
                </div>
                <button type="button" className="ct-btn-dark" onClick={enterDashboard}>
                  <span>{authUser ? 'Jelajahi di Dasbor' : 'Login untuk Mulai'}</span>
                  <span className="ct-btn-dark-circle">
                    {authUser ? <ArrowUpRight size={18} /> : <LogIn size={16} />}
                  </span>
                </button>
              </div>
            </Reveal>

            {/* Grup 1: Foto & AI (F1–F7) */}
            <Reveal delay={60}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span className="pill pill-ok">Foto &amp; Computer Vision (F1–F7)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {PHOTO_FEATURES.map((f) => {
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.code}
                        type="button"
                        onClick={() => enterFeature(f.target)}
                        className="card card-interactive"
                        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="pill pill-ok">{f.code}</span>
                          <span style={{ color: 'var(--leaf-600)' }}>
                            <Icon size={20} />
                          </span>
                        </div>
                        <h3 className="t-h3" style={{ color: 'var(--ink)' }}>{f.title}</h3>
                        <p className="t-small t-soft">{f.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            {/* Grup 2: Lahan, Irigasi & Surya (F8–F13) */}
            <Reveal delay={120}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span className="pill pill-water">Lahan, Irigasi &amp; Energi Surya (F8–F13)</span>
                  <span className="pill pill-sim">Simulasi</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {LAND_FEATURES.map((f) => {
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.code}
                        type="button"
                        onClick={() => enterFeature(f.target)}
                        className="card card-interactive"
                        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="pill pill-water">{f.code}</span>
                          <span style={{ color: 'var(--water-700)' }}>
                            <Icon size={20} />
                          </span>
                        </div>
                        <h3 className="t-h3" style={{ color: 'var(--ink)' }}>{f.title}</h3>
                        <p className="t-small t-soft">{f.desc}</p>
                      </button>
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
