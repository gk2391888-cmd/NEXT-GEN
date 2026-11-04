'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useProgress } from './progress/store';
import { planFrom, type Plan } from './plans';

export { PRICING, accessOf, planFrom, type Access, type Plan, type Tier } from './plans';

/** The signed-in student's plan (guest when logged out). */
export function usePlan(): Plan {
  const { user } = useAuth();
  const { plan } = useProgress();
  return planFrom(plan, Boolean(user));
}

/**
 * Whether the study app is open to this visitor:
 * - checking: the session or the account's plan is still loading
 * - guest: logged out
 * - starting: a new account is claiming its free trial
 * - locked: logged in, but no active trial or Pro (trial over, Pro over, or no trial given)
 * - open: active trial, Pro, or an admin (admins are never locked)
 */
export type StudyAccess = 'checking' | 'guest' | 'starting' | 'locked' | 'open';

export function useStudyAccess(): StudyAccess {
  const { user, ready, loaded, isAdmin, trial } = useAuth();
  const plan = usePlan();
  const { plan: dates } = useProgress();
  if (!ready) return 'checking';
  if (!user) return 'guest';
  if (plan.isPro || isAdmin) return 'open';
  // A plan saved on this device may be out of date (e.g. paid on another device): wait for the account.
  if (!loaded) return 'checking';
  if (!dates?.trialEndsAt && !dates?.proUntil) return trial === 'failed' ? 'locked' : 'starting';
  return 'locked';
}
