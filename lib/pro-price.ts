'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { authedFetch } from './supabase/client';
import { activeOffer, OFFER, type Offer } from './offers';
import { PRICING } from './plans';

import type { UpiConfig } from '@/components/upi-payment';

export type { UpiConfig };

export type PaymentConfig = {
  enabled: boolean;
  upi: UpiConfig | null;
  price: { amountInr: number; fullPriceInr: number; offer: Offer | null; offerUsed: boolean } | null;
};

/** One shared copy of /api/payments/config per signed-in account (the price depends on who's asking). */
let config: PaymentConfig | null = null;
let loadedFor: string | null | undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load(userId: string | null, force = false) {
  if (!force && loadedFor === userId && (config || loading)) return loading ?? Promise.resolve();
  loadedFor = userId;
  loading = authedFetch('/api/payments/config')
    .then((r) => r.json())
    .then((d) => {
      if (loadedFor !== userId) return;
      config = { enabled: Boolean(d.enabled), upi: d.upi ?? null, price: d.price ?? null };
    })
    .catch(() => {
      if (loadedFor === userId) config = { enabled: false, upi: null, price: null };
    })
    .finally(() => {
      loading = null;
      listeners.forEach((l) => l());
    });
  return loading;
}

/** Re-checks the price, e.g. after a payment that used the offer. */
export function refreshPaymentConfig() {
  return load(loadedFor ?? null, true);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePaymentConfig(): PaymentConfig | null {
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  useEffect(() => {
    if (ready) load(userId);
  }, [ready, userId]);
  const current = useSyncExternalStore(subscribe, () => config, () => null);
  return loadedFor === userId ? current : null;
}

export type ProPrice = {
  /** What this student pays now. */
  priceInr: number;
  fullPriceInr: number;
  /** Set while this student can get the offer price. */
  offer: Offer | null;
  /** The offer is running, but this account has already used it. */
  offerUsed: boolean;
};

/**
 * The Pro price to show. Until the server has answered it assumes an unused
 * offer, which is right for everyone except the few who've used it.
 */
export function useProPrice(): ProPrice {
  const cfg = usePaymentConfig();
  // Pages are prerendered, so the first render must not depend on the clock:
  // it uses the configured offer, and the deadline is checked once mounted.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const running = mounted ? activeOffer() : OFFER;
  const p = cfg?.price;
  const offer = !running ? null : p ? (p.offer && !p.offerUsed ? running : null) : running;
  const fullPriceInr = p?.fullPriceInr ?? PRICING.proMonthlyInr;
  return { priceInr: offer ? offer.priceInr : fullPriceInr, fullPriceInr, offer, offerUsed: Boolean(running && p?.offerUsed) };
}

const noop = () => () => {};
