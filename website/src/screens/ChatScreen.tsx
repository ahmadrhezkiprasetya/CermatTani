'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react';
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

/* Layar 9: Tanya Cermo — Viewport Terkunci, Hanya Area Chat yang Di-scroll */
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
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesRef = useRef<HTMLDivElement | null>(null);

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

  // Scroll HANYA di dalam kontainer pesan (tidak pernah menggeser halaman utama!)
  const scrollChatToBottom = useCallback((smooth = true) => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setShowScrollBottom(false);
  }, []);

  useEffect(() => {
    scrollChatToBottom(state.chatMessages.length > 0);
  }, [state.chatMessages.length, isTyping, scrollChatToBottom]);

  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 110);
  };

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
    <section className="chat-shell-card" aria-label="Ruang percakapan Tanya Cermo AI">
      {/* Header Terkunci di Atas (tidak pernah ikut ter-scroll) */}
      <header className="chat-card-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <CermoMascot pose={isTyping ? 'thinking' : 'wave'} size={44} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 className="t-h3" style={{ fontSize: '1.08rem' }}>
                  Tanya Cermo AI
                </h2>
                <span className="pill pill-ok">
                  {aiModel ? `Gemini · ${aiModel}` : 'Gemini · Dataset Khusus'}
                </span>
              </div>
              <p className="t-micro t-soft" style={{ marginTop: 1 }}>
                Fokus budidaya, hasil scan, pupuk organik, &amp; irigasi kebun.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              id="chat-plant-ctx"
              aria-label="Konteks tanaman"
              className="field-select"
              style={{ minHeight: 36, padding: '5px 10px', fontSize: '0.82rem', minWidth: 175 }}
              value={selectedPlant?.id || ''}
              onChange={(e) => openChatWithPlant(e.target.value)}
            >
              {state.plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.fase})
                </option>
              ))}
            </select>

            {state.chatMessages.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  clearChatMessages();
                  setChatError('');
                }}
                style={{ minHeight: 36, padding: '5px 11px', fontSize: '0.82rem' }}
                title="Mulai percakapan baru"
              >
                <RotateCcw size={14} /> Baru
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 11px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            overflow: 'hidden',
          }}
        >
          <Sparkles size={13} color="var(--leaf-600)" style={{ flexShrink: 0 }} />
          {latestScanForPlant ? (
            <span
              className="t-micro t-soft"
              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              <strong style={{ color: 'var(--ink)' }}>Konteks scan:</strong> {latestScanForPlant.bagian} ·{' '}
              {latestScanForPlant.tahapDominan
                ? `${RIPENESS_REFERENCE[latestScanForPlant.tahapDominan].label} (${latestScanForPlant.anjuranPanen})`
                : latestScanForPlant.penyakitUtamaNama}{' '}
              · Keyakinan <strong style={{ color: 'var(--leaf-600)' }}>{latestScanForPlant.keyakinan}%</strong>
            </span>
          ) : (
            <span
              className="t-micro t-soft"
              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              <strong style={{ color: 'var(--ink)' }}>{selectedPlant?.nama || 'Belum ada tanaman'}</strong> · Belum ada
              hasil scan tersimpan. Tanyakan budidaya, penyakit, pupuk, atau irigasi di bawah.
            </span>
          )}
        </div>
      </header>

      {/* Area Pesan yang Di-scroll Secara Mandiri (flex: 1, minHeight: 0, overflowY: auto) */}
      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        className="chat-messages-scroll"
        aria-live="polite"
      >
        {state.chatMessages.length === 0 && !isTyping && (
          <div
            style={{
              margin: 'auto',
              maxWidth: 500,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '16px 12px',
            }}
          >
            <CermoMascot pose="wave" size={82} />
            <h3 className="t-h2" style={{ fontSize: '1.35rem' }}>
              Halo! Aku Cermo, siap bantu kebunmu
            </h3>
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
                fontSize: '0.78rem',
                color: 'var(--ink-soft)',
              }}
            >
              <ShieldCheck size={14} color="var(--leaf-600)" />
              Fokus pertanian &amp; CermatTani · Organik lebih dulu · Tanpa data dummy
            </div>
          </div>
        )}

        {state.chatMessages.map((msg) => {
          const isCermo = msg.peran === 'cermo';
          return (
            <div
              key={msg.id}
              className="step-transition"
              style={{
                display: 'flex',
                justifyContent: isCermo ? 'flex-start' : 'flex-end',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              {isCermo && <CermoMascot pose="wave" size={42} interactive={false} />}
              <div
                style={{
                  maxWidth: 'min(600px, 85%)',
                  padding: '13px 16px',
                  borderRadius: isCermo ? '20px 20px 20px 6px' : '20px 20px 6px 20px',
                  background: isCermo ? 'var(--surface)' : 'var(--leaf-600)',
                  color: isCermo ? 'var(--ink)' : 'var(--on-leaf)',
                  border: isCermo ? '1px solid var(--line)' : 'none',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <p className="t-body" style={{ margin: 0, whiteSpace: 'pre-line', fontSize: '0.95rem' }}>
                  {msg.isi}
                </p>
                {isCermo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="pill pill-warn" style={{ fontSize: '0.7rem', padding: '2px 9px' }}>
                      Saran, bukan keputusan akhir
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="step-transition" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CermoMascot pose="thinking" size={44} interactive={false} />
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                padding: '11px 15px',
                borderRadius: '20px 20px 20px 6px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <span className="t-small t-soft loading-pulse">
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
      </div>

      {/* Tombol Mengambang Lompat ke Pesan Terbaru saat User Scroll ke Atas */}
      {showScrollBottom && (
        <button
          type="button"
          className="chat-scroll-bottom-btn"
          onClick={() => scrollChatToBottom(true)}
          aria-label="Gulir ke pesan terbaru"
        >
          <ArrowDown size={14} /> Pesan terbaru
        </button>
      )}

      {/* Bilah Input Terkunci di Bawah (selalu terlihat & tidak pernah tertutup) */}
      <footer className="chat-composer">
        <div className="chat-quick-row" aria-label="Saran pertanyaan cepat">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void sendMessage(q)}
              className="btn-secondary"
              disabled={isTyping}
              style={{
                minHeight: 34,
                padding: '4px 12px',
                fontSize: '0.8rem',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            className="field-input"
            style={{ minHeight: 44 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pertanyaan tentang tanaman, hasil scan, pupuk, atau irigasimu..."
            aria-label="Pesan untuk Cermo"
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ minHeight: 44, padding: '8px 18px', flexShrink: 0 }}
            disabled={!input.trim() || isTyping}
          >
            <Send size={17} /> Kirim
          </button>
        </form>
      </footer>
    </section>
  );
};
