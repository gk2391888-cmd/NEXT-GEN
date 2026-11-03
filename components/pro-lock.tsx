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
      <h2 className="mt-md mb-sm">{feature} is a Pro feature</h2>
      {plan.tier === 'guest' ? (
        <>
          <p>Log in to start your {PRICING.trialDays}-day free trial of Pro. No card needed.</p>
          <Link className="btn btn-primary mt-lg" href={`/login?next=${encodeURIComponent(pathname)}`}>Log in to start free trial</Link>
        </>
      ) : (
        <>
          <p>Upgrade to Pro for ₹{PRICING.proMonthlyInr}/month to unlock it, along with unlimited AI doubts and exam-level practice.</p>
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
