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
