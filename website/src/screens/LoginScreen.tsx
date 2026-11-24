'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  MapPin,
  ShieldCheck,
  Sprout,
  User,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { PakCermatMascot } from '../components/PakCermatMascot';
import { isSupabaseConfigured } from '@/lib/supabase/client';

function translateAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email atau kata sandi belum cocok. Periksa kembali atau daftar akun baru.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email akun ini belum dikonfirmasi. Buka kotak masuk/spam emailmu lalu klik tautan verifikasi.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan pindah ke tab Masuk (Login).';
  }
  if (lower.includes('password should be at least')) {
    return 'Kata sandi minimal 6 karakter agar akunmu aman.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi ya.';
  }
  return raw || 'Terjadi kendala saat menghubungkan akun. Coba lagi beberapa saat.';
}

/* Halaman Resmi Login & Register CermatTani — Terhubung langsung ke seluruh tabel Supabase */
export const LoginScreen: React.FC = () => {
  const {
    setActiveScreen,
    signInAccount,
    registerAccount,
    authUser,
    postLoginScreen,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [namaKebun, setNamaKebun] = useState('Kebun Utama');
  const [lokasiKebun, setLokasiKebun] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Jika sudah login, arahkan langsung ke dasbor
  React.useEffect(() => {
    if (authUser) {
      setActiveScreen(postLoginScreen || 'beranda');
    }
  }, [authUser, postLoginScreen, setActiveScreen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Masukkan alamat email yang valid (contoh: petani@gmail.com).');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    if (mode === 'register') {
      if (nama.trim().length < 2) {
        setErrorMsg('Masukkan nama lengkap atau nama panggilanmu (minimal 2 huruf).');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Konfirmasi kata sandi tidak sama. Periksa kembali ya.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signInAccount(cleanEmail, password);
      } else {
        const res = await registerAccount({
          nama: nama.trim(),
          email: cleanEmail,
          password,
          namaKebun: namaKebun.trim() || 'Kebun Utama',
          lokasiKebun: lokasiKebun.trim() || 'Lahan Budidaya',
        });
        if (res.needsEmailConfirmation) {
          setInfoMsg(
            'Akun berhasil dibuat! Klik tautan konfirmasi di kotak masuk/spam emailmu lalu login — atau matikan "Confirm email" di Supabase → Authentication → Providers → Email agar bisa langsung masuk tanpa verifikasi email.'
          );
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(translateAuthError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(circle at 12% 10%, rgba(190, 232, 185, 0.34), transparent 44%), radial-gradient(circle at 88% 88%, rgba(250, 240, 212, 0.55), transparent 48%), var(--bg)',
        padding: '20px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Bar atas: kembali ke Halaman Utama */}
      <div
        style={{
          maxWidth: 1020,
          width: '100%',
          margin: '0 auto 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setActiveScreen('landing')}
          style={{ padding: '6px 12px' }}
        >
          <ArrowLeft size={17} /> Kembali ke Beranda Publik
        </button>
        <span className={`pill ${isSupabaseConfigured ? 'pill-ok' : 'pill-warn'}`}>
          <Database size={12} /> {isSupabaseConfigured ? 'Database Akun Terhubung' : 'Supabase .env belum diisi'}
        </span>
      </div>

      {/* Kontainer Kartu 2 Kolom Responsif */}
      <div
        className="login-split-grid"
        style={{
          maxWidth: 1020,
          width: '100%',
          margin: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: 22,
          alignItems: 'stretch',
        }}
      >
        {/* Header Ringkas Mobile — Identik dengan Login Screen Flutter App */}
        <div className="login-mobile-brand">
          <PakCermatMascot pose={mode === 'login' ? 'jempol' : 'bibit'} height={78} />
          <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>
            CermatTani
          </div>
          <div className="t-small t-soft">Cermat memeriksa, tepat memutuskan</div>
        </div>

        {/* Panel Kiri: Identitas CermatTani & Relasi Tabel Database */}
        <section
          className="card-forest login-info-panel"
          style={{
            padding: '28px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <PakCermatMascot pose={mode === 'login' ? 'jempol' : 'bibit'} height={72} />
              <div>
                <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>
                  CermatTani
                </div>
                <div className="t-small t-soft">Cermat memeriksa, tepat memutuskan</div>
              </div>
            </div>

            <h1 className="t-h2" style={{ fontSize: '1.55rem', lineHeight: 1.25 }}>
              {mode === 'login'
                ? 'Masuk ke akun kebunmu untuk lanjut memantau tanaman.'
                : 'Daftar akun petani gratis — seluruh riwayat kebun tersimpan rapi.'}
            </h1>

            <p className="t-small t-soft" style={{ lineHeight: 1.6 }}>
              Satu akun CermatTani otomatis terhubung ke seluruh tabel database kebunmu secara aman (RLS per akun):
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Profil & Pengaturan Akun', sub: 'Tabel profiles · nama, tema, ambang batas & Telegram' },
                { label: 'Multi-Kebun & Tanaman', sub: 'Tabel farms & plants · daftar lahan dan petak budidaya' },
                { label: 'Riwayat Foto & Hasil Scan AI', sub: 'Tabel scans & Storage · kematangan, penyakit & hara' },
                { label: 'Kalender Panen & Chat Cermo', sub: 'Tabel harvest_events & chat_messages · tersimpan per akun' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <CheckCircle2 size={17} color="var(--leaf-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--ink)' }}>{item.label}</div>
                    <div className="t-micro t-soft">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(23, 128, 63, 0.08)',
              fontSize: '0.78rem',
              color: 'var(--leaf-700)',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            Data tiap petani terisolasi otomatis dengan Row Level Security (RLS) Supabase.
          </div>
        </section>

        {/* Panel Kanan: Form Login & Register */}
        <section
          className="card"
          style={{
            padding: '28px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Tab Switcher Login / Daftar */}
          <div
            role="tablist"
            aria-label="Pilih masuk atau daftar akun"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              padding: 5,
              borderRadius: 14,
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setInfoMsg('');
              }}
              style={{
                border: 'none',
                borderRadius: 10,
                padding: '10px 12px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background: mode === 'login' ? 'var(--surface)' : 'transparent',
                color: mode === 'login' ? 'var(--leaf-700)' : 'var(--ink-soft)',
                boxShadow: mode === 'login' ? 'var(--shadow-card)' : 'none',
              }}
            >
              <LogIn size={16} /> Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setInfoMsg('');
              }}
              style={{
                border: 'none',
                borderRadius: 10,
                padding: '10px 12px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background: mode === 'register' ? 'var(--surface)' : 'transparent',
                color: mode === 'register' ? 'var(--leaf-700)' : 'var(--ink-soft)',
                boxShadow: mode === 'register' ? 'var(--shadow-card)' : 'none',
              }}
            >
              <UserPlus size={16} /> Daftar Akun
            </button>
          </div>

          <div>
            <h2 className="t-h2" style={{ fontSize: '1.3rem' }}>
              {mode === 'login' ? 'Masuk ke CermatTani' : 'Buat Akun Baru'}
            </h2>
            <p className="t-small t-soft" style={{ marginTop: 3 }}>
              {mode === 'login'
                ? 'Gunakan email dan kata sandi akun CermatTani milikmu.'
                : 'Isi data di bawah — profil, kebun awal, dan tanaman pertamamu langsung disiapkan di database.'}
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="alert-card alert-card--warn" role="alert">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div className="t-micro">
                Konfigurasi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{' '}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> belum aktif di file <code>website/.env</code>.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="alert-card alert-card--bad" role="alert">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div className="t-small">{errorMsg}</div>
            </div>
          )}

          {infoMsg && (
            <div className="alert-card alert-card--ok" role="status">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div className="t-small">{infoMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div className="field-group">
                <label htmlFor="auth-nama" className="field-label">
                  Nama Lengkap
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    color="var(--ink-soft)"
                    style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    id="auth-nama"
                    type="text"
                    required
                    className="field-input"
                    style={{ paddingLeft: 38, width: '100%' }}
                    placeholder="Contoh: Pak Budi Santoso"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="field-group">
              <label htmlFor="auth-email" className="field-label">
                Alamat Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="var(--ink-soft)"
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  className="field-input"
                  style={{ paddingLeft: 38, width: '100%' }}
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="auth-password" className="field-label">
                Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="var(--ink-soft)"
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="field-input"
                  style={{ paddingLeft: 38, paddingRight: 42, width: '100%' }}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--ink-soft)',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="field-group">
                  <label htmlFor="auth-confirm" className="field-label">
                    Konfirmasi Kata Sandi
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={16}
                      color="var(--ink-soft)"
                      style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      id="auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="field-input"
                      style={{ paddingLeft: 38, width: '100%' }}
                      placeholder="Ulangi kata sandi"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="auth-farm" className="field-label">
                      Nama Kebun Awal
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Sprout
                        size={15}
                        color="var(--ink-soft)"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        id="auth-farm"
                        type="text"
                        className="field-input"
                        style={{ paddingLeft: 34, width: '100%' }}
                        placeholder="Kebun Sayur Lembang"
                        value={namaKebun}
                        onChange={(e) => setNamaKebun(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field-group">
                    <label htmlFor="auth-loc" className="field-label">
                      Lokasi Kebun (opsional)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MapPin
                        size={15}
                        color="var(--ink-soft)"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        id="auth-loc"
                        type="text"
                        className="field-input"
                        style={{ paddingLeft: 34, width: '100%' }}
                        placeholder="Bandung Barat"
                        value={lokasiKebun}
                        onChange={(e) => setLokasiKebun(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !isSupabaseConfigured}
              style={{ width: '100%', minHeight: 48, marginTop: 4, fontSize: '0.96rem' }}
            >
              {busy
                ? mode === 'login'
                  ? 'Memeriksa akun & memuat data kebun...'
                  : 'Mendaftarkan akun & menyiapkan kebun...'
                : mode === 'login'
                  ? 'Masuk ke Dasbor Kebun'
                  : 'Daftar & Mulai Kelola Kebun'}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--ink-soft)',
              paddingTop: 6,
              borderTop: '1px solid var(--line)',
            }}
          >
            {mode === 'login' ? (
              <>
                Belum punya akun petani?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--leaf-700)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--leaf-700)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Masuk sekarang
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
