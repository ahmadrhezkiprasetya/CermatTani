'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Unlink,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';

const DAYS_HEADER = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getLocalTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatFullDateId(ymd: string): string {
  try {
    return new Date(`${ymd}T00:00:00`).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

function getRelativeDayLabel(targetYmd: string, todayYmd: string): string {
  const diff = Math.round(
    (new Date(`${targetYmd}T00:00:00`).getTime() - new Date(`${todayYmd}T00:00:00`).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff > 1) return `${diff} hari lagi`;
  return `${Math.abs(diff)} hari lalu`;
}

/* Layar 6: Kalender Panen, Agenda Terdekat & Pengingat Otomatis (F7.1–F7.3) */
export const CalendarScreen: React.FC = () => {
  const {
    state,
    addHarvestEvent,
    markHarvestActual,
    updateReminderSchedule,
    triggerTestReminderAlert,
    linkTelegram,
    unlinkTelegram,
    regenerateTelegramCode,
    sendTestTelegramReminder,
    updateUserProfile,
  } = useApp();

  const today = new Date();
  const todayYmd = getLocalTodayYmd();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedYmd, setSelectedYmd] = useState(todayYmd);
  const [reminderTab, setReminderTab] = useState<'harian' | 'telegram'>('harian');

  // Form tambah jadwal manual
  const [plantId, setPlantId] = useState(state.plants[0]?.id || '');
  const [catatan, setCatatan] = useState('');
  const [addedNotice, setAddedNotice] = useState(false);
  const [tgHandle, setTgHandle] = useState('');
  const [copied, setCopied] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);
  const [tgFeedback, setTgFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [tgBotInfo, setTgBotInfo] = useState<{
    configured: boolean;
    username: string;
    botUrl: string;
  }>({ configured: true, username: '', botUrl: '' });

  useEffect(() => {
    if (reminderTab !== 'telegram') return;
    fetch('/api/telegram/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setTgBotInfo({
            configured: Boolean(d.configured),
            username: d.username || '',
            botUrl: d.botUrl || '',
          });
        }
      })
      .catch(() => {});
  }, [reminderTab]);

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

  const upcomingHarvests = useMemo(
    () =>
      state.harvestEvents
        .filter((ev) => ev.sumber === 'estimasi')
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
        .slice(0, 4),
    [state.harvestEvents]
  );

  const doneHarvestCount = useMemo(
    () => state.harvestEvents.filter((ev) => ev.sumber === 'aktual').length,
    [state.harvestEvents]
  );

  const activeRemindersCount = useMemo(
    () => state.settings.jadwalPengingat.filter((r) => r.aktif).length,
    [state.settings.jadwalPengingat]
  );

  const selectedDayEvents = eventsByDate.get(selectedYmd) || [];

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const isViewingCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const jumpToDate = (ymd: string) => {
    setSelectedYmd(ymd);
    const dt = new Date(`${ymd}T00:00:00`);
    if (!Number.isNaN(dt.getTime())) {
      setViewYear(dt.getFullYear());
      setViewMonth(dt.getMonth());
    }
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
    setAddedNotice(true);
    window.setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(`/link ${state.user.telegramLinkCode}`).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Bar Ringkasan Cepat */}
      <section
        className="card"
        style={{
          padding: '13px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill pill-warn tabular-nums">
            {upcomingHarvests.length} menunggu dipetik
          </span>
          <span className="pill pill-ok tabular-nums">
            {doneHarvestCount} sudah dipanen
          </span>
          <span className="pill pill-neutral tabular-nums">
            {activeRemindersCount} pengingat harian aktif
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(!isViewingCurrentMonth || selectedYmd !== todayYmd) && (
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.8rem' }}
              onClick={() => jumpToDate(todayYmd)}
            >
              Ke hari ini
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => triggerTestReminderAlert()}
          >
            <Sparkles size={14} /> Uji alert
          </button>
        </div>
      </section>

      {/* Tata Letak 2 Kolom Seimbang: Kiri (Kalender + Antrean Panen Terdekat) | Kanan (Agenda Tanggal + Pengingat) */}
      <div className="calendar-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Kartu Kalender Bulanan */}
          <section className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <h2 className="t-h3" style={{ fontSize: '1.15rem' }}>Kalender panen</h2>
                <p className="t-micro t-soft" style={{ marginTop: 2 }}>
                  Pilih tanggal untuk melihat atau menjadwalkan petik
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 36, height: 36 }}
                  onClick={() => shiftMonth(-1)}
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={17} />
                </button>
                <span
                  className="font-display"
                  style={{ minWidth: 132, textAlign: 'center', fontWeight: 600, fontSize: '0.98rem' }}
                >
                  {monthLabel}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 36, height: 36 }}
                  onClick={() => shiftMonth(1)}
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            {/* Legenda warna */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="t-micro t-soft" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="ripeness-dot" style={{ background: 'var(--tomato-500)' }} /> Estimasi panen
              </span>
              <span className="t-micro t-soft" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="ripeness-dot" style={{ background: 'var(--ok)' }} /> Sudah dipanen
              </span>
              <span className="t-micro t-soft" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 4,
                    background: 'var(--cream-warm)',
                    border: '1.5px solid var(--cream-border)',
                  }}
                />{' '}
                Hari ini
              </span>
            </div>

            {/* Nama hari */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
              {DAYS_HEADER.map((d) => (
                <div key={d} className="t-micro t-soft" style={{ textAlign: 'center', fontWeight: 700 }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid tanggal dengan animasi perpindahan bulan halus */}
            <div
              key={`${viewYear}-${viewMonth}`}
              className="tab-fade"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}
            >
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
                    className={`cal-day-cell ${
                      isSelected
                        ? 'cal-day-cell--selected'
                        : isToday
                          ? 'cal-day-cell--today'
                          : hasHarvest
                            ? 'cal-day-cell--has'
                            : ''
                    }`}
                  >
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: hasHarvest || isToday || isSelected ? 700 : 500,
                        fontSize: '0.88rem',
                        color: isSelected ? 'var(--ok-fg)' : 'var(--ink)',
                      }}
                    >
                      {dayNum}
                    </span>
                    {hasHarvest && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            style={{
                              width: 6,
                              height: 6,
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
          </section>

          {/* Daftar Panen Terdekat — Klik untuk langsung lompat ke tanggalnya */}
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <h3 className="t-h3">Antrean panen terdekat</h3>
                <p className="t-micro t-soft">Klik item untuk langsung membuka tanggalnya di kalender</p>
              </div>
              <CalendarDays size={18} color="var(--leaf-600)" />
            </div>

            {upcomingHarvests.length === 0 ? (
              <div className="card-subtle" style={{ textAlign: 'center', padding: 18 }}>
                <p className="t-small t-soft">
                  Semua jadwal panen sudah selesai! Pilih tanggal di atas untuk menjadwalkan panen baru.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                {upcomingHarvests.map((ev) => {
                  const plant = state.plants.find((p) => p.id === ev.plantId);
                  const rel = getRelativeDayLabel(ev.tanggal, todayYmd);
                  const isActive = ev.tanggal === selectedYmd;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => jumpToDate(ev.tanggal)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') jumpToDate(ev.tanggal);
                      }}
                      className="card-subtle card-interactive"
                      style={{
                        cursor: 'pointer',
                        borderColor: isActive ? 'var(--leaf-600)' : 'var(--line)',
                        background: isActive ? 'var(--surface-accent)' : 'var(--surface-2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: '0.88rem' }}>{plant?.nama || 'Tanaman'}</strong>
                        <span className={`pill ${rel === 'Hari ini' ? 'pill-bad' : 'pill-warn'}`}>
                          {rel}
                        </span>
                      </div>
                      <p className="t-micro t-soft" style={{ lineHeight: 1.4 }}>{ev.catatan}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span className="t-micro t-soft tabular-nums">{ev.tanggal}</span>
                        <button
                          type="button"
                          className="alert-toast-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            markHarvestActual(ev.id);
                          }}
                        >
                          <Check size={12} /> Panen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Kolom Kanan: Agenda Tanggal Terpilih + Pengingat Otomatis (Harian & Telegram) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Kartu 1: Detail Agenda Tanggal Terpilih */}
          <section key={selectedYmd} className="card step-transition" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <span className="t-micro" style={{ color: 'var(--leaf-600)' }}>
                  Agenda tanggal terpilih
                </span>
                <h3 className="t-h3" style={{ marginTop: 2, textTransform: 'capitalize' }}>
                  {formatFullDateId(selectedYmd)}
                </h3>
              </div>
              <span className="pill pill-neutral tabular-nums">
                {selectedDayEvents.length} jadwal
              </span>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="card-subtle" style={{ padding: '14px 16px' }}>
                <p className="t-small t-soft">
                  Belum ada jadwal panen pada tanggal ini. Tambahkan jadwal cepat di bawah.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {selectedDayEvents.map((ev) => {
                  const plant = state.plants.find((p) => p.id === ev.plantId);
                  return (
                    <div
                      key={ev.id}
                      className="card-subtle"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{plant?.nama || 'Tomat'}</strong>
                          <span className={`pill ${ev.sumber === 'aktual' ? 'pill-ok' : 'pill-warn'}`}>
                            {ev.sumber === 'aktual' ? 'Sudah dipanen' : 'Estimasi'}
                          </span>
                        </div>
                        <p className="t-small t-soft" style={{ marginTop: 3 }}>{ev.catatan}</p>
                      </div>
                      {ev.sumber === 'estimasi' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ minHeight: 36, padding: '5px 11px', fontSize: '0.8rem' }}
                          onClick={() => markHarvestActual(ev.id)}
                        >
                          <Check size={15} /> Tandai panen
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Form Tambah Jadwal Cepat */}
            <form
              onSubmit={handleAddHarvest}
              style={{
                display: 'grid',
                gap: 10,
                paddingTop: 12,
                borderTop: '1px solid var(--line)',
              }}
            >
              <div className="form-grid-2">
                <select
                  className="field-select"
                  style={{ minHeight: 42, fontSize: '0.88rem' }}
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
                  style={{ minHeight: 42, fontSize: '0.88rem' }}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan panen (opsional)"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  <Plus size={17} /> Tambah jadwal panen
                </button>
                {addedNotice && <span className="pill pill-ok">Tersimpan!</span>}
              </div>
            </form>
          </section>

          {/* Kartu 2: Pengingat Otomatis (Tab Jadwal Harian | Bot Telegram) */}
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CermoMascot
                  pose={state.user.telegramChatId ? 'happy' : 'wave'}
                  size={48}
                  tipOverride="Atur jam pengingat harian atau tautkan Telegram agar jadwal panen & siram tidak terlewat!"
                />
                <div>
                  <h3 className="t-h3">Pengingat otomatis</h3>
                  <p className="t-micro t-soft">Alert pojok kanan atas &amp; Bot Telegram</p>
                </div>
              </div>

              <div className="seg-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={reminderTab === 'harian'}
                  className={`seg-tab ${reminderTab === 'harian' ? 'active' : ''}`}
                  onClick={() => setReminderTab('harian')}
                >
                  Harian ({activeRemindersCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reminderTab === 'telegram'}
                  className={`seg-tab ${reminderTab === 'telegram' ? 'active' : ''}`}
                  onClick={() => setReminderTab('telegram')}
                >
                  Telegram
                </button>
              </div>
            </div>

            {reminderTab === 'harian' ? (
              <div key="rem-harian" className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {state.settings.jadwalPengingat.map((item) => (
                  <div
                    key={item.id}
                    className={`schedule-row ${!item.aktif ? 'schedule-row--off' : ''}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 130, flex: 1 }}>
                      <strong style={{ fontSize: '0.84rem', display: 'block' }}>{item.label}</strong>
                      <span className="t-micro t-soft">Setiap hari · WIB</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={14} color="var(--ink-soft)" />
                      <input
                        type="time"
                        className="time-pill-input"
                        aria-label={`Jam ${item.label}`}
                        value={item.jam}
                        onChange={(e) => updateReminderSchedule(item.id, { jam: e.target.value })}
                      />
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
                  </div>
                ))}
              </div>
            ) : (
              <div key="rem-telegram" className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!state.user.telegramChatId ? (
                  <>
                    <div className="card-forest" style={{ textAlign: 'center', padding: 18 }}>
                      <div className="t-micro t-soft">Kode tautan 6 digit kamu</div>
                      <div
                        className="font-display tabular-nums"
                        style={{
                          fontSize: '2rem',
                          letterSpacing: '0.18em',
                          color: 'var(--leaf-700)',
                          margin: '6px 0',
                        }}
                      >
                        {state.user.telegramLinkCode}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {tgBotInfo.botUrl && (
                          <a
                            href={`${tgBotInfo.botUrl}?start=${state.user.telegramLinkCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{ minHeight: 36, padding: '5px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
                          >
                            1. Buka Bot {tgBotInfo.username ? `@${tgBotInfo.username}` : 'Telegram'}{' '}
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ minHeight: 36, padding: '5px 12px', fontSize: '0.8rem' }}
                          onClick={handleCopyCode}
                        >
                          <Copy size={14} /> {copied ? 'Tersalin!' : `Salin /link ${state.user.telegramLinkCode}`}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ minHeight: 36, padding: '5px 12px', fontSize: '0.8rem' }}
                          onClick={regenerateTelegramCode}
                        >
                          <RefreshCw size={14} /> Kode baru
                        </button>
                      </div>
                    </div>

                    <ol className="t-small t-soft" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 5 }}>
                      <li>
                        Buka bot{' '}
                        <strong style={{ color: 'var(--ink)' }}>
                          {tgBotInfo.username ? `@${tgBotInfo.username}` : 'Telegram CermatTani'}
                        </strong>{' '}
                        lalu tekan <strong>Start</strong> (atau kirim{' '}
                        <code>/link {state.user.telegramLinkCode}</code>).
                      </li>
                      <li>
                        Klik tombol <strong>Deteksi &amp; Sambungkan Otomatis</strong> di bawah — Chat ID kamu langsung tertangkap otomatis.
                      </li>
                    </ol>

                    <button
                      type="button"
                      className="btn-primary"
                      disabled={tgBusy}
                      onClick={async () => {
                        setTgBusy(true);
                        setTgFeedback(null);
                        const res = await linkTelegram();
                        setTgBusy(false);
                        setTgFeedback({ ok: res.ok, text: res.message });
                      }}
                    >
                      <Sparkles size={16} />{' '}
                      {tgBusy ? 'Mendeteksi pesan dari Telegram...' : '2. Deteksi & Sambungkan Otomatis'}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="t-micro t-soft">Atau masukkan Chat ID numerik secara manual:</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          id="tg-handle"
                          className="field-input"
                          style={{ flex: '1 1 160px', minHeight: 42 }}
                          value={tgHandle}
                          onChange={(e) => setTgHandle(e.target.value)}
                          placeholder="Chat ID numerik (mis. 123456789)"
                          aria-label="Chat ID Telegram"
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={tgBusy || !tgHandle.trim()}
                          onClick={async () => {
                            setTgBusy(true);
                            setTgFeedback(null);
                            const res = await linkTelegram(tgHandle);
                            setTgBusy(false);
                            setTgFeedback({ ok: res.ok, text: res.message });
                          }}
                        >
                          <Send size={15} /> Tautkan Manual
                        </button>
                      </div>
                    </div>

                    {tgFeedback && (
                      <div className={`alert-card ${tgFeedback.ok ? 'alert-card--ok' : 'alert-card--warn'}`} role="status">
                        <div className="t-small">{tgFeedback.text}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="alert-card alert-card--ok">
                      <BellRing size={20} style={{ flexShrink: 0, color: 'var(--leaf-600)' }} />
                      <div>
                        <strong>Tersambung ke Chat ID {state.user.telegramChatId}</strong>
                        <p className="t-small t-soft" style={{ marginTop: 3 }}>
                          Jadwal panen/siram ({state.user.telegramReminderTime} WIB), peringatan sensor kritis, dan temuan penyakit scan aktif dikirim ke Telegram.
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
                        onClick={() => {
                          unlinkTelegram();
                          setTgFeedback(null);
                        }}
                      >
                        <Unlink size={15} /> Putuskan
                      </button>
                    </div>

                    {tgFeedback && (
                      <div className={`alert-card ${tgFeedback.ok ? 'alert-card--ok' : 'alert-card--warn'}`} role="status">
                        <div className="t-small">{tgFeedback.text}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
