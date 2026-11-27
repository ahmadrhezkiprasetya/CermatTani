/**
 * Klien AI server-only (kunci API hanya di server lewat `.env`, tidak pernah dikirim ke browser).
 *
 * Penyedia utama: **KoboiLLM** (gateway AI Indonesia, API kompatibel OpenAI)
 *   - KOBOILLM_API_KEY      : wajib, kunci `sk-...` dari dashboard.koboillm.com → API Keys
 *   - KOBOILLM_BASE_URL     : opsional, default https://api.koboillm.com/v1
 *   - KOBOILLM_MODEL_VISION : opsional, model untuk Scan foto (harus mendukung gambar)
 *   - KOBOILLM_MODEL_CHAT   : opsional, model untuk Chat Cermo
 *
 * Cadangan: Google Gemini langsung (GEMINI_API_KEY) — hanya dipakai bila KOBOILLM_API_KEY kosong.
 *
 * Nama tipe/fungsi lama (GeminiContent, callGeminiServer) dipertahankan agar route API tidak berubah.
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
  /** Skema format Gemini (type: 'OBJECT' | 'STRING' …); otomatis diubah ke JSON Schema untuk KoboiLLM. */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

export type AiProvider = 'koboillm' | 'gemini';

/**
 * Pemberitahuan ramah untuk pengguna saat AI gagal. Sengaja TIDAK menyebut kunci API, saldo,
 * nama penyedia, atau kode error — detail aslinya hanya dicatat ke log server (lihat logAiFailure).
 */
export const AI_BUSY_MESSAGE = {
  scan: 'Cermo sedang sibuk memeriksa banyak foto. Coba pindai ulang dalam beberapa saat ya.',
  chat: 'Cermo sedang istirahat sebentar. Coba kirim pertanyaanmu lagi dalam beberapa saat ya.',
} as const;

/** Catat detail kegagalan AI hanya di log server (terminal dev / Vercel → Logs). */
export function logAiFailure(context: string, detail: unknown, statusCode?: number) {
  const msg = detail instanceof Error ? detail.message : String(detail ?? '');
  console.error(`[AI ${context}] gagal${statusCode ? ` (${statusCode})` : ''}: ${msg}`);
}

export type GeminiCallResult =
  | {
      ok: true;
      text: string;
      model: string;
      provider: AiProvider;
    }
  | {
      ok: false;
      error: string;
      statusCode: number;
    };

/* ============================================================================
   PEMILIH PENYEDIA
   ============================================================================ */

export function getActiveAiProvider(): AiProvider | null {
  if (process.env.KOBOILLM_API_KEY?.trim()) return 'koboillm';
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini';
  return null;
}

export async function callGeminiServer(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const provider = getActiveAiProvider();
  if (provider === 'koboillm') return callKoboiLlm(options);
  if (provider === 'gemini') return callGeminiDirect(options);
  return {
    ok: false,
    statusCode: 500,
    error: 'KOBOILLM_API_KEY belum terpasang di file .env server (atau di Environment Variables Vercel).',
  };
}

/* ============================================================================
   KOBOILLM (OpenAI Chat Completions)
   ============================================================================ */

const DEFAULT_KOBOILLM_BASE_URL = 'https://api.koboillm.com/v1';

function uniq(list: Array<string | undefined>): string[] {
  return Array.from(new Set(list.map((m) => (m || '').trim()).filter(Boolean)));
}

function getKoboiModels(mode: 'vision' | 'chat'): string[] {
  // Model vision yang tercantum di dokumentasi KoboiLLM (docs.koboillm.com/en/vision).
  // Model dari .env selalu dicoba lebih dulu; sisanya cadangan bila model tak tersedia di kunci Anda.
  return mode === 'vision'
    ? uniq([
        process.env.KOBOILLM_MODEL_VISION,
        'openai/gpt-4o-mini',
        'gemini/gemini-2.5-flash',
        'openai/gpt-4o',
      ])
    : uniq([
        process.env.KOBOILLM_MODEL_CHAT,
        process.env.KOBOILLM_MODEL_VISION,
        'openai/gpt-4o-mini',
        'gemini/gemini-2.5-flash',
      ]);
}

type OpenAiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAiContentPart[];
}

