'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { loadQuestionBank, type BankQuestion } from '@/lib/question-bank';
import { findQualifierQuestion } from '@/lib/qualifier-questions';
import { accessOf, PRICING, usePlan } from '@/lib/plan';
import { limitsFor, type AiUsage } from '@/lib/ai/features';
import { askAi } from '@/lib/ai/client';
import { useQuestionLang } from '@/lib/question-lang';
import { localize } from '@/lib/question-text';
import { useInChoice } from '@/lib/programme-choice';
import faqs from '@/content/faqs.json';
import { useAuth } from './auth/auth-provider';
import { RichText } from './rich-text';

type Turn = { role: 'user' | 'assistant'; content: string };

const todayIST = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const LETTERS = ['A', 'B', 'C', 'D'];

/** The current chat is kept on this device, so a refresh or a tab switch doesn't lose it. */
const chatKey = (userId: string) => `nextgen-doubt-chat:${userId}`;
type SavedChat = { turns: Turn[]; questionId?: string };

export function DoubtChat() {
  const { user, ready } = useAuth();
  const plan = usePlan();
  const params = useSearchParams();
  const lang = useQuestionLang();
  const inChoice = useInChoice();
  // An example from the student's own courses (the first quick answer in their choice).
  const example = faqs.find((f) => inChoice(f.subject))?.title ?? 'Is week ke main concept ko ek example se samjhao.';
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [about, setAbout] = useState<BankQuestion | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Limits come from lib/ai/features.ts, the same numbers the server enforces.
  const limits = limitsFor('doubt', accessOf(plan));
  const freeLimits = limitsFor('doubt', 'free');
  const proLimits = limitsFor('doubt', 'pro');

  // "Explain more with AI" links here with ?question=<id>, and "Why was my answer wrong?" adds &picked=<option index>.
  // Without a question, the last chat on this device comes back.
  const [restored, setRestored] = useState(false);
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    const id = params.get('question');
    const picked = Number(params.get('picked'));
    let saved: SavedChat | null = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(chatKey(uid)) ?? 'null');
    } catch {
      // Nothing saved, or private mode.
    }
    if (!id && saved?.turns?.length) setTurns(saved.turns);
    const questionId = id ?? (saved?.turns?.length ? saved.questionId : undefined);
    setRestored(true);
    if (!questionId) return;
    loadQuestionBank()
      // Qualifier mock questions aren't in the course question bank.
      .then(async (bank) => bank.find((x) => x.id === questionId) ?? (await findQualifierQuestion(questionId)))
      .then((q) => {
        if (!q) return;
        setAbout(q);
        if (!id) return;
        const wrongPick = Number.isInteger(picked) && picked >= 0 && picked < q.options.length && picked !== q.answer;
        // The suggested doubt is in the language the student reads questions in.
        if (lang === 'en') {
          setDraft(
            wrongPick
              ? `I chose option ${LETTERS[picked]}. Why is it wrong, and how do we get the correct answer ${LETTERS[q.answer]}? Explain step by step.`
              : 'Explain this question step by step, and tell me why the other options are wrong.',
          );
          return;
        }
        setDraft(
          wrongPick
            ? `Maine option ${LETTERS[picked]} choose kiya tha. Ye galat kyun hai, aur sahi answer ${LETTERS[q.answer]} kaise aata hai? Step-by-step samjhao.`
            : 'Is question ko step-by-step samjhao, aur batao baaki options galat kyun hain.',
        );
      })
      .catch(() => {});
  }, [params, uid]); // eslint-disable-line react-hooks/exhaustive-deps -- lang only picks the wording of the suggested doubt

  useEffect(() => {
    if (!uid || !restored) return;
    try {
      if (turns.length) window.localStorage.setItem(chatKey(uid), JSON.stringify({ turns: turns.slice(-40), questionId: about?.id } satisfies SavedChat));
      else window.localStorage.removeItem(chatKey(uid));
    } catch {
      // Not saved; the chat still works.
    }
  }, [turns, about, uid, restored]);

  function newChat() {
    setTurns([]);
    setAbout(null);
    setDraft('');
    setError('');
  }

  // Today's usage, for the "3 of 5 left" counter.
  useEffect(() => {
    if (!user) return;
    getSupabase()
      .from('ai_usage')
      .select('count')
      .eq('day', todayIST())
      .eq('feature', 'doubt')
      .maybeSingle()
      .then(({ data }) => limits && setUsage({ used: data?.count ?? 0, limit: limits.perDay }));
  }, [user, limits?.perDay]); // eslint-disable-line react-hooks/exhaustive-deps -- limits is recomputed each render

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
    const res = await askAi<{ answer: string }>('doubt', { messages: next, questionId: about?.id, lang });
    setBusy(false);
    if (res.usage) setUsage(res.usage);
    if (res.ok) {
      setTurns([...next, { role: 'assistant', content: res.data.answer }]);
      return;
    }
    // Put the doubt back so the student doesn't have to retype it.
    setTurns(turns);
    setDraft(text);
    setError(res.code === 'limit' && !plan.isPro ? 'limit' : res.message);
  }

  if (!ready) return <div className="card chat" />;

  if (!user) {
    return (
      <div className="card empty">
        <div className="empty-icon">✦</div>
        <p>Log in to ask the AI doubt solver. New accounts get {PRICING.trialDays} days of Pro, with {proLimits?.perDay} doubts a day.</p>
        <Link className="btn btn-primary" href="/login?next=/doubts">Log in to ask a doubt</Link>
      </div>
    );
  }

  const left = usage ? Math.max(0, usage.limit - usage.used) : null;

  return (
    <div className="card chat">
      <div className="quiz-top">
        <span className="muted">{plan.isPro ? 'Pro plan' : 'Free plan'}</span>
        <span className="btn-group">
          {left !== null && <span className="chip chip-blue">{left} of {usage!.limit} doubts left today</span>}
          {turns.length > 0 && <button className="text-btn" onClick={newChat} disabled={busy}>New chat</button>}
        </span>
      </div>

      {about && (
        <div className="chat-context">
          <span className="muted">Asking about</span>
          <strong>{localize(about, lang).question.slice(0, 160)}</strong>
          <button className="text-btn" onClick={() => setAbout(null)}>Remove</button>
        </div>
      )}

      <div className="chat-log" aria-live="polite">
        {turns.length === 0 && (
          <p className="muted chat-empty">
            Example: “{example}”
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
          You’ve used all {usage?.limit ?? freeLimits?.perDay} free doubts for today. They reset at midnight, or{' '}
          <Link href="/pricing">go Pro for ₹{PRICING.proMonthlyInr}/month</Link> for {proLimits?.perDay} doubts a day.
        </div>
      ) : (
        error && <p className="field-error" role="alert">{error}</p>
      )}

      <form className="chat-form" onSubmit={ask}>
        <textarea
          className="input"
          rows={2}
          maxLength={limits?.maxInputChars}
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
