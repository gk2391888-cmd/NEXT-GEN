import { adminClient, getUserFromRequest } from '@/lib/server/supabase';
import { REFERRAL, type ReferralFriend, type ReferralSummary } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** The student's invite code (made on first visit) and the friends who joined with it. */
export async function GET(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return reply({ error: 'Log in first.' }, 401);
  const admin = adminClient();
  if (!admin) return reply({ error: 'Invites are being set up. Please try again in a little while.' }, 503);

  const [code, friends] = await Promise.all([
    admin.rpc('referral_code_for', { p_uid: auth.user.id }),
    admin.rpc('referral_friends', { p_uid: auth.user.id }),
  ]);
  if (code.error || friends.error) {
    console.error('[referrals]', code.error ?? friends.error);
    return reply({ error: 'Could not load your invites. Please try again.' }, 502);
  }

  const list: ReferralFriend[] = (friends.data ?? []).map((f: { name: string; status: ReferralFriend['status']; joined_at: string; rewarded_at: string | null; answered: number }) => ({
    name: f.name,
    status: f.status,
    joinedAt: f.joined_at,
    rewardedAt: f.rewarded_at,
    answered: f.answered,
  }));
  const rewarded = list.filter((f) => f.status === 'rewarded');
  const monthAgo = Date.now() - 30 * 86_400_000;
  const summary: ReferralSummary = {
    code: code.data as string,
    friends: list,
    earnedDays: rewarded.length * REFERRAL.rewardDays,
    rewardedThisMonth: rewarded.filter((f) => f.rewardedAt && Date.parse(f.rewardedAt) > monthAgo).length,
  };
  return reply(summary);
}
