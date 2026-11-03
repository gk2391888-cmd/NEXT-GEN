'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { hasProgress } from '@/lib/progress/types';
import { setChoice, useLocalChoice } from '@/lib/programme-choice';
import { CHOICES, choiceInProfile, DEFAULT_CHOICE_ID, parseChoice, PROGRAMMES, QUALIFIER, QUALIFIER_PATH } from '@/lib/programmes';
import { useAuth } from './auth/auth-provider';

/** Pages where the question would get in the way. */
const SKIP = ['/login', '/privacy', '/terms', QUALIFIER_PATH];

/**
 * "What are you preparing for?", asked once: right after sign-up (after the guest-progress import, if any),
 * and to existing students who haven't chosen yet, with Data Science Foundation pre-selected so confirming
 * changes nothing for them. Guests are asked on the Overview page. A guest's choice is copied to the
 * account when they sign up instead of asking again.
 */
export function ProgrammePrompt() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, loaded } = useAuth();
  const state = useProgress();
  const local = useLocalChoice();
  const [picked, setPicked] = useState(DEFAULT_CHOICE_ID);
  const saved = choiceInProfile(state.profile?.subjects);
  const localChoice = parseChoice(local);
  // The import prompt (guest progress → account) goes first.
  const guestProgress = useMemo(() => (user ? hasProgress(progress.readGuest()) : false), [user]);
  const importPending = Boolean(user) && !state.guestImportHandled && guestProgress;

  // Signed up after choosing as a guest: keep that choice.
  useEffect(() => {
    if (user && loaded && state.profile && !saved && localChoice) setChoice(localChoice.id, state.profile);
  }, [user, loaded, state.profile, saved, localChoice]);

  if (!ready || SKIP.some((p) => pathname.startsWith(p))) return null;
  const ask = user ? loaded && Boolean(state.profile) && !saved && !localChoice && !importPending : !localChoice && pathname === '/';
  if (!ask) return null;

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    setChoice(picked, user ? state.profile : undefined);
    if (picked === QUALIFIER) router.push(QUALIFIER_PATH);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="programme-title">
      <form className="card modal" onSubmit={confirm}>
        <span className="chip chip-teal">ONE QUICK QUESTION</span>
        <h2 id="programme-title" className="mt-md mb-sm">What are you preparing for?</h2>
        <p className="muted mb-lg">We’ll show only that course’s subjects. You can change it any time from the menu or My profile.</p>
        <fieldset className="fieldset stack" aria-labelledby="programme-title">
          {PROGRAMMES.map((p) => (
            <div key={p.id}>
              <div className="field-label mb-xs">{p.name}</div>
              <div className="check-grid">
                {CHOICES.filter((c) => c.programme === p).map((c) => (
                  <Option key={c.id} id={c.id} label={c.label.slice(p.short.length + 3)} note={c.comingSoon ? 'Notes coming soon' : undefined} picked={picked} onPick={setPicked} />
                ))}
              </div>
            </div>
          ))}
          <div>
            <div className="field-label mb-xs">Not admitted yet</div>
            <div className="check-grid">
              <Option id={QUALIFIER} label="Qualifier exam" picked={picked} onPick={setPicked} />
            </div>
          </div>
        </fieldset>
        <div className="btn-group mt-lg">
          <button className="btn btn-primary">Continue →</button>
        </div>
      </form>
    </div>
  );
}

function Option({ id, label, note, picked, onPick }: { id: string; label: string; note?: string; picked: string; onPick: (id: string) => void }) {
  return (
    <label className="check">
      <input type="radio" name="programme-choice" value={id} checked={picked === id} onChange={() => onPick(id)} />
      <span>
        {label}
        {note && <small className="muted block">{note}</small>}
      </span>
    </label>
  );
}
