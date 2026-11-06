'use client';

import { useSyncExternalStore } from 'react';
import { RAW, RAW_DARK } from './tokens';
import { DARK_QUERY, THEME_KEY } from './theme-boot';

/** What the student picked; "system" follows the device's own dark mode setting. */
export type ThemePref = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = THEME_KEY;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function readPref(): ThemePref {
  try {
    const p = window.localStorage.getItem(KEY);
    return p === 'light' || p === 'dark' ? p : 'system';
  } catch {
    return 'system';
  }
}

const resolve = (pref: ThemePref): Theme => (pref === 'system' ? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light') : pref);

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  // The phone's browser bar follows the theme too.
  const bar = theme === 'dark' ? (RAW_DARK['color-nav-bg'] ?? RAW['color-nav-bg']) : RAW['color-nav-bg'];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bar));
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, pref);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  apply(resolve(pref));
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readPref() === 'system') apply(resolve('system'));
    listener();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    apply(resolve(readPref()));
    listener();
  };
  media.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** The saved preference and the theme actually showing. The server render assumes light. */
export function useTheme(): { pref: ThemePref; theme: Theme } {
  const pref = useSyncExternalStore(subscribe, readPref, () => 'system' as ThemePref);
  const theme = useSyncExternalStore(subscribe, () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'), () => 'light' as Theme);
  return { pref, theme };
}
