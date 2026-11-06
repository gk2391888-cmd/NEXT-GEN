'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { claimPromptSlot } from '@/lib/prompt-slot';
import { DEFAULT_PREFS, hourLabel } from '@/lib/reminders';
import { isIos, isStandalone, pushSupported, reminderKey, saveReminders, savedReminders } from '@/lib/push-client';

const SNOOZE_KEY = 'nextgen-reminder-prompt-snoozed';
/** "Not now" hides the card for this long. */
const SNOOZE_DAYS = 7;
/** Let the page settle (and the Overview load) before asking. */
const DELAY_MS = 4000;

/**
 * "Get a daily study reminder", for logged-in students who haven't turned reminders on on this
 * device. Browsers only show their Allow popup well when the student taps a button, so this card
 * asks first and "Turn on" opens the real popup. Never shown again once allowed or blocked.
 */
export function ReminderPrompt() {
  const { user, loaded } = useAuth();
  const [show, setShow] = useState(false);
  const [state, setState] = useState<'ask' | 'busy' | 'done'>('ask');

  useEffect(() => {
    if (!user || !loaded) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!pushSupported() || Notification.permission !== 'default' || savedReminders().on) return;
      // iPhone only allows notifications in the Home Screen app, not in a Safari tab.
      if (isIos() && !isStandalone()) return;
      let snoozedAt = 0;
      try {
        snoozedAt = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0) || 0;
      } catch {
        // Treated as never snoozed.
      }
      if (Date.now() - snoozedAt < SNOOZE_DAYS * 86_400_000) return;
      if (!(await reminderKey()) || cancelled) return;
      if (claimPromptSlot('reminders')) setShow(true);
    }, DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, loaded]);

  function snooze() {
    setShow(false);
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      // Hidden for this visit.
    }
  }

  async function turnOn() {
    setState('busy');
    const result = await saveReminders(DEFAULT_PREFS);
    if (result === 'on') {
      setState('done');
      window.setTimeout(() => setShow(false), 4000);
    } else {
      // Blocked or failed: don't ask again soon; My profile explains how to fix it.
      snooze();
    }
  }

  if (!show) return null;
  return (
    <div className="install-sheet" role="dialog" aria-labelledby="reminder-prompt-title">
      <div className="install-head">
        <span className="logo install-logo" aria-hidden="true">🔔</span>
        <div>
          <h3 id="reminder-prompt-title">{state === 'done' ? 'Reminders are on ✓' : 'Get a daily study reminder'}</h3>
          <p>
            {state === 'done'
              ? `You’ll get one at ${hourLabel(DEFAULT_PREFS.hour)} on days you haven’t practised. Change the time in My profile.`
              : `One notification a day at ${hourLabel(DEFAULT_PREFS.hour)}, only on days you haven’t practised, plus your exam countdown.`}
          </p>
        </div>
      </div>
      {state !== 'done' && (
        <>
          <div className="btn-group install-actions">
            <button type="button" className="btn btn-secondary" onClick={snooze} disabled={state === 'busy'}>Not now</button>
            <button type="button" className="btn btn-primary" onClick={turnOn} disabled={state === 'busy'}>{state === 'busy' ? 'Turning on…' : 'Turn on'}</button>
          </div>
          <p className="install-note">You can change or turn it off any time in <Link href="/profile">My profile</Link>.</p>
        </>
      )}
    </div>
  );
}
