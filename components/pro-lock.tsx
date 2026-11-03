'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRICING, usePlan } from '@/lib/plan';

/** Shown in place of a Pro-only feature for Free and logged-out students. */
export function ProLock({ feature, children }: { feature: string; children: React.ReactNode }) {
  const plan = usePlan();
  const pathname = usePathname();
  if (plan.isPro) return <>{children}</>;

  return (
    <div className="card pro-lock">
      <span className="chip chip-yellow">PRO</span>
      <h2 style={{ margin: '12px 0 6px' }}>{feature} is a Pro feature</h2>
      {plan.tier === 'guest' ? (
        <>
          <p>Log in to start your {PRICING.trialDays}-day free trial of Pro. No card needed.</p>
          <Link className="btn btn-primary" style={{ marginTop: 16 }} href={`/login?next=${encodeURIComponent(pathname)}`}>Log in to start free trial</Link>
        </>
      ) : (
        <>
          <p>Upgrade to Pro for ₹{PRICING.proMonthlyInr}/month to unlock it, along with unlimited AI doubts and exam-level practice.</p>
          <Link className="btn btn-primary" style={{ marginTop: 16 }} href="/pricing">See Pro plans</Link>
        </>
      )}
    </div>
  );
}

/** Small "PRO" tag for buttons and list items. */
export function ProTag() {
  return <span className="chip chip-yellow" style={{ fontSize: 10, padding: '2px 6px' }}>PRO</span>;
}
