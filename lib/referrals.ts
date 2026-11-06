import { SITE_URL } from './site';

/** Refer a friend. The same numbers are enforced in the database (supabase/migrations/0011_referrals.sql). */
export const REFERRAL = {
  /** A friend who signs up with a link gets this trial instead of the usual one. */
  friendTrialDays: 14,
  /** What the inviter gets for each friend who joins and practises. */
  rewardDays: 7,
  /** Answers a friend needs before the inviter is rewarded. */
  questions: 10,
  /** Friends rewarded in any 30 days. */
  monthlyLimit: 5,
  /** How long an opened invite link is remembered before signing up. */
  rememberDays: 7,
} as const;

/** Codes are 6–10 of A–Z and 2–9 (no look-alikes); links may arrive lower-case. */
export const REFERRAL_CODE = /^[A-Z2-9]{6,10}$/;
export const normaliseCode = (code: string | null | undefined) => {
  const c = (code ?? '').trim().toUpperCase();
  return REFERRAL_CODE.test(c) ? c : null;
};

/** In the browser, the address the student is on (SITE_URL there is only known on the server). */
export const inviteLink = (code: string) => `${typeof window === 'undefined' ? SITE_URL : window.location.origin}/i/${code}`;

export function inviteMessage(link: string) {
  return `I’m preparing for IITM BS on NEXT GEN: week-wise notes, practice questions and mock tests. Join with my link and get a ${REFERRAL.friendTrialDays}-day free Pro trial: ${link}`;
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export type ReferralFriend = { name: string; status: 'joined' | 'rewarded' | 'capped'; joinedAt: string; rewardedAt: string | null; answered: number };
export type ReferralSummary = { code: string; friends: ReferralFriend[]; earnedDays: number; rewardedThisMonth: number };

/* ---------------- The invite link a visitor opened (browser only) ---------------- */

const REF_KEY = 'nextgen-referral';

export function saveReferral(code: string) {
  try {
    window.localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Without storage the friend simply signs up without the referral.
  }
}

/** The code from an invite link opened in the last few days, or null. */
export function pendingReferral(): string | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(REF_KEY) ?? 'null') as { code?: string; at?: number } | null;
    if (!saved?.code || !saved.at || Date.now() - saved.at > REFERRAL.rememberDays * 86_400_000) return null;
    return normaliseCode(saved.code);
  } catch {
    return null;
  }
}

export function clearReferral() {
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    // Nothing to clear.
  }
}
