import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRICING } from '@/lib/plans';
import { activeOffer, type Offer } from '@/lib/offers';

const PRO_DAYS = 30;

/** What one month of Pro normally costs. PRO_PRICE_INR overrides the listed price. */
export const proPriceInr = () => Number(process.env.PRO_PRICE_INR ?? PRICING.proMonthlyInr);

export type Price = {
  amountInr: number;
  fullPriceInr: number;
  /** Set when this payment gets the offer price; stored on the payment. */
  offerId: string | null;
  /** The running offer, if any, even when this student has already used it. */
  offer: Offer | null;
  offerUsed: boolean;
};

/** Whether this student already has a live (pending or approved) or paid payment that used the offer. */
async function hasUsedOffer(admin: SupabaseClient, userId: string, offerId: string) {
  const [upi, card] = await Promise.all([
    admin.from('upi_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('offer_id', offerId).neq('status', 'rejected'),
    admin.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('offer_id', offerId).eq('status', 'paid'),
  ]);
  if (upi.error) throw upi.error;
  if (card.error) throw card.error;
  return (upi.count ?? 0) + (card.count ?? 0) > 0;
}

/**
 * The price this student pays right now: the offer price while an offer runs
 * and they haven't used it yet, otherwise the normal price. Logged-out visitors
 * (no userId) see the offer price, since they haven't used it.
 */
export async function priceFor(admin: SupabaseClient | null, userId: string | null): Promise<Price> {
  const fullPriceInr = proPriceInr();
  const offer = activeOffer();
  if (!offer || offer.priceInr >= fullPriceInr) return { amountInr: fullPriceInr, fullPriceInr, offerId: null, offer: null, offerUsed: false };
  const offerUsed = Boolean(userId && admin && (await hasUsedOffer(admin, userId, offer.id)));
  return offerUsed
    ? { amountInr: fullPriceInr, fullPriceInr, offerId: null, offer, offerUsed }
    : { amountInr: offer.priceInr, fullPriceInr, offerId: offer.id, offer, offerUsed };
}

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
