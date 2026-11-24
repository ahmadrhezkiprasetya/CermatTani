'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BellRing,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  CloudOff,
  Droplets,
  Globe,
  Home,
  MapPin,
  MessageCircle,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Sprout,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import {
  NotificationItem,
  ReminderCategory,
  ReminderSchedule,
  ScreenId,
} from '../types/cermattani';
import { CermoMascot } from './CermoMascot';

type NavEntry = {
  id: Exclude<ScreenId, 'landing'>;
  label: string;
  pageTitle: string;
  icon: React.FC<{ size?: number; strokeWidth?: number }>;
  group: 'utama' | 'lapangan' | 'sistem';
};

const NAV_ITEMS: NavEntry[] = [
  { id: 'beranda', label: 'Beranda', pageTitle: 'Beranda Kebun', icon: Home, group: 'utama' },
  { id: 'scan', label: 'Scan', pageTitle: 'Scan Tanaman', icon: Camera, group: 'utama' },
  { id: 'tanaman', label: 'Tanaman', pageTitle: 'Tanaman & Timeline', icon: Sprout, group: 'utama' },
  { id: 'kalender', label: 'Kalender panen', pageTitle: 'Kalender Panen', icon: CalendarDays, group: 'utama' },
  { id: 'lahan', label: 'Lahan', pageTitle: 'Lahan & Irigasi', icon: Droplets, group: 'lapangan' },
  { id: 'energi', label: 'Energi surya', pageTitle: 'Energi Surya', icon: Sun, group: 'lapangan' },
  { id: 'cermo', label: 'Tanya Cermo', pageTitle: 'Tanya Cermo', icon: MessageCircle, group: 'lapangan' },
  { id: 'pengaturan', label: 'Pengaturan', pageTitle: 'Pengaturan', icon: Settings, group: 'sistem' },
];

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function renderNotifIcon(tipe: NotificationItem['tipe'], size = 16) {
  switch (tipe) {
    case 'siram':
    case 'tandon':
      return <Droplets size={size} strokeWidth={2} />;
    case 'penyakit':
      return <AlertTriangle size={size} strokeWidth={2} />;
    case 'pupuk':
      return <Sprout size={size} strokeWidth={2} />;
    case 'panen':
      return <CalendarDays size={size} strokeWidth={2} />;
    case 'energi':
      return <Zap size={size} strokeWidth={2} />;
    case 'telegram':
    default:
      return <BellRing size={size} strokeWidth={2} />;
  }
}

function getCategoryLabel(kategori: ReminderCategory): string {
  switch (kategori) {
    case 'siram':
      return 'Siram';
    case 'cek_daun':
      return 'Cek Daun';
    case 'pupuk':
      return 'Pupuk';
    case 'panen':
      return 'Panen';
  }
}

function getCategoryToNotifType(kategori: ReminderCategory): NotificationItem['tipe'] {
  switch (kategori) {
    case 'siram':
      return 'siram';
    case 'cek_daun':
      return 'penyakit';
    case 'pupuk':
      return 'pupuk';
    case 'panen':
      return 'panen';
  }
}

