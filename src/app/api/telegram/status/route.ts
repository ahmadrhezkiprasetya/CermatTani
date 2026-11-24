import { NextResponse } from 'next/server';
import { getTelegramBotInfo } from '@/lib/telegram';

/**
 * GET /api/telegram/status
 * Mengembalikan username & tautan langsung Bot Telegram aktif untuk deep-link tautan akun.
 */
export async function GET() {
  const info = await getTelegramBotInfo();
  return NextResponse.json(info);
}
