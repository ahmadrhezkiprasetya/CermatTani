'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Hourglass } from 'lucide-react';
import { HarvestEvent, Plant } from '../types/cermattani';

/* Jam petik ideal: pagi hari sebelum terik (buah masih segar & dingin) */
const HARVEST_HOUR = 6;

function harvestTarget(ymd: string): number {
  const d = new Date(`${ymd}T00:00:00`);
  d.setHours(HARVEST_HOUR, 0, 0, 0);
  return d.getTime();
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

interface Props {
  events: HarvestEvent[];
  plants: Plant[];
  todayYmd: string;
  onOpenDate: (ymd: string) => void;
  onMarkHarvested: (eventId: string) => void;
}

/* Kartu Hitung Mundur Panen — detik berjalan menuju jadwal petik estimasi terdekat */
export const HarvestCountdownCard: React.FC<Props> = ({ events, plants, todayYmd, onOpenDate, onMarkHarvested }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const estimates = useMemo(
    () => events.filter((e) => e.sumber === 'estimasi').sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
    [events]
  );
  // Jadwal hari ini yang jam petiknya sudah lewat = waktunya memetik
  const dueToday = estimates.filter((e) => e.tanggal === todayYmd && harvestTarget(e.tanggal) <= now);
  // Hitung mundur selalu ke jadwal petik berikutnya yang masih di depan
  const next = estimates.find((e) => harvestTarget(e.tanggal) > now) || null;
  const overdueCount = estimates.filter((e) => e.tanggal < todayYmd).length;
  const plantName = (id: string) => plants.find((p) => p.id === id)?.nama || 'Tanaman';

  const dueBanner =
    dueToday.length > 0 ? (
      <div className="harvest-countdown-due" role="status">
        <span>
          Hari ini waktunya memetik: <strong>{dueToday.map((e) => plantName(e.plantId)).join(', ')}</strong>
        </span>
        <button type="button" className="btn-primary" onClick={() => onMarkHarvested(dueToday[0].id)}>
          <Check size={15} /> Sudah dipanen
        </button>
      </div>
    ) : null;

  const overduePill =
    overdueCount > 0 ? (
      <span className="pill pill-bad" style={{ alignSelf: 'flex-start' }}>
        {overdueCount} jadwal lewat tanggal, belum ditandai panen
      </span>
    ) : null;

  if (!next) {
    return (
      <section className="card harvest-countdown">
        <div className="harvest-countdown-head">
          <span className="harvest-countdown-icon">
            <Hourglass size={18} />
          </span>
          <div>
            <h3 className="t-h3">Hitung mundur panen</h3>
            <p className="t-micro t-soft">Belum ada jadwal petik mendatang. Pilih tanggal di kalender untuk menambahkannya.</p>
          </div>
        </div>
        {dueBanner}
        {overduePill}
      </section>
    );
  }

  const diffMs = Math.max(0, harvestTarget(next.tanggal) - now);
  const totalSec = Math.floor(diffMs / 1000);
  const parts = [
    { label: 'Hari', value: Math.floor(totalSec / 86400) },
    { label: 'Jam', value: Math.floor((totalSec % 86400) / 3600) },
    { label: 'Menit', value: Math.floor((totalSec % 3600) / 60) },
    { label: 'Detik', value: totalSec % 60 },
  ];

  return (
    <section className="card harvest-countdown">
      {dueBanner}

      <div className="harvest-countdown-head">
        <span className="harvest-countdown-icon">
          <Hourglass size={18} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="t-micro harvest-countdown-kicker">Hitung mundur panen berikutnya</span>
          <h3 className="t-h3 harvest-countdown-title">{plantName(next.plantId)}</h3>
          <p className="t-micro t-soft">
            <span style={{ textTransform: 'capitalize' }}>{formatFullDateId(next.tanggal)}</span> · petik pukul 0
            {HARVEST_HOUR}.00
          </p>
        </div>
      </div>

      <div
        className="harvest-countdown-grid"
        role="timer"
        aria-label={`${parts[0].value} hari ${parts[1].value} jam ${parts[2].value} menit lagi`}
      >
        {parts.map((p) => (
          <div key={p.label} className="harvest-countdown-cell">
            <span className="harvest-countdown-num tabular-nums">{String(p.value).padStart(2, '0')}</span>
            <span className="harvest-countdown-unit">{p.label}</span>
          </div>
        ))}
      </div>

      {next.catatan && <p className="t-small t-soft harvest-countdown-note">{next.catatan}</p>}

      <div className="harvest-countdown-actions">
        <button type="button" className="btn-secondary" onClick={() => onOpenDate(next.tanggal)}>
          <CalendarDays size={15} /> Lihat di kalender
        </button>
        <button type="button" className="btn-primary" onClick={() => onMarkHarvested(next.id)}>
          <Check size={15} /> Sudah dipanen
        </button>
      </div>

      {overduePill}
    </section>
  );
};
