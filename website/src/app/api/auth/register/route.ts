import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/register
 * Mendaftarkan atau mengonfirmasi akun petani menggunakan SUPABASE_SERVICE_ROLE_KEY
 * di sisi server agar bebas dari error 429 (email rate limit Supabase Free Tier)
 * dan akun langsung aktif (`email_confirm: true`) tanpa tertahan verifikasi email.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const nama = String(body.nama || 'Petani CermatTani').trim();
    const confirmOnly = Boolean(body.confirmOnly);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format alamat email tidak valid.' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ fallbackToClient: true });
    }

    if (confirmOnly) {
      const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = listData?.users?.find((u) => (u.email || '').toLowerCase() === email);
      if (existing && !existing.email_confirmed_at) {
        await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
        return NextResponse.json({ ok: true, confirmedExisting: true });
      }
      return NextResponse.json({ ok: false });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama },
    });

    if (error) {
      const lower = (error.message || '').toLowerCase();
      if (
        lower.includes('already been registered') ||
        lower.includes('already exists') ||
        lower.includes('user already registered')
      ) {
        // Jika akun sebelumnya sempat terbuat saat terkena limit 429 / belum terkonfirmasi,
        // aktifkan status email_confirm agar pengguna bisa langsung login dengan password-nya.
        const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = listData?.users?.find((u) => (u.email || '').toLowerCase() === email);
        if (existing && !existing.email_confirmed_at) {
          await admin.auth.admin.updateUserById(existing.id, {
            email_confirm: true,
            user_metadata: { ...(existing.user_metadata || {}), nama },
          });
          return NextResponse.json({ ok: true, confirmedExisting: true, userId: existing.id });
        }
        return NextResponse.json(
          { error: 'Email ini sudah terdaftar. Silakan pindah ke tab Masuk (Login).' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Gagal mendaftarkan akun di server.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, userId: data.user?.id || null });
  } catch {
    return NextResponse.json(
      { error: 'Permintaan pendaftaran akun tidak valid.' },
      { status: 400 }
    );
  }
}
