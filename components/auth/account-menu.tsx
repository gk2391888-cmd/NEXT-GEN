'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@/lib/progress/store';
import { useSyncStatus } from '@/lib/sync';
import { initials, useAuth } from './auth-provider';

const STATUS_TEXT = { idle: '', syncing: 'Saving…', synced: '✓ Synced', offline: 'Offline · will sync later' } as const;

/** Topbar right side: login button for guests, sync status and profile menu for students. */
export function AccountMenu() {
  const { user, ready, signOut } = useAuth();
  const state = useProgress();
  const status = useSyncStatus();
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
        <span className="muted hide-mobile">Progress is saved on this device only</span>
        <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(pathname)}`}>Log in to save progress</Link>
      </div>
    );
  }

  const fullName = state.profile?.fullName || user.user_metadata?.full_name || user.user_metadata?.name || '';

  return (
    <div className="account" ref={ref}>
      {STATUS_TEXT[status] && <span className={`sync-chip ${status}`}>{STATUS_TEXT[status]}</span>}
      <button className="avatar" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        {initials(user, fullName)}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <span className="avatar" aria-hidden="true" style={{ width: 40, height: 40 }}>{initials(user, fullName)}</span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: 'block' }}>{fullName || 'Student'}</strong>
              <span className="muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
            </div>
          </div>
          <Link role="menuitem" className="menu-item" href="/profile">My profile</Link>
          <Link role="menuitem" className="menu-item" href="/progress">My progress</Link>
          <button role="menuitem" className="menu-item danger" onClick={() => signOut()}>Logout</button>
        </div>
      )}
    </div>
  );
}
