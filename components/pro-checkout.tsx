'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/supabase/client';
import { DEMO, demoFetch } from '@/lib/supabase/demo';
import { PRICING, usePlan } from '@/lib/plan';
import { sync } from '@/lib/sync';
import { RAW } from '@/lib/tokens';
import { useAuth } from './auth/auth-provider';
import { UpiPayment, type UpiConfig } from './upi-payment';

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

/**
 * Buying Pro: Razorpay (UPI, cards, net banking) and/or pay by UPI QR, whichever is switched on.
 * Used by the pricing page and the paywall. `button` goes where the call to action belongs;
 * `panel` (the payment message and the UPI QR) goes below it. A successful Razorpay payment
 * refreshes the plan straight away, which reopens everything behind the paywall.
 */
export function useProCheckout() {
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
        description: 'Pro · 30 days',
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
    : plan.tier === 'trial' ? `Keep Pro: ₹${PRICING.proMonthlyInr} for 30 days` : `Get Pro: ₹${PRICING.proMonthlyInr} for 30 days`;
  // With only UPI switched on, the QR is the way to pay, so it's shown straight away (paid Pro students open it to renew).
  const upiOnly = Boolean(config && !config.enabled && config.upi);
  const upiOpen = Boolean(user && config?.upi && (showUpi || (upiOnly && !isPaidPro)));
  const openUpi = () => {
    setShowUpi(true);
    requestAnimationFrame(() => document.getElementById('upi-pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const button = (() => {
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

  const panel = (
    <>
      {message && <p className="alert mt-lg" role="status">{message}</p>}
      {upiOpen && user && config?.upi && (
        <div id="upi-pay">
          <UpiPayment upi={config.upi} userId={user.id} />
        </div>
      )}
    </>
  );

  return { button, panel, upiOnly };
}
