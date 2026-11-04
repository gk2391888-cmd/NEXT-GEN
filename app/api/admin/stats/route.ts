import { adminClient, clientForToken, getUserFromRequest } from '@/lib/server/supabase';
import { buildStats, type StatsRows } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** Sign-ups, plans, payments and activity for the admin Stats tab. Admins only. */
export async function GET(req: Request) {
  const admin = adminClient();
  if (!admin) return reply({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' }, 503);
  const auth = await getUserFromRequest(req);
  if (!auth) return reply({ error: 'Log in again.' }, 401);
  const { data: isAdmin } = await clientForToken(auth.token).rpc('is_admin');
  if (!isAdmin) return reply({ error: 'Only admins can see the stats.' }, 403);

  // Every account, 1,000 at a time (Supabase's page size limit).
  const users: StatsRows['users'] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return reply({ error: 'Could not load the accounts.' }, 500);
    users.push(...data.users.map((u) => ({ created_at: u.created_at, last_sign_in_at: u.last_sign_in_at })));
    if (data.users.length < 1000) break;
  }

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = (table: string) => admin.from(table).select('*', { count: 'exact', head: true });
  const [profiles, claims, upi, razorpay, recent, answers, tests] = await Promise.all([
    admin.from('profiles').select('trial_ends_at, pro_until, subjects').limit(100_000),
    // trial_claims only exists once migration 0009 has run; without it every count is just 0.
    admin.from('trial_claims').select('granted, reason').eq('granted', false).limit(100_000),
    admin.from('upi_requests').select('status, amount_inr').limit(100_000),
    admin.from('payments').select('status, amount_paise').limit(100_000),
    admin.from('answers').select('user_id').gte('answered_at', weekAgo).limit(100_000),
    count('answers'),
    count('test_attempts'),
  ]);
  if (profiles.error) return reply({ error: 'Could not load the profiles.' }, 500);

  return reply(
    buildStats({
      users,
      profiles: profiles.data ?? [],
      trialClaims: claims.data ?? [],
      upi: upi.data ?? [],
      razorpay: razorpay.data ?? [],
      recentAnswerUsers: (recent.data ?? []).map((r) => r.user_id as string),
      answers: answers.count ?? 0,
      tests: tests.count ?? 0,
    }),
  );
}
