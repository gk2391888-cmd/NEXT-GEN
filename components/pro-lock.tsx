'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRICING, usePlan } from '@/lib/plan';
import type { ProContentError } from '@/lib/pro-content';

/** Shown in place of a Pro-only feature for Free and logged-out students. */
export function ProLock({ feature, children }: { feature: string; children: React.ReactNode }) {
  const plan = usePlan();
  const pathname = usePathname();
  if (plan.isPro) return <>{children}</>;

  return (
    <div className="card pro-lock">
      <span className="chip chip-yellow">PRO</span>
      <h2 className="mt-md mb-sm">{feature} is a Pro feature</h2>
      {plan.tier === 'guest' ? (
        <>
          <p>Log in to start your {PRICING.trialDays}-day free trial of Pro. No card needed.</p>
          <Link className="btn btn-primary mt-lg" href={`/login?next=${encodeURIComponent(pathname)}`}>Log in to start free trial</Link>
        </>
      ) : (
        <>
          <p>Upgrade to Pro for ₹{PRICING.proMonthlyInr}/month to unlock it, along with more AI doubts and exam-level practice.</p>
          <Link className="btn btn-primary mt-lg" href="/pricing">See Pro plans</Link>
        </>
      )}
    </div>
  );
}

/** Small "PRO" tag for buttons and list items. */
export function ProTag() {
  return <span className="chip chip-yellow chip-sm">PRO</span>;
}

/** Loading and error states while Pro content comes from the server (which checks the plan again). */
export function ProContentStatus({ error, onRetry }: { error: ProContentError | null; onRetry: () => void }) {
  if (!error) return <div className="card"><p className="muted">Loading…</p></div>;
  if (error.code === 'not_in_plan' || error.code === 'login_required') {
    return (
      <div className="card pro-lock">
        <span className="chip chip-yellow">PRO</span>
        <h2 className="mt-md mb-sm">Your account doesn’t have Pro right now</h2>
        <p>{error.message} If you just paid, refresh the page in a minute.</p>
        <Link className="btn btn-primary mt-lg" href="/pricing">See Pro plans</Link>
      </div>
    );
  }
  return (
    <div className="card">
      <p>{error.message}</p>
      <button className="btn btn-secondary mt-md" onClick={onRetry}>Try again</button>
    </div>
  );
}
