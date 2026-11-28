'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, ExternalLink, Send, Sparkles, Unlink } from 'lucide-react';
import { useApp } from '../state/AppContext';

type BotInfo = {
  configured: boolean;
  username: string;
  botUrl: string;
  error: string;
  webhook: {
    configured: boolean;
    endpointValid: boolean;
    pendingUpdates: number;
    lastError?: string;
  };
};

/* Kartu Pengingat Telegram — tautkan bot, atur jam kirim, uji kirim & putuskan (dipakai di Pengaturan) */
export const TelegramSettingsCard: React.FC = () => {
  const {
    state,
    linkTelegram,
    refreshTelegramConnection,
    unlinkTelegram,
    sendTestTelegramReminder,
    updateUserProfile,
  } = useApp();

  const [tgBusy, setTgBusy] = useState(false);
  const [tgFeedback, setTgFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [tgLink, setTgLink] = useState<{ code: string; expiresAt: string; botUrl: string } | null>(null);
  const [tgBotInfo, setTgBotInfo] = useState<BotInfo>({
    configured: false,
    username: '',
    botUrl: '',
    error: '',
    webhook: { configured: false, endpointValid: false, pendingUpdates: 0 },
  });

  const isLinked = Boolean(state.user.telegramChatId);

  // Pantau status tautan selama kartu tampil (deteksi otomatis setelah user menekan Start di bot)
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const result = await refreshTelegramConnection();
      if (!active) return;
      if (!result.ok) {
        setTgFeedback((current) =>
          current?.ok === false && current.text === result.message ? current : { ok: false, text: result.message }
        );
        return;
      }
      if (result.connected) {
        setTgLink(null);
        setTgFeedback((current) =>
          current?.ok && current.text === 'Akun Telegram berhasil terhubung.'
            ? current
            : { ok: true, text: 'Akun Telegram berhasil terhubung.' }
        );
        return;
      }
      setTgFeedback((current) => (current?.ok === false ? null : current));
      const nextLink =
        result.code && result.expiresAt && result.botUrl
          ? { code: result.code, expiresAt: result.expiresAt, botUrl: result.botUrl }
          : null;
      setTgLink((current) =>
        current?.code === nextLink?.code &&
        current?.expiresAt === nextLink?.expiresAt &&
        current?.botUrl === nextLink?.botUrl
          ? current
          : nextLink
      );
    };

    void refresh();
    // Sudah tertaut: cukup cek sekali; belum tertaut: polling tiap 5 detik menunggu Start di bot
    const intervalId = isLinked ? null : window.setInterval(refresh, 5000);
    return () => {
      active = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [refreshTelegramConnection, isLinked]);

  useEffect(() => {
    fetch('/api/telegram/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setTgBotInfo({
          configured: Boolean(d.configured && d.ok),
          username: d.username || '',
          botUrl: d.botUrl || '',
          error: d.error || '',
          webhook: {
            configured: Boolean(d.webhook?.configured),
            endpointValid: Boolean(d.webhook?.endpointValid),
            pendingUpdates: Number(d.webhook?.pendingUpdates || 0),
            lastError: d.webhook?.lastError,
          },
        });
      })
      .catch(() => {});
  }, []);

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Send size={20} color="var(--leaf-600)" />
          <div>
            <h3 className="t-h3">Pengingat Telegram</h3>
            <p className="t-micro t-soft">Jadwal panen, siram &amp; peringatan sensor dikirim ke chat Telegram-mu</p>
          </div>
        </div>
        <span className={`pill ${isLinked ? 'pill-ok' : 'pill-neutral'}`}>{isLinked ? 'Tertaut' : 'Belum tertaut'}</span>
      </div>

      {tgBotInfo.configured && (!tgBotInfo.webhook.configured || !tgBotInfo.webhook.endpointValid) && (
        <div className="alert-card alert-card--warn" role="status">
          <div>
            <strong>Webhook Telegram belum siap</strong>
            <p className="t-small" style={{ marginTop: 4 }}>
              Tombol Start tidak akan diproses sampai webhook terdaftar ke URL HTTPS <code>/api/telegram/webhook</code>.
              Daftarkan webhook untuk domain aplikasi sesuai langkah di README, lalu coba Start lagi.
            </p>
          </div>
        </div>
      )}
      {tgBotInfo.webhook.lastError && (
        <div className="alert-card alert-card--warn" role="status">
          <div>
            <strong>Telegram gagal menghubungi webhook</strong>
            <p className="t-small" style={{ marginTop: 4 }}>
              {tgBotInfo.webhook.lastError}
              {tgBotInfo.webhook.pendingUpdates > 0 && ` (${tgBotInfo.webhook.pendingUpdates} update tertunda)`}
            </p>
          </div>
        </div>
      )}

      {!isLinked ? (
        <>
          <div className="card-subtle" style={{ textAlign: 'center', padding: 18 }}>
            {tgLink ? (
              <>
                <div className="t-micro t-soft">
                  Kode tautan berlaku sampai{' '}
                  {new Date(tgLink.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div
                  className="font-display tabular-nums"
                  style={{ fontSize: '2rem', letterSpacing: '0.18em', color: 'var(--leaf-700)', margin: '6px 0' }}
                >
                  {tgLink.code}
                </div>
                <a
                  href={`${tgLink.botUrl}?start=${tgLink.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ minHeight: 40, padding: '7px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
                >
                  Buka Bot @{tgBotInfo.username || 'Telegram'} <ExternalLink size={14} />
                </a>
              </>
            ) : (
              <>
                {!tgBotInfo.configured && (
                  <p className="t-small t-soft" style={{ marginBottom: 10 }}>
                    {tgBotInfo.error || 'Bot Telegram belum dikonfigurasi oleh admin aplikasi.'}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  disabled={tgBusy || !tgBotInfo.configured}
                  onClick={async () => {
                    setTgBusy(true);
                    setTgFeedback(null);
                    const result = await linkTelegram();
                    setTgBusy(false);
                    setTgFeedback({ ok: result.ok, text: result.message });
                    if (result.ok && result.code && result.expiresAt && result.botUrl) {
                      setTgLink({ code: result.code, expiresAt: result.expiresAt, botUrl: result.botUrl });
                    }
                  }}
                >
                  <Sparkles size={16} /> {tgBusy ? 'Membuat tautan...' : 'Buat kode tautan 6 digit'}
                </button>
              </>
            )}
          </div>

          {tgLink && (
            <p className="t-small t-soft">
              Tekan <strong>Start</strong> di Telegram. Koneksi terdeteksi otomatis di sini, dan kode hanya berlaku 10 menit.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="alert-card alert-card--ok">
            <BellRing size={20} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
            <div>
              <strong>Tersambung ke Chat ID {state.user.telegramChatId}</strong>
              <p className="t-small t-soft" style={{ marginTop: 3 }}>
                Jadwal panen/siram ({state.user.telegramReminderTime} WIB), peringatan sensor kritis, dan temuan penyakit
                scan dikirim ke Telegram.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <label htmlFor="tg-time" className="t-small" style={{ fontWeight: 700 }}>
              Jam pengingat Telegram (WIB)
            </label>
            <input
              id="tg-time"
              type="time"
              className="time-pill-input"
              value={state.user.telegramReminderTime}
              onChange={(e) => updateUserProfile({ telegramReminderTime: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={tgBusy}
              onClick={async () => {
                setTgBusy(true);
                setTgFeedback(null);
                const res = await sendTestTelegramReminder();
                setTgBusy(false);
                setTgFeedback({ ok: res.ok, text: res.message });
              }}
            >
              <Send size={16} /> {tgBusy ? 'Mengirim ke Telegram...' : 'Uji kirim sekarang'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={tgBusy}
              onClick={async () => {
                setTgBusy(true);
                const result = await unlinkTelegram();
                setTgBusy(false);
                setTgFeedback({ ok: result.ok, text: result.message });
              }}
            >
              <Unlink size={15} /> Putuskan
            </button>
          </div>
        </>
      )}

      {tgFeedback && (
        <div className={`alert-card ${tgFeedback.ok ? 'alert-card--ok' : 'alert-card--warn'}`} role="status">
          <div className="t-small">{tgFeedback.text}</div>
        </div>
      )}
    </section>
  );
};
