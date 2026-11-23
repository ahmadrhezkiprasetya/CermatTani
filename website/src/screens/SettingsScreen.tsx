'use client';

import React, { useState } from 'react';
import {
  Download,
  Globe,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sun,
  Trash2,
  User,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { downloadCsv } from '../utils/scanAnalyzer';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';

/* Layar 10: Pengaturan (akun, Telegram, ambang, tema, ekspor, privasi & hapus data) */
export const SettingsScreen: React.FC = () => {
  const {
    state,
    updateUserProfile,
    updateSettings,
    updateSensor,
    setActiveScreen,
    reopenOnboarding,
    resetDemoData,
    deleteAllUserData,
  } = useApp();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
      <div>
        <h2 className="t-h1">Pengaturan</h2>
        <p className="t-small t-soft">
          Atur profil kebun, tampilan terang/gelap, ambang peringatan, dan privasi datamu.
        </p>
      </div>

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
