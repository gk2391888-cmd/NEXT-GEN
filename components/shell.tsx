'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountMenu } from './auth/account-menu';
import { useAuth } from './auth/auth-provider';
import { PRICING, usePlan } from '@/lib/plan';
import { RenewBanner } from './renew-banner';
import { ProgrammeSwitch } from './programme-switch';
import { ProgrammePrompt } from './programme-prompt';
import { ChoiceNotice } from './choice-notice';
import { AccessGate } from './access-gate';
import { useChoice, useChosen } from '@/lib/programme-choice';
import { choiceHas, QUALIFIER_PATH, type Tool } from '@/lib/programmes';

/** Items with a `tool` are shown only to the choices that have it (see `choiceHas`). */
const NAV: { href: string; label: string; icon: string; tag?: string; tool?: Tool }[] = [
  { href: '/', label: 'Overview', icon: '◈' },
  { href: QUALIFIER_PATH, label: 'Qualifier Prep', icon: '★', tag: 'NEW', tool: 'qualifier' },
  { href: '/library', label: 'Study Library', icon: '▣' },
  { href: '/practice', label: 'Practice Quiz', icon: '▤' },
  { href: '/mistakes', label: 'My Mistakes', icon: '↻' },
  { href: '/tests', label: 'Mock Tests', icon: '◷', tool: 'tests' },
  { href: '/lab', label: 'Coding Lab', icon: '⌘', tag: 'NEW', tool: 'lab' },
  { href: '/doubts', label: 'AI Doubt Solver', icon: '✦', tag: 'NEW' },
  { href: '/planner', label: 'Exam Planner', icon: '▦', tool: 'planner' },
  { href: '/grades', label: 'Grade Calculator', icon: '∑', tag: 'NEW', tool: 'grades' },
  { href: '/progress', label: 'My Progress', icon: '▥' },
];

/** Topbar titles for pages that aren't in the sidebar. */
const OTHER_PAGES = [
  { href: '/search', label: 'Search' },
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
  const choice = useChoice();
  // Until a student picks, every tool stays in the menu (Qualifier Prep is how many visitors arrive).
  const chosen = useChosen();
  const nav = NAV.filter((item) => !item.tool || !chosen || choiceHas(choice, item.tool));

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
        <ProgrammeSwitch />
        <div className="side-eyebrow">WORKSPACE</div>
        <nav>
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            // A qualifier student goes straight to their own qualifier.
            const href = item.tool === 'qualifier' && choice.qualifier ? `${QUALIFIER_PATH}/${choice.qualifier}` : item.href;
            return (
              <Link key={item.href} href={href} className={`nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
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
              <strong>Start your {PRICING.trialDays}-day free trial</strong>
              <span>Sign up free, no card needed</span>
            </Link>
          )}
          {ready && user && !plan.isPro && !isAdmin && (
            <Link href="/pricing" className="sidebar-pro">
              <strong>Get Pro for ₹{PRICING.proMonthlyInr}</strong>
              <span>30 days of full access, progress kept</span>
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
          <ChoiceNotice />
          <AccessGate>{children}</AccessGate>
          <ProgrammePrompt />
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
