'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/supabase/client';
import { DEMO, demoFetch } from '@/lib/supabase/demo';
import { PRICING, usePlan } from '@/lib/plan';
import { limitsFor } from '@/lib/ai/features';
import { sync } from '@/lib/sync';
import { RAW } from '@/lib/tokens';
import { useAuth } from './auth/auth-provider';
import { UpiPayment, type UpiConfig } from './upi-payment';

const FREE_DOUBTS = limitsFor('doubt', 'free')?.perDay ?? 0;
const PRO_DOUBTS = limitsFor('doubt', 'pro')?.perDay ?? 0;

const FREE_FEATURES = [
  'Every week of notes and formula sheets',
  'Every practice question',
  'Quiz 1 and Quiz 2 mock tests',
  'My Mistakes revision and Exam Planner',
  'Python Coding Lab practice problems',
  `${FREE_DOUBTS} AI doubts per day`,
];
const FREE_MISSING = ['End term mock tests', 'OPPE-style coding tests'];
const PRO_FEATURES = [
  'Everything in Free',
  `${PRO_DOUBTS} AI doubts per day, with longer answers`,
  'End term mock tests',
  'OPPE-style coding tests with hidden test cases',
  'Detailed analytics: time per question',
  'Download notes as PDF',
];

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PricingPlans() {
  const { user } = useAuth();
  const plan = usePlan();
  const [config, setConfig] = useState<{ enabled: boolean; upi: UpiConfig | null } | null>(null);
  const [showUpi, setShowUpi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (DEMO ? demoFetch('/api/payments/config') : fetch('/api/payments/config'))
      .then((r) => r.json())
      .then((d) => setConfig({ enabled: Boolean(d.enabled), upi: d.upi ?? null }))
      .catch(() => setConfig({ enabled: false, upi: null }));
  }, []);

  async function upgrade() {
    if (!user) return;
    setBusy(true);
    setMessage('');
    try {
      const [loaded, res] = await Promise.all([loadCheckout(), authedFetch('/api/payments/order', { method: 'POST' })]);
      const order = await res.json();
      if (!res.ok || !loaded || !window.Razorpay) throw new Error(order.error ?? 'Could not open the payment window.');

      new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: 'INR',
        name: 'NEXT GEN',
        description: 'Pro · 1 month',
        prefill: { email: order.email },
        theme: { color: RAW['color-action-primary-bg'] },
        handler: async (r: RazorpayResponse) => {
          const verify = await authedFetch('/api/payments/verify', {
            method: 'POST',
            body: JSON.stringify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
          });
          if (verify.ok) {
            await sync(user.id);
            setMessage('Payment received. Pro is now active. Thank you!');
          } else {
            setMessage('Payment received, but we could not confirm it yet. It will activate within a few minutes; contact us if it doesn’t.');
          }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const isPaidPro = plan.tier === 'pro';
  const upgradeLabel = isPaidPro
    ? `Renew: add 30 days for ₹${PRICING.proMonthlyInr}`
    : plan.tier === 'trial' ? `Keep Pro for ₹${PRICING.proMonthlyInr}/month` : `Upgrade for ₹${PRICING.proMonthlyInr}/month`;
  // With only UPI switched on, the QR is the way to pay, so it's shown straight away (paid Pro students open it to renew).
  const upiOnly = Boolean(config && !config.enabled && config.upi);
  const upiOpen = Boolean(user && config?.upi && (showUpi || (upiOnly && !isPaidPro)));
  const openUpi = () => {
    setShowUpi(true);
    requestAnimationFrame(() => document.getElementById('upi-pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const proButton = (() => {
    if (!user) return <Link className="btn btn-primary btn-block" href="/login?next=/pricing">Start {PRICING.trialDays}-day free trial</Link>;
    const active = isPaidPro && <span className="btn btn-primary btn-block">Pro active · {plan.daysLeft} days left</span>;
    // No auto-renewal, so paid Pro students can add another 30 days whenever they like.
    const payStyle = isPaidPro ? 'btn-secondary' : 'btn-primary';
    if (config && !config.enabled && !config.upi) return active || <span className="btn btn-secondary btn-block">Online payment launching soon</span>;
    if (upiOnly) {
      return (
        <div className="stack">
          {active}
          {!upiOpen && <button className={`btn ${payStyle} btn-block`} onClick={openUpi}>{upgradeLabel}</button>}
        </div>
      );
    }
    return (
      <div className="stack">
        {active}
        <button className={`btn ${payStyle} btn-block`} onClick={upgrade} disabled={busy || config === null}>
          {busy ? 'Opening payment…' : upgradeLabel}
        </button>
        {config?.upi && !upiOpen && <button className="btn btn-secondary btn-block" onClick={openUpi}>Pay by scanning a UPI QR instead</button>}
      </div>
    );
  })();

  return (
    <>
      <div className="page-head-center">
        <span className="chip chip-teal">{PRICING.trialDays} DAYS OF PRO FREE · NO CARD NEEDED</span>
        <h1 className="mt-md">Simple pricing for every student</h1>
        <p>Everything you need to study is free. Go Pro for more AI help and exam-level practice.</p>
        {plan.tier === 'trial' && (
          <p className="muted mt-sm">Your free trial has {plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'} left. After that you move to Free automatically; you’re never charged unless you upgrade.</p>
        )}
      </div>

      <div className="grid grid-2 plan-grid">
        <div className="card plan-card">
          <h2>Free</h2>
          <div className="price">₹0</div>
          <p className="muted">Forever</p>
          <ul className="plan-list">
            {FREE_FEATURES.map((f) => <li key={f}>{f}</li>)}
            {FREE_MISSING.map((f) => <li key={f} className="missing">{f}</li>)}
          </ul>
          <span className="btn btn-secondary btn-block">{plan.tier === 'free' ? 'Your current plan' : 'Always included'}</span>
        </div>

        <div className="card plan-card plan-pro">
          <div className="flex-between">
            <h2>Pro</h2>
            <span className="chip chip-teal">MOST POPULAR</span>
          </div>
          <div className="price">₹{PRICING.proMonthlyInr}<span> / month</span></div>
          <p>{upiOnly ? 'Pay monthly by UPI' : 'Pay monthly · UPI, cards, net banking'} · No auto-renewal</p>
          <ul className="plan-list">
            {PRO_FEATURES.map((f) => <li key={f}>{f}</li>)}
          </ul>
          {proButton}
        </div>
      </div>

      {message && <div className="plan-grid"><p className="alert mt-lg" role="status">{message}</p></div>}
      {upiOpen && user && config?.upi && (
        <div className="plan-grid" id="upi-pay">
          <UpiPayment upi={config.upi} userId={user.id} />
        </div>
      )}
      <p className="muted text-center mt-lg">
        Each payment adds 30 days of Pro. Questions about billing? See our <Link href="/terms">Terms</Link>.
      </p>
    </>
  );
}
