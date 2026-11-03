import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRICING } from '@/lib/plans';

const PRO_DAYS = 30;

/** What one month of Pro costs. PRO_PRICE_INR overrides the listed price. */
export const proPriceInr = () => Number(process.env.PRO_PRICE_INR ?? PRICING.proMonthlyInr);

/**
 * Adds 30 days of Pro, counted from whichever ends last: now, the current paid period
 * or the free trial. So paying early (renewing, or during the trial) never loses days.
 */
export async function extendPro(admin: SupabaseClient, userId: string) {
  const { data: profile, error: readError } = await admin.from('profiles').select('pro_until, trial_ends_at').eq('id', userId).single();
  if (readError) throw readError;
  const end = (iso: string | null) => (iso ? Date.parse(iso) : 0);
  const from = Math.max(Date.now(), end(profile.pro_until), end(profile.trial_ends_at));
  const proUntil = new Date(from + PRO_DAYS * 86_400_000).toISOString();
  const { error } = await admin.from('profiles').update({ pro_until: proUntil }).eq('id', userId);
  if (error) throw error;
}