function getNextReminderText(schedules: ReminderSchedule[]): string {
  const active = schedules.filter((s) => s.aktif).sort((a, b) => a.jam.localeCompare(b.jam));
  if (active.length === 0) return 'Belum ada jadwal pengingat aktif';
  const now = new Date();
  const nowClock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const upcomingToday = active.find((s) => s.jam > nowClock);
  if (upcomingToday) {
    return `Berikutnya: ${upcomingToday.label} · ${upcomingToday.jam} WIB`;
  }
  return `Besok: ${active[0].label} · ${active[0].jam} WIB`;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    activeScreen,
    setActiveScreen,
    openScanWith,
    searchQuery,
    setSearchQuery,
    activeFarm,
    setActiveFarmId,
    unreadNotifCount,
    activeAlerts,
    dismissAlert,
    markAllNotificationsRead,
    clearAllNotifications,
    updateReminderSchedule,
    addReminderSchedule,
    deleteReminderSchedule,
    triggerTestReminderAlert,
    requestBrowserNotifications,
    updateSettings,
    isOffline,
    processOfflineQueue,
  } = useApp();

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTab, setNotifTab] = useState<'peringatan' | 'jadwal'>('peringatan');
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedLabel, setNewSchedLabel] = useState('');
  const [newSchedCat, setNewSchedCat] = useState<ReminderCategory>('siram');
  const [newSchedTime, setNewSchedTime] = useState('07:30');
  const [newSchedNote, setNewSchedNote] = useState('');
  const [browserNotifNote, setBrowserNotifNote] = useState('');
  const [syncing, setSyncing] = useState(false);

  const isSoilDry = state.sensor.kelembapanTanah < state.settings.ambangTanahBawah;
  const isPowerSave = state.sensor.bateraiPersen <= state.settings.ambangBateraiHemat;
  const isTankLow = state.sensor.levelTandonPersen < state.settings.ambangTandonRendah;
  const isDiseaseRisk =
    state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit;

  const liveSensorAlerts = useMemo(() => {
    const items: Array<{
      id: string;
      judul: string;
      isi: string;
      tipe: NotificationItem['tipe'];
      severity: 'warn' | 'bad';
      actionLabel: string;
      actionScreen: Exclude<ScreenId, 'landing'>;
    }> = [];

    if (isTankLow) {
      items.push({
        id: 'live-tank',
        judul: `Tandon air rendah (${state.sensor.levelTandonPersen}%)`,
        isi: `Di bawah batas ${state.settings.ambangTandonRendah}%. Isi tandon agar pompa dapat menyiram.`,
        tipe: 'tandon',
        severity: 'bad',
        actionLabel: 'Buka Lahan',
        actionScreen: 'lahan',
      });
    }
    if (isSoilDry) {
      items.push({
        id: 'live-soil',
        judul: `Tanah perlu disiram (${state.sensor.kelembapanTanah}%)`,
        isi: `Kelembapan tanah di bawah ${state.settings.ambangTanahBawah}%. Cek irigasi atau aktifkan pompa.`,
        tipe: 'siram',
        severity: 'warn',
        actionLabel: 'Siram di Lahan',
        actionScreen: 'lahan',
      });
    }
    if (isDiseaseRisk) {
      items.push({
        id: 'live-rh',
        judul: `Risiko jamur meningkat (${state.sensor.kelembapanUdara}% RH)`,
        isi: `Kelembapan udara ≥${state.settings.ambangKelembapanRisikoPenyakit}%. Periksa bercak daun bawah.`,
        tipe: 'penyakit',
        severity: 'warn',
        actionLabel: 'Scan Daun',
        actionScreen: 'scan',
      });
    }
    if (isPowerSave) {
      items.push({
        id: 'live-bat',
        judul: `Baterai surya hemat daya (${state.sensor.bateraiPersen}%)`,
        isi: `Baterai ≤${state.settings.ambangBateraiHemat}%. Cek kebersihan & posisi panel surya.`,
        tipe: 'energi',
        severity: 'warn',
        actionLabel: 'Cek Energi',
        actionScreen: 'energi',
      });
    }
    return items;
  }, [
    isTankLow,
    isSoilDry,
    isDiseaseRisk,
    isPowerSave,
    state.sensor.levelTandonPersen,
    state.sensor.kelembapanTanah,
    state.sensor.kelembapanUdara,
    state.sensor.bateraiPersen,
    state.settings.ambangTandonRendah,
    state.settings.ambangTanahBawah,
    state.settings.ambangKelembapanRisikoPenyakit,
    state.settings.ambangBateraiHemat,
  ]);

  const totalAlertBadge = unreadNotifCount + liveSensorAlerts.length;
  const activeScheduleCount = state.settings.jadwalPengingat.filter((s) => s.aktif).length;
  const nextReminderLabel = getNextReminderText(state.settings.jadwalPengingat);

  useEffect(() => {
    if (!showNotifModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotifModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showNotifModal]);

  const handleToggleBrowserNotif = async () => {
    setBrowserNotifNote('');
    if (state.settings.notifikasiBrowser) {
      updateSettings({ notifikasiBrowser: false });
      return;
    }
    const granted = await requestBrowserNotifications();
    if (!granted) {
      setBrowserNotifNote('Izin notifikasi browser belum diaktifkan di peramban ini.');
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedLabel.trim()) return;
    addReminderSchedule({
      label: newSchedLabel,
      kategori: newSchedCat,
      jam: newSchedTime,
      catatan: newSchedNote,
    });
    setNewSchedLabel('');
    setNewSchedNote('');
    setShowAddSchedule(false);
  };

  const activeNav = NAV_ITEMS.find((i) => i.id === activeScreen) || NAV_ITEMS[0];

  const cermoSidebarPose = isPowerSave
    ? 'sleep'
    : isTankLow
      ? 'water'
      : isDiseaseRisk
        ? 'worried'
        : 'wave';

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matchedPlants = state.plants
      .filter((p) => p.nama.toLowerCase().includes(q) || p.varietas.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        title: p.nama,
        sub: `${p.varietas} · Fase ${p.fase}`,
        go: () => {
          setSearchQuery('');
          setActiveScreen('tanaman');
        },
      }));
    const matchedScans = state.scans
      .filter((s) => s.penyakitUtamaNama.toLowerCase().includes(q) || s.dugaanHaraNama.toLowerCase().includes(q))
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        title: s.penyakitUtamaNama,
        sub: `Hasil scan ${s.bagian} · ${s.keyakinan}%`,
        go: () => {
          setSearchQuery('');
          setActiveScreen('tanaman');
        },
      }));
    return [...matchedPlants, ...matchedScans];
  }, [searchQuery, state.plants, state.scans, setActiveScreen, setSearchQuery]);

  const toggleTheme = () => {
    const isDark =
      state.settings.tema === 'dark' ||
      (state.settings.tema === 'system' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    updateSettings({ tema: isDark ? 'light' : 'dark' });
  };

  const handleSyncQueue = async () => {
    setSyncing(true);
    await processOfflineQueue();
    setSyncing(false);
  };

  const renderGroup = (group: NavEntry['group'], title: string) => {
    const items = NAV_ITEMS.filter((i) => i.group === group);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 }}>
        <div className="sidebar-section-title">{title}</div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.id === 'scan' ? openScanWith() : setActiveScreen(item.id))}
              className={`nav-item ${active ? 'active' : ''} ${item.id === 'scan' ? 'nav-scan-item' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={1.75} />
              <span>{item.label}</span>
              {item.id === 'lahan' && (isTankLow || isDiseaseRisk) && (
                <span className="nav-badge" aria-label="Perlu perhatian">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="app-shell">
      <a href="#isi-aplikasi" className="skip-link">
        Lewati ke isi utama
      </a>

      {/* Sidebar Gelap 240px (--forest-900) + Item Aktif Pil --lime-300 (§5.1 & §6.2) */}
      <aside className="sidebar" aria-label="Navigasi utama">
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => setActiveScreen('beranda')}
        >
          <div className="sidebar-brand-logo">
            <CermoMascot pose="wave" size={40} interactive={false} />
          </div>
          <div className="sidebar-brand-text">
            <div className="font-display" style={{ fontSize: '1.125rem', lineHeight: 1.1, color: 'var(--ink)' }}>
              CermatTani
            </div>
            <div className="t-micro" style={{ color: 'var(--leaf-600)', fontSize: '0.7rem' }}>
              Asisten kebun AI
            </div>
          </div>
        </button>

        <div className="sidebar-farm-box">
          <label htmlFor="farm-switcher" className="sidebar-farm-label">
            Kebun Aktif
          </label>
          <select
            id="farm-switcher"
            className="sidebar-farm-select"
            value={activeFarm?.id || ''}
            onChange={(e) => setActiveFarmId(e.target.value)}
          >
            {state.farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nama}
              </option>
            ))}
          </select>
        </div>

        <nav className="sidebar-nav">
          {renderGroup('utama', 'Budidaya')}
          {renderGroup('lapangan', 'Lahan & Asisten')}
          {renderGroup('sistem', 'Sistem')}
          <button
            type="button"
            onClick={() => setActiveScreen('landing')}
            className="nav-item"
            style={{ marginTop: 4, opacity: 0.9 }}
          >
            <Globe size={19} strokeWidth={1.75} />
            <span>Halaman Publik</span>
          </button>
        </nav>

        {/* Asisten Cermo interaktif di sidebar */}
        <div className="sidebar-mascot-card">
          <CermoMascot
            pose={cermoSidebarPose}
            size={38}
            tipOverride={
              isPowerSave
                ? 'Baterai surya sedang hemat daya. Data dikirim lebih jarang ya.'
                : isTankLow
                  ? `Tandon tinggal ${state.sensor.levelTandonPersen}%. Pompa kutahan dulu supaya tidak kering.`
                  : undefined
            }
          />
          <div className="sidebar-mascot-text" style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
              {isPowerSave ? 'Mode hemat' : 'Pak Cermat'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: 1 }}>
              {isPowerSave ? 'Baterai surya rendah' : 'Klik untuk tips cepat'}
            </div>
          </div>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className={`main-viewport ${activeScreen === 'cermo' ? 'main-viewport--chat' : ''}`}>
        {/* Kepala Halaman 1 Baris Bersih — tanpa wrapping */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="t-h1" style={{ fontSize: 'clamp(1.2rem, 1.65vw, 1.5rem)', lineHeight: 1.18 }}>
              {activeScreen === 'beranda'
                ? `${getTimeGreeting()}, ${state.user.nama}`
                : activeNav.pageTitle}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span
                className="t-micro t-soft"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <MapPin size={13} color="var(--leaf-600)" style={{ flexShrink: 0 }} />
                {activeFarm?.nama} · {activeFarm?.lokasi}
              </span>
              <span className={`pill ${isOffline ? 'pill-warn' : 'pill-ok'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                {isOffline ? (
                  <>
                    <CloudOff size={11} /> Offline
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={11} /> Online
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="search-box" role="search">
              <Search size={16} strokeWidth={1.75} color="var(--ink-soft)" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tanaman atau scan..."
                aria-label="Cari tanaman atau riwayat scan"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus pencarian"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-soft)' }}
                >
                  <X size={15} />
                </button>
              )}
              {searchResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: 'var(--surface)',
                    borderRadius: 14,
                    boxShadow: 'var(--shadow-2)',
                    border: '1px solid var(--line)',
                    padding: 6,
                    zIndex: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={r.go}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.title}</span>
                      <span className="t-micro t-soft">{r.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

            <button
              type="button"
              className={`icon-btn ${liveSensorAlerts.length > 0 ? 'icon-btn--alert' : ''}`}
              onClick={() => {
                const nextOpen = !showNotifModal;
                setShowNotifModal(nextOpen);
                if (nextOpen) {
                  markAllNotificationsRead();
                }
              }}
              aria-label={`Buka peringatan & jadwal (${totalAlertBadge} aktif)`}
              aria-expanded={showNotifModal}
              title={`Peringatan & jadwal · ${nextReminderLabel}`}
            >
              {liveSensorAlerts.length > 0 ? (
                <BellRing size={18} strokeWidth={1.9} />
              ) : (
                <Bell size={18} strokeWidth={1.75} />
              )}
              {totalAlertBadge > 0 && (
                <span className="icon-btn-count">
                  {totalAlertBadge > 9 ? '9+' : totalAlertBadge}
                </span>
              )}
            </button>

            {activeScreen !== 'scan' && activeScreen !== 'beranda' && (
              <button
                type="button"
                className="ct-btn-dark"
                onClick={() => openScanWith('buah')}
              >
                <span>Scan</span>
                <span className="ct-btn-dark-circle">
                  <ArrowUpRight size={15} />
                </span>
              </button>
            )}
          </div>
        </header>

        <div className={`main-content-pad ${activeScreen === 'cermo' ? 'main-content-pad--chat' : ''}`}>
          {/* Bar pintasan mobile ringkas */}
          <div className="mobile-more-bar" aria-label="Menu tambahan mobile">
            <select
              aria-label="Pilih kebun"
              className="mobile-chip-nav"
              value={activeFarm?.id || ''}
              onChange={(e) => setActiveFarmId(e.target.value)}
            >
              {state.farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nama}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mobile-chip-nav"
              onClick={() => setActiveScreen('landing')}
            >
              <Globe size={15} strokeWidth={1.75} /> Tentang
            </button>
            <button
              type="button"
              className={`mobile-chip-nav ${activeScreen === 'kalender' ? 'active' : ''}`}
              onClick={() => setActiveScreen('kalender')}
            >
              <CalendarDays size={15} strokeWidth={1.75} /> Kalender
            </button>
            <button
              type="button"
              className={`mobile-chip-nav ${activeScreen === 'energi' ? 'active' : ''}`}
              onClick={() => setActiveScreen('energi')}
            >
              <Sun size={15} strokeWidth={1.75} /> Energi surya
            </button>
            <button
              type="button"
              className={`mobile-chip-nav ${activeScreen === 'pengaturan' ? 'active' : ''}`}
              onClick={() => setActiveScreen('pengaturan')}
            >
              <Settings size={15} strokeWidth={1.75} /> Pengaturan
            </button>
          </div>

          {/* Banner offline & antrean unggah PWA */}
          {(isOffline || state.offlineQueue.length > 0) && (
            <div className="alert-card alert-card--warn" role="status">
              <CloudOff size={22} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>
                  {isOffline
                    ? 'Offline, data tersimpan di ponsel'
                    : `${state.offlineQueue.length} foto di antrean siap dikirim`}
                </div>
                <p className="t-small t-soft">
                  {isOffline
                    ? 'Halaman utama tetap dapat dibaca. Foto scan baru antre lokal dan terkirim otomatis saat sinyal kembali.'
                    : 'Koneksi kembali stabil. Klik tombol di kanan bila belum tersinkron.'}
                </p>
              </div>
              {!isOffline && state.offlineQueue.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSyncQueue}
                  disabled={syncing}
                >
                  <RefreshCw size={16} /> {syncing ? 'Mengirim...' : 'Kirim sekarang'}
                </button>
              )}
            </div>
          )}

          {/* Layar aktif — perpindahan instan 0 ms */}
          <main id="isi-aplikasi" className={activeScreen === 'cermo' ? 'chat-main-host' : undefined}>
            {children}
          </main>
        </div>
      </div>

      {/* Bottom-Nav Mobile 5 Item + FAB Scan 64px Terangkat 22px (§5.1 & §6.2) */}
      <nav className="mobile-bottom-nav" aria-label="Navigasi bawah mobile">
        <button
          type="button"
          className={`bottom-nav-btn ${activeScreen === 'beranda' ? 'active' : ''}`}
          onClick={() => setActiveScreen('beranda')}
        >
          <Home size={22} strokeWidth={1.75} />
          <span>Beranda</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-btn ${activeScreen === 'tanaman' ? 'active' : ''}`}
          onClick={() => setActiveScreen('tanaman')}
        >
          <Sprout size={22} strokeWidth={1.75} />
          <span>Tanaman</span>
        </button>

        <div className="bottom-nav-scan-wrap">
          <button
            type="button"
            className="scan-fab"
            onClick={() => openScanWith()}
            aria-label="Scan tanaman"
          >
            <Camera size={28} strokeWidth={2} />
          </button>
          <span
            className="t-micro"
            style={{
              fontWeight: 700,
              color: activeScreen === 'scan' ? 'var(--tomato-btn)' : 'var(--ink-soft)',
              marginTop: 2,
            }}
          >
            Scan
          </span>
        </div>

        <button
          type="button"
          className={`bottom-nav-btn ${activeScreen === 'lahan' ? 'active' : ''}`}
          onClick={() => setActiveScreen('lahan')}
        >
          <Droplets size={22} strokeWidth={1.75} />
          <span>Lahan</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-btn ${activeScreen === 'cermo' ? 'active' : ''}`}
          onClick={() => setActiveScreen('cermo')}
        >
          <MessageCircle size={22} strokeWidth={1.75} />
          <span>Cermo</span>
        </button>
      </nav>

      {/* Floating Live Alert Toasts — Kanan Atas */}
      {activeAlerts.length > 0 && (
        <div
          className="alert-toast-stack"
          role="region"
          aria-label="Peringatan langsung kebun"
          aria-live="polite"
        >
          {activeAlerts.map((toast) => (
            <div key={toast.id} className={`alert-toast alert-toast--${toast.severity}`}>
              <div className="alert-toast-icon">{renderNotifIcon(toast.tipe, 17)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <strong style={{ fontSize: '0.86rem', lineHeight: 1.25 }}>{toast.judul}</strong>
                  <span className="t-micro t-soft" style={{ flexShrink: 0 }}>
                    {toast.waktu}
                  </span>
                </div>
                <p className="t-small t-soft" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  {toast.isi}
                </p>
                {toast.actionLabel && toast.actionScreen && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="alert-toast-action"
                      onClick={() => {
                        const targetScreen = toast.actionScreen!;
                        dismissAlert(toast.id);
                        if (targetScreen === 'scan') {
                          openScanWith('daun');
                        } else {
                          setActiveScreen(targetScreen);
                        }
                      }}
                    >
                      {toast.actionLabel}
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="alert-toast-close"
                onClick={() => dismissAlert(toast.id)}
                aria-label="Tutup peringatan"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Panel Notifikasi & Jadwal Pengingat — Kanan Atas (Desktop) / Bottom Sheet (Mobile) */}
      {showNotifModal && (
        <>
          <div
            className="notif-popover-backdrop"
            onClick={() => setShowNotifModal(false)}
            aria-hidden="true"
          />
          <aside
            className="notif-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Peringatan dan jadwal pengingat kebun"
          >
            <div className="notif-popover-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <h2 className="t-h3" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <BellRing size={17} color="var(--leaf-600)" />
                    Peringatan &amp; Jadwal
                  </h2>
                  <p className="t-micro t-soft" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} />
                    {nextReminderLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="alert-toast-close"
                  onClick={() => setShowNotifModal(false)}
                  aria-label="Tutup panel notifikasi"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="seg-tabs" role="tablist" style={{ width: '100%' }}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={notifTab === 'peringatan'}
                  className={`seg-tab ${notifTab === 'peringatan' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setNotifTab('peringatan')}
                >
                  Peringatan ({liveSensorAlerts.length + state.notifications.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={notifTab === 'jadwal'}
                  className={`seg-tab ${notifTab === 'jadwal' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setNotifTab('jadwal')}
                >
                  Atur Jadwal ({activeScheduleCount} aktif)
                </button>
              </div>
            </div>

            <div key={notifTab} className="notif-popover-body tab-fade">
              {notifTab === 'peringatan' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ minHeight: 34, padding: '5px 11px', fontSize: '0.78rem' }}
                      onClick={() => {
                        setShowNotifModal(false);
                        triggerTestReminderAlert();
                      }}
                    >
                      <Sparkles size={14} /> Uji alert kanan atas
                    </button>
                    {state.notifications.length > 0 && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ minHeight: 34, padding: '5px 9px', fontSize: '0.76rem' }}
                        onClick={clearAllNotifications}
                      >
                        Bersihkan riwayat
                      </button>
                    )}
                  </div>

                  {/* Peringatan Sensor Aktif Real-Time */}
                  {liveSensorAlerts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="t-micro" style={{ fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Kondisi butuh perhatian sekarang
                      </div>
                      {liveSensorAlerts.map((item) => (
                        <div key={item.id} className={`notif-item-card notif-item-card--${item.severity}`}>
                          <div
                            className="alert-toast-icon"
                            style={{
                              background:
                                item.severity === 'bad'
                                  ? 'color-mix(in srgb, var(--bad) 15%, transparent)'
                                  : 'color-mix(in srgb, var(--warn) 16%, transparent)',
                              color: item.severity === 'bad' ? 'var(--bad)' : 'var(--warn)',
                            }}
                          >
                            {renderNotifIcon(item.tipe, 16)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: '0.86rem', display: 'block', lineHeight: 1.25 }}>
                              {item.judul}
                            </strong>
                            <p className="t-small t-soft" style={{ fontSize: '0.79rem', marginTop: 2 }}>
                              {item.isi}
                            </p>
                            <button
                              type="button"
                              className="alert-toast-action"
                              style={{ marginTop: 7 }}
                              onClick={() => {
                                setShowNotifModal(false);
                                if (item.actionScreen === 'scan') {
                                  openScanWith('daun');
                                } else {
                                  setActiveScreen(item.actionScreen);
                                }
                              }}
                            >
                              {item.actionLabel} <ArrowUpRight size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Riwayat Notifikasi & Pengingat */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="t-micro" style={{ fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Riwayat pengingat
                    </div>
                    {state.notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '18px 8px' }}>
                        <CermoMascot pose="happy" size={68} interactive={false} />
                        <p className="t-small t-soft" style={{ marginTop: 8 }}>
                          Belum ada riwayat notifikasi. Pengingat jadwal &amp; sensor akan muncul otomatis di kanan atas.
                        </p>
                      </div>
                    ) : (
                      state.notifications.map((n) => {
                        const sev = n.severity || (n.tipe === 'penyakit' ? 'warn' : n.tipe === 'tandon' ? 'bad' : 'info');
                        return (
                          <div key={n.id} className={`notif-item-card notif-item-card--${sev}`}>
                            <div
                              className="alert-toast-icon"
                              style={{
                                background:
                                  sev === 'bad'
                                    ? 'color-mix(in srgb, var(--bad) 14%, transparent)'
                                    : sev === 'warn'
                                      ? 'color-mix(in srgb, var(--warn) 16%, transparent)'
                                      : sev === 'ok'
                                        ? 'color-mix(in srgb, var(--leaf-600) 14%, transparent)'
                                        : 'color-mix(in srgb, var(--water) 14%, transparent)',
                                color:
                                  sev === 'bad'
                                    ? 'var(--bad)'
                                    : sev === 'warn'
                                      ? 'var(--warn)'
                                      : sev === 'ok'
                                        ? 'var(--leaf-600)'
                                        : 'var(--water)',
                              }}
                            >
                              {renderNotifIcon(n.tipe, 15)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                                <strong style={{ fontSize: '0.85rem', lineHeight: 1.25 }}>{n.judul}</strong>
                                <span className="t-micro t-soft" style={{ flexShrink: 0 }}>
                                  {n.waktu}
                                </span>
                              </div>
                              <p className="t-small t-soft" style={{ fontSize: '0.79rem', lineHeight: 1.4 }}>
                                {n.isi}
                              </p>
                              {n.actionLabel && n.actionScreen && (
                                <button
                                  type="button"
                                  className="alert-toast-action"
                                  style={{ marginTop: 6 }}
                                  onClick={() => {
                                    setShowNotifModal(false);
                                    if (n.actionScreen === 'scan') {
                                      openScanWith('daun');
                                    } else {
                                      setActiveScreen(n.actionScreen!);
                                    }
                                  }}
                                >
                                  {n.actionLabel} <ArrowUpRight size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Pengaturan Cepat Alert Otomatis */}
                  <div className="schedule-row" style={{ gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div>
                        <strong style={{ fontSize: '0.84rem', display: 'block' }}>Alert otomatis sensor kebun</strong>
                        <span className="t-micro t-soft">
                          Pop-up kanan atas saat tanah kering, tandon kritis, atau lembap berjamur
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={state.settings.peringatanOtomatisSensor}
                        aria-label="Aktifkan alert otomatis sensor"
                        className="alert-switch"
                        onClick={() =>
                          updateSettings({
                            peringatanOtomatisSensor: !state.settings.peringatanOtomatisSensor,
                          })
                        }
                      >
                        <span className="alert-switch-thumb" />
                      </button>
                    </div>

                    <div
                      style={{
                        borderTop: '1px solid var(--line)',
                        paddingTop: 9,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.84rem', display: 'block' }}>Notifikasi perangkat/browser</strong>
                        <span className="t-micro t-soft">
                          Tampilkan peringatan sistem saat tab CermatTani sedang terbuka
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={state.settings.notifikasiBrowser}
                        aria-label="Aktifkan notifikasi browser"
                        className="alert-switch"
                        onClick={handleToggleBrowserNotif}
                      >
                        <span className="alert-switch-thumb" />
                      </button>
                    </div>
                    {browserNotifNote && (
                      <p className="t-micro" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                        {browserNotifNote}
                      </p>
                    )}
                  </div>

                  {/* Daftar Jadwal Pengingat */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span className="t-micro" style={{ fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Jadwal harian (WIB)
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ minHeight: 32, padding: '4px 10px', fontSize: '0.76rem' }}
                      onClick={() => setShowAddSchedule((v) => !v)}
                    >
                      <Plus size={14} /> {showAddSchedule ? 'Tutup form' : 'Tambah jadwal'}
                    </button>
                  </div>

                  {showAddSchedule && (
                    <form
                      onSubmit={handleCreateSchedule}
                      className="schedule-row step-transition"
                      style={{ background: 'var(--surface)', borderColor: 'var(--leaf-500)' }}
                    >
                      <input
                        type="text"
                        className="field-input"
                        style={{ minHeight: 38, fontSize: '0.85rem' }}
                        placeholder="Nama jadwal, mis. Semprot Pupuk Daun"
                        value={newSchedLabel}
                        onChange={(e) => setNewSchedLabel(e.target.value)}
                        required
                      />
                      <div className="form-grid-2">
                        <select
                          className="field-select"
                          style={{ minHeight: 38, fontSize: '0.83rem' }}
                          value={newSchedCat}
                          onChange={(e) => setNewSchedCat(e.target.value as ReminderCategory)}
                        >
                          <option value="siram">Siram Kebun</option>
                          <option value="cek_daun">Cek Daun &amp; Hama</option>
                          <option value="pupuk">Pemupukan</option>
                          <option value="panen">Cek Panen</option>
                        </select>
                        <input
                          type="time"
                          className="time-pill-input"
                          style={{ width: '100%', minHeight: 38 }}
                          value={newSchedTime}
                          onChange={(e) => setNewSchedTime(e.target.value)}
                          required
                        />
                      </div>
                      <input
                        type="text"
                        className="field-input"
                        style={{ minHeight: 36, fontSize: '0.82rem' }}
                        placeholder="Catatan singkat peringatan (opsional)"
                        value={newSchedNote}
                        onChange={(e) => setNewSchedNote(e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.8rem' }}
                          onClick={() => setShowAddSchedule(false)}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          style={{ minHeight: 34, padding: '5px 14px', fontSize: '0.8rem' }}
                        >
                          Simpan jadwal
                        </button>
                      </div>
                    </form>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {state.settings.jadwalPengingat.map((item) => (
                      <div
                        key={item.id}
                        className={`schedule-row ${!item.aktif ? 'schedule-row--off' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span
                              className="alert-toast-icon"
                              style={{
                                width: 30,
                                height: 30,
                                background: 'color-mix(in srgb, var(--leaf-600) 13%, transparent)',
                                color: 'var(--leaf-600)',
                              }}
                            >
                              {renderNotifIcon(getCategoryToNotifType(item.kategori), 15)}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: '0.85rem', display: 'block', lineHeight: 1.2 }}>
                                {item.label}
                              </strong>
                              <span className="t-micro t-soft">{getCategoryLabel(item.kategori)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.aktif}
                            aria-label={`Aktifkan jadwal ${item.label}`}
                            className="alert-switch"
                            onClick={() => updateReminderSchedule(item.id, { aktif: !item.aktif })}
                          >
                            <span className="alert-switch-thumb" />
                          </button>
                        </div>

                        {item.catatan && (
                          <p className="t-micro t-soft" style={{ lineHeight: 1.38 }}>
                            {item.catatan}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={14} color="var(--ink-soft)" />
                            <input
                              type="time"
                              aria-label={`Jam pengingat ${item.label}`}
                              className="time-pill-input"
                              value={item.jam}
                              onChange={(e) =>
                                updateReminderSchedule(item.id, { jam: e.target.value })
                              }
                            />
                            <span className="t-micro t-soft">WIB</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="alert-toast-action"
                              onClick={() => triggerTestReminderAlert(item.id)}
                              title="Tampilkan contoh alert di kanan atas sekarang"
                            >
                              <Sparkles size={12} /> Uji
                            </button>
                            <button
                              type="button"
                              className="alert-toast-close"
                              onClick={() => deleteReminderSchedule(item.id)}
                              aria-label={`Hapus jadwal ${item.label}`}
                              title="Hapus jadwal"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
};
