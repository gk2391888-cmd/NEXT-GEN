'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useStudyAccess } from '@/lib/plan';
import { useChoice, useChoiceSubjects } from '@/lib/programme-choice';
import { PREVIEW_WEEK } from '@/lib/access';
import { fetchProContent } from '@/lib/pro-content';
import { cardsForWeek, isDue, isKnown, loadCards, markCard, studyOrder, type DeckState, type Flashcard } from '@/lib/flashcards';
import { InlineText, ProgressBar } from '@/components/ui';
import type { Subject, Week } from '@/lib/types';

/** One week's deck as the server lists it: card ids only (the text comes with the week's notes). */
export type DeckRef = { week: number; title: string; cardIds: string[] };

/** Whose cards these are on this device: the account, or "guest". */
function useOwner() {
  const { user } = useAuth();
  return user?.id ?? 'guest';
}

function useDeckState(owner: string): [DeckState, (s: DeckState) => void] {
  const [state, setState] = useState<DeckState>({});
  useEffect(() => setState(loadCards(owner)), [owner]);
  return [state, setState];
}

/* ---------------- /flashcards ---------------- */

export function FlashcardsHome({ subjects: all, decks }: { subjects: Subject[]; decks: Record<string, DeckRef[]> }) {
  // The programme's own subjects (like every other page).
  const subjects = useChoiceSubjects(all);
  const choice = useChoice();
  const owner = useOwner();
  const access = useStudyAccess();
  const [state] = useDeckState(owner);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('nextgen-flashcards-subject');
      if (saved && subjects.some((s) => s.id === saved)) setSubjectId(saved);
    } catch {
      // Start with the first subject.
    }
  }, [subjects]);
  const pick = (id: string) => {
    setSubjectId(id);
    try {
      window.localStorage.setItem('nextgen-flashcards-subject', id);
    } catch {
      // Not remembered.
    }
  };

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  if (subject && subject.id !== subjectId) setSubjectId(subject.id);
  // A qualifier covers only its first weeks.
  const weeks = (decks[subject?.id ?? ''] ?? []).filter((w) => !choice.weeks || w.week <= choice.weeks);
  const open = access === 'open';
  const now = Date.now();
  const due = weeks.filter((w) => open || w.week === PREVIEW_WEEK).flatMap((w) => w.cardIds).filter((id) => isDue(state[id], now)).length;

  return (
    <section className="card card-loose max-reading" aria-labelledby="decks-title">
      <div className="flex-between mb-sm">
        <h2 id="decks-title" className="card-title mb-0">{subject?.name ?? 'Flashcards'}</h2>
        <label className="sr-only" htmlFor="deck-subject">Subject</label>
        <select id="deck-subject" className="select select-compact" value={subjectId} onChange={(e) => pick(e.target.value)}>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {due > 0 && (
        <div className="deck-row">
          <span><strong>🔥 Due for review</strong><small>{due} card{due === 1 ? '' : 's'} you studied before</small></span>
          <Link className="btn btn-primary" href={`/flashcards/${subjectId}/review`}>Review</Link>
        </div>
      )}
      {weeks.map((w) => {
        const locked = !open && w.week !== PREVIEW_WEEK;
        const known = w.cardIds.filter((id) => isKnown(state[id], now)).length;
        const seen = w.cardIds.some((id) => state[id]);
        return (
          <div key={w.week} className="deck-row">
            <span className="min-w-0">
              <strong>Week {w.week} · {w.title}{locked && <span className="chip chip-yellow chip-sm ml-xs">PRO</span>}</strong>
              <small>{w.cardIds.length} cards{seen ? ` · ${known} known` : ' · new'}</small>
            </span>
            {locked ? (
              <Link className="btn btn-secondary" href="/pricing">🔒 Unlock</Link>
            ) : (
              <Link className="btn btn-secondary" href={`/flashcards/${subjectId}/${w.week}`}>Study</Link>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ---------------- /flashcards/<subject>/<week | review> ---------------- */

type LoadedWeek = Pick<Week, 'week' | 'title' | 'concepts' | 'mistakes'>;

/** Loads the weeks' notes (week 1 is free; the rest need a trial or Pro, checked by the server). */
function useWeeks(subjectId: string, weeks: number[]) {
  const [loaded, setLoaded] = useState<LoadedWeek[] | null>(null);
  const [error, setError] = useState('');
  const key = weeks.join(',');
  useEffect(() => {
    let alive = true;
    setLoaded(null);
    setError('');
    Promise.all(key.split(',').filter(Boolean).map((w) => fetchProContent<{ week: LoadedWeek }>(`/api/pro/week/${subjectId}/${w}`).then((d) => d.week)))
      .then((list) => alive && setLoaded(list))
      .catch((e: { message?: string }) => alive && setError(e?.message ?? 'Could not load the cards.'));
    return () => {
      alive = false;
    };
  }, [subjectId, key]);
  return { loaded, error };
}

export function FlashcardSession({ subject, week, decks }: { subject: Subject; week: number | 'review'; decks: DeckRef[] }) {
  const owner = useOwner();
  const access = useStudyAccess();
  const [state, setState] = useDeckState(owner);
  const review = week === 'review';

  // Review: the weeks that have due cards (the free plan only reviews its preview week).
  const weeks = useMemo(() => {
    if (!review) return [week as number];
    const now = Date.now();
    return decks
      .filter((d) => (access === 'open' || d.week === PREVIEW_WEEK) && d.cardIds.some((id) => isDue(loadCards(owner)[id], now)))
      .map((d) => d.week);
  }, [review, week, decks, access, owner]);

  const { loaded, error } = useWeeks(subject.id, weeks);
  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [knew, setKnew] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Build the round once the notes are in.
  useEffect(() => {
    if (!loaded) return;
    const now = Date.now();
    const saved = loadCards(owner);
    let cards = loaded.flatMap((w) => cardsForWeek(subject.id, w));
    cards = review ? cards.filter((c) => isDue(saved[c.id], now)) : studyOrder(cards, saved, now);
    setQueue(cards);
    setTotal(cards.length);
    setKnew(0);
    setFlipped(false);
  }, [loaded, owner, review, subject.id]);

  const card = queue?.[0];

  function answer(known: boolean) {
    if (!card || !queue) return;
    setState(markCard(owner, card.id, known));
    setFlipped(false);
    if (known) {
      setKnew((k) => k + 1);
      setQueue(queue.slice(1));
    } else {
      // Comes back at the end of this round.
      setQueue([...queue.slice(1), card]);
    }
  }

  // Keyboard: Space flips, → knew it, ← show again.
  const answerRef = useRef(answer);
  answerRef.current = answer;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, select, textarea')) return;
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') answerRef.current(true);
      else if (e.key === 'ArrowLeft') answerRef.current(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Swipe: right = knew it, left = show again (after flipping).
  const start = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  const title = review ? 'Due for review' : `Week ${week} · ${loaded?.[0]?.title ?? ''}`;

  if (error) return <div className="card card-loose max-reading"><p className="muted">{error}</p><Link className="btn btn-secondary mt-md" href="/flashcards">Back to decks</Link></div>;
  if (!queue) return <div className="card card-loose max-reading"><p className="muted">Loading cards…</p></div>;

  if (!card) {
    return (
      <div className="card card-loose card-center max-reading">
        <div className="kicker">{subject.short} · {title}</div>
        <h2 className="mt-sm">{total ? `You knew ${knew} of ${total} cards first time` : 'Nothing due right now'}</h2>
        <p className="mt-sm">{total ? 'Cards you knew come back in 3 days, then a week, then two weeks.' : 'Cards you study come back here when it’s time to revise them.'}</p>
        <div className="btn-group justify-center mt-lg">
          {!review && <button className="btn btn-primary" onClick={() => setQueue(studyOrder(loaded!.flatMap((w) => cardsForWeek(subject.id, w)), state))}>Study again</button>}
          {!review && <Link className="btn btn-secondary" href={`/practice/${subject.id}/${week}`}>Practise week {week} →</Link>}
          <Link className="btn btn-secondary" href="/flashcards">Back to decks</Link>
        </div>
      </div>
    );
  }

  const done = total - queue.length;
  return (
    <div className="flashcard-wrap">
      <div className="flex-between mb-md">
        <div className="min-w-0">
          <span className="chip chip-blue">{subject.short.toUpperCase()}</span>
          <h2 className="mt-sm">{title}</h2>
        </div>
        <div className="flashcard-progress">
          <small className="muted">Card {Math.min(done + 1, total)} of {total} · {knew} known</small>
          <ProgressBar value={total ? (done / total) * 100 : 0} />
        </div>
      </div>

      <button
        type="button"
        className={`flashcard${flipped ? ' flipped' : ''}${card.kind === 'mistake' ? ' trap' : ''}`}
        style={{ '--drag': `${drag}px` } as React.CSSProperties}
        aria-label={flipped ? 'Card back. Tap to see the front.' : 'Card front. Tap to see the answer.'}
        onClick={() => setFlipped((f) => !f)}
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerMove={(e) => start.current !== null && flipped && setDrag(e.clientX - start.current)}
        onPointerUp={() => {
          if (flipped && Math.abs(drag) > 80) answer(drag > 0);
          start.current = null;
          setDrag(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}
      >
        {flipped ? (
          <span className="flashcard-face">
            <small>{card.kind === 'mistake' ? 'HOW TO AVOID IT' : card.front.toUpperCase()}</small>
            <span className="flashcard-back"><InlineText text={card.back} /></span>
          </span>
        ) : (
          <span className="flashcard-face">
            <small>{card.kind === 'mistake' ? '⚠️ COMMON MISTAKE · tap to flip' : 'CONCEPT · tap to flip'}</small>
            <span className={card.kind === 'mistake' ? 'flashcard-trap' : 'flashcard-term'}><InlineText text={card.front} /></span>
            {card.kind === 'concept' && <span className="flashcard-hint">What is it? Say it in your head, then flip.</span>}
          </span>
        )}
      </button>

      <div className="btn-group justify-center mt-lg">
        {flipped ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => answer(false)}>↻ Show again</button>
            <button type="button" className="btn btn-primary" onClick={() => answer(true)}>✓ I knew it</button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setFlipped(true)}>Flip card</button>
        )}
      </div>
      <p className="muted text-small text-center mt-md hide-phone">Space flips the card · → I knew it · ← Show again</p>
      <p className="muted text-small text-center mt-md show-phone">Flip, then swipe right if you knew it, left to see it again.</p>
    </div>
  );
}
