'use client';

import React, { useState } from 'react';
import {
  BellRing,
  Clock,
  Database,
  Download,
  Globe,
  LogOut,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  User,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { downloadCsv } from '../utils/scanAnalyzer';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { isSupabaseConfigured } from '@/lib/supabase/client';

/* Layar 10: Pengaturan (akun, Telegram, ambang, tema, ekspor, privasi & hapus data) */
export const SettingsScreen: React.FC = () => {
  const {
    state,
    authUser,
    openLogin,
    signOutAccount,
    updateUserProfile,
    updateSettings,
    updateSensor,
    updateReminderSchedule,
    triggerTestReminderAlert,
    requestBrowserNotifications,
    setActiveScreen,
    reopenOnboarding,
    resetDemoData,
    deleteAllUserData,
  } = useApp();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [sbMsg, setSbMsg] = useState<string>('');

  const handleSupabaseLogout = async () => {
    await signOutAccount();
    setSbMsg('Berhasil keluar dari akun.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const exportAllScans = () => {
    const headers = ['ID', 'Tanaman', 'Waktu', 'Bagian', 'Tahap', 'Penyakit', 'Keyakinan (%)', 'Dugaan Hara'];
    const rows = state.scans.map((s) => {
      const p = state.plants.find((pl) => pl.id === s.plantId);
      return [
        s.id,
        p?.nama || s.plantId,
        s.waktu,
        s.bagian,
        s.tahapDominan ? RIPENESS_REFERENCE[s.tahapDominan].label : '-',
        s.penyakitUtamaNama,
        s.keyakinan,
        s.dugaanHaraNama,
      ];
    });
    downloadCsv('cermattani-riwayat-scan.csv', headers, rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920, margin: '0 auto', width: '100%' }}>
      {/* Header Ringkas Pengaturan */}
      <section
        className="card stagger-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '18px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <CermoMascot pose="wave" size={56} />
          <div>
            <h2 className="t-h2" style={{ fontSize: '1.3rem' }}>Pengaturan kebun &amp; akun</h2>
            <p className="t-small t-soft" style={{ marginTop: 2 }}>
              Kelola profil, tampilan terang/gelap, ambang peringatan, dan data lokalmu.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`pill ${isSupabaseConfigured ? 'pill-ok' : 'pill-neutral'}`}>
            {isSupabaseConfigured ? 'Supabase aktif' : 'Mode lokal'}
          </span>
          <span className="pill pill-neutral">
            Tema: {state.settings.tema === 'dark' ? 'Gelap' : state.settings.tema === 'light' ? 'Terang' : 'Sistem'}
          </span>
        </div>
      </section>

      {/* Koneksi Database Supabase (Akun, Kebun, Scan & AI, Basis Pengetahuan, IoT & Irigasi, Jadwal & Chat) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} color="var(--leaf-600)" />
            <h3 className="t-h3">Database Supabase</h3>
          </div>
          <span className={`pill ${isSupabaseConfigured ? 'pill-ok' : 'pill-warn'}`}>
            {isSupabaseConfigured ? 'Terkonfigurasi' : 'Mode lokal (belum diisi .env)'}
          </span>
        </div>

        {!isSupabaseConfigured ? (
          <div className="card-subtle">
            <p className="t-small">
              Untuk menyambungkan 11 tabel Supabase (Akun, Kebun, Scan &amp; AI, Basis Pengetahuan,
              IoT &amp; Irigasi, Jadwal &amp; Chat):
            </p>
            <ol className="t-small t-soft" style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 4 }}>
              <li>Jalankan <code>supabase/migrations/001_cermattani_schema.sql</code> dan <code>supabase/seed.sql</code> di SQL Editor Supabase.</li>
              <li>Salin <code>website/.env.example</code> menjadi <code>website/.env.local</code> lalu isi URL &amp; Key proyekmu.</li>
              <li>Restart <code>npm run dev</code> di folder <code>website/</code>.</li>
            </ol>
          </div>
        ) : authUser ? (
          <div className="alert-card alert-card--ok">
            <Database size={20} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
            <div style={{ flex: 1 }}>
              <strong>Masuk sebagai {authUser.email}</strong>
              <p className="t-small" style={{ marginTop: 4 }}>
                Seluruh tabel akun (profiles, farms, plants, scans, harvest_events, chat_messages) aktif tersinkron dengan RLS Supabase.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={handleSupabaseLogout}>
              <LogOut size={16} /> Keluar
            </button>
          </div>
        ) : (
          <div className="card-subtle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <strong className="t-small">Belum masuk ke akun CermatTani</strong>
              <p className="t-micro t-soft" style={{ marginTop: 2 }}>
                Login atau daftar akun untuk menyinkronkan kebun, riwayat scan, dan obrolan Cermo ke database Supabase.
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={() => openLogin('pengaturan')}>
              Buka Halaman Login
            </button>
          </div>
        )}

        {sbMsg && <p className="t-small" style={{ fontWeight: 600, color: 'var(--leaf-600)' }}>{sbMsg}</p>}
      </section>

      {/* Akun & Profil */}
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <User size={20} color="var(--leaf-600)" />
          <h3 className="t-h3">Profil pengguna</h3>
        </div>
        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div className="field-group">
              <label htmlFor="set-name" className="field-label">
                Nama panggilan
              </label>
              <input
                id="set-name"
                className="field-input"
                value={state.user.nama}
                onChange={(e) => updateUserProfile({ nama: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label htmlFor="set-role" className="field-label">
                Profil budidaya
              </label>
              <input
                id="set-role"
                className="field-input"
                value={state.user.peran}
                onChange={(e) => updateUserProfile({ peran: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" className="btn-primary">
              Simpan profil
            </button>
            <button type="button" className="btn-secondary" onClick={() => setActiveScreen('kalender')}>
              Atur bot Telegram ({state.user.telegramChatId ? 'Tertaut' : 'Belum tertaut'})
            </button>
            {savedNotice && <span className="pill pill-ok">Profil diperbarui</span>}
          </div>
        </form>
      </section>

      {/* Tema & Bahasa (X2) */}
      <section className="card" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sun size={20} color="var(--leaf-600)" />
          <h3 className="t-h3">Tampilan & bahasa</h3>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'light', label: 'Mode terang', icon: Sun },
              { id: 'dark', label: 'Mode gelap', icon: Moon },
              { id: 'system', label: 'Ikuti perangkat', icon: Globe },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const active = state.settings.tema === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateSettings({ tema: opt.id })}
                className={active ? 'btn-primary' : 'btn-secondary'}
              >
                <Icon size={18} /> {opt.label}
              </button>
            );
          })}
        </div>

        <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong>Bahasa antarmuka</strong>
            <p className="t-micro t-soft">Versi 1.0 fokus bahasa Indonesia sehari-hari; bahasa Inggris di fase 2.</p>
          </div>
          <span className="pill pill-ok">Bahasa Indonesia (Aktif)</span>
        </div>
      </section>

      {/* Jadwal Pengingat & Alert Kanan Atas */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BellRing size={20} color="var(--leaf-600)" />
            <div>
              <h3 className="t-h3">Jadwal pengingat &amp; alert kanan atas</h3>
              <p className="t-micro t-soft">
                Atur jam siram, cek daun, pemupukan, dan panen. Peringatan muncul otomatis di pojok kanan atas.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: 38, padding: '6px 12px', fontSize: '0.82rem' }}
            onClick={() => triggerTestReminderAlert()}
          >
            <Sparkles size={15} /> Uji alert kanan atas
          </button>
        </div>

        <div className="form-grid-2">
          <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <strong className="t-small" style={{ display: 'block' }}>Alert otomatis sensor</strong>
              <span className="t-micro t-soft">Tanah kering, tandon rendah, risiko jamur &amp; baterai</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.settings.peringatanOtomatisSensor}
              aria-label="Toggle alert otomatis sensor"
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

          <div className="card-subtle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <strong className="t-small" style={{ display: 'block' }}>Notifikasi perangkat/browser</strong>
              <span className="t-micro t-soft">Kirim notifikasi sistem saat jadwal tiba</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.settings.notifikasiBrowser}
              aria-label="Toggle notifikasi browser"
              className="alert-switch"
              onClick={() => {
                if (state.settings.notifikasiBrowser) {
                  updateSettings({ notifikasiBrowser: false });
                } else {
                  void requestBrowserNotifications();
                }
              }}
            >
              <span className="alert-switch-thumb" />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {state.settings.jadwalPengingat.map((item) => (
            <div
              key={item.id}
              className={`schedule-row ${!item.aktif ? 'schedule-row--off' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: '0.88rem' }}>{item.label}</strong>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.aktif}
                  aria-label={`Aktifkan ${item.label}`}
                  className="alert-switch"
                  onClick={() => updateReminderSchedule(item.id, { aktif: !item.aktif })}
                >
                  <span className="alert-switch-thumb" />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} color="var(--ink-soft)" />
                  <input
                    type="time"
                    className="time-pill-input"
                    aria-label={`Jam ${item.label}`}
                    value={item.jam}
                    onChange={(e) => updateReminderSchedule(item.id, { jam: e.target.value })}
                  />
                  <span className="t-micro t-soft">WIB</span>
                </div>
                <button
                  type="button"
                  className="alert-toast-action"
                  onClick={() => triggerTestReminderAlert(item.id)}
                >
                  Uji
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ambang Sistem (F2.4, F10, F11, F12, F13) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sliders size={20} color="var(--leaf-600)" />
          <h3 className="t-h3">Ambang peringatan & perangkat</h3>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="th-conf" className="t-small" style={{ fontWeight: 600 }}>
              Ambang peringatan keyakinan rendah AI (F2.4)
            </label>
            <strong className="tabular-nums">{state.settings.ambangKeyakinanRendah}%</strong>
          </div>
          <input
            id="th-conf"
            type="range"
            min={40}
            max={85}
            value={state.settings.ambangKeyakinanRendah}
            onChange={(e) => updateSettings({ ambangKeyakinanRendah: Number(e.target.value) })}
            className="range-slider"
          />
          <p className="t-micro t-soft">
            Bila keyakinan di bawah nilai ini, Cermo tampilkan peringatan kuning & saran konfirmasi ke penyuluh.
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="th-rh" className="t-small" style={{ fontWeight: 600 }}>
              Ambang kelembapan udara risiko penyakit (F11.3)
            </label>
            <strong className="tabular-nums">{state.settings.ambangKelembapanRisikoPenyakit}% RH</strong>
          </div>
          <input
            id="th-rh"
            type="range"
            min={70}
            max={95}
            value={state.settings.ambangKelembapanRisikoPenyakit}
            onChange={(e) => updateSettings({ ambangKelembapanRisikoPenyakit: Number(e.target.value) })}
            className="range-slider"
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label htmlFor="th-tank" className="t-small" style={{ fontWeight: 600 }}>
              Ambang peringatan level air tandon rendah (F12.2)
            </label>
            <strong className="tabular-nums">{state.settings.ambangTandonRendah}%</strong>
          </div>
          <input
            id="th-tank"
            type="range"
            min={10}
            max={40}
            value={state.settings.ambangTandonRendah}
            onChange={(e) => updateSettings({ ambangTandonRendah: Number(e.target.value) })}
            className="range-slider"
          />
        </div>

        <hr className="card-divider" />

        {/* Uji koneksi offline PWA & ketersediaan sensor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <strong className="t-small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <WifiOff size={16} /> Simulasikan koneksi offline (uji antrean PWA)
              </strong>
              <p className="t-micro t-soft">
                Saat aktif, foto scan akan masuk antrean lokal dan otomatis diproses ketika kembali online.
              </p>
            </div>
            <button
              type="button"
              className={state.settings.simulasikanOffline ? 'btn-tomato' : 'btn-secondary'}
              onClick={() => updateSettings({ simulasikanOffline: !state.settings.simulasikanOffline })}
            >
              {state.settings.simulasikanOffline ? 'Sedang Offline (Klik online)' : 'Online (Uji offline)'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <strong className="t-small">Data sensor untuk rekomendasi pupuk (F3.3)</strong>
              <p className="t-micro t-soft">
                Matikan untuk melihat label "Dugaan visual" saat kebun belum memakai perangkat sensor.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => updateSensor({ sensorTersedia: !state.sensor.sensorTersedia })}
            >
              {state.sensor.sensorTersedia ? 'Dengan data sensor' : 'Dugaan visual'}
            </button>
          </div>
        </div>
      </section>

      {/* Ekspor, Onboarding, Privasi & Hapus Data (PRD §8 & §12) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={20} color="var(--leaf-600)" />
          <h3 className="t-h3">Data, privasi & sumber rujukan</h3>
        </div>

        <p className="t-small t-soft">
          Foto dan riwayat tanaman sepenuhnya milik kamu dan tersimpan lokal di peramban ini.
          Referensi dataset & panduan agronomi: <strong>PlantVillage</strong>,{' '}
          <strong>LaboroTomato</strong>, <strong>Balitsa Kementan RI</strong>, dan{' '}
          <strong>FAO Tomato IPM</strong>. Hasil model dataset dan foto lapangan dilaporkan terpisah
          di dokumentasi karya tulis.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={exportAllScans}>
            <Download size={18} /> Ekspor riwayat scan CSV
          </button>
          <button type="button" className="btn-secondary" onClick={reopenOnboarding}>
            Ulangi onboarding (3 langkah)
          </button>
          <button type="button" className="btn-secondary" onClick={resetDemoData}>
            <RotateCcw size={18} /> Muat ulang data contoh
          </button>
          <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} /> Hapus akun & semua data
          </button>
        </div>
      </section>

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)} role="dialog" aria-modal="true">
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="t-h2" style={{ marginBottom: 8 }}>
              Hapus semua data lokal?
            </h3>
            <p className="t-body t-soft" style={{ marginBottom: 18 }}>
              Seluruh riwayat scan, daftar kebun, tanaman, jadwal panen, dan percakapan Cermo di
              perangkat ini akan dihapus permanen sesuai hak privasi pengguna.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                Batal
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  deleteAllUserData();
                  setConfirmDelete(false);
                }}
              >
                Ya, hapus semua data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
