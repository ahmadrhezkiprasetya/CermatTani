'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Plus,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { HarvestCountdownCard } from '../components/HarvestCountdownCard';

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

/* Layar 6: Kalender Panen, Hitung Mundur & Agenda Terdekat (F7.1–F7.2). Pengingat ada di Notifikasi & Pengaturan. */
export const CalendarScreen: React.FC = () => {
  const {
    state,
    addHarvestEvent,
    markHarvestActual,
  } = useApp();

  const today = new Date();
  const todayYmd = getLocalTodayYmd();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedYmd, setSelectedYmd] = useState(todayYmd);

  // Form tambah jadwal manual
  const [plantId, setPlantId] = useState(state.plants[0]?.id || '');
  const [catatan, setCatatan] = useState('');
  const [addedNotice, setAddedNotice] = useState(false);
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
        </div>
      </section>

      {/* Tata Letak 2 Kolom Seimbang: Kiri (Kalender + Antrean Panen Terdekat) | Kanan (Agenda Tanggal + Pengingat) */}
      {/* Grid 2×2 rata: baris 1 Kalender | Hitung mundur, baris 2 Antrean | Agenda (tinggi per baris sama) */}
      <div className="calendar-layout">
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

        <HarvestCountdownCard
          events={state.harvestEvents}
          plants={state.plants}
          todayYmd={todayYmd}
          onOpenDate={jumpToDate}
          onMarkHarvested={markHarvestActual}
        />

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
                        <Hourglass size={11} /> {rel}
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
      </div>
    </div>
  );
};
