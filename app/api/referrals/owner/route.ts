import { adminClient } from '@/lib/server/supabase';
import { normaliseCode } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

/** The first name behind an invite code, for "Arjun invited you" on the sign-in page. No login needed. */
export async function GET(req: Request) {
  const code = normaliseCode(new URL(req.url).searchParams.get('code'));
  const admin = adminClient();
  if (!code || !admin) return Response.json({ name: null }, { status: code ? 503 : 400 });
  const { data, error } = await admin.rpc('referral_owner', { p_code: code });
  if (error) return Response.json({ name: null }, { status: 502 });
  return Response.json({ name: (data as string | null) ?? null }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
