'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { authedFetch, getSupabase } from '@/lib/supabase/client';
import { loadQuestionBank, type BankQuestion } from '@/lib/question-bank';
import { getOverride } from '@/lib/overrides';
import { PRICING, usePlan } from '@/lib/plan';
import { useAuth } from './auth/auth-provider';
import { RichText } from './rich-text';
import { letter } from './quiz/question-view';

type Turn = { role: 'user' | 'assistant'; content: string };

const todayIST = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function questionContext(q: BankQuestion) {
  const patched = { ...q, ...getOverride(q.id) };
  return [
    `Question: ${patched.question}`,
    patched.code ? `Code:\n${patched.code}` : '',
    `Options: ${patched.options.map((o, i) => `${letter(i)}) ${o}`).join('  ')}`,
    `Correct answer: ${letter(patched.answer)}`,
    `Explanation on the site: ${patched.explanation}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function DoubtChat() {
  const { user, ready } = useAuth();
  const plan = usePlan();
  const params = useSearchParams();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [about, setAbout] = useState<BankQuestion | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // "Explain more with AI" links here with ?question=<id>.
  useEffect(() => {
    const id = params.get('question');
    if (!id) return;
    loadQuestionBank()
      .then((bank) => {
        const q = bank.find((x) => x.id === id);
        if (q) {
          setAbout(q);
          setDraft('Is question ko step-by-step samjhao, aur batao baaki options galat kyun hain.');
        }
      })
      .catch(() => {});
  }, [params]);

  // Today's usage, for the "3 of 5 left" counter.
  useEffect(() => {
    if (!user) return;
    getSupabase()
      .from('ai_usage')
      .select('count')
      .eq('day', todayIST())
      .maybeSingle()
      .then(({ data }) => setUsage({ used: data?.count ?? 0, limit: plan.isPro ? 200 : PRICING.freeDoubtsPerDay }));
  }, [user, plan.isPro]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns, busy]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) {
      setError('Type your doubt first.');
      return;
    }
    const next = [...turns, { role: 'user' as const, content: text }];
    setTurns(next);
    setDraft('');
    setError('');
    setBusy(true);
    try {
      const res = await authedFetch('/api/doubt', {
        method: 'POST',
        body: JSON.stringify({ messages: next, context: about ? questionContext(about) : undefined }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setUsage({ used: data.used, limit: data.limit });
        setError(data.pro ? 'You’ve reached today’s fair-use limit. Please come back tomorrow.' : 'limit');
        setTurns(turns);
        setDraft(text);
      } else if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setTurns(turns);
        setDraft(text);
      } else {
        setTurns([...next, { role: 'assistant', content: data.answer }]);
        setUsage({ used: data.used, limit: data.limit });
      }
    } catch {
      setError('Check your internet connection and try again.');
      setTurns(turns);
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="card chat" />;

  if (!user) {
    return (
      <div className="card empty">
        <div className="empty-icon">✦</div>
        <p>Log in to ask the AI doubt solver. New accounts get {PRICING.trialDays} days of Pro, with unlimited doubts.</p>
        <Link className="btn btn-primary" href="/login?next=/doubts">Log in to ask a doubt</Link>
      </div>
    );
  }

  const left = usage ? Math.max(0, usage.limit - usage.used) : null;

  return (
    <div className="card chat">
      <div className="quiz-top">
        <span className="muted">{plan.isPro ? 'Pro · unlimited doubts' : 'Free plan'}</span>
        {!plan.isPro && left !== null && <span className="chip chip-blue">{left} of {usage!.limit} free doubts left today</span>}
      </div>

      {about && (
        <div className="chat-context">
          <span className="muted">Asking about</span>
          <strong>{about.question.slice(0, 160)}</strong>
          <button className="text-btn" onClick={() => setAbout(null)}>Remove</button>
        </div>
      )}

      <div className="chat-log" aria-live="polite">
        {turns.length === 0 && (
          <p className="muted chat-empty">
            Example: “Median aur mean mein outlier ka effect alag kyun hota hai?”
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`bubble ${t.role === 'user' ? 'me' : 'ai'}`}>
            {t.role === 'user' ? t.content : <RichText text={t.content} />}
          </div>
        ))}
        {busy && <div className="bubble ai muted">Thinking…</div>}
        <div ref={endRef} />
      </div>

      {error === 'limit' ? (
        <div className="alert alert-warn">
          You’ve used all {usage?.limit ?? PRICING.freeDoubtsPerDay} free doubts for today. They reset at midnight, or{' '}
          <Link href="/pricing">go Pro for ₹{PRICING.proMonthlyInr}/month</Link> for unlimited doubts.
        </div>
      ) : (
        error && <p className="field-error" role="alert">{error}</p>
      )}

      <form className="chat-form" onSubmit={ask}>
        <textarea
          className="input"
          rows={2}
          maxLength={2000}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (error && error !== 'limit') setError(''); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Type your doubt… (Hinglish or English)"
          aria-label="Your doubt"
        />
        <button className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </form>
      <p className="muted mt-sm">AI answers can be wrong. Check important steps against your notes.</p>
    </div>
  );
}
