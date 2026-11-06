'use client';

import { useEffect, useState } from 'react';
import { hourLabel, MISTAKES_THRESHOLD, type ReminderPrefs } from '@/lib/reminders';
import { isIos, isStandalone, pushSupported, reminderKey, saveReminders, savedReminders, turnOffReminders, type ReminderResult } from '@/lib/push-client';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

const PROBLEM: Partial<Record<ReminderResult, string>> = {
  denied: 'Notifications are blocked for this site. Allow them in your browser’s site settings (the lock icon next to the address), then try again.',
  unsupported: 'This browser can’t show reminders. Try Chrome on Android or a computer.',
  unavailable: 'Reminders are being set up. Please try again in a little while.',
  failed: 'Could not turn on reminders. Check your connection and try again.',
};

/** My profile → Study reminders: one notification a day at most, per device. */
export function ReminderSettings() {
  const [on, setOn] = useState(false);
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => savedReminders().prefs);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [setUp, setSetUp] = useState(true);
  const [iosTab, setIosTab] = useState(false);

  useEffect(() => {
    const saved = savedReminders();
    // On only if this device still has permission (the student may have blocked it since).
    setOn(saved.on && pushSupported() && Notification.permission === 'granted');
    setPrefs(saved.prefs);
    setIosTab(isIos() && !isStandalone());
    reminderKey().then((key) => setSetUp(Boolean(key)));
  }, []);

  async function apply(next: ReminderPrefs, turnOn: boolean) {
    setPrefs(next);
    setNote('');
    setBusy(true);
    if (!turnOn) {
      await turnOffReminders(next);
      setOn(false);
    } else {
      const result = await saveReminders(next);
      setOn(result === 'on');
      if (result !== 'on') setNote(PROBLEM[result] ?? '');
    }
    setBusy(false);
  }

  const change = (patch: Partial<ReminderPrefs>) => {
    const next = { ...prefs, ...patch };
    if (on) apply(next, true);
    else setPrefs(next);
  };

  return (
    <section className="card card-loose max-reading mt-lg" aria-labelledby="reminders-title">
      <div className="flex-between">
        <div>
          <h2 id="reminders-title" className="card-title mb-xs">Study reminders</h2>
          <p className="muted text-small">One notification a day at most, on this device. Works on Android, computers and iPhone (after Add to Home Screen).</p>
        </div>
        <Switch label="Reminders on this device" checked={on} disabled={busy || iosTab || !setUp} onChange={(v) => apply(prefs, v)} />
      </div>

      {iosTab && <p className="alert mt-md">On iPhone, first add NEXT GEN to your Home Screen (Share ⬆︎ → Add to Home Screen), then open it from there to turn on reminders.</p>}
      {!setUp && !iosTab && <p className="alert mt-md">Reminders are being set up. Please check back soon.</p>}
      {note && <p className="field-error mt-md" role="alert">{note}</p>}

      <div className={`setting-list mt-md${on ? '' : ' setting-list-off'}`}>
        <div className="setting-row">
          <span>
            <strong>Daily practice reminder</strong>
            <small>Only on days you haven’t practised yet</small>
          </span>
          <span className="btn-group">
            <label className="sr-only" htmlFor="reminder-hour">Reminder time</label>
            <select id="reminder-hour" className="select select-compact" value={prefs.hour} disabled={busy} onChange={(e) => change({ hour: Number(e.target.value) })}>
              {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            <Switch label="Daily practice reminder" checked={prefs.daily} disabled={busy} onChange={(v) => change({ daily: v })} />
          </span>
        </div>
        <div className="setting-row">
          <span>
            <strong>Exam countdown</strong>
            <small>3 days before, and the day before, your Exam Planner date</small>
          </span>
          <Switch label="Exam countdown" checked={prefs.exam} disabled={busy} onChange={(v) => change({ exam: v })} />
        </div>
        <div className="setting-row">
          <span>
            <strong>Mistakes due for revision</strong>
            <small>When {MISTAKES_THRESHOLD} or more mistakes are due</small>
          </span>
          <Switch label="Mistakes due for revision" checked={prefs.mistakes} disabled={busy} onChange={(v) => change({ mistakes: v })} />
        </div>
      </div>
      <p className="muted text-small mt-md">All reminders come at the time you pick (India time).</p>
    </section>
  );
}

function Switch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" />
    </label>
  );
}
