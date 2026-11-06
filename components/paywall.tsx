'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRICING, type StudyAccess } from '@/lib/plan';
import { useProgress } from '@/lib/progress/store';
import { NO_TRIAL_REASON, savedTrialResult } from '@/lib/trial';
import { useAuth } from './auth/auth-provider';
import { useProCheckout } from './pro-checkout';
import { PRO_FEATURES } from './pricing-plans';
import { OfferNote, ProPrice } from './offer';

const PREVIEW_NOTE = 'Week 1 of every subject, Qualifier Prep and the grade calculator stay free to use.';

/** Shown instead of a page that needs an active free trial or Pro (see <AccessGate>). */
export function Paywall({ access }: { access: Exclude<StudyAccess, 'open'> }) {
  const pathname = usePathname();

  if (access === 'checking') return <div className="card"><p className="muted">Loading…</p></div>;
  if (access === 'starting') {
    return (
      <div className="card pro-lock" role="status">
        <span className="chip chip-teal">{PRICING.trialDays}-DAY FREE TRIAL</span>
        <h2 className="mt-md mb-sm">Setting up your free trial…</h2>
        <p className="muted">This takes a second.</p>
      </div>
    );
  }
  if (access === 'guest') {
    return (
      <div className="card pro-lock paywall">
        <span className="chip chip-teal">{PRICING.trialDays} DAYS FREE · NO CARD NEEDED</span>
        <h2 className="mt-md mb-sm">Sign up free to keep studying</h2>
        <p>Create your account to unlock everything for {PRICING.trialDays} days. After that, Pro is <ProPrice /> for 30 days.</p>
        <ul className="plan-list">
          {PRO_FEATURES.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <div className="paywall-actions stack">
          <Link className="btn btn-primary btn-block btn-lg" href={`/login?next=${encodeURIComponent(pathname)}`}>Start {PRICING.trialDays}-day free trial</Link>
          <Link className="btn btn-secondary btn-block" href={`/login?next=${encodeURIComponent(pathname)}`}>I already have an account</Link>
        </div>
        <p className="muted mt-lg">Want a look first? {PREVIEW_NOTE} <Link className="link" href="/library">Open the Study Library</Link></p>
      </div>
    );
  }
  return <Locked />;
}

/** Logged in without an active plan: why, what they keep, and the ways to pay. */
function Locked() {
  const { user, trial, retryTrial } = useAuth();
  const { plan } = useProgress();
  const checkout = useProCheckout();
  const reason = user ? NO_TRIAL_REASON[savedTrialResult(user.id) ?? 'granted'] : undefined;

  const [chip, title] = trial === 'failed'
    ? ['FREE TRIAL', 'We couldn’t start your free trial']
    : reason ? ['NO FREE TRIAL', 'This account doesn’t have a free trial']
    : plan?.proUntil ? ['PRO ENDED', 'Your Pro plan has ended']
    : ['TRIAL ENDED', 'Your free trial has ended'];

  return (
    <div className="card pro-lock paywall">
      <span className="chip chip-yellow">{chip}</span>
      <h2 className="mt-md mb-sm">{title}</h2>
      {trial === 'failed' && (
        <p>
          Check your connection and <button className="text-btn" onClick={retryTrial}>try again</button>. You can also get Pro straight away.
        </p>
      )}
      {reason && <p>{reason} A free trial is given once per person. You can still get full access with Pro.</p>}
      <p>Get Pro for <ProPrice /> for 30 days to unlock every subject’s notes, practice, mock tests, Coding Lab and AI doubts.</p>
      <OfferNote />
      <p className="alert mt-md">Your progress, mistakes and test history are saved. They’re all here again the moment you pay.</p>
      <div className="paywall-actions mt-lg">{checkout.button}</div>
      {checkout.panel}
      <p className="muted mt-lg">
        {PREVIEW_NOTE} <Link className="link" href="/pricing">See plans</Link>
      </p>
    </div>
  );
}
