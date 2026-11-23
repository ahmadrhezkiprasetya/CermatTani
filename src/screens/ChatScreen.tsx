'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { cermatSupabaseRepo } from '@/lib/supabase/repository';

/* Saran pertanyaan cepat wajib PRD F5.4 */
const QUICK_QUESTIONS = [
  'Apa arti hasil ini?',
  'Kapan panen?',
  'Pupuk apa yang cocok secara organik?',
  'Cara atasi penyakit daun secara organik?',
  'Apakah tandon dan irigasi aman?',
];

/* Layar 9: Tanya Cermo — Chatbot Asisten Agronomi 100% Gemini AI + Dataset Khusus CermatTani */
export const ChatScreen: React.FC = () => {
  const {
    state,
    chatContextPlantId,
    openChatWithPlant,
    addChatMessage,
    clearChatMessages,
    isOffline,
  } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiModel, setAiModel] = useState<string>('');
  const [chatError, setChatError] = useState<string>('');
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

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || isTyping) return;
    setChatError('');

    if (isOffline) {
      setChatError(
        'Koneksi sedang offline. Cermo AI membutuhkan jaringan internet untuk menjawab menggunakan model Gemini.'
      );
      return;
    }

    setInput('');

    const historySnapshot = state.chatMessages.slice(-10).map((m) => ({
      peran: m.peran,
      isi: m.isi,
    }));

    addChatMessage({
      plantId: selectedPlant?.id || null,
      peran: 'pengguna',
      isi: clean,
    });
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: historySnapshot,
          plant: selectedPlant,
          latestScan: latestScanForPlant,
          sensor: state.sensor,
          lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
          tankLowThreshold: state.settings.ambangTandonRendah,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.reply) {
        throw new Error(
          data?.error ||
            `Cermo AI gagal merespons (kode ${res.status}). Pastikan GEMINI_API_KEY di .env aktif dan koneksi stabil.`
        );
      }

      const replyText = String(data.reply);
      if (data.aiModel) {
        setAiModel(String(data.aiModel));
      }

      addChatMessage({
        plantId: selectedPlant?.id || null,
        peran: 'cermo',
        isi: replyText,
      });

      // Simpan ke Supabase chat_messages secara non-blocking jika user sudah login
      if (isSupabaseConfigured) {
        void (async () => {
          try {
            const session = await cermatSupabaseRepo.getCurrentSession();
            if (!session) return;
            await cermatSupabaseRepo.insertChatMessage(null, 'pengguna', clean);
            await cermatSupabaseRepo.insertChatMessage(null, 'cermo', replyText);
          } catch {
            // Tetap aman di penyimpanan lokal
          }
        })();
      }
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : 'Gagal terhubung ke model AI Cermo. Silakan coba kirim ulang.'
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
      {/* Bar Konteks Hasil Scan Terbaru (F5.1) — Bento Dark Forest Header */}
      <section className="card-forest stagger-card" style={{ padding: '18px 20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                background: 'rgba(216,243,106,0.14)',
                border: '1px solid rgba(216,243,106,0.24)',
                borderRadius: 18,
                padding: 4,
              }}
            >
              <CermoMascot pose={isTyping ? 'thinking' : 'wave'} size={62} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 className="t-h2" style={{ color: '#FFFFFF' }}>
                  Tanya Cermo AI
                </h2>
                <span
                  className="pill"
                  style={{
                    background: 'var(--lime-300)',
                    color: '#14302A',
                  }}
                >
                  {aiModel ? `Gemini AI · ${aiModel}` : 'Gemini AI · Dataset Khusus'}
                </span>
              </div>
              <p className="t-small t-soft" style={{ marginTop: 2 }}>
                Asisten agronomi terikat Dataset Khusus CermatTani. Pertanyaan di luar budidaya &amp;
                kebun akan ditolak sopan.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <div className="field-group" style={{ minWidth: 215 }}>
              <label
                htmlFor="chat-plant-ctx"
                className="t-micro"
                style={{ fontWeight: 700, color: 'rgba(234,245,238,0.78)' }}
              >
                Konteks tanaman &amp; scan terbaru
              </label>
              <select
                id="chat-plant-ctx"
                className="sidebar-farm-select"
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

            {state.chatMessages.length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  clearChatMessages();
                  setChatError('');
                }}
                style={{ color: '#EAF5EE', borderColor: 'rgba(255,255,255,0.22)' }}
                title="Bersihkan percakapan"
              >
                <RotateCcw size={16} /> Mulai baru
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Sparkles size={16} color="#D8F36A" />
          {latestScanForPlant ? (
            <span className="t-small" style={{ color: '#EAF5EE' }}>
              <strong>Konteks aktif:</strong> Scan {latestScanForPlant.bagian} ·{' '}
              {latestScanForPlant.tahapDominan
                ? `${RIPENESS_REFERENCE[latestScanForPlant.tahapDominan].label} (${latestScanForPlant.anjuranPanen})`
                : latestScanForPlant.penyakitUtamaNama}{' '}
              · Seberapa yakin Cermo:{' '}
              <strong style={{ color: '#D8F36A' }}>{latestScanForPlant.keyakinan}%</strong>
            </span>
          ) : (
            <span className="t-small" style={{ color: '#EAF5EE' }}>
              <strong>Konteks aktif:</strong> {selectedPlant?.nama || 'Belum ada tanaman'} · Belum
              ada riwayat scan tersimpan. Kamu tetap bisa bertanya seputar budidaya, pupuk organik,
              penyakit, atau sensor kebun.
            </span>
          )}
        </div>
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
        {state.chatMessages.length === 0 && !isTyping && (
          <div
            style={{
              margin: 'auto',
              maxWidth: 520,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '24px 12px',
            }}
          >
            <CermoMascot pose="wave" size={82} />
            <h3 className="t-h2">Halo! Aku Cermo, siap bantu kebunmu</h3>
            <p className="t-small t-soft">
              Semua jawaban dihasilkan langsung oleh model <strong>Gemini AI</strong> dengan acuan{' '}
              <strong>Dataset Khusus Agronomi CermatTani</strong> (Balitsa Kementan RI, FAO IPM,
              &amp; standar kematangan buah).
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                fontSize: '0.8rem',
                color: 'var(--ink-soft)',
              }}
            >
              <ShieldCheck size={15} color="var(--leaf-600)" />
              Fokus pertanian &amp; CermatTani · Organik lebih dulu · Tanpa data dummy
            </div>
          </div>
        )}

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
                <p className="t-body" style={{ margin: 0, whiteSpace: 'pre-line' }}>
                  {msg.isi}
                </p>
                {isCermo && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
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
              <span className="t-small t-soft">
                Cermo AI sedang memeriksa dataset agronomi &amp; menyusun jawaban...
              </span>
            </div>
          </div>
        )}

        {chatError && (
          <div className="alert-card alert-card--bad" role="alert">
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div className="t-small">{chatError}</div>
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
              onClick={() => void sendMessage(q)}
              className="btn-secondary"
              disabled={isTyping}
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
            placeholder="Tulis pertanyaan tentang tanaman, hasil scan, pupuk, atau irigasimu..."
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
