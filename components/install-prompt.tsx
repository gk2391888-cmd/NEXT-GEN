'use client';

import { useEffect, useState } from 'react';
import { isIos, isStandalone, registerServiceWorker } from '@/lib/push-client';
import { claimPromptSlot } from '@/lib/prompt-slot';

/** Chrome's install event (not in TypeScript's DOM types yet). */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const VISITS_KEY = 'nextgen-visits';
const COUNTED_KEY = 'nextgen-visit-counted';
const SNOOZE_KEY = 'nextgen-install-snoozed';
/** "Not now" hides the card for this long. */
const SNOOZE_DAYS = 14;

function readNumber(key: string) {
  try {
    return Number(window.localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** Counts visits (once per browser session) and returns the count. */
function countVisit() {
  try {
    if (!window.sessionStorage.getItem(COUNTED_KEY)) {
      window.sessionStorage.setItem(COUNTED_KEY, '1');
      window.localStorage.setItem(VISITS_KEY, String(readNumber(VISITS_KEY) + 1));
    }
  } catch {
    // Without storage the card just doesn't show.
  }
  return readNumber(VISITS_KEY);
}

/**
 * "Install NEXT GEN": a one-tap install where the browser supports it (Android, Chrome on
 * computers), the Add to Home Screen steps on iPhone. From the second visit, never once
 * installed, and not again for two weeks after "Not now".
 */
export function InstallPrompt() {
  const [mode, setMode] = useState<'none' | 'install' | 'ios'>('none');
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    registerServiceWorker();
    if (isStandalone()) return;
    const visits = countVisit();
    const snoozed = Date.now() - readNumber(SNOOZE_KEY) < SNOOZE_DAYS * 86_400_000;
    const eligible = visits >= 2 && !snoozed;

    const onInstallable = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      if (eligible && claimPromptSlot('install')) setMode('install');
    };
    const onInstalled = () => setMode('none');
    window.addEventListener('beforeinstallprompt', onInstallable);
    window.addEventListener('appinstalled', onInstalled);
    // Safari on iPhone has no install event; show the steps instead.
    if (eligible && isIos() && !/crios|fxios|edgios/i.test(navigator.userAgent) && claimPromptSlot('install')) setMode('ios');
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function snooze() {
    setMode('none');
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      // Hidden for this visit.
    }
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    if (outcome === 'accepted') setMode('none');
    else snooze();
  }

  if (mode === 'none') return null;
  return (
    <div className="install-sheet" role="dialog" aria-labelledby="install-title">
      <div className="install-head">
        <span className="logo install-logo" aria-hidden="true">N</span>
        <div>
          <h3 id="install-title">{mode === 'ios' ? 'Add NEXT GEN to your Home Screen' : 'Install NEXT GEN'}</h3>
          {mode === 'install' && <p>Opens like an app, full screen, from your home screen.</p>}
        </div>
      </div>
      {mode === 'ios' ? (
        <>
          <ol className="install-steps">
            <li>Tap the <strong>Share</strong> button ⬆︎ in Safari</li>
            <li>Choose <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong></li>
          </ol>
          <button type="button" className="btn btn-secondary btn-block" onClick={snooze}>Got it</button>
        </>
      ) : (
        <div className="btn-group install-actions">
          <button type="button" className="btn btn-secondary" onClick={snooze}>Not now</button>
          <button type="button" className="btn btn-primary" onClick={install}>Install</button>
        </div>
      )}
    </div>
  );
}
