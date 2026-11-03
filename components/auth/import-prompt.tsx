'use client';

import type { User } from '@supabase/supabase-js';
import { useMemo, useState } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { hasProgress } from '@/lib/progress/types';

/** After the first login on a device, offers to move the device's logged-out progress into the account. */
export function ImportPrompt({ user }: { user: User }) {
  const state = useProgress();
  const [closed, setClosed] = useState(false);
  const guest = useMemo(() => progress.readGuest(), []);

  if (closed || state.guestImportHandled || !hasProgress(guest)) return null;

  const weeksDone = Object.values(guest.weeks).filter((w) => w.done).length;
  const name = (state.profile?.fullName || user.user_metadata?.full_name || user.user_metadata?.name || '').split(' ')[0];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="card modal">
        <span className="chip chip-teal">WELCOME{name ? `, ${name.toUpperCase()}` : ''}</span>
        <h2 id="import-title" className="mt-md mb-sm">We found progress on this device</h2>
        <p>Save the practice you did before logging in to your account so it’s available on all your devices.</p>
        <div className="grid stat-row my-lg">
          <Stat value={guest.answers.length} label="answers" />
          <Stat value={guest.tests.length} label="mock tests" />
          <Stat value={weeksDone} label="weeks done" />
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => { progress.importGuest(); setClosed(true); }}>Save to my account</button>
          <button className="btn btn-secondary" onClick={() => { progress.dismissGuestImport(); setClosed(true); }}>No, start fresh</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="import-stat">
      <strong className="stat-value">{value}</strong>
      <span className="muted">{label}</span>
    </div>
  );
}
