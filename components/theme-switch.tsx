'use client';

import { setThemePref, useTheme, type ThemePref } from '@/lib/theme';

/** ☀ / 🌙 in the topbar: one tap flips between light and dark. */
export function ThemeToggle() {
  const { theme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="theme-toggle" onClick={() => setThemePref(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '🌙'}</span>
    </button>
  );
}

const OPTIONS: { pref: ThemePref; label: string; icon: string }[] = [
  { pref: 'light', label: 'Light', icon: '☀' },
  { pref: 'dark', label: 'Dark', icon: '🌙' },
  { pref: 'system', label: 'System', icon: '⚙' },
];

/** Light / Dark / System, for the account menu and My profile. */
export function AppearanceSetting() {
  const { pref } = useTheme();
  return (
    <div className="appearance">
      <span className="appearance-label">Appearance</span>
      <div className="segmented" role="radiogroup" aria-label="Appearance">
        {OPTIONS.map((o) => (
          <button key={o.pref} role="radio" aria-checked={pref === o.pref} className={pref === o.pref ? 'on' : ''} onClick={() => setThemePref(o.pref)}>
            <span aria-hidden="true">{o.icon}</span> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
