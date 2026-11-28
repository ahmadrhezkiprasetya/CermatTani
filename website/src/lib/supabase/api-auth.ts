import type { User } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from './server';

export async function authenticateSupabaseRequest(
  request: Request
): Promise<
  | { admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>; user: User }
  | { error: string; status: number }
> {
  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!accessToken) {
    return { error: 'Silakan masuk ke akun CermatTani terlebih dahulu.', status: 401 };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { error: 'Supabase server belum dikonfigurasi.', status: 503 };
  }

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) {
    return { error: 'Sesi login tidak valid atau sudah berakhir. Silakan masuk kembali.', status: 401 };
  }

  return { admin, user: data.user };
}
