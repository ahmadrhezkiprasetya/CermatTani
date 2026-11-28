import { NextResponse } from 'next/server';
import { getTelegramBotInfo, getTelegramWebhookStatus } from '@/lib/telegram';

/**
 * GET /api/telegram/status
 * Mengembalikan username & tautan langsung Bot Telegram aktif untuk deep-link tautan akun.
 */
export async function GET() {
  const [info, webhook] = await Promise.all([
    getTelegramBotInfo(),
    getTelegramWebhookStatus(),
  ]);
  return NextResponse.json({ ...info, webhook });
}
