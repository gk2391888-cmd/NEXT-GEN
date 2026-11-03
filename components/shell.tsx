'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'Overview', icon: '◈' },
  { href: '/library', label: 'Study Library', icon: '▣' },
  { href: '/practice', label: 'Practice Quiz', icon: '▤' },
  { href: '/tests', label: 'Mock Tests', icon: '◷', tag: 'NEW' },
  { href: '/lab', label: 'Python & CT Lab', icon: '⌘' },
  { href: '/doubts', label: 'Doubt Help', icon: '◇' },
  { href: '/progress', label: 'My Progress', icon: '▥' },
];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <Link href="/" className="identity">
          <span className="logo" aria-hidden="true">N</span>
          <span>
            <span className="brand">NEXT GEN</span>
            <span className="brand-sub" style={{ display: 'block' }}>STUDENT LEARNING HUB</span>
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
        </nav>
        <div className="sidebar-bottom">
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
              Student workspace<span className="sep">/</span>
              <strong>{NAV.find((n) => isActive(pathname, n.href))?.label ?? 'NEXT GEN'}</strong>
            </span>
          </div>
          <span className="tag-local" title="Progress is saved in this browser until student accounts launch">● Progress saved on this device</span>
        </header>
        <main className="content" id="content">{children}</main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} NEXT GEN · A THE TECH HUB initiative</span>
          <span>Made for learning by <strong>GAURAV GUPTA</strong></span>
        </footer>
      </div>
    </div>
  );
}
