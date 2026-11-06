'use client';

/**
 * The install card and the reminders card both slide up from the bottom. Only one may show per
 * visit (browser session): whichever asks first gets the slot, so a student never sees two at once.
 */
const SLOT_KEY = 'nextgen-prompt-shown';

export function claimPromptSlot(name: string) {
  try {
    const taken = window.sessionStorage.getItem(SLOT_KEY);
    if (taken && taken !== name) return false;
    window.sessionStorage.setItem(SLOT_KEY, name);
    return true;
  } catch {
    return true;
  }
}
