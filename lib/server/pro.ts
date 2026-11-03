import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRICING } from '@/lib/plans';

const PRO_DAYS = 30;

/** What one month of Pro costs. PRO_PRICE_INR overrides the listed price. */
export const proPriceInr = () => Number(process.env.PRO_PRICE_INR ?? PRICING.proMonthlyInr);

/** Adds 30 days of Pro, counted from now or from the end of the student's current paid period. */
export async function extendPro(admin: SupabaseClient, userId: string) {
  const { data: profile } = await admin.from('profiles').select('pro_until').eq('id', userId).single();
  const from = Math.max(Date.now(), profile?.pro_until ? Date.parse(profile.pro_until) : 0);
  const proUntil = new Date(from + PRO_DAYS * 86_400_000).toISOString();
  const { error } = await admin.from('profiles').update({ pro_until: proUntil }).eq('id', userId);
  if (error) throw error;
}
