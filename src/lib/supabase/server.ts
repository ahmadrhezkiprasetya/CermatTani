import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client (memakai SUPABASE_SERVICE_ROLE_KEY).
 * HANYA dipanggil di Next.js API Route Handlers (tidak pernah dikirim ke browser).
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey || url.includes('PROJECT-ID-KAMU') || serviceKey.includes('SERVICE_ROLE_KEY_KAMU')) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
