import dns from 'node:dns';

// Pastikan IPv4 diprioritaskan agar request ke api.telegram.org cepat (< 500 ms) di Windows & Linux
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Abaikan bila runtime tidak mendukung
}

export interface TelegramBotInfo {
  configured: boolean;
  ok: boolean;
  username: string;
  firstName: string;
  botUrl: string;
  error?: string;
}

export interface TelegramWebhookStatus {
  configured: boolean;
  endpointValid: boolean;
  pendingUpdates: number;
  lastError?: string;
}

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

let cachedBotInfo: { expiresAt: number; data: TelegramBotInfo } | null = null;
const BOT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function getTelegramBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function translateTelegramError(desc?: string): string {
  const lower = (desc || '').toLowerCase();
  if (lower.includes('chat not found')) {
    return 'Chat ID belum dikenali bot. Buka bot di Telegram lalu tekan Start (/start) terlebih dulu.';
  }
  if (lower.includes('blocked by the user')) {
    return 'Bot sedang diblokir di akun Telegram kamu. Buka blokir bot lalu coba lagi.';
  }
  if (lower.includes('too many requests')) {
    return 'Telegram sedang membatasi permintaan sementara. Tunggu beberapa detik lalu coba lagi.';
  }
  if (lower.includes('unauthorized')) {
    return 'Token Bot Telegram ditolak oleh server Telegram. Periksa TELEGRAM_BOT_TOKEN di .env.';
  }
  return desc || 'Gagal menghubungi server Telegram. Periksa koneksi internet server.';
}

async function callTelegramApi<T>(
  method: string,
  payload?: Record<string, unknown>,
  timeoutMs = 25000
): Promise<TelegramApiResponse<T>> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN belum diatur di server.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: payload ? 'POST' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as TelegramApiResponse<T> | null;
    if (!json) {
      return { ok: false, error_code: res.status, description: `Respons HTTP ${res.status}` };
    }
    return json;
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      description: isAbort
        ? 'Koneksi ke server Telegram melebihi batas waktu.'
        : 'Gagal terhubung ke API Telegram.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getTelegramBotInfo(): Promise<TelegramBotInfo> {
  const token = getTelegramBotToken();
  if (!token) {
    const username = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim();
    return {
      configured: false,
      ok: false,
      username,
      firstName: 'CermatTani Bot',
      botUrl: username ? `https://t.me/${username}` : '',
      error: 'TELEGRAM_BOT_TOKEN belum diatur.',
    };
  }

  if (cachedBotInfo && cachedBotInfo.expiresAt > Date.now()) {
    return cachedBotInfo.data;
  }

  const res = await callTelegramApi<{
    id: number;
    username?: string;
    first_name?: string;
  }>('getMe');

  if (res.ok && res.result?.username) {
    const info: TelegramBotInfo = {
      configured: true,
      ok: true,
      username: res.result.username,
      firstName: res.result.first_name || 'CermatTani Bot',
      botUrl: `https://t.me/${res.result.username}`,
    };
    cachedBotInfo = { expiresAt: Date.now() + BOT_CACHE_TTL_MS, data: info };
    return info;
  }

  return {
    configured: true,
    ok: false,
    username: cachedBotInfo?.data.username || '',
    firstName: cachedBotInfo?.data.firstName || 'CermatTani Bot',
    botUrl: cachedBotInfo?.data.botUrl || '',
    error: translateTelegramError(res.description),
  };
}

export async function getTelegramWebhookStatus(): Promise<TelegramWebhookStatus> {
  if (!getTelegramBotToken()) {
    return { configured: false, endpointValid: false, pendingUpdates: 0 };
  }

  const res = await callTelegramApi<{
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
  }>('getWebhookInfo');

  if (!res.ok || !res.result) {
    return {
      configured: false,
      endpointValid: false,
      pendingUpdates: 0,
      lastError: translateTelegramError(res.description),
    };
  }

  const url = res.result.url || '';
  let endpointValid = false;
  try {
    const parsedUrl = new URL(url);
    endpointValid =
      parsedUrl.protocol === 'https:' &&
      parsedUrl.pathname.replace(/\/+$/, '') === '/api/telegram/webhook' &&
      !parsedUrl.search &&
      !parsedUrl.hash;
  } catch {
    endpointValid = false;
  }

  return {
    configured: Boolean(url),
    endpointValid,
    pendingUpdates: Number(res.result.pending_update_count || 0),
    lastError: res.result.last_error_message,
  };
}

export async function sendTelegramMessage(params: {
  chatId: string;
  text: string;
  parseMode?: 'HTML';
}): Promise<{ ok: boolean; error?: string }> {
  const res = await callTelegramApi('sendMessage', {
    chat_id: params.chatId,
    text: params.text,
    ...(params.parseMode ? { parse_mode: params.parseMode } : {}),
    disable_web_page_preview: true,
  });

  if (!res.ok) {
    return { ok: false, error: translateTelegramError(res.description) };
  }
  return { ok: true };
}