function toOpenAiMessages(systemPrompt: string, contents: GeminiContent[]): OpenAiMessage[] {
  const messages: OpenAiMessage[] = [{ role: 'system', content: systemPrompt }];
  for (const c of contents) {
    const role = c.role === 'model' ? 'assistant' : 'user';
    const hasImage = c.parts.some((p) => p.inlineData);
    if (!hasImage) {
      messages.push({ role, content: c.parts.map((p) => p.text || '').join('\n') });
      continue;
    }
    const parts: OpenAiContentPart[] = [];
    for (const p of c.parts) {
      if (p.text) parts.push({ type: 'text', text: p.text });
      if (p.inlineData) {
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` },
        });
      }
    }
    messages.push({ role, content: parts });
  }
  return messages;
}

/** Ubah skema gaya Gemini (type 'OBJECT', nullable) menjadi JSON Schema standar. */
function toJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const src = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src)) {
    if (key === 'nullable') continue;
    if (key === 'type' && typeof value === 'string') {
      const t = value.toLowerCase();
      out.type = src.nullable ? [t, 'null'] : t;
    } else if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toJsonSchema(v)])
      );
    } else if (key === 'items') {
      out.items = toJsonSchema(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function extractOpenAiText(data: unknown): string {
  const msg = (data as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message;
  const content = msg?.content;
  let text = '';
  if (typeof content === 'string') text = content;
  else if (Array.isArray(content)) {
    text = content
      .map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text?: string }).text || '') : ''))
      .join('');
  }
  // Buang jejak penalaran model "thinking" bila ikut terkirim
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/** Ambil kunci `sk-...` saja — toleran bila label (mis. "Koboilm:") atau kutip ikut ter-paste. */
function readKoboiKey(): string {
  const raw = (process.env.KOBOILLM_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  const idx = raw.indexOf('sk-');
  return idx > 0 ? raw.slice(idx).trim() : raw;
}

async function callKoboiLlm(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const apiKey = readKoboiKey();
  const baseUrl = (process.env.KOBOILLM_BASE_URL?.trim() || DEFAULT_KOBOILLM_BASE_URL).replace(/\/+$/, '');
  const mode = options.mode ?? 'chat';
  const timeoutMs = mode === 'vision' ? 28000 : 20000;
  const wantJson = options.responseMimeType === 'application/json';

  // KoboiLLM mendukung response_format json_object; skema dititipkan di instruksi sistem agar strukturnya tetap tepat.
  const systemPrompt =
    wantJson && options.responseSchema
      ? `${options.systemInstruction}

FORMAT JAWABAN WAJIB: kembalikan HANYA satu objek JSON valid (tanpa markdown, tanpa teks lain) yang mengikuti JSON Schema berikut. Semua field "required" wajib ada.
${JSON.stringify(toJsonSchema(options.responseSchema))}`
      : options.systemInstruction;

  const messages = toOpenAiMessages(systemPrompt, options.contents);
  const models = getKoboiModels(mode);

  let lastStatus = 503;
  let lastError = 'Layanan AI KoboiLLM sedang sibuk. Silakan coba lagi beberapa saat.';

  for (const model of models) {
    // Percobaan 1 dengan response_format JSON; bila model menolak parameter itu, ulangi tanpa.
    for (const useJsonMode of wantJson ? [true, false] : [false]) {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: options.temperature ?? (mode === 'vision' ? 0.15 : 0.35),
        max_tokens: options.maxOutputTokens ?? (mode === 'vision' ? 4096 : 1200),
        ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          lastStatus = res.status;
          let detail = '';
          try {
            const errJson = (await res.json()) as { error?: { message?: string } | string; message?: string };
            detail =
              (typeof errJson?.error === 'string' ? errJson.error : errJson?.error?.message) || errJson?.message || '';
          } catch {
            // Body error bukan JSON
          }
          if (detail) lastError = detail;

          if (res.status === 401 || res.status === 403) {
            return {
              ok: false,
              statusCode: res.status,
              error: `Kunci API KoboiLLM ditolak (${res.status}). Periksa KOBOILLM_API_KEY. ${detail}`.trim(),
            };
          }
          if (res.status === 402) {
            return {
              ok: false,
              statusCode: 402,
              error: 'Saldo/kredit KoboiLLM habis. Isi ulang saldo di dashboard.koboillm.com lalu coba lagi.',
            };
          }
          // Model menolak response_format → ulangi model yang sama tanpa JSON mode
          if (useJsonMode && res.status === 400 && /response_format|json/i.test(detail)) continue;
          // Model tidak tersedia / sibuk → coba model berikutnya
          break;
        }

        const data = await res.json();
        const text = extractOpenAiText(data);
        if (text) {
          const servedModel = String((data as { model?: string })?.model || model);
          return { ok: true, text, model: servedModel, provider: 'koboillm' };
        }
        lastStatus = 502;
        lastError = `Model ${model} mengembalikan respons kosong.`;
        break;
      } catch (err) {
        lastStatus = 504;
        lastError =
          err instanceof Error && err.name === 'AbortError'
            ? 'Permintaan ke AI KoboiLLM melebihi batas waktu.'
            : 'Gagal terhubung ke server AI KoboiLLM. Periksa koneksi internet server.';
        break;
      }
    }
  }

  return { ok: false, statusCode: lastStatus, error: lastError };
}

/* ============================================================================
   CADANGAN: GOOGLE GEMINI LANGSUNG (dipakai hanya bila KOBOILLM_API_KEY kosong)
   ============================================================================ */

function getGeminiModelCascade(mode: 'vision' | 'chat'): string[] {
  const customModel = process.env.GEMINI_MODEL?.trim();
  const defaults =
    mode === 'vision'
      ? ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']
      : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  return customModel ? [customModel, ...defaults.filter((m) => m !== customModel)] : defaults;
}

async function callGeminiDirect(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const mode = options.mode ?? 'chat';
  const models = getGeminiModelCascade(mode);
  const timeoutMs = mode === 'vision' ? 28000 : 20000;

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.systemInstruction }] },
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        lastStatus = res.status;
        try {
          const errJson = (await res.json()) as { error?: { message?: string } };
          if (errJson?.error?.message) lastError = errJson.error.message;
        } catch {
          // Body error bukan JSON
        }
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
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };
      const parts = data?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts
            .filter((p) => !p.thought && typeof p.text === 'string')
            .map((p) => p.text || '')
            .join('')
            .trim()
        : '';
      if (text) return { ok: true, text, model, provider: 'gemini' };

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

  return { ok: false, statusCode: lastStatus, error: lastError };
}
