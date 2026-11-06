'use client';

import { authedFetch } from './supabase/client';
import { DEFAULT_PREFS, type ReminderPrefs } from './reminders';

/* ---------------- The device ---------------- */

/** Opened from the home screen (installed), not in a browser tab. */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone or iPad, where Safari only offers Add to Home Screen by hand, and push only works once added. */
export function isIos() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Registers public/sw.js (reminders, and what makes the site installable). */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/sw.js').catch(() => null);
}

/* ---------------- Reminders ---------------- */

const PREFS_KEY = 'nextgen-reminders';

type Saved = { on: boolean; prefs: ReminderPrefs };

/** What this device last saved, for showing the settings before the server answers. */
export function savedReminders(): Saved {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null') as Saved | null;
    return saved?.prefs ? { on: Boolean(saved.on), prefs: { ...DEFAULT_PREFS, ...saved.prefs } } : { on: false, prefs: DEFAULT_PREFS };
  } catch {
    return { on: false, prefs: DEFAULT_PREFS };
  }
}

function remember(saved: Saved) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(saved));
  } catch {
    // The server still has the choice; only the settings page's first paint uses this.
  }
}

/** The site's public push key, or null while reminders aren't set up (no VAPID keys in Vercel). */
export async function reminderKey(): Promise<string | null> {
  try {
    const res = await authedFetch('/api/reminders');
    return res.ok ? (((await res.json()) as { publicKey: string | null }).publicKey ?? null) : null;
  } catch {
    return null;
  }
}

function keyBytes(base64url: string) {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export type ReminderResult = 'on' | 'denied' | 'unsupported' | 'unavailable' | 'failed';

/**
 * Turns reminders on for this device (asking for permission the first time), or saves new
 * choices when they're already on.
 */
export async function saveReminders(prefs: ReminderPrefs): Promise<ReminderResult> {
  if (!pushSupported()) return 'unsupported';
  const key = await reminderKey();
  if (!key) return 'unavailable';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const res = await authedFetch('/api/reminders', { method: 'POST', body: JSON.stringify({ subscription: subscription.toJSON(), prefs }) });
    if (!res.ok) return 'failed';
    remember({ on: true, prefs });
    return 'on';
  } catch {
    return 'failed';
  }
}

export async function turnOffReminders(prefs: ReminderPrefs) {
  remember({ on: false, prefs });
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await authedFetch('/api/reminders', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
    await subscription.unsubscribe();
  } catch {
    // Already off on this device.
  }
}
