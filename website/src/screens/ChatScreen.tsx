'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { CermoMascot } from '../components/CermoMascot';
import { FormattedText } from '../components/FormattedText';
import { KNOWLEDGE_DISEASES, KNOWLEDGE_NUTRIENTS, RIPENESS_REFERENCE } from '../data/knowledgeBase';
import { ScanRecord } from '../types/cermattani';

const DEFAULT_QUICK_QUESTIONS = [
  'Apa arti hasil scan terakhirku?',
  'Kapan panen terbaik?',
  'Pupuk organik apa yang cocok?',
  'Cara atasi penyakit secara organik?',
  'Apakah tandon dan irigasi aman?',
];

/* Layar 9: Tanya Cermo — Viewport Terkunci, Auto-Receive Pertanyaan & Konteks dari Hasil Scan */
export const ChatScreen: React.FC = () => {
  const {
    state,
    chatContextPlantId,
    chatContextScan,
    pendingChatQuestion,
    clearPendingChatQuestion,
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
  const dispatchedPendingRef = useRef<string | null>(null);

  const selectedPlant = useMemo(
    () => state.plants.find((p) => p.id === chatContextPlantId) || state.plants[0] || null,
    [state.plants, chatContextPlantId]
  );

  // Gunakan data hasil scan yang baru dikirim dari layar Scan (atau scan terbaru tanaman terpilih)
  const latestScanForPlant = useMemo(() => {
    if (chatContextScan && (!selectedPlant || chatContextScan.plantId === selectedPlant.id)) {
      return chatContextScan;
    }
    if (!selectedPlant) return null;
    const plantScans = state.scans
      .filter((s) => s.plantId === selectedPlant.id)
      .sort((a, b) => b.waktu.localeCompare(a.waktu));
    return plantScans[0] || null;
  }, [chatContextScan, state.scans, selectedPlant]);

  const contextualQuickQuestions = useMemo(() => {
    if (!latestScanForPlant) return DEFAULT_QUICK_QUESTIONS;
    const fokus =
      latestScanForPlant.fokusOutput ||
      (latestScanForPlant.tahapDominan ? 'kematangan' : 'penyakit');
    if (fokus === 'penyakit') {
      return [
        'Bagaimana cara mencegah ini menular ke buah/tanaman lain?',
        'Langkah penanganan organik apa yang paling aman?',
        'Apakah bagian yang rusak boleh dikomposkan?',
        'Apakah irigasi dan kelembapan kebun memicu ini?',
      ];
    }
    if (fokus === 'kematangan') {
      return [
        'Jam berapa terbaik untuk memetik buah ini?',
        'Cara menyimpan hasil panen supaya tahan lama?',
        'Pupuk organik apa yang cocok saat fase ini?',
        'Apakah tandon dan irigasi aman?',
      ];
    }
    if (fokus === 'hara') {
      return [
        'Berapa takaran pupuk organik yang aman?',
        'Berapa hari sekali pemberian pupuk susulan?',
        'Apa gejala jika tanaman sudah pulih?',
        'Apakah penyiraman perlu disesuaikan?',
      ];
    }
    return DEFAULT_QUICK_QUESTIONS;
  }, [latestScanForPlant]);

  const scanContextLabel = useMemo(() => {
    if (!latestScanForPlant) return null;
    const fokus =
      latestScanForPlant.fokusOutput ||
      (latestScanForPlant.tahapDominan ? 'kematangan' : 'penyakit');
    if (fokus === 'penyakit') {
      const dis = KNOWLEDGE_DISEASES[latestScanForPlant.penyakitUtamaId];
      return `${dis?.penyakit || latestScanForPlant.penyakitUtamaNama} · Keyakinan ${latestScanForPlant.keyakinan}%`;
    }
    if (fokus === 'kematangan' && latestScanForPlant.tahapDominan) {
      const rip = RIPENESS_REFERENCE[latestScanForPlant.tahapDominan];
      const minor =
        latestScanForPlant.penyakitRinganId && KNOWLEDGE_DISEASES[latestScanForPlant.penyakitRinganId]
          ? ` (+ catatan: ${KNOWLEDGE_DISEASES[latestScanForPlant.penyakitRinganId].penyakit})`
          : '';
      return `${rip.label} (${latestScanForPlant.anjuranPanen})${minor} · Keyakinan ${latestScanForPlant.keyakinan}%`;
    }
    if (fokus === 'hara') {
      const nut = KNOWLEDGE_NUTRIENTS[latestScanForPlant.dugaanHaraId];
      return `${nut?.dugaan || latestScanForPlant.dugaanHaraNama} · Keyakinan ${latestScanForPlant.keyakinan}%`;
    }
    return `Hasil scan terbaru · Keyakinan ${latestScanForPlant.keyakinan}%`;
  }, [latestScanForPlant]);

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

  const sendMessage = useCallback(
    async (text: string, overrideScan?: ScanRecord | null) => {
      const clean = text.trim();
      if (!clean || isTyping) return;
      setChatError('');

      if (isOffline) {
        setChatError(
          'Koneksi sedang offline. Cermo AI membutuhkan jaringan internet untuk menjawab menggunakan model AI.'
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

      const scanToSend = overrideScan !== undefined ? overrideScan : latestScanForPlant;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: clean,
            history: historySnapshot,
            plant: selectedPlant,
            latestScan: scanToSend,
            sensor: state.sensor,
            lowConfidenceThreshold: state.settings.ambangKeyakinanRendah,
            tankLowThreshold: state.settings.ambangTandonRendah,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.reply) {
          throw new Error(
            data?.error ||
              'Cermo sedang istirahat sebentar. Coba kirim pertanyaanmu lagi dalam beberapa saat ya.'
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
      } catch (err) {
        setChatError(
          err instanceof Error && !(err instanceof TypeError)
            ? err.message
            : 'Cermo belum bisa dihubungi. Periksa koneksi internetmu lalu coba kirim ulang ya.'
        );
      } finally {
        setIsTyping(false);
      }
    },
    [
      isTyping,
      isOffline,
      state.chatMessages,
      state.sensor,
      state.settings.ambangKeyakinanRendah,
      state.settings.ambangTandonRendah,
      selectedPlant,
      latestScanForPlant,
      addChatMessage,
    ]
  );

  // Otomatis kirim pertanyaan yang diketik user dari bawah hasil Scan!
  useEffect(() => {
    if (!pendingChatQuestion) {
      dispatchedPendingRef.current = null;
      return;
    }
    const signature = `${pendingChatQuestion}|${chatContextScan?.id || ''}`;
    if (dispatchedPendingRef.current === signature) return;
    dispatchedPendingRef.current = signature;
    const q = pendingChatQuestion;
    clearPendingChatQuestion();
    void sendMessage(q, chatContextScan ?? latestScanForPlant);
  }, [pendingChatQuestion, chatContextScan, latestScanForPlant, clearPendingChatQuestion, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <section className="chat-shell-card" aria-label="Ruang percakapan Tanya Cermo AI">
      {/* Header Terkunci di Atas */}
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
                  {aiModel ? `AI · ${aiModel}` : 'AI · Dataset Khusus'}
                </span>
              </div>
              <p className="t-micro t-soft chat-header-desc" style={{ marginTop: 1 }}>
                Fokus budidaya, hasil scan, pupuk organik, &amp; irigasi kebun.
              </p>
            </div>
          </div>

          <div className="chat-header-controls" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

        {/* Strip Data Hasil Scan Aktif */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 11px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            overflow: 'hidden',
          }}
        >
          <Sparkles size={13} color="var(--leaf-600)" style={{ flexShrink: 0 }} />
          {scanContextLabel ? (
            <span
              className="t-micro t-soft"
              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              <strong style={{ color: 'var(--ink)' }}>Data scan aktif:</strong> {scanContextLabel}
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

      {/* Area Pesan yang Di-scroll Secara Mandiri */}
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
              {scanContextLabel
                ? `Data hasil scan (${scanContextLabel}) sudah terhubung. Langsung tanyakan detail penanganan atau langkah berikutnya di bawah!`
                : 'Semua jawaban dihasilkan langsung oleh AI (KoboiLLM) dengan acuan Dataset Khusus Agronomi CermatTani (Balitsa Kementan RI & FAO IPM).'}
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
              Fokus pertanian &amp; CermatTani · Organik lebih dulu · Dataset Agronomi
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
                <FormattedText
                  text={msg.isi}
                  className="t-body"
                  style={{ fontSize: '0.95rem', color: isCermo ? 'var(--ink)' : 'var(--on-leaf)' }}
                />
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

      {/* Bilah Input Terkunci di Bawah */}
      <footer className="chat-composer">
        <div className="chat-quick-row" aria-label="Saran pertanyaan cepat">
          {contextualQuickQuestions.map((q) => (
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
            placeholder="Tulis pertanyaan lanjutan tentang hasil scan, penyakit, pupuk, atau irigasi..."
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
