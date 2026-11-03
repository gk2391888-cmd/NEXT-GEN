'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { progress, useProgress } from '@/lib/progress/store';
import type { Subject } from '@/lib/types';
import { PageHead } from '@/components/ui';
import { useAuth } from './auth-provider';

export function ProfileForm({ subjects }: { subjects: Subject[] }) {
  const { user, ready, loaded, signOut } = useAuth();
  const state = useProgress();
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Fill the form once the account's profile has loaded.
  useEffect(() => {
    if (!loaded || !user) return;
    setName(state.profile?.fullName || user.user_metadata?.full_name || user.user_metadata?.name || '');
    setChosen(state.profile?.subjects ?? []);
  }, [loaded, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- fill once, don't overwrite edits

  if (!ready) return null;

  if (!user) {
    return (
      <div className="card empty max-form">
        <div className="empty-icon">◎</div>
        <p>Log in to view your profile.</p>
        <Link className="btn btn-primary" href="/login?next=/profile">Login</Link>
      </div>
    );
  }

  function toggle(id: string) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    setMessage('');
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const fullName = name.trim().slice(0, 80);
    if (!fullName) {
      setError('Enter your name.');
      return;
    }
    setError('');
    progress.updateProfile({ fullName, subjects: subjects.map((s) => s.id).filter((id) => chosen.includes(id)) });
    setMessage('Changes saved.');
  }

  async function deleteAccount() {
    const typed = window.prompt('This permanently deletes your account and all your progress. Type DELETE to confirm.');
    if (typed?.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    const { error } = await getSupabase().rpc('delete_my_account');
    if (error) {
      setDeleting(false);
      setError('We couldn’t delete your account. Check your connection and try again.');
      return;
    }
    progress.reset();
    progress.acknowledge(Number.MAX_SAFE_INTEGER);
    await signOut();
  }

  return (
    <>
      <PageHead kicker="Account" title="My profile" description="Choose your subjects for this term. They appear first on your Overview and Mock Tests pages." />
      <form className="card card-loose max-reading" onSubmit={save} noValidate>
        <div className="grid grid-2 mb-lg">
          <div>
            <label className="field-label" htmlFor="name">Name</label>
            <input id="name" className="input" value={name} maxLength={80} autoComplete="name" onChange={(e) => { setName(e.target.value); setError(''); setMessage(''); }} aria-invalid={Boolean(error)} />
          </div>
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" className="input" value={user.email ?? ''} disabled />
          </div>
        </div>

        <fieldset className="fieldset">
          <legend className="field-label mb-sm">Subjects this term</legend>
          <div className="check-grid">
            {subjects.map((s) => (
              <label key={s.id} className="check">
                <input type="checkbox" checked={chosen.includes(s.id)} onChange={() => toggle(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="field-error mt-lg" role="alert">{error}</p>}
        <div className="notes-foot">
          <button type="button" className="btn btn-danger" onClick={deleteAccount} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
          <div className="btn-group">
            {message && <span className="muted" role="status">✓ {message}</span>}
            <button className="btn btn-primary">Save changes</button>
          </div>
        </div>
      </form>
    </>
  );
}
