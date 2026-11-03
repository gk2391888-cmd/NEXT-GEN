'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';

const KINDS = [
  { id: 'wrong_answer', label: 'Wrong answer' },
  { id: 'unclear', label: 'Unclear question' },
  { id: 'typo', label: 'Typo' },
  { id: 'other', label: 'Other' },
] as const;

type Kind = (typeof KINDS)[number]['id'];

/** "Report a problem" link that opens a small form; reports go to the admin panel. */
export function ReportButton({ questionId, label }: { questionId: string; label?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('wrong_answer');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await getSupabase().from('reports').insert({ question_id: questionId, kind, message: message.trim().slice(0, 1000) });
    setState(error ? 'error' : 'sent');
  }

  if (state === 'sent') return <p className="muted report-done">✓ Thanks! We’ll review this question.</p>;

  return (
    <>
      <button type="button" className="text-btn report-link" onClick={() => setOpen(true)}>⚑ Report a problem</button>
      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={`report-${questionId}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="card modal" onSubmit={send}>
            <h3 id={`report-${questionId}`}>Report a problem with this question</h3>
            <p className="muted mt-xs mb-md">{label ?? questionId}</p>
            {!user ? (
              <>
                <p>Log in to send a report, so we can follow up if needed.</p>
                <div className="btn-group mt-lg">
                  <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="filters mb-md" role="radiogroup" aria-label="What’s wrong?">
                  {KINDS.map((k) => (
                    <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>{k.label}</button>
                  ))}
                </div>
                <label className="field-label" htmlFor={`report-msg-${questionId}`}>Details (optional)</label>
                <textarea id={`report-msg-${questionId}`} className="input" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="For example: option B is also correct because…" />
                {state === 'error' && <p className="field-error" role="alert">We couldn’t send your report. Please try again.</p>}
                <div className="btn-group justify-end mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send report'}</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
