'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@/lib/progress/store';
import { useSyncStatus } from '@/lib/sync';
import { usePlan } from '@/lib/plan';
import { initials, useAuth } from './auth-provider';
import { AppearanceSetting, ThemeToggle } from '@/components/theme-switch';

const STATUS_TEXT = { idle: '', syncing: 'Saving…', synced: '✓ Synced', offline: 'Offline · will sync later' } as const;

/** Topbar right side: login button for guests, sync status and profile menu for students. */
export function AccountMenu() {
  const { user, ready, signOut } = useAuth();
  const state = useProgress();
  const status = useSyncStatus();
  const plan = usePlan();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!ready) return <span className="account-placeholder" />;

  if (!user) {
    return (
      <div className="account">
        <ThemeToggle />
        <span className="muted hide-tablet">Progress is saved on this device only</span>
        <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(pathname)}`}>Log in<span className="hide-phone"> to save progress</span></Link>
      </div>
    );
  }

  const fullName = state.profile?.fullName || user.user_metadata?.full_name || user.user_metadata?.name || '';

  return (
    <div className="account" ref={ref}>
      <ThemeToggle />
      {STATUS_TEXT[status] && <span className={`sync-chip hide-tablet ${status}`}>{STATUS_TEXT[status]}</span>}
      {plan.tier === 'trial' && <Link href="/pricing" className="plan-chip pro">Free trial · {plan.daysLeft}d left</Link>}
      {plan.tier === 'pro' && <span className="plan-chip pro">Pro</span>}
      {plan.tier === 'free' && <Link href="/pricing" className="plan-chip">Get Pro</Link>}
      <button className="avatar" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        {initials(user, fullName)}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <span className="avatar lg" aria-hidden="true">{initials(user, fullName)}</span>
            <div className="min-w-0">
              <strong className="block">{fullName || 'Student'}</strong>
              <span className="muted block truncate">{user.email}</span>
            </div>
          </div>
          <Link role="menuitem" className="menu-item" href="/profile">My profile</Link>
          <Link role="menuitem" className="menu-item" href="/progress">My progress</Link>
          <Link role="menuitem" className="menu-item" href="/pricing">Plan and billing</Link>
          <AppearanceSetting />
          <button role="menuitem" className="menu-item danger" onClick={() => signOut()}>Logout</button>
        </div>
      )}
    </div>
  );
}
