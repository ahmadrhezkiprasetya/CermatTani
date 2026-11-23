'use client';

import React, { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Camera,
  CloudOff,
  Droplets,
  Home,
  MessageCircle,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sprout,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { ScreenId } from '../types/cermattani';
import { CermoMascot } from './CermoMascot';

const NAV_ITEMS: {
  id: ScreenId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ size?: number; strokeWidth?: number }>;
}[] = [
  { id: 'beranda', label: 'Beranda', shortLabel: 'Beranda', icon: Home },
  { id: 'scan', label: 'Scan tanaman', shortLabel: 'Scan', icon: Camera },
  { id: 'tanaman', label: 'Tanaman', shortLabel: 'Tanaman', icon: Sprout },
  { id: 'kalender', label: 'Kalender panen', shortLabel: 'Kalender', icon: CalendarDays },
  { id: 'lahan', label: 'Lahan & irigasi', shortLabel: 'Lahan', icon: Droplets },
  { id: 'energi', label: 'Energi surya', shortLabel: 'Surya', icon: Sun },
  { id: 'cermo', label: 'Tanya Cermo', shortLabel: 'Cermo', icon: MessageCircle },
  { id: 'pengaturan', label: 'Pengaturan', shortLabel: 'Atur', icon: Settings },
];

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
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
    markAllNotificationsRead,
    updateSettings,
    isOffline,
    processOfflineQueue,
  } = useApp();

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isPowerSave = state.sensor.bateraiPersen <= state.settings.ambangBateraiHemat;
  const isTankLow = state.sensor.levelTandonPersen < state.settings.ambangTandonRendah;
  const isDiseaseRisk =
    state.sensor.kelembapanUdara >= state.settings.ambangKelembapanRisikoPenyakit;

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
  }, [searchQuery, state.plants, state.scans]);

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

  return (
    <div className="app-shell">
      {/* Sidebar gelap Desktop 240px / Tablet rail (DESIGN.md §6) */}
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
            <div className="font-display" style={{ fontSize: '1.25rem', lineHeight: 1.1 }}>
              CermatTani
            </div>
            <div className="t-micro" style={{ color: 'rgba(234,245,238,0.72)' }}>
              Budidaya tomat cerdas
            </div>
          </div>
        </button>

        {/* Pemilih kebun (X1 banyak kebun) */}
        <div className="sidebar-farm-box">
          <label htmlFor="farm-switcher" className="sidebar-farm-label">
            Kebun aktif
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
          {NAV_ITEMS.map((item) => {
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
                <Icon size={22} strokeWidth={1.75} />
                <span>{item.label}</span>
                {item.id === 'lahan' && (isTankLow || isDiseaseRisk) && (
                  <span className="nav-badge" aria-label="Perlu perhatian">
                    !
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Maskot Cermo di bawah sidebar */}
        <div className="sidebar-mascot-card">
          <CermoMascot
            pose={cermoSidebarPose}
            size={52}
            tipOverride={
              isPowerSave
                ? 'Baterai surya rendah, aku masuk mode hemat dulu ya...'
                : isTankLow
                  ? `Tandon tinggal ${state.sensor.levelTandonPersen}%. Pompa kutahan dulu.`
                  : undefined
            }
          />
          <div className="sidebar-mascot-text" style={{ minWidth: 0 }}>
            <div className="t-small" style={{ fontWeight: 700, color: '#FFFFFF' }}>
              {isPowerSave ? 'Mode hemat' : 'Cermo siap!'}
            </div>
            <div className="t-micro" style={{ color: 'rgba(234,245,238,0.78)' }}>
              {isPowerSave
                ? 'Baterai rendah'
                : 'Klik aku untuk tips cepat'}
            </div>
          </div>
        </div>
      </aside>

      {/* Konten Utama */}
      <div className="main-viewport">
        {/* Topbar: Sapaan + pencarian + notifikasi + tema */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="t-h1">
              {getTimeGreeting()}, {state.user.nama}
            </h1>
            <p className="t-small t-soft">
              {activeFarm?.nama} · {activeFarm?.lokasi}
            </p>
          </div>

          <div className="topbar-actions">
            <div className="search-box" role="search">
              <Search size={18} strokeWidth={1.75} color="var(--ink-soft)" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tanaman atau hasil scan..."
                aria-label="Cari tanaman atau hasil scan"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus pencarian"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-soft)' }}
                >
                  <X size={16} />
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
                    borderRadius: '18px',
                    boxShadow: 'var(--shadow-card-hover)',
                    padding: '8px',
                    zIndex: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
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
                        padding: '10px 12px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{r.title}</span>
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
                <Sun size={20} strokeWidth={1.75} />
              ) : (
                <Moon size={20} strokeWidth={1.75} />
              )}
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setShowNotifModal(true);
                markAllNotificationsRead();
              }}
              aria-label={`Buka notifikasi (${unreadNotifCount} belum dibaca)`}
              title="Notifikasi & pengingat"
            >
              <Bell size={20} strokeWidth={1.75} />
              {unreadNotifCount > 0 && <span className="icon-btn-dot" />}
            </button>
          </div>
        </header>

        {/* Bar pintasan mobile untuk menu sekunder (Kalender, Energi surya, Pengaturan, Kebun) */}
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
            className={`mobile-chip-nav ${activeScreen === 'kalender' ? 'active' : ''}`}
            onClick={() => setActiveScreen('kalender')}
          >
            <CalendarDays size={16} strokeWidth={1.75} /> Kalender
          </button>
          <button
            type="button"
            className={`mobile-chip-nav ${activeScreen === 'energi' ? 'active' : ''}`}
            onClick={() => setActiveScreen('energi')}
          >
            <Sun size={16} strokeWidth={1.75} /> Energi surya
          </button>
          <button
            type="button"
            className={`mobile-chip-nav ${activeScreen === 'pengaturan' ? 'active' : ''}`}
            onClick={() => setActiveScreen('pengaturan')}
          >
            <Settings size={16} strokeWidth={1.75} /> Pengaturan
          </button>
        </div>

        {/* Banner status koneksi offline & antrean unggah ulang PWA (PRD §8) */}
        {(isOffline || state.offlineQueue.length > 0) && (
          <div className="alert-card alert-card--warn" role="status">
            <CloudOff size={22} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>
                {isOffline
                  ? 'Mode offline aktif (cache PWA)'
                  : `${state.offlineQueue.length} foto di antrean siap dikirim`}
              </div>
              <p className="t-small t-soft">
                {isOffline
                  ? 'Halaman utama tetap bisa dibaca. Foto scan baru akan disimpan ke antrean dan diunggah otomatis saat sinyal kembali.'
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

        {/* Layar aktif */}
        <main key={activeScreen} className="page-enter">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav 5 item: Beranda, Tanaman, [FAB SCAN 64px], Lahan, Cermo (DESIGN.md §6 & §7) */}
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
            aria-label="Scan tanaman tomat"
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

      {/* Modal Notifikasi */}
      {showNotifModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNotifModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Daftar notifikasi"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="t-h2">Notifikasi & pengingat</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowNotifModal(false)}
                aria-label="Tutup notifikasi"
              >
                <X size={20} />
              </button>
            </div>
            {state.notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CermoMascot pose="happy" size={80} />
                <p className="t-body t-soft" style={{ marginTop: 12 }}>
                  Belum ada notifikasi baru. Kebunmu terlihat tenang!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {state.notifications.map((n) => (
                  <div key={n.id} className="card-subtle">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: '0.9375rem' }}>{n.judul}</strong>
                      <span className="t-micro t-soft">{n.waktu}</span>
                    </div>
                    <p className="t-small t-soft">{n.isi}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
