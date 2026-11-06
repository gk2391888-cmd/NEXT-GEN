/**
 * Limited-time Pro offers, shared by the browser and the server. The server
 * decides the price actually charged (see lib/server/pro.ts priceFor); the
 * browser only uses this to show the offer.
 *
 * To run a new offer, change OFFER; to stop one early, set it to null.
 */
export type Offer = {
  /** Stored on each payment that used the offer, so it can be claimed once per account. */
  id: string;
  title: string;
  /** Short badge, e.g. "50% OFF". */
  badge: string;
  priceInr: number;
  /** ISO time with offset; the offer is on until this moment. */
  endsAt: string;
};

export const OFFER: Offer | null = {
  id: 'diwali-2026',
  title: 'Diwali offer',
  badge: '50% OFF',
  priceInr: 49,
  endsAt: '2026-11-12T23:59:59+05:30',
};

export function activeOffer(now = Date.now()): Offer | null {
  return OFFER && now <= Date.parse(OFFER.endsAt) ? OFFER : null;
}

/** "12 Nov" in India time, for "ends 12 Nov". */
export function offerEndLabel(offer: Offer) {
  return new Date(offer.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}
