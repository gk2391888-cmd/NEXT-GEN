'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRICING, usePlan } from '@/lib/plan';
import type { ProContentError } from '@/lib/pro-content';
import { useAuth } from './auth/auth-provider';
import { OfferNote, ProPrice } from './offer';

/**
 * Shown in place of a trial-or-Pro feature on a page that's otherwise open to everyone
 * (e.g. a Pro qualifier mock). Whole pages are locked by <AccessGate> instead.
 */
export function ProLock({ feature, children }: { feature: string; children: React.ReactNode }) {
  const plan = usePlan();
  const pathname = usePathname();
  const { ready, isAdmin } = useAuth();
  if (plan.isPro || isAdmin) return <>{children}</>;
  // Until the session is known everyone looks like a guest, so don't flash "Log in" at Pro students.
  if (!ready) return <div className="card"><p className="muted">Loading…</p></div>;

  return (
    <div className="card pro-lock">
      <span className="chip chip-yellow">PRO</span>
      <h2 className="mt-md mb-sm">{feature} is a Pro feature</h2>
      {plan.tier === 'guest' ? (
        <>
          <p>Sign up to start your {PRICING.trialDays}-day free trial. No card needed.</p>
          <Link className="btn btn-primary mt-lg" href={`/login?next=${encodeURIComponent(pathname)}`}>Start free trial</Link>
        </>
      ) : (
        <>
          <p>Get Pro for <ProPrice /> for 30 days to unlock it, along with every subject’s notes, practice and mock tests. Your progress is saved.</p>
          <OfferNote />
          <Link className="btn btn-primary mt-lg" href="/pricing">Get Pro</Link>
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
