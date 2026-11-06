import { authedFetch } from './supabase/client';
import { clearReferral, pendingReferral } from './referrals';

/** What POST /api/trial/start answers (from claim_trial() in migration 0009). */
export type TrialResult = 'granted' | 'already' | 'email' | 'device' | 'network' | 'disposable';

/** Why an account got no free trial, in words for the paywall. */
export const NO_TRIAL_REASON: Partial<Record<TrialResult, string>> = {
  email: 'This email address has already had a free trial.',
  device: 'This device has already been used for a free trial.',
  network: 'Too many free trials have started on this network today.',
  disposable: 'Free trials aren’t available for temporary email addresses.',
};

const DEVICE_KEY = 'nextgen-device-id';
const resultKey = (userId: string) => `nextgen-trial-result:${userId}`;

function deviceId() {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * The answer this device got when the account claimed its trial (to explain "no trial").
 * Null until this device has asked, so it also says whether the device is recorded yet.
 */
export function savedTrialResult(userId: string): TrialResult | null {
  try {
    return window.localStorage.getItem(resultKey(userId)) as TrialResult | null;
  } catch {
    return null;
  }
}

/**
 * Asks the server for the account's free trial, sending this browser's device id.
 * For an account that already had its turn it only records the device.
 * Returns null when the request failed.
 */
export async function claimTrial(userId: string): Promise<TrialResult | null> {
  try {
    const res = await authedFetch('/api/trial/start', { method: 'POST', body: JSON.stringify({ deviceId: deviceId(), ref: pendingReferral() }) });
    if (!res.ok) return null;
    const { result } = (await res.json()) as { result: TrialResult };
    // Used up either way: a referral only counts with the account's first trial.
    clearReferral();
    try {
      // Keep the first real answer: later calls only say 'already'.
      if (result !== 'already' || !savedTrialResult(userId)) window.localStorage.setItem(resultKey(userId), result);
    } catch {
      // Only used for the paywall's wording and to skip asking again.
    }
    return result;
  } catch {
    return null;
  }
}
