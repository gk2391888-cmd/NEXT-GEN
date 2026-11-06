'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home', icon: '◈' },
  { href: '/library', label: 'Library', icon: '▣' },
  { href: '/practice', label: 'Practice', icon: '▤' },
  { href: '/doubts', label: 'Ask AI', icon: '✦' },
];

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

/** Phones and tablets: the four places students go most, plus "More" for the full menu. */
export function TabBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const pathname = usePathname();
  const inTabs = TABS.some((t) => isActive(pathname, t.href));
  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {TABS.map((t) => {
        const active = isActive(pathname, t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
      <button className={`tab${!inTabs || moreOpen ? ' active' : ''}`} onClick={onMore} aria-expanded={moreOpen} aria-label="More: open the full menu">
        <span aria-hidden="true">☰</span>
        More
      </button>
    </nav>
  );
}
