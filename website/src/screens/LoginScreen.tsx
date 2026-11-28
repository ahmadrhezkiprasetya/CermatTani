'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Sprout,
  User,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { PakCermatMascot, type PakCermatPose } from '../components/PakCermatMascot';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { AUTH_WAVE_DEFAULT, buildWaveMask, type AuthWave } from '@/lib/authWave';
// TOOLS SEMENTARA: editor gelombang (aktif via ?wave-editor). Hapus setelah bentuk final.
import { AuthWaveEditor, loadWaveEditorDraft } from '../components/AuthWaveEditor';

function translateAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email atau kata sandi belum cocok. Periksa kembali atau daftar akun baru.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email akun ini belum dikonfirmasi. Buka kotak masuk/spam emailmu lalu klik tautan verifikasi.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk dengan akun yang sudah ada.';
  }
  if (lower.includes('password should be at least')) {
    return 'Kata sandi minimal 6 karakter agar akunmu aman.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi ya.';
  }
  return raw || 'Terjadi kendala saat menghubungkan akun. Coba lagi beberapa saat.';
}

const BOKEH_BUBBLES = Array.from({ length: 14 }, (_, index) => index);

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
  const [namaKebun, setNamaKebun] = useState('');
  const [lokasiKebun, setLokasiKebun] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [focusedField, setFocusedField] = useState<'nama' | 'email' | 'password' | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const passwordStrength = [
    password.length >= 8,
    /[a-z]/i.test(password) && /\d/.test(password),
    /[A-Z]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const mascotPose: PakCermatPose = busy
    ? 'bibit'
    : errorMsg
      ? 'analisis'
      : focusedField === 'password'
        ? 'inspeksi'
        : focusedField
          ? 'analisis'
          : mode === 'register'
            ? 'catat'
            : 'jempol';
  const mascotMessage = busy
    ? 'Sebentar ya, Juragan. Sedang menyiapkan kebunmu.'
    : errorMsg
      ? 'Waduh, coba kita periksa sekali lagi ya.'
      : mode === 'register'
        ? 'Daftar dulu, nanti saya bantu pantau tanamanmu.'
        : focusedField === 'password'
          ? 'Tenang, saya nggak ngintip kok.'
          : 'Sugeng rawuh, Juragan!';

  // TOOLS SEMENTARA: draft gelombang dari editor (null = editor tidak aktif).
  const [waveDraft, setWaveDraft] = useState<AuthWave | null>(null);
  React.useEffect(() => {
    setWaveDraft(loadWaveEditorDraft());
  }, []);
  const wave = waveDraft ?? AUTH_WAVE_DEFAULT;
  const cardStyle = React.useMemo(
    () =>
      ({
        '--auth-wave-w': `${wave.width}px`,
        '--auth-wave-mask': buildWaveMask(wave.nodes, mode === 'register'),
      }) as React.CSSProperties,
    [wave, mode]
  );

  React.useEffect(() => {
    if (authUser) {
      setActiveScreen(postLoginScreen || 'beranda');
    }
  }, [authUser, postLoginScreen, setActiveScreen]);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg('');
    setInfoMsg('');
    setTermsAccepted(false);
    setFocusedField(null);
    setShowPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Masukkan alamat email yang valid, misalnya petani@gmail.com.');
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
      if (!termsAccepted) {
        setErrorMsg('Setujui syarat dan kebijakan privasi sebelum membuat akun.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signInAccount(cleanEmail, password);
      } else {
        const result = await registerAccount({
          nama: nama.trim(),
          email: cleanEmail,
          password,
          namaKebun: namaKebun.trim() || 'Kebun Utama',
          lokasiKebun: lokasiKebun.trim() || 'Lahan Budidaya',
        });
        if (result.needsEmailConfirmation) {
          switchMode('login');
          setPassword('');
          setConfirmPassword('');
          setInfoMsg(
            'Akun berhasil dibuat. Buka kotak masuk atau spam emailmu, lalu klik tautan konfirmasi sebelum masuk.'
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMsg(translateAuthError(message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="ct-auth-page">
      <div className="ct-auth-bokeh" aria-hidden="true">
        {BOKEH_BUBBLES.map((bubble) => <span key={bubble} />)}
      </div>

      <section
        className={`ct-auth-card ct-auth-card--${mode}`}
        style={cardStyle}
        aria-label={mode === 'login' ? 'Masuk ke CermatTani' : 'Daftar akun CermatTani'}
      >
        <section className="ct-auth-art" aria-label="Pak Cermat menyambut petani">
          <a
            href="/"
            className="ct-auth-brand"
            onClick={(event) => {
              event.preventDefault();
              setActiveScreen('landing');
            }}
          >
            <span className="ct-auth-brand-mark"><Sprout size={19} /></span>
            <span>
              <strong>CermatTani</strong>
              <small>Cermat memeriksa, tepat memutuskan</small>
            </span>
          </a>

          <div className="ct-auth-art-heading">
            <span>SAHABAT DI SETIAP MUSIM</span>
            <p>{mode === 'login' ? 'Rawat dengan cermat.' : 'Mulai tumbuh bersama.'}</p>
          </div>

          <div className="ct-auth-scene" aria-hidden="true">
            <div className="ct-auth-blob ct-auth-blob--large" />
            <div className="ct-auth-blob ct-auth-blob--small" />
            <svg className="ct-auth-farm" viewBox="0 0 540 360" fill="none">
              <circle cx="402" cy="72" r="31" fill="#F8C55D" />
              <circle cx="402" cy="72" r="46" fill="#F8C55D" fillOpacity=".16" />
              {/* Bukit diperpanjang ke kiri, kanan & bawah agar menyatu sampai tepi gelombang dan dasar panel. */}
              <path d="M-320 214C-200 190-90 186 0 206C77 158 136 175 202 198c82 28 136-9 204-29 59-18 96-5 134 16 110 24 220 12 360-6V470H-320Z" fill="#B9DDA9" />
              <path d="M-320 250C-210 226-100 222 0 238c80-38 145-27 218 2 75 29 147 1 209-19 47-15 80-11 113 3 100 22 200 18 360 4V470H-320Z" fill="#72B987" />
              <path d="M-320 280C-210 258-100 254 0 267c82-29 154-17 230 13 74 29 141 10 205-8 43-12 75-8 105 3 100 20 200 16 360 4V470H-320Z" fill="#4C9D70" />
              <path d="M9 255c71-23 134-12 199 12m-165 4c70-21 124-9 182 12m-107-49c70-20 129-8 188 13m-89 41c67-18 122-8 177 9" stroke="#D8F3C8" strokeOpacity=".8" strokeWidth="5" strokeLinecap="round" />
              <path d="M375 351c-10-47 10-82 40-111 24-23 52-41 73-64-7 41-20 66-44 94-22 26-41 49-41 81h-28Z" fill="#6BC4CC" />
              <path d="M377 351c-6-40 12-73 37-99m-25 88c7-41 31-73 62-102" stroke="#E4FAF7" strokeWidth="4" strokeLinecap="round" />
              <path d="M91 233v-38l26-22 26 22v38H91Z" fill="#9E704A" />
              <path d="M83 198 117 168l34 30H83Z" fill="#6B4A2E" />
              <path d="M103 233v-23h15v23" fill="#F2D9A6" />
              <g className="ct-auth-rice">
                <path d="M68 285c0-23-8-39-21-51m22 51c3-29 13-45 30-58m-28 58c-9-24-20-35-36-42" stroke="#276B49" strokeWidth="4" strokeLinecap="round" />
                <path d="M46 233c-8-1-12-7-10-13 8 0 13 4 14 11m26 5c1-8 7-12 14-10-1 8-5 12-13 12m-31 13c-8-2-12-8-10-15 8 1 13 6 14 13" fill="#D9B84F" />
              </g>
              <g className="ct-auth-rice ct-auth-rice--second">
                <path d="M187 278c-1-24-8-39-21-51m23 51c3-27 13-43 29-56m-29 56c-9-23-20-35-36-42" stroke="#276B49" strokeWidth="4" strokeLinecap="round" />
                <path d="M166 227c-8-1-12-7-10-13 8 0 13 4 14 11m25 5c1-8 7-12 14-10-1 8-5 12-13 12m-31 13c-8-2-12-8-10-15 8 1 13 6 14 13" fill="#D9B84F" />
              </g>
            </svg>
            <span className="ct-auth-dew ct-auth-dew--one" />
            <span className="ct-auth-dew ct-auth-dew--two" />
            <span className="ct-auth-dew ct-auth-dew--three" />
            <div key={mascotPose} className="ct-auth-mascot">
              <div className="ct-auth-speech">{mascotMessage}</div>
              <PakCermatMascot pose={mascotPose} height={250} />
            </div>
          </div>

          <p className="ct-auth-art-caption">Langkah cermat hari ini, panen lebih baik esok hari.</p>
          <svg className="ct-auth-wave" viewBox="0 0 390 48" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 27c54-21 90 14 147 6 55-8 88-26 141-14 40 9 67 15 102 2v27H0V27Z" fill="#286c46" />
          </svg>
        </section>

        <section className="ct-auth-form-panel">
          <div className="ct-auth-form-scroll">
            <button type="button" className="ct-auth-home-link" onClick={() => setActiveScreen('landing')}>
              <ArrowLeft size={15} /> Beranda
            </button>

            <header className="ct-auth-form-heading">
              <span>{mode === 'login' ? 'SENANG MELIHATMU LAGI' : 'RUANG BARU UNTUK KEBUNMU'}</span>
              <h1>{mode === 'login' ? 'Masuk' : 'Daftar'}</h1>
              <p>
                {mode === 'login'
                  ? 'Masuk untuk melanjutkan cerita kebunmu.'
                  : 'Buat akun dan mulai mencatat perjalanan kebunmu.'}
              </p>
            </header>

            {!isSupabaseConfigured && (
              <div className="ct-auth-alert ct-auth-alert--warning" role="alert">
                <AlertTriangle size={17} />
                <span>Layanan akun belum siap. Silakan hubungi pengelola CermatTani.</span>
              </div>
            )}

            {errorMsg && (
              <div className="ct-auth-alert ct-auth-alert--error" role="alert" aria-live="polite">
                <AlertTriangle size={17} />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="ct-auth-alert ct-auth-alert--success" role="status" aria-live="polite">
                <CheckCircle2 size={17} />
                <span>{infoMsg}</span>
              </div>
            )}

            <form key={mode} id="auth-form" className="ct-auth-form" onSubmit={handleSubmit}>
              {/* Mode daftar: kolom dipasangkan 2-2 agar form muat di layar tanpa tertutup. */}
              <div className="ct-auth-field-row">
                {mode === 'register' && (
                  <div className="field-group">
                    <label htmlFor="auth-nama" className="field-label">Nama lengkap</label>
                    <div className="ct-auth-input-wrap">
                      <User size={17} aria-hidden="true" />
                      <input
                        id="auth-nama"
                        type="text"
                        required
                        minLength={2}
                        className="field-input"
                        placeholder="Nama panggilanmu"
                        value={nama}
                        onFocus={() => setFocusedField('nama')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(event) => setNama(event.target.value)}
                        autoComplete="name"
                      />
                    </div>
                  </div>
                )}

                <div className="field-group">
                  <label htmlFor="auth-email" className="field-label">Email</label>
                  <div className="ct-auth-input-wrap">
                    <Mail size={17} aria-hidden="true" />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      className="field-input"
                      placeholder="nama@email.com"
                      value={email}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>

              {mode === 'register' && (
                <div className="ct-auth-field-row">
                  <div className="field-group">
                    <label htmlFor="auth-farm" className="field-label">Nama kebun (opsional)</label>
                    <div className="ct-auth-input-wrap">
                      <Sprout size={17} aria-hidden="true" />
                      <input
                        id="auth-farm"
                        type="text"
                        className="field-input"
                        placeholder="Kebun Lembang"
                        value={namaKebun}
                        onFocus={() => setFocusedField('nama')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(event) => setNamaKebun(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field-group">
                    <label htmlFor="auth-location" className="field-label">Lokasi kebun (opsional)</label>
                    <div className="ct-auth-input-wrap">
                      <MapPin size={17} aria-hidden="true" />
                      <input
                        id="auth-location"
                        type="text"
                        className="field-input"
                        placeholder="Desa / kecamatan"
                        value={lokasiKebun}
                        onFocus={() => setFocusedField('nama')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(event) => setLokasiKebun(event.target.value)}
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="ct-auth-field-row">
                <div className="field-group">
                  <label htmlFor="auth-password" className="field-label">Kata sandi</label>
                  <div className="ct-auth-input-wrap">
                    <Lock size={17} aria-hidden="true" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="field-input"
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="ct-auth-visibility"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {mode === 'register' && password.length > 0 && (
                    <div className="ct-auth-strength" aria-live="polite">
                      <div className="ct-auth-strength-leaves" aria-hidden="true">
                        {[1, 2, 3, 4].map((leaf) => (
                          <span key={leaf} className={passwordStrength >= leaf ? 'is-lit' : ''} />
                        ))}
                      </div>
                      <span>{['Minimal 8 karakter', 'Mulai kuat', 'Cukup kuat', 'Kuat', 'Sangat kuat'][passwordStrength]}</span>
                    </div>
                  )}
                </div>

                {mode === 'register' && (
                  <div className="field-group">
                    <label htmlFor="auth-confirm" className="field-label">Konfirmasi kata sandi</label>
                    <div className="ct-auth-input-wrap">
                      <Lock size={17} aria-hidden="true" />
                      <input
                        id="auth-confirm"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="field-input"
                        placeholder="Ulangi kata sandi"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        aria-invalid={Boolean(confirmPassword && password !== confirmPassword)}
                        aria-describedby={confirmPassword ? 'auth-confirm-feedback' : undefined}
                      />
                    </div>
                    {confirmPassword && (
                      <span
                        id="auth-confirm-feedback"
                        className={`ct-auth-confirm ${password === confirmPassword ? 'is-match' : 'is-mismatch'}`}
                        aria-live="polite"
                      >
                        {password === confirmPassword ? 'Kata sandi cocok' : 'Kata sandi belum sama'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {mode === 'login' ? (
                <div className="ct-auth-forgot">
                  <a href="mailto:bantuan@cermattani.id?subject=Bantuan%20Kata%20Sandi">Lupa kata sandi?</a>
                </div>
              ) : (
                <>
                  <label className="ct-auth-terms">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                    />
                    <span className="ct-auth-checkbox" aria-hidden="true"><Check size={13} /></span>
                    <span>
                      Saya menyetujui{' '}
                      <a href="mailto:bantuan@cermattani.id?subject=Syarat%20dan%20Ketentuan">Syarat &amp; Ketentuan</a>
                      {' '}serta{' '}
                      <a href="mailto:bantuan@cermattani.id?subject=Kebijakan%20Privasi">Kebijakan Privasi</a>.
                    </span>
                  </label>
                </>
              )}

              <button
                type="submit"
                className="ct-auth-submit"
                disabled={busy || !isSupabaseConfigured}
                aria-busy={busy}
              >
                {busy ? (
                  <>
                    <Sprout size={18} className="ct-auth-loading-sprout" />
                    {mode === 'login' ? 'Memeriksa akun...' : 'Menyiapkan kebunmu...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Masuk ke kebun' : 'Daftar sekarang'}
                    <ArrowLeft size={17} className="ct-auth-submit-arrow" />
                  </>
                )}
              </button>

              <p className="ct-auth-switch">
                {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Daftar sekarang' : 'Masuk'}
                </button>
              </p>
            </form>

            <div className="ct-auth-security">
              <ShieldCheck size={15} />
              <span>Data kebunmu tetap privat dan terlindungi.</span>
            </div>
          </div>
        </section>

        {waveDraft && (
          <AuthWaveEditor wave={waveDraft} onChange={setWaveDraft} flipped={mode === 'register'} />
        )}

        <div className="ct-auth-card-footer">
          <span>© 2026 Cermat Tani</span>
          <a href="mailto:bantuan@cermattani.id">Butuh bantuan? Hubungi kami</a>
        </div>
      </section>
    </main>
  );
};
