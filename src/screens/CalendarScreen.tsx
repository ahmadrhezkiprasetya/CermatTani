'use client';

import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  RefreshCw,
  Send,
  Unlink,
} from 'lucide-react';
import { useApp } from '../state/AppContext';

const DAYS_HEADER = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/* Layar 6: Kalender Panen & Notifikasi Bot Telegram (F7.1–F7.3) */
export const CalendarScreen: React.FC = () => {
  const {
    state,
    addHarvestEvent,
    markHarvestActual,
    linkTelegram,
    unlinkTelegram,
    regenerateTelegramCode,
    sendTestTelegramReminder,
    updateUserProfile,
  } = useApp();

  const today = new Date();
  const todayYmd = today.toISOString().slice(0, 10);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedYmd, setSelectedYmd] = useState(todayYmd);

  // Form tambah jadwal manual
  const [plantId, setPlantId] = useState(state.plants[0]?.id || '');
  const [catatan, setCatatan] = useState('');
  const [tgHandle, setTgHandle] = useState('');
  const [copied, setCopied] = useState(false);
  const [tgPreviewSent, setTgPreviewSent] = useState(false);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push(`${viewYear}-${mStr}-${dStr}`);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof state.harvestEvents>();
    for (const ev of state.harvestEvents) {
      const list = map.get(ev.tanggal) || [];
      list.push(ev);
      map.set(ev.tanggal, list);
    }
    return map;
  }, [state.harvestEvents]);

  const selectedDayEvents = eventsByDate.get(selectedYmd) || [];

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleAddHarvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantId) return;
    addHarvestEvent({
      plantId,
      tanggal: selectedYmd,
      sumber: 'estimasi',
      catatan: catatan.trim() || 'Jadwal panen manual',
    });
    setCatatan('');
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(`/link ${state.user.telegramLinkCode}`).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 24, alignItems: 'start' }}>
      {/* Kolom Kiri: Kalender Panen (sel hari dengan chip tomat kecil, panen --tomato-500) */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 className="t-h2">Kalender panen</h2>
            <p className="t-small t-soft">Hari panen ditandai warna tomat merah-oranye</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft size={20} />
            </button>
            <span className="font-display" style={{ minWidth: 132, textAlign: 'center', fontWeight: 600 }}>
              {monthLabel}
            </span>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Nama hari */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
          {DAYS_HEADER.map((d) => (
            <div key={d} className="t-micro t-soft" style={{ textAlign: 'center', fontWeight: 700 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid tanggal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {calendarDays.map((ymd, idx) => {
            if (!ymd) return <div key={`empty-${idx}`} />;
            const dayNum = Number(ymd.slice(8, 10));
            const dayEvents = eventsByDate.get(ymd) || [];
            const hasHarvest = dayEvents.length > 0;
            const isSelected = ymd === selectedYmd;
            const isToday = ymd === todayYmd;

            return (
              <button
                key={ymd}
                type="button"
                onClick={() => setSelectedYmd(ymd)}
                style={{
                  minHeight: 54,
                  borderRadius: 14,
                  border: isSelected
                    ? '2px solid var(--leaf-600)'
                    : isToday
                      ? '2px dashed var(--leaf-500)'
                      : '1px solid var(--line)',
                  background: hasHarvest
                    ? 'rgba(242, 86, 43, 0.14)'
                    : isSelected
                      ? 'var(--surface-2)'
                      : 'var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: 4,
                }}
              >
                <span
                  className="tabular-nums"
                  style={{
                    fontWeight: hasHarvest || isToday ? 700 : 500,
                    fontSize: '0.9375rem',
                    color: hasHarvest ? 'var(--tomato-btn)' : 'var(--ink)',
                  }}
                >
                  {dayNum}
                </span>
                {hasHarvest && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: ev.sumber === 'aktual' ? 'var(--ok)' : 'var(--tomato-500)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail tanggal terpilih */}
        <hr className="card-divider" />
        <div>
          <h3 className="t-h3" style={{ marginBottom: 10 }}>
            Jadwal tanggal {selectedYmd}
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="t-small t-soft" style={{ marginBottom: 12 }}>
              Belum ada jadwal panen pada tanggal ini.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {selectedDayEvents.map((ev) => {
                const plant = state.plants.find((p) => p.id === ev.plantId);
                return (
                  <div
                    key={ev.id}
                    className="card-subtle"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{plant?.nama || 'Tomat'}</strong>
                        <span className={`pill ${ev.sumber === 'aktual' ? 'pill-ok' : 'pill-warn'}`}>
                          {ev.sumber === 'aktual' ? 'Sudah dipanen' : 'Estimasi scan'}
                        </span>
                      </div>
                      <p className="t-small t-soft">{ev.catatan}</p>
                    </div>
                    {ev.sumber === 'estimasi' && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ minHeight: 42, padding: '6px 12px', fontSize: '0.875rem' }}
                        onClick={() => markHarvestActual(ev.id)}
                      >
                        <Check size={16} /> Tandai sudah panen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tambah jadwal panen */}
          <form onSubmit={handleAddHarvest} style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select
                className="field-select"
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                aria-label="Pilih tanaman"
              >
                {state.plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
              <input
                className="field-input"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan panen..."
              />
            </div>
            <button type="submit" className="btn-primary">
              <Plus size={18} /> Jadwalkan panen di {selectedYmd}
            </button>
          </form>
        </div>
      </section>

      {/* Kolom Kanan: Notifikasi Bot Telegram (F7.2 & F7.3) */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <h2 className="t-h2">Pengingat Telegram</h2>
            <p className="t-small t-soft">Tautkan sekali dengan kode 6 digit</p>
          </div>
          <span className={`pill ${state.user.telegramChatId ? 'pill-ok' : 'pill-neutral'}`}>
            {state.user.telegramChatId ? 'Tertaut' : 'Belum tertaut'}
          </span>
        </div>

        {!state.user.telegramChatId ? (
          <>
            <div className="card-forest" style={{ textAlign: 'center', padding: 20 }}>
              <div className="t-micro" style={{ color: 'rgba(234,245,238,0.8)' }}>
                Kode tautan 6 digit kamu
              </div>
              <div
                className="font-display tabular-nums"
                style={{ fontSize: '2.25rem', letterSpacing: '0.18em', color: '#D8F36A', margin: '6px 0' }}
              >
                {state.user.telegramLinkCode}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ minHeight: 42, padding: '6px 14px', fontSize: '0.875rem' }}
                  onClick={handleCopyCode}
                >
                  <Copy size={16} /> {copied ? 'Tersalin!' : 'Salin perintah'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ minHeight: 42, padding: '6px 14px', fontSize: '0.875rem' }}
                  onClick={regenerateTelegramCode}
                >
                  <RefreshCw size={16} /> Kode baru
                </button>
              </div>
            </div>

            <ol className="t-small" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Buka bot <strong>@CermatTaniBot</strong> di aplikasi Telegram.</li>
              <li>
                Kirim pesan <code>/link {state.user.telegramLinkCode}</code>.
              </li>
              <li>Klik tombol konfirmasi di bawah untuk mengaktifkan pengingat terjadwal.</li>
            </ol>

            <div className="field-group">
              <label htmlFor="tg-handle" className="field-label">
                Username Telegram (opsional untuk demo)
              </label>
              <input
                id="tg-handle"
                className="field-input"
                value={tgHandle}
                onChange={(e) => setTgHandle(e.target.value)}
                placeholder="@pakjoko_tani"
              />
            </div>

            <button type="button" className="btn-primary" onClick={() => linkTelegram(tgHandle)}>
              <Send size={18} /> Konfirmasi tautan Telegram
            </button>
          </>
        ) : (
          <>
            <div className="alert-card alert-card--ok">
              <BellRing size={22} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
              <div>
                <strong>Tersambung ke {state.user.telegramChatId}</strong>
                <p className="t-small" style={{ marginTop: 4 }}>
                  Bot mengirim pengingat panen & peringatan kelembapan tinggi setiap hari pukul{' '}
                  <strong>{state.user.telegramReminderTime} WIB</strong>.
                </p>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="tg-time" className="field-label">
                Jam kirim pengingat harian (WIB)
              </label>
              <input
                id="tg-time"
                type="time"
                className="field-input"
                value={state.user.telegramReminderTime}
                onChange={(e) => updateUserProfile({ telegramReminderTime: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  sendTestTelegramReminder();
                  setTgPreviewSent(true);
                }}
              >
                <Send size={18} /> Uji kirim pengingat sekarang
              </button>
              <button type="button" className="btn-ghost" onClick={unlinkTelegram}>
                <Unlink size={16} /> Putuskan tautan
              </button>
            </div>

            {tgPreviewSent && (
              <div className="card-subtle" role="status">
                <div className="t-micro" style={{ fontWeight: 700, color: 'var(--leaf-600)' }}>
                  Pratinjau pesan terkirim (@CermatTaniBot):
                </div>
                <p className="t-small" style={{ marginTop: 4 }}>
                  "Halo {state.user.nama}! Pengingat panen CermatTani ({state.user.telegramReminderTime}{' '}
                  WIB): Tomat Servo #01 sudah masuk jadwal panen. Yuk cek kebunmu!"
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
