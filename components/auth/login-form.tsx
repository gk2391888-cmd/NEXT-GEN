'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthProviders, getSupabase } from '@/lib/supabase/client';
import { isDisposableEmail } from '@/lib/disposable-email';
import { PRICING } from '@/lib/plans';
import { useAuth } from './auth-provider';
import { InvitedBanner, useInviter } from '@/components/referral';
import { REFERRAL } from '@/lib/referrals';

const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Only same-site paths, so the login link can't be used to bounce students to another website.
 * Parsed like the browser would, since it treats `/\evil.com` and `/%09/evil.com` as `//evil.com`.
 */
function safeNext(value: string | null) {
  if (!value?.startsWith('/')) return '/';
  const base = 'https://nextgen.invalid';
  try {
    const url = new URL(value, base);
    return url.origin === base && !url.pathname.startsWith('/login') ? url.pathname + url.search + url.hash : '/';
  } catch {
    return '/';
  }
}

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('expired') || m.includes('invalid')) return 'That code is incorrect or has expired. Check it, or request a new one.';
  if (m.includes('fetch') || m.includes('network')) return 'Check your internet connection and try again.';
  return 'Something went wrong. Please try again shortly.';
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const inviter = useInviter(params.get('ref'));
  const { user, ready } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getAuthProviders().then((p) => setGoogleEnabled(p.google));
  }, []);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) {
      setError('Enter a valid email address, such as rahul@gmail.com.');
      return;
    }
    if (isDisposableEmail(address)) {
      setError('Temporary email addresses can’t be used. Please use your own email, such as Gmail or your college email.');
      return;
    }
    setBusy(true);
    setError('');
    // The email carries a login link (and a code too, once the email template includes {{ .Token }}).
    const emailRedirectTo = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
    const { error } = await getSupabase().auth.signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo } });
    setBusy(false);
    if (error) return setError(friendlyError(error.message));
    setEmail(address);
    setCode('');
    setStep('code');
    setCooldown(RESEND_SECONDS);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length < 6) {
      setError('Enter the full code from your email.');
      return;
    }
    setBusy(true);
    setError('');
    const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (error) setError(friendlyError(error.message));
    // On success the auth provider sees the new session and the effect above redirects.
  }

  async function google() {
    setError('');
    const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
    const { error } = await getSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setError(friendlyError(error.message));
  }

  return (
    <div className="card login-card">
      <Link href="/" className="identity">
        <span className="logo" aria-hidden="true">N</span>
        <span className="brand">NEXT GEN</span>
      </Link>

      {step === 'email' ? (
        <form onSubmit={sendCode} noValidate>
          {inviter && <InvitedBanner name={inviter} />}
          <h1 className="login-title">{inviter ? 'Create your account' : 'Log in or sign up'}</h1>
          <p className="mt-sm mb-xl">New accounts get {inviter ? REFERRAL.friendTrialDays : PRICING.trialDays} days of full access free, no card needed. Your progress is saved on every device.</p>
          {googleEnabled && (
            <>
              <button type="button" className="btn btn-secondary btn-block btn-lg btn-google" onClick={google}>
                <span className="google-g" aria-hidden="true">G</span> Continue with Google
              </button>
              <div className="or">or continue with email</div>
            </>
          )}
          <div className="field">
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="rahul@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
            />
            {error && <p id="login-error" className="field-error" role="alert">{error}</p>}
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a login link →'}
          </button>
          <p className="muted mt-lg">
            New here? Your account is created automatically. One free trial per person. Week 1 of every subject is free to preview without an account.
          </p>
          <p className="muted mt-md">
            By continuing you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <span className="chip chip-blue">STEP 2</span>
          <h1 className="login-title mt-md mb-sm">Check your email</h1>
          <p>
            We’ve sent a login email to <strong>{email}</strong>. Click <strong>Sign in</strong> in that email to log in.
            If you don’t see it, check your spam folder.
          </p>
          <div className="field mt-lg">
            <label className="field-label" htmlFor="code">Got a code in the email? Enter it here</label>
            <input
              id="code"
              className="input otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="••••••"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
            />
            {error && <p id="login-error" className="field-error" role="alert">{error}</p>}
          </div>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Verifying…' : 'Log in with code'}
          </button>
          <div className="muted flex-between mt-lg">
            <button type="button" className="text-btn" onClick={() => { setStep('email'); setError(''); }}>← Use a different email</button>
            {cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <button type="button" className="text-btn" onClick={() => sendCode()} disabled={busy}>Didn’t get it? Resend</button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
