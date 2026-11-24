'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Loader2, Search, Sprout, X } from 'lucide-react';
import {
  ALL_VARIETY_OPTIONS,
  PlantVarietyOption,
} from '../data/plantVarieties';

interface PlantSearchInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

const SOURCE_BADGE_STYLE: Record<string, { bg: string; fg: string; text: string }> = {
  satudata_klaten: { bg: 'var(--water-bg)', fg: 'var(--water-700)', text: 'Satu Data Klaten' },
  gbif: { bg: 'var(--ok-bg)', fg: 'var(--ok-fg)', text: 'GBIF Plantae' },
  wikipedia: { bg: 'var(--cream-warm)', fg: 'var(--ink)', text: 'Wikipedia ID' },
  katalog: { bg: 'var(--surface-2)', fg: 'var(--ink-soft)', text: 'Katalog' },
};

/**
 * Input pencarian & bebas-ketik untuk SEMUA jenis tanaman.
 * Terhubung ke API Satu Data Klaten (CKAN), GBIF Plantae (global), Wikipedia ID, & katalog instan —
 * sekaligus memperbolehkan pengguna mengetik jenis/varietas tanaman apa pun secara bebas.
 */
export const PlantSearchInput: React.FC<PlantSearchInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Ketik atau cari tanaman apa saja (Cabai, Padi, Durian, Kopi, Anggrek...)',
  required,
}) => {
  const [open, setOpen] = useState(false);
  const [remoteItems, setRemoteItems] = useState<PlantVarietyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Muat hasil live dari /api/plants/catalog (CKAN Satu Data Klaten + GBIF Plantae + Wikipedia ID)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const trimmed = value.trim();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/plants/catalog?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.items)) {
          setRemoteItems(data.items);
        }
      } catch {
        // Tetap tampilkan katalog instan saat offline
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, trimmed.length >= 2 ? 250 : 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, open]);

  const mergedItems = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = remoteItems.length > 0 ? remoteItems : ALL_VARIETY_OPTIONS;
    const filtered = base.filter((item) => {
      const matchCat =
        activeCategory === 'Semua' ||
        (activeCategory === 'Satu Data Klaten'
          ? item.source === 'satudata_klaten'
          : (item.category || '').toLowerCase().includes(activeCategory.toLowerCase()));
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.value.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.komoditas.toLowerCase().includes(q) ||
        (item.scientificName || '').toLowerCase().includes(q)
      );
    });
    return filtered.slice(0, 28);
  }, [remoteItems, value, activeCategory]);

  const exactExists = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return true;
    return mergedItems.some((item) => item.value.toLowerCase() === q);
  }, [mergedItems, value]);

  const quickTabs = ['Semua', 'Satu Data Klaten', 'Sayur', 'Pangan', 'Buah', 'Rempah', 'Hias'];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search
          size={16}
          color="var(--ink-soft)"
          style={{ position: 'absolute', left: 12, pointerEvents: 'none' }}
        />
        <input
          id={id}
          type="text"
          className="field-input"
          style={{ paddingLeft: 36, paddingRight: value ? 34 : 14 }}
          value={value}
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
        />
        {loading ? (
          <Loader2
            size={15}
            color="var(--leaf-600)"
            className="loading-pulse"
            style={{ position: 'absolute', right: 11, pointerEvents: 'none' }}
          />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(true);
            }}
            aria-label="Hapus teks jenis tanaman"
            style={{
              position: 'absolute',
              right: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              padding: 4,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 60,
            background: 'var(--surface)',
            border: '1.5px solid var(--line)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-2)',
            overflow: 'hidden',
          }}
        >
          {/* Strip filter kategori + info sumber API */}
          <div
            style={{
              padding: '8px 10px 7px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span className="t-micro t-soft" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Globe size={12} color="var(--leaf-600)" /> Bebas semua tanaman · CKAN Klaten + GBIF + Wiki
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
              {quickTabs.map((tab) => {
                const active = activeCategory === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveCategory(tab)}
                    style={{
                      border: '1px solid var(--line)',
                      background: active ? 'var(--leaf-600)' : 'var(--surface)',
                      color: active ? '#ffffff' : 'var(--ink-soft)',
                      borderRadius: 999,
                      padding: '3px 9px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Opsi langsung pakai teks apa pun yang diketik pengguna */}
            {value.trim().length > 0 && !exactExists && (
              <button
                type="button"
                onClick={() => {
                  onChange(value.trim());
                  setOpen(false);
                }}
                style={{
                  border: '1px dashed var(--leaf-600)',
                  background: 'var(--surface-milk)',
                  color: 'var(--leaf-700)',
                  borderRadius: 11,
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 700,
                  fontSize: '0.84rem',
                }}
              >
                <Sprout size={15} />
                <span>Gunakan &ldquo;{value.trim()}&rdquo; (tanaman bebas)</span>
              </button>
            )}

            {mergedItems.map((item) => {
              const badge = SOURCE_BADGE_STYLE[item.source || 'katalog'] || SOURCE_BADGE_STYLE.katalog;
              return (
                <button
                  key={`${item.source || 'katalog'}-${item.value}`}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={{
                    border: 'none',
                    background: value.toLowerCase() === item.value.toLowerCase() ? 'var(--surface-2)' : 'transparent',
                    color: 'var(--ink)',
                    borderRadius: 10,
                    padding: '7px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem' }}>
                      {item.label}
                    </span>
                    <span className="t-micro t-soft">
                      {item.scientificName || item.category || item.komoditas}
                    </span>
                  </span>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.fg,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {badge.text}
                  </span>
                </button>
              );
            })}

            {mergedItems.length === 0 && !loading && (
              <div className="t-micro t-soft" style={{ padding: '10px 8px', textAlign: 'center' }}>
                Tidak ada di daftar saran — cukup tekan tombol hijau di atas untuk memakai nama tanamanmu sendiri!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
