'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PRICING, usePlan } from '@/lib/plan';
import { useAuth } from './auth/auth-provider';

const DISMISS_KEY = 'nextgen-renew-dismissed';
const today = () => new Date().toISOString().slice(0, 10);

/**
 * A reminder that Pro is ending soon, since nothing renews automatically:
 * paid Pro in its last 5 days, or a trial in its last 2. Can be hidden for the day.
 */
export function RenewBanner() {
  const { user, ready } = useAuth();
  const plan = usePlan();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === today());
    } catch {
      setDismissed(false);
    }
  }, []);

  const ending = (plan.tier === 'pro' && plan.daysLeft <= 5) || (plan.tier === 'trial' && plan.daysLeft <= 2);
  if (!ready || !user || !ending || dismissed || pathname === '/pricing') return null;

  const when = plan.daysLeft <= 1 ? 'today' : `in ${plan.daysLeft} days`;
  function hide() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, today());
    } catch {
      // Hidden for this visit only.
    }
  }

  return (
    <div className="alert alert-warn renew-banner no-print" role="status">
      <span>
        {plan.tier === 'trial' ? 'Your free Pro trial ends' : 'Your Pro plan ends'} {when}. Keep End term tests, OPPE sets and more AI doubts for ₹{PRICING.proMonthlyInr}/month.
      </span>
      <span className="btn-group">
        <Link className="btn btn-primary" href="/pricing">{plan.tier === 'trial' ? 'Keep Pro' : 'Renew'}</Link>
        <button className="btn btn-secondary" onClick={hide}>Later</button>
      </span>
    </div>
  );
}
