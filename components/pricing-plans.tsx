'use client';

import Link from 'next/link';
import { PRICING, usePlan } from '@/lib/plan';
import { limitsFor } from '@/lib/ai/features';
import { useAuth } from './auth/auth-provider';
import { useProCheckout } from './pro-checkout';
import { OfferCountdown, ProPrice } from './offer';
import { useProPrice } from '@/lib/pro-price';
import { OFFER, offerEndLabel } from '@/lib/offers';

const OFFER_TITLE = OFFER?.title ?? 'offer';

const PRO_DOUBTS = limitsFor('doubt', 'pro')?.perDay ?? 0;

const TRIAL_FEATURES = [
  'Everything in Pro, free for 7 days',
  'Starts when you sign up',
  'No card or payment details needed',
  'One free trial per person and device',
];
export const PRO_FEATURES = [
  'Every week of notes and formula sheets',
  'Every practice question, at Easy, Medium and Hard levels',
  'Quiz 1, Quiz 2 and End term mock tests',
  'Python Coding Lab, OPPE-style sets and the timed OPPE exam',
  `AI Doubt Solver: ${PRO_DOUBTS} doubts a day`,
  'My Mistakes revision, Exam Planner and progress reports',
];

export function PricingPlans() {
  const { user } = useAuth();
  const plan = usePlan();
  const checkout = useProCheckout();
  const { priceInr, fullPriceInr, offer, offerUsed } = useProPrice({ exact: true });

  const trialButton = (() => {
    if (!user) return <Link className="btn btn-secondary btn-block" href="/login?next=/pricing">Start {PRICING.trialDays}-day free trial</Link>;
    if (plan.tier === 'trial') return <span className="btn btn-secondary btn-block">Trial active · {plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'} left</span>;
    return <span className="btn btn-secondary btn-block">Free trial used</span>;
  })();

  return (
    <>
      <div className="page-head-center">
        {offer ? (
          <>
            <span className="chip chip-yellow">🪔 {offer.title.toUpperCase()} · {offer.badge}</span>
            <h1 className="mt-md">Celebrate {offer.title.replace(/ offer$/i, '')} with Pro at half price</h1>
            <p>
              Get 30 days of Pro for ₹{offer.priceInr} instead of ₹{fullPriceInr}. Offer ends {offerEndLabel(offer)}, 11:59 PM, and works once per account.
              New here? Your {PRICING.trialDays}-day free trial comes first.
            </p>
          </>
        ) : (
          <>
            <span className="chip chip-teal">{PRICING.trialDays} DAYS FREE · NO CARD NEEDED</span>
            <h1 className="mt-md">Simple pricing for every student</h1>
            <p>Try everything free for {PRICING.trialDays} days. After that, Pro is ₹{priceInr} for 30 days, with no auto-renewal.</p>
          </>
        )}
        {offerUsed && <p className="muted mt-sm">You’ve used the {OFFER_TITLE} on an earlier payment, so renewals are at the normal price.</p>}
        {plan.tier === 'trial' && (
          <p className="muted mt-sm">
            Your free trial has {plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'} left. After that, notes, practice and tests lock until you get Pro. Your progress stays saved, and you’re never charged automatically.
          </p>
        )}
        {plan.tier === 'free' && <p className="muted mt-sm">Your progress is saved. Get Pro and everything opens again straight away.</p>}
      </div>

      <div className="grid grid-2 plan-grid">
        <div className="card plan-card">
          <h2>Free trial</h2>
          <div className="price">₹0</div>
          <p className="muted">{PRICING.trialDays} days, once</p>
          <ul className="plan-list">
            {TRIAL_FEATURES.map((f) => <li key={f}>{f}</li>)}
          </ul>
          {trialButton}
        </div>

        <div className="card plan-card plan-pro">
          {offer && <span className="offer-ribbon">🪔 {offer.badge}</span>}
          <div className="flex-between">
            <h2>Pro</h2>
            {!offer && <span className="chip chip-teal">FULL ACCESS</span>}
          </div>
          <div className="price"><ProPrice suffix={<span> / 30 days</span>} /></div>
          <p>{checkout.upiOnly ? 'Pay by UPI' : 'UPI, cards, net banking'} · No auto-renewal</p>
          {offer && <OfferCountdown offer={offer} />}
          <ul className="plan-list">
            {PRO_FEATURES.map((f) => <li key={f}>{f}</li>)}
          </ul>
          {checkout.button}
          {offer && <p className="muted mt-sm text-center">{offer.title} price for your first payment during the offer. Renewals are ₹{fullPriceInr}.</p>}
        </div>
      </div>

      <div className="plan-grid">{checkout.panel}</div>
      <p className="muted text-center mt-lg">
        Without a plan you can still read and practise week 1 of every subject, use Qualifier Prep with its free mock, and the grade calculator.
      </p>
      <p className="muted text-center mt-sm">
        Each payment adds 30 days of Pro. Questions about billing? See our <Link href="/terms">Terms</Link>.
      </p>
    </>
  );
}
