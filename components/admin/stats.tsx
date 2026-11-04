'use client';

import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/supabase/client';
import type { AdminStats } from '@/lib/admin-stats';
import { ProgressBar } from '@/components/ui';

const REASON_LABEL: Record<string, string> = {
  email: 'Same email again',
  device: 'Same device again',
  network: 'Too many from one network',
  disposable: 'Temporary email',
};

const num = (n: number) => n.toLocaleString('en-IN');
const dayLabel = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** How the launch is going: sign-ups, trials, payments and activity, counted on the server. */
export function Stats({ onOpenPayments }: { onOpenPayments: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await authedFetch('/api/admin/stats');
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(body.error ?? 'Could not load the stats.');
    setStats(body as AdminStats);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!stats) {
    return error ? <p className="field-error" role="alert">{error}</p> : <p className="muted">Loading stats…</p>;
  }

  const { users, plans, revenue, activity } = stats;
  const maxDay = Math.max(1, ...stats.signupsByDay.map((d) => d.count));
  const reasons = Object.entries(stats.noTrialReasons);

  return (
    <div className="stack">
      <div className="flex-between">
        <span className="muted">
          Updated {new Date(stats.generatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}. Days are India time.
        </span>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="grid grid-4">
        <div className="stat"><strong>{num(users.total)}</strong><span>Sign-ups in total</span></div>
        <div className="stat"><strong>{num(users.today)}</strong><span>Signed up today</span></div>
        <div className="stat"><strong>{num(users.last7Days)}</strong><span>Signed up in the last 7 days</span></div>
        <div className="stat"><strong>{num(users.active7Days)}</strong><span>Practised in the last 7 days</span></div>
      </div>

      <div className="grid grid-4">
        <div className="stat"><strong>{num(plans.onTrial)}</strong><span>On the free trial</span></div>
        <div className="stat"><strong className="tone-good">{num(plans.pro)}</strong><span>Paying Pro now</span></div>
        <div className="stat"><strong>{num(plans.trialEnded)}</strong><span>Trial over or none, not paid</span></div>
        <div className="stat"><strong>{num(users.signedIn24h)}</strong><span>Logged in in the last 24 hours</span></div>
      </div>

      <div className="grid grid-2 stack-laptop">
        <div className="card">
          <h3 className="card-title">Payments</h3>
          <div className="weak-row"><span>UPI approved</span><b>{num(revenue.upiApproved)} · ₹{num(revenue.upiInr)}</b></div>
          <div className="weak-row">
            <span>UPI waiting for you</span>
            <span className="btn-group">
              <b className={revenue.upiPending ? 'tone-poor' : ''}>{num(revenue.upiPending)}</b>
              {revenue.upiPending > 0 && <button className="text-btn" onClick={onOpenPayments}>Review →</button>}
            </span>
          </div>
          <div className="weak-row"><span>Razorpay paid</span><b>{num(revenue.razorpayPaid)} · ₹{num(revenue.razorpayInr)}</b></div>
          <div className="weak-row"><span><strong>Total received</strong></span><b>₹{num(revenue.upiInr + revenue.razorpayInr)}</b></div>
        </div>

        <div className="card">
          <h3 className="card-title">No free trial given</h3>
          {reasons.length === 0 ? (
            <p className="muted">Nobody has been refused a trial yet.</p>
          ) : (
            reasons.map(([reason, n]) => (
              <div key={reason} className="weak-row"><span>{REASON_LABEL[reason] ?? reason}</span><b>{num(n)}</b></div>
            ))
          )}
          <p className="muted mt-sm">These accounts can still use week 1 and buy Pro.</p>
        </div>
      </div>

      <div className="grid grid-2 stack-laptop">
        <div className="card">
          <h3 className="card-title">Sign-ups, last 14 days</h3>
          {[...stats.signupsByDay].reverse().map((d) => (
            <div key={d.day} className="week-score">
              <div><span>{dayLabel(d.day)}</span><b>{num(d.count)}</b></div>
              <ProgressBar value={(d.count / maxDay) * 100} color="var(--color-accent-solid)" />
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="card-title">Preparing for</h3>
          {stats.choices.length === 0 ? (
            <p className="muted">No students yet.</p>
          ) : (
            stats.choices.map((c) => (
              <div key={c.label} className="weak-row"><span>{c.label}</span><b>{num(c.count)}</b></div>
            ))
          )}
          <h3 className="card-title mt-lg">Activity</h3>
          <div className="weak-row"><span>Questions answered</span><b>{num(activity.answers)}</b></div>
          <div className="weak-row"><span>Mock tests submitted</span><b>{num(activity.tests)}</b></div>
          <p className="muted mt-sm">Visitors who haven&apos;t signed up are counted in Vercel → Analytics, not here.</p>
        </div>
      </div>
    </div>
  );
}
