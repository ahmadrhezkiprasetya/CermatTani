import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('PROJECT-ID-KAMU')
);

let browserClient: SupabaseClient | null = null;

/**
 * Mengembalikan singleton Supabase browser client jika NEXT_PUBLIC_SUPABASE_URL
 * dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diisi di website/.env.local.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return browserClient;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.access_token || null;
}
