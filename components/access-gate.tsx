'use client';

import { usePathname } from 'next/navigation';
import { isOpenPath } from '@/lib/access';
import { useStudyAccess } from '@/lib/plan';
import { Paywall } from './paywall';

/**
 * Shows the page only when it's open to everyone (lib/access.ts) or the visitor has an active
 * free trial or Pro; otherwise the paywall. This is the UI side: what's worth paying for is
 * served by /api/pro/*, which checks the plan again, so it isn't in the page to begin with.
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const access = useStudyAccess();
  if (isOpenPath(pathname) || access === 'open') return <>{children}</>;
  return <Paywall access={access} />;
}
