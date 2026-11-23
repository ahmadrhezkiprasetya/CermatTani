/**
 * Server-only Gemini AI client (PRD §8: kunci API hanya di server lewat `.env` GEMINI_API_KEY).
 * Menggunakan Google Generative Language API (v1beta) dengan model Gemini 3.x aktif
 * yang telah terverifikasi pada kunci `.env` (tanpa fallback dummy/lokal).
 */

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiCallOptions {
  mode?: 'vision' | 'chat';
  systemInstruction: string;
  contents: GeminiContent[];
  responseMimeType?: 'application/json' | 'text/plain';
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

export type GeminiCallResult =
  | {
      ok: true;
      text: string;
      model: string;
    }
  | {
      ok: false;
      error: string;
      statusCode: number;
    };

function getModelCascade(mode: 'vision' | 'chat'): string[] {
  const customModel = process.env.GEMINI_MODEL?.trim();

  // Urutan model aktif terverifikasi (Gemini 3.x):
  // - Vision memprioritaskan gemini-3.5-flash-lite (~2.6s, pas target <5 detik PRD) lalu gemini-3.6-flash/3.5-flash.
  // - Chat memprioritaskan respons cepat (~1.3-1.5s) lalu fallback model lebih besar.
  const defaults =
    mode === 'vision'
      ? [
          'gemini-3.5-flash-lite',
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemini-3.1-flash-lite',
          'gemini-3.8-flash',
        ]
      : [
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemini-3.8-flash',
        ];

  return customModel
    ? [customModel, ...defaults.filter((m) => m !== customModel)]
    : defaults;
}

export async function callGeminiServer(
  options: GeminiCallOptions
): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      statusCode: 500,
      error: 'GEMINI_API_KEY belum terpasang di file .env server.',
    };
  }

  const mode = options.mode ?? 'chat';
  const models = getModelCascade(mode);
  const timeoutMs = mode === 'vision' ? 28000 : 20000;

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: options.systemInstruction }],
    },
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? (mode === 'vision' ? 0.15 : 0.35),
      maxOutputTokens: options.maxOutputTokens ?? (mode === 'vision' ? 4096 : 1200),
      ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
    },
  };

  let lastStatus = 503;
  let lastError = 'Layanan AI Gemini sedang sibuk. Silakan coba lagi beberapa saat.';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        lastStatus = res.status;
        try {
          const errJson = (await res.json()) as { error?: { message?: string } };
          if (errJson?.error?.message) {
            lastError = errJson.error.message;
          }
        } catch {
          // Abaikan bila body error bukan JSON
        }
        // Coba model berikutnya pada 404/429/500/503; hentikan jika API key tidak valid (401/403)
        if (res.status === 401 || res.status === 403) {
          return {
            ok: false,
            statusCode: res.status,
            error: `Kunci API Gemini ditolak oleh server Google (${res.status}): ${lastError}`,
          };
        }
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string; thought?: boolean }>;
          };
        }>;
      };

      const parts = data?.candidates?.[0]?.content?.parts;
      // Saring bagian `thought: true` agar jejak penalaran internal Gemini 3.x tidak ikut keluar
      const text = Array.isArray(parts)
        ? parts
            .filter((p) => !p.thought && typeof p.text === 'string')
            .map((p) => p.text || '')
            .join('')
            .trim()
        : '';

      if (text) {
        return { ok: true, text, model };
      }

      lastStatus = 502;
      lastError = `Model ${model} mengembalikan respons kosong.`;
    } catch (err) {
      lastStatus = 504;
      lastError =
        err instanceof Error && err.name === 'AbortError'
          ? 'Permintaan ke AI Gemini melebihi batas waktu.'
          : 'Gagal terhubung ke server AI Gemini. Periksa koneksi internet server.';
    }
  }

  return {
    ok: false,
    statusCode: lastStatus,
    error: lastError,
  };
}
