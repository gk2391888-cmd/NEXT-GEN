'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { offerEndLabel, type Offer } from '@/lib/offers';
import { useProPrice } from '@/lib/pro-price';
import { usePlan } from '@/lib/plan';

/** "₹49" on its own, or "~~₹99~~ ₹49" while this student can get the offer. */
export function ProPrice({ suffix }: { suffix?: React.ReactNode }) {
  const { priceInr, fullPriceInr, offer } = useProPrice();
  return (
    <>
      {offer && <s className="price-was">₹{fullPriceInr}</s>}₹{priceInr}
      {suffix}
    </>
  );
}

/** A one-line reminder of the offer's end date, under a "Get Pro" pitch. */
export function OfferNote() {
  const { offer } = useProPrice();
  if (!offer) return null;
  return <p className="mt-sm"><span className="chip chip-yellow">🪔 {offer.title.toUpperCase()} · {offer.badge} · ENDS {offerEndLabel(offer).toUpperCase()}</span></p>;
}

/** Time left until the offer ends, ticking each second. Null until mounted, so server and browser render the same. */
function useTimeLeft(endsAt: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Date.parse(endsAt) - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return left;
}

export function OfferCountdown({ offer }: { offer: Offer }) {
  const left = useTimeLeft(offer.endsAt);
  if (left === null) return null;
  const s = Math.floor(left / 1000);
  const parts = [
    { value: Math.floor(s / 86_400), label: 'days' },
    { value: Math.floor((s % 86_400) / 3600), label: 'hrs' },
    { value: Math.floor((s % 3600) / 60), label: 'min' },
    { value: s % 60, label: 'sec' },
  ];
  return (
    <div className="offer-timer" role="timer" aria-label={`Offer ends in ${parts[0].value} days ${parts[1].value} hours`}>
      {parts.map((p) => (
        <div key={p.label}>
          {String(p.value).padStart(2, '0')}
          <small>{p.label}</small>
        </div>
      ))}
    </div>
  );
}

const dismissKey = (offer: Offer) => `nextgen-offer-dismissed:${offer.id}`;

/** Site-wide strip announcing the offer. Hidden once dismissed on this device, once used, and for paid Pro students. */
export function OfferBanner() {
  const pathname = usePathname();
  const plan = usePlan();
  const { offer, fullPriceInr } = useProPrice();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!offer) return;
    try {
      setDismissed(window.localStorage.getItem(dismissKey(offer)) === '1');
    } catch {
      setDismissed(false);
    }
  }, [offer]);

  if (!offer || dismissed || pathname === '/login') return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissKey(offer!), '1');
    } catch {
      // Storage blocked: the banner just comes back on the next visit.
    }
  }

  return (
    <div className="offer-banner no-print" role="region" aria-label={offer.title}>
      <span aria-hidden="true">🪔</span>
      <span>
        <strong>{offer.title}: {offer.badge.toLowerCase()} Pro</strong>
        <span className="hide-mobile"> · ₹{offer.priceInr} instead of ₹{fullPriceInr} for 30 days</span>
        {' '}· ends {offerEndLabel(offer)}
      </span>
      {pathname !== '/pricing' && (
        <Link href="/pricing" className="offer-banner-cta">
          {plan.tier === 'pro' ? 'Renew for ₹' + offer.priceInr : 'Grab the offer'} →
        </Link>
      )}
      <button className="offer-banner-close" onClick={dismiss} aria-label="Hide this offer">✕</button>
    </div>
  );
}
