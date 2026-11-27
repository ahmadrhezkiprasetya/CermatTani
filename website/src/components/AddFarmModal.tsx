'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../state/AppContext';

/* Modal Tambah Kebun — dipakai dari pemilih kebun di sidebar (desktop) & lembar pilih kebun (mobile) */
export const AddFarmModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addFarm } = useApp();
  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;
    addFarm(nama, lokasi, 'Lahan budidaya');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Tambah kebun baru">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="t-h2">Tambah kebun baru</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field-group">
            <label htmlFor="add-farm-name" className="field-label">Nama kebun</label>
            <input
              id="add-farm-name"
              className="field-input"
              placeholder="Contoh: Greenhouse Blok B"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field-group">
            <label htmlFor="add-farm-loc" className="field-label">Lokasi</label>
            <input
              id="add-farm-loc"
              className="field-input"
              placeholder="Contoh: Lembang, Bandung"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Simpan kebun
          </button>
        </form>
      </div>
    </div>
  );
};
