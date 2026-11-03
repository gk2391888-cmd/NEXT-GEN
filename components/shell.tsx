'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountMenu } from './auth/account-menu';
import { useAuth } from './auth/auth-provider';
import { PRICING, usePlan } from '@/lib/plan';
import { RenewBanner } from './renew-banner';

const NAV = [
  { href: '/', label: 'Overview', icon: '◈' },
  { href: '/library', label: 'Study Library', icon: '▣' },
  { href: '/practice', label: 'Practice Quiz', icon: '▤' },
  { href: '/mistakes', label: 'My Mistakes', icon: '↻' },
  { href: '/tests', label: 'Mock Tests', icon: '◷' },
  { href: '/lab', label: 'Coding Lab', icon: '⌘', tag: 'NEW' },
  { href: '/doubts', label: 'AI Doubt Solver', icon: '✦', tag: 'NEW' },
  { href: '/planner', label: 'Exam Planner', icon: '▦' },
  { href: '/grades', label: 'Grade Calculator', icon: '∑', tag: 'NEW' },
  { href: '/progress', label: 'My Progress', icon: '▥' },
];

/** Topbar titles for pages that aren't in the sidebar. */
const OTHER_PAGES = [
  { href: '/search', label: 'Search notes' },
  { href: '/pricing', label: 'Plans and pricing' },
  { href: '/profile', label: 'My profile' },
  { href: '/admin', label: 'Admin' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Use' },
];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
const pageTitle = (pathname: string) => [...NAV, ...OTHER_PAGES].find((n) => isActive(pathname, n.href))?.label ?? 'NEXT GEN';

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, ready, isAdmin } = useAuth();
  const plan = usePlan();

  useEffect(() => setOpen(false), [pathname]);

  // The login screen is full-page, without the workspace chrome.
  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <Link href="/" className="identity">
          <span className="logo" aria-hidden="true">N</span>
          <span>
            <span className="brand">NEXT GEN</span>
            <span className="brand-sub">STUDENT LEARNING HUB</span>
          </span>
        </Link>
        <div className="side-eyebrow">WORKSPACE</div>
        <nav>
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.tag && <span className="nav-tag">{item.tag}</span>}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" className={`nav-item${isActive(pathname, '/admin') ? ' active' : ''}`}>
              <span className="nav-icon" aria-hidden="true">⚙</span>
              Admin
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          {ready && !user && (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="sidebar-login">
              <strong>Log in to save progress</strong>
              <span>Keep your progress on every device</span>
            </Link>
          )}
          {ready && user && !plan.isPro && (
            <Link href="/pricing" className="sidebar-pro">
              <strong>Go Pro for ₹{PRICING.proMonthlyInr}/month</strong>
              <span>More AI doubts and End term tests</span>
            </Link>
          )}
          <div className="sidebar-info">
            <div className="status-light" />
            <div>
              <strong>Independent learning project</strong>
              <span>Not affiliated with IIT Madras</span>
            </div>
          </div>
          <div className="sidebar-company">
            POWERED BY
            <strong>THE TECH HUB</strong>
            <span>Created by GAURAV GUPTA</span>
          </div>
        </div>
      </aside>
      <div className={`mobile-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <div className="main-wrap">
        <header className="topbar">
          <div className="top-left">
            <button className="menu-toggle" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
            <span className="crumb">
              <span className="crumb-section">Student workspace<span className="sep">/</span></span>
              <strong>{pageTitle(pathname)}</strong>
            </span>
          </div>
          <AccountMenu />
        </header>
        <main className="content" id="content">
          <RenewBanner />
          {children}
        </main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} NEXT GEN · A THE TECH HUB initiative</span>
          <span className="footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </span>
          <span>Made for learning by <strong>GAURAV GUPTA</strong></span>
        </footer>
      </div>
    </div>
  );
}
