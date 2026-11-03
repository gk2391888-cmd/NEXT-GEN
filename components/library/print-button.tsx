'use client';

import Link from 'next/link';
import { usePlan } from '@/lib/plan';
import { ProTag } from '@/components/pro-lock';

/** "Save as PDF" (the browser's print dialog), a Pro feature. */
export function PrintButton() {
  const { isPro } = usePlan();
  return isPro ? (
    <button className="btn btn-secondary no-print" onClick={() => window.print()}>⤓ Save as PDF</button>
  ) : (
    <Link className="btn btn-secondary no-print" href="/pricing">⤓ Save as PDF <ProTag /></Link>
  );
}
