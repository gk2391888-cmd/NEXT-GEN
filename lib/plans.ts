/**
 * Plans and pricing, shared by the browser and the server. Pure functions only,
 * so the API routes and the UI always agree on who is Free and who is Pro.
 */
export const PRICING = {
  proMonthlyInr: 99,
  trialDays: 7,
} as const;

export type Tier = 'guest' | 'free' | 'trial' | 'pro';

/** What a tier gets: trial students get everything Pro students get. */
export type Access = 'guest' | 'free' | 'pro';

export type Plan = {
  tier: Tier;
  /** Trial or paid Pro: every Pro feature is unlocked. */
  isPro: boolean;
  /** Whole days left in the trial or paid period (0 when not Pro). */
  daysLeft: number;
};

const DAY_MS = 86_400_000;

export function planFrom(dates: { trialEndsAt?: string | null; proUntil?: string | null } | undefined, signedIn: boolean, now = Date.now()): Plan {
  if (!signedIn) return { tier: 'guest', isPro: false, daysLeft: 0 };
  const proUntil = dates?.proUntil ? Date.parse(dates.proUntil) : 0;
  const trialEnds = dates?.trialEndsAt ? Date.parse(dates.trialEndsAt) : 0;
  if (proUntil > now) return { tier: 'pro', isPro: true, daysLeft: Math.ceil((proUntil - now) / DAY_MS) };
  if (trialEnds > now) return { tier: 'trial', isPro: true, daysLeft: Math.ceil((trialEnds - now) / DAY_MS) };
  return { tier: 'free', isPro: false, daysLeft: 0 };
}

export const accessOf = (plan: Plan): Access => (plan.tier === 'guest' ? 'guest' : plan.isPro ? 'pro' : 'free');
