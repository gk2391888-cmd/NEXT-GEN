'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthProviders, getSupabase } from '@/lib/supabase/client';
import { useAuth } from './auth-provider';

const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only same-site paths, so the login link can't be used to bounce students to another website. */
function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') ? value : '/';
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
  const next = safeNext(useSearchParams().get('next'));
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
      <Link href="/" className="identity" style={{ color: 'var(--ink)', margin: '0 0 22px' }}>
        <span className="logo" aria-hidden="true">N</span>
        <span className="brand">NEXT GEN</span>
      </Link>

      {step === 'email' ? (
        <form onSubmit={sendCode} noValidate>
          <h1 style={{ fontSize: 22 }}>Log in to save your progress</h1>
          <p style={{ margin: '6px 0 20px' }}>Pick up your notes and tests exactly where you left off, on any device.</p>
          {googleEnabled && (
            <>
              <button type="button" className="btn btn-secondary btn-block btn-google" onClick={google}>
                <span className="google-g" aria-hidden="true">G</span> Continue with Google
              </button>
              <div className="or">or continue with email</div>
            </>
          )}
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            style={{ margin: '0 0 10px' }}
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
          <button className="btn btn-primary btn-block" style={{ padding: 12 }} disabled={busy}>
            {busy ? 'Sending…' : 'Email me a login link →'}
          </button>
          <p className="muted" style={{ marginTop: 16 }}>
            New here? Your account is created automatically. You can also study and practise without logging in; your progress will then be saved only on this device.
          </p>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <span className="chip chip-blue">STEP 2</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 6px' }}>Check your email</h1>
          <p>
            We’ve sent a login email to <strong>{email}</strong>. Click <strong>Sign in</strong> in that email to log in.
            If you don’t see it, check your spam folder.
          </p>
          <label className="field-label" htmlFor="code" style={{ marginTop: 16 }}>Got a code in the email? Enter it here</label>
          <input
            id="code"
            className="input otp-input"
            style={{ margin: '0 0 10px' }}
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
          <button className="btn btn-primary btn-block" style={{ padding: 12 }} disabled={busy}>
            {busy ? 'Verifying…' : 'Log in with code'}
          </button>
          <div className="muted" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
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
