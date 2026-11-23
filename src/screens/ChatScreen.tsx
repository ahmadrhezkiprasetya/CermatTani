'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { generateCermoReply } from '../utils/cermoBrain';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';

/* Saran pertanyaan cepat wajib PRD F5.4 */
const QUICK_QUESTIONS = [
  'Apa arti hasil ini?',
  'Kapan panen?',
  'Pupuk apa?',
  'Cara atasi penyakit secara organik?',
  'Apakah tandon dan irigasi aman?',
];

/* Layar 9: Tanya Cermo — Chatbot Asisten Tani (F5.1–F5.4) */
export const ChatScreen: React.FC = () => {
  const { state, chatContextPlantId, openChatWithPlant, addChatMessage } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedPlant = useMemo(
    () => state.plants.find((p) => p.id === chatContextPlantId) || state.plants[0] || null,
    [state.plants, chatContextPlantId]
  );

  const latestScanForPlant = useMemo(() => {
    if (!selectedPlant) return null;
    const plantScans = state.scans
      .filter((s) => s.plantId === selectedPlant.id)
      .sort((a, b) => b.waktu.localeCompare(a.waktu));
    return plantScans[0] || null;
  }, [state.scans, selectedPlant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages.length, isTyping]);

  const sendMessage = (text: string) => {
    const clean = text.trim();
    if (!clean || isTyping) return;
    setInput('');
    addChatMessage({
      plantId: selectedPlant?.id || null,
      peran: 'pengguna',
      isi: clean,
    });
    setIsTyping(true);

    const delay =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 50
        : 650;

    window.setTimeout(() => {
      const reply = generateCermoReply(clean, {
        plant: selectedPlant,
        latestScan: latestScanForPlant,
        sensor: state.sensor,
        lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
        tankLowThreshold: state.settings.ambangTandonRendah,
      });
      addChatMessage({
        plantId: selectedPlant?.id || null,
        peran: 'cermo',
        isi: reply,
      });
      setIsTyping(false);
    }, delay);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
      {/* Bar Konteks Hasil Scan Terbaru (F5.1) */}
      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CermoMascot pose={isTyping ? 'thinking' : 'wave'} size={64} />
            <div>
              <h2 className="t-h2">Tanya Cermo</h2>
              <p className="t-small t-soft">
                Asisten khusus budidaya tomat & hasil scan. Topik di luar tomat akan ditolak sopan.
              </p>
            </div>
          </div>

          <div className="field-group" style={{ minWidth: 220 }}>
            <label htmlFor="chat-plant-ctx" className="t-micro t-soft" style={{ fontWeight: 700 }}>
              Konteks tanaman & scan terbaru
            </label>
            <select
              id="chat-plant-ctx"
              className="field-select"
              style={{ minHeight: 44 }}
              value={selectedPlant?.id || ''}
              onChange={(e) => openChatWithPlant(e.target.value)}
            >
              {state.plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.fase})
                </option>
              ))}
            </select>
          </div>
        </div>

        {latestScanForPlant && (
          <div
            className="card-subtle"
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              padding: '10px 14px',
            }}
          >
            <Sparkles size={16} color="var(--leaf-600)" />
            <span className="t-small">
              <strong>Konteks aktif:</strong> Scan {latestScanForPlant.bagian} ·{' '}
              {latestScanForPlant.tahapDominan
                ? `${RIPENESS_REFERENCE[latestScanForPlant.tahapDominan].label} (${latestScanForPlant.anjuranPanen})`
                : latestScanForPlant.penyakitUtamaNama}{' '}
              · Seberapa yakin Cermo: {latestScanForPlant.keyakinan}%
            </span>
          </div>
        )}
      </section>

      {/* Area percakapan */}
      <section
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 380,
          maxHeight: '58dvh',
          overflowY: 'auto',
          background: 'var(--surface-2)',
        }}
        aria-live="polite"
      >
        {state.chatMessages.map((msg) => {
          const isCermo = msg.peran === 'cermo';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isCermo ? 'flex-start' : 'flex-end',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              {isCermo && <CermoMascot pose="wave" size={44} interactive={false} />}
              <div
                style={{
                  maxWidth: 'min(580px, 84%)',
                  padding: '14px 16px',
                  borderRadius: isCermo ? '20px 20px 20px 6px' : '20px 20px 6px 20px',
                  background: isCermo ? 'var(--surface)' : 'var(--leaf-600)',
                  color: isCermo ? 'var(--ink)' : 'var(--on-leaf)',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <p className="t-body" style={{ margin: 0 }}>
                  {msg.isi}
                </p>
                {/* F5.3 & DESIGN §7: Setiap jawaban Cermo diakhiri tag "Saran, bukan keputusan akhir" */}
                {isCermo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      className="pill pill-warn"
                      style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                    >
                      Saran, bukan keputusan akhir
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CermoMascot pose="thinking" size={46} interactive={false} />
            <div
              style={{
                background: 'var(--surface)',
                padding: '12px 16px',
                borderRadius: '20px 20px 20px 6px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <span className="t-small t-soft">Cermo sedang menyusun jawaban...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </section>

      {/* Saran pertanyaan cepat (F5.4) + Input */}
      <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="btn-secondary"
              style={{ minHeight: 42, padding: '6px 14px', fontSize: '0.875rem', borderRadius: 999 }}
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
          <input
            className="field-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pertanyaan tentang tomat atau hasil scanmu..."
            aria-label="Pesan untuk Cermo"
          />
          <button type="submit" className="btn-primary" disabled={!input.trim() || isTyping}>
            <Send size={18} /> Kirim
          </button>
        </form>
      </section>
    </div>
  );
};
