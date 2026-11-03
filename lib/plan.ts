'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useProgress } from './progress/store';

/** Pricing in one place; the AI limits are enforced by `consume_doubt()` in the database. */
export const PRICING = {
  proMonthlyInr: 99,
  trialDays: 7,
  freeDoubtsPerDay: 5,
} as const;

export type Tier = 'guest' | 'free' | 'trial' | 'pro';

export type Plan = {
  tier: Tier;
  /** Trial or paid Pro: every Pro feature is unlocked. */
  isPro: boolean;
  /** Whole days left in the trial or paid period (0 when not Pro). */
  daysLeft: number;
};

const DAY_MS = 86_400_000;

export function planFrom(dates: { trialEndsAt?: string; proUntil?: string } | undefined, signedIn: boolean, now = Date.now()): Plan {
  if (!signedIn) return { tier: 'guest', isPro: false, daysLeft: 0 };
  const proUntil = dates?.proUntil ? Date.parse(dates.proUntil) : 0;
  const trialEnds = dates?.trialEndsAt ? Date.parse(dates.trialEndsAt) : 0;
  if (proUntil > now) return { tier: 'pro', isPro: true, daysLeft: Math.ceil((proUntil - now) / DAY_MS) };
  if (trialEnds > now) return { tier: 'trial', isPro: true, daysLeft: Math.ceil((trialEnds - now) / DAY_MS) };
  return { tier: 'free', isPro: false, daysLeft: 0 };
}

export function usePlan(): Plan {
  const { user } = useAuth();
  const { plan } = useProgress();
  return planFrom(plan, Boolean(user));
}
