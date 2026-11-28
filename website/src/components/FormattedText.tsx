'use client';

import React from 'react';

/**
 * Merender teks output AI (Chatbot, Ringkasan Scan, Temuan Visual) secara rapi:
 * - **teks** atau __teks__ -> <strong>teks</strong> (bold sungguhan, tidak pernah tampilkan ** mentah)
 * - *teks* -> <em>teks</em>
 * - [judul](https://...) -> tautan klik aman
 * - Baris bullet (- / * / •) -> daftar poin bersih tanpa tanda bintang mentah
 */
function renderInlineTokens(line: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Cocokkan [label](url), **bold**, __bold__, *italic*
  const tokenRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const plain = line.slice(lastIndex, match.index).replace(/\*\*/g, '');
      if (plain) nodes.push(plain);
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${tokenIdx++}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}
        >
          {match[2]}
        </a>
      );
    } else if (match[4] || match[5]) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${tokenIdx++}`} style={{ fontWeight: 700 }}>
          {(match[4] || match[5]).replace(/\*\*/g, '')}
        </strong>
      );
    } else if (match[6]) {
      nodes.push(
        <em key={`${keyPrefix}-i-${tokenIdx++}`} style={{ fontStyle: 'italic' }}>
          {match[6]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    // Bersihkan sisa ** nyasar yang tidak berpasangan agar user tidak pernah melihat ** mentah
    const rest = line.slice(lastIndex).replace(/\*\*/g, '');
    if (rest) nodes.push(rest);
  }

  return nodes;
}

export const FormattedText: React.FC<{
  text: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ text, className = 't-body', style }) => {
  const cleanText = (text || '').replace(/\r\n/g, '\n').trim();
  if (!cleanText) return null;

  const lines = cleanText.split('\n');

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        lineHeight: 1.55,
        ...style,
      }}
    >
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} style={{ height: 4 }} />;

        // Heading markdown (### Judul) -> teks tebal bersih tanpa #
        const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
          return (
            <div key={idx} style={{ fontWeight: 700, marginTop: idx > 0 ? 4 : 0 }}>
              {renderInlineTokens(headingMatch[1], `h-${idx}`)}
            </div>
          );
        }

        // Bullet point (- item atau * item atau • item)
        const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 7,
                paddingLeft: 2,
              }}
            >
              <span aria-hidden="true" style={{ fontWeight: 700, lineHeight: 1.5 }}>
                •
              </span>
              <span style={{ flex: 1 }}>{renderInlineTokens(bulletMatch[1], `li-${idx}`)}</span>
            </div>
          );
        }

        // Daftar bernomor (1. item)
        const numMatch = line.match(/^(\d+\.)\s+(.+)$/);
        if (numMatch) {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 7,
                paddingLeft: 2,
              }}
            >
              <span style={{ fontWeight: 700, flexShrink: 0 }}>{numMatch[1]}</span>
              <span style={{ flex: 1 }}>{renderInlineTokens(numMatch[2], `ol-${idx}`)}</span>
            </div>
          );
        }

        return <div key={idx}>{renderInlineTokens(line, `p-${idx}`)}</div>;
      })}
    </div>
  );
};
