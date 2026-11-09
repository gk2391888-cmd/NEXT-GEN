'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authedFetch } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { useChoice, useChoiceSubjects } from '@/lib/programme-choice';
import { useQuestionLang } from '@/lib/question-lang';
import { formatCode, parseCode, WAR, type WarError, type WarPlayer, type WarQuestion, type WarRival, type WarView } from '@/lib/war';
import { whatsappUrl } from '@/lib/referrals';
import { QuestionView, letter } from '@/components/quiz/question-view';
import { InlineText } from '@/components/ui';
import type { Question, Subject } from '@/lib/types';

/* ---------------- shared bits ---------------- */

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await authedFetch(path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: 'Something went wrong. Please try again.' }));
  if (!res.ok) throw data as WarError;
  return data as T;
}

/** The question in the student's language, shaped for QuestionView (answer -1 until it's revealed). */
function asQuestion(q: WarQuestion, lang: 'en' | 'hi', answer = -1): Question {
  const text = lang === 'en' && q.en ? q.en : q;
  return { id: `war-${q.index}`, question: text.question, options: text.options, code: q.code, answer, explanation: '', difficulty: 'medium' };
}

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

function Avatar({ player }: { player: Pick<WarPlayer, 'name' | 'isMe'> }) {
  return <span className={`friend-avatar${player.isMe ? ' war-me' : ''}`} aria-hidden="true">{initials(player.name)}</span>;
}

function weekRange(from: number, to: number) {
  return from === to ? `Week ${from}` : `Weeks ${from}–${to}`;
}

/* ---------------- /war ---------------- */

type Range = { label: string; from: number; to: number };

function rangesFor(weeks: number): Range[] {
  const presets: Range[] = [
    { label: 'Quiz 1 · weeks 1–4', from: 1, to: 4 },
    { label: 'Quiz 2 · weeks 5–8', from: 5, to: 8 },
    { label: `End term · weeks 1–${weeks}`, from: 1, to: weeks },
  ].filter((r) => r.to <= weeks);
  const single = Array.from({ length: weeks }, (_, i) => ({ label: `Week ${i + 1}`, from: i + 1, to: i + 1 }));
  return [...presets, ...single];
}

export function WarHome({ subjects: all, weeks }: { subjects: Subject[]; weeks: Record<string, number> }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready } = useAuth();
  const choice = useChoice();
  const subjects = useChoiceSubjects(all).filter((s) => (weeks[s.id] ?? 0) > 0);
  const [subjectId, setSubjectId] = useState('');
  const [range, setRange] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<WarError | null>(null);
  const [rivals, setRivals] = useState<WarRival[]>([]);

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const maxWeeks = Math.min(weeks[subject?.id ?? ''] ?? 0, choice.weeks ?? 99);
  const ranges = useMemo(() => rangesFor(maxWeeks), [maxWeeks]);
  const picked = ranges.find((r) => `${r.from}-${r.to}` === range) ?? ranges[0];

  // A link from the Question of the Day: /war?subject=stat1&from=5&to=5.
  useEffect(() => {
    const s = params.get('subject');
    if (s) setSubjectId(s);
    const from = Number(params.get('from'));
    const to = Number(params.get('to'));
    if (from && to) setRange(`${from}-${to}`);
  }, [params]);

  useEffect(() => {
    if (!user) return;
    call<{ rivals: WarRival[] }>('/api/war').then((r) => setRivals(r.rivals)).catch(() => {});
  }, [user]);

  async function go(kind: 'live' | 'challenge' | 'match') {
    if (!subject || !picked) return;
    setBusy(kind);
    setError(null);
    try {
      const { code } = await call<{ code: string }>('/api/war', {
        action: kind === 'match' ? 'match' : 'create',
        mode: kind,
        subjectId: subject.id,
        fromWeek: picked.from,
        toWeek: picked.to,
      });
      router.push(`/war/${code}`);
    } catch (e) {
      setError(e as WarError);
      setBusy('');
    }
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const code = parseCode(joinCode);
    if (!code) return setError({ error: 'Enter the 6-digit code, like QW-482193.' });
    router.push(`/war/${code}`);
  }

  if (ready && !user) {
    return (
      <div className="card card-loose text-center">
        <h2 className="mb-sm">Play Quiz War with your friends ⚔️</h2>
        <p className="muted mb-lg">Log in to challenge friends, or get matched with another IITM BS student.</p>
        <Link className="btn btn-primary" href="/login?next=/war">Log in or sign up</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card card-loose" aria-label="New war">
        <div className="btn-group mb-lg">
          <label className="sr-only" htmlFor="war-subject">Subject</label>
          <select id="war-subject" className="select" value={subject?.id ?? ''} onChange={(e) => { setSubjectId(e.target.value); setRange(''); }}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="war-weeks">Weeks</label>
          <select id="war-weeks" className="select" value={picked ? `${picked.from}-${picked.to}` : ''} onChange={(e) => setRange(e.target.value)}>
            {ranges.map((r) => <option key={`${r.from}-${r.to}`} value={`${r.from}-${r.to}`}>{r.label}</option>)}
          </select>
          <span className="muted text-small">{WAR.questions} questions · {WAR.seconds} s each</span>
        </div>
        <div className="war-modes">
          <div className="war-mode war-mode-main">
            <span className="war-mode-icon" aria-hidden="true">⚔️</span>
            <h3>1v1 with a friend</h3>
            <p>Live. Share a code and play together right now. Up to {WAR.maxPlayers} players for a group war.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => go('live')} disabled={Boolean(busy)}>{busy === 'live' ? 'Creating…' : 'Create war'}</button>
          </div>
          <div className="war-mode">
            <span className="war-mode-icon" aria-hidden="true">📩</span>
            <h3>Challenge a friend</h3>
            <p>Play now, send the link. They play the same {WAR.questions} questions whenever they’re free.</p>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => go('challenge')} disabled={Boolean(busy)}>{busy === 'challenge' ? 'Starting…' : 'Play and send'}</button>
          </div>
          <div className="war-mode">
            <span className="war-mode-icon" aria-hidden="true">🎲</span>
            <h3>Random 1v1</h3>
            <p>Get matched with another student playing the same subject and weeks.</p>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => go('match')} disabled={Boolean(busy)}>{busy === 'match' ? 'Searching…' : 'Find a match'}</button>
          </div>
        </div>
        {error && (
          <p className="field-error mt-md" role="alert">
            {error.error} {error.code === 'limit' && <Link className="link" href="/pricing">Get Pro →</Link>}
          </p>
        )}
        <p className="muted text-small mt-md">PYQ-style questions written for NEXT GEN, in the pattern of IITM BS quizzes. Not copied from IITM papers.</p>
      </section>

      <div className="grid grid-2">
        <form className="card" onSubmit={join}>
          <h3 className="card-title">Join a war</h3>
          <div className="btn-group">
            <label className="sr-only" htmlFor="war-code">War code</label>
            <input id="war-code" className="input flex-1" placeholder="Code, e.g. QW-482193" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} inputMode="numeric" autoComplete="off" />
            <button className="btn btn-primary">Join</button>
          </div>
        </form>
        <section className="card" aria-labelledby="rivals-title">
          <h3 id="rivals-title" className="card-title">Your rivals</h3>
          {rivals.length === 0 ? (
            <p className="muted text-small">Finish a war with a friend and your head-to-head record shows up here.</p>
          ) : (
            rivals.map((r) => (
              <div key={r.name + r.lastCode} className="friend-row">
                <Avatar player={{ name: r.name, isMe: false }} />
                <strong className="flex-1">{r.name}</strong>
                <span className={r.wins >= r.losses ? 'tone-good' : 'tone-poor'}><strong>{r.wins}</strong> – {r.losses}</span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- /war/<code> ---------------- */

/** Polls the war about once a second, and keeps a clock in step with the server's. */
function useWar(code: string) {
  const [view, setView] = useState<WarView | null>(null);
  const [error, setError] = useState<WarError | null>(null);
  const offset = useRef(0);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const v = await call<WarView>(`/api/war/${code}`);
      offset.current = v.serverNow - Date.now();
      setView(v);
      setError(null);
    } catch (e) {
      setError(e as WarError);
    }
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Polling is what Quiz War costs to run, so it's kept modest: every 2 s while playing, slower in the
  // lobby and on the results, and not at all while the tab is in the background.
  const phase = view?.phase;
  const settled = phase === 'done' && Boolean(view?.players.every((p) => p.finished));
  useEffect(() => {
    if (settled) return;
    const every = phase === 'lobby' ? 3000 : phase === 'done' ? 8000 : 2000;
    const id = window.setInterval(() => document.visibilityState === 'visible' && refresh(), every);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [phase, settled, refresh]);

  // Re-render a few times a second for the timers.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  const now = () => Date.now() + offset.current;
  return { view, setView, error, refresh, now };
}

export function WarRoom({ code }: { code: string }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const lang = useQuestionLang();
  const { view, setView, error, refresh, now } = useWar(code);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<WarError | null>(null);
  const [sent, setSent] = useState<{ index: number; choice: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showReview, setShowReview] = useState(false);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      const v = await call<WarView>(`/api/war/${code}`, body);
      setView(v);
    } catch (e) {
      setActionError(e as WarError);
    }
    setBusy(false);
  }

  async function answer(choice: number) {
    if (!view?.question || sent?.index === view.index) return;
    setSent({ index: view.index, choice });
    try {
      await call(`/api/war/${code}`, { action: 'answer', index: view.index, choice });
    } catch (e) {
      setActionError(e as WarError);
    }
    refresh();
  }

  async function rematch() {
    setBusy(true);
    try {
      const { code: next } = await call<{ code: string }>(`/api/war/${code}`, { action: 'rematch' });
      router.push(`/war/${next}`);
    } catch (e) {
      setActionError(e as WarError);
      setBusy(false);
    }
  }

  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/war/${code}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy the war link', link);
    }
  }

  if (error && !view) {
    return (
      <div className="card card-loose text-center">
        <h2 className="mb-sm">{error.code === 'not_found' ? 'War not found' : 'Could not load the war'}</h2>
        <p className="muted mb-lg">{error.error}</p>
        <Link className="btn btn-primary" href="/war">Back to Quiz War</Link>
      </div>
    );
  }
  if (!view) return <div className="card card-loose"><p className="muted">Loading the war…</p></div>;

  const me = view.players.find((p) => p.isMe);
  const others = view.players.filter((p) => !p.isMe);
  const t = now();
  const secondsLeft = view.qEndsAt ? Math.max(0, Math.ceil((view.qEndsAt - t) / 1000)) : 0;
  const title = `${view.subject.short} · ${weekRange(view.fromWeek, view.toWeek)}`;
  const shareText = view.mode === 'challenge'
    ? `I just played a Quiz War on NEXT GEN ⚔️ (${title}). Beat my score: ${link}`
    : `Join my Quiz War on NEXT GEN ⚔️ (${title}). Code ${formatCode(code)}: ${link}`;

  // Not in this war yet.
  if (!view.joined) {
    const canJoin = view.mode === 'challenge' || view.phase === 'lobby';
    return (
      <div className="card card-loose max-reading text-center">
        <span className="chip chip-blue">{title.toUpperCase()}</span>
        <h2 className="mt-md mb-sm">{view.mode === 'challenge' ? `${view.players[0]?.name ?? 'A friend'} challenged you ⚔️` : `${view.players.find((p) => p.isHost)?.name ?? 'A friend'}’s Quiz War`}</h2>
        <p className="muted mb-lg">
          {view.mode === 'challenge'
            ? `Play the same ${view.total} questions and see who scores more.`
            : canJoin ? `${view.players.length} of ${WAR.maxPlayers} players in. Join before the host starts.` : 'This war has already started.'}
        </p>
        {!ready ? null : !user ? (
          <Link className="btn btn-primary" href={`/login?next=/war/${code}`}>Log in to play</Link>
        ) : canJoin ? (
          <button className="btn btn-primary" onClick={() => act({ action: 'join' })} disabled={busy}>{busy ? 'Joining…' : view.mode === 'challenge' ? 'Play this challenge' : 'Join war'}</button>
        ) : (
          <Link className="btn btn-primary" href="/war">Start your own war</Link>
        )}
        {actionError && <p className="field-error mt-md" role="alert">{actionError.error} {actionError.code === 'limit' && <Link className="link" href="/pricing">Get Pro →</Link>}</p>}
      </div>
    );
  }

  // Random match: waiting for someone.
  if (view.phase === 'lobby' && view.mode === 'random') {
    const waited = Math.min(WAR.matchWaitMs, t - view.createdAt);
    return (
      <div className="card card-loose max-reading text-center war-searching">
        <div className="war-pulse" aria-hidden="true">🎲</div>
        <h2>Finding an opponent…</h2>
        <p className="muted mt-sm">{title}</p>
        <p className="muted text-small mt-lg">No one free in {Math.max(0, Math.ceil((WAR.matchWaitMs - waited) / 1000))} s? It turns into a challenge: you play now, and the next student who searches takes on your score.</p>
        <Link className="btn btn-secondary mt-lg" href="/war">Cancel</Link>
      </div>
    );
  }

  // Lobby.
  if (view.phase === 'lobby') {
    return (
      <div className="card card-loose max-reading">
        <span className="chip chip-blue">{title.toUpperCase()}</span>
        <h2 className="mt-md mb-xs">{others.length ? 'Ready when you are' : 'Waiting for your friend'}</h2>
        <p className="muted">Send this code or link. {view.isHost ? 'The war starts when you tap Start.' : 'The host starts the war.'}</p>
        <div className="war-code" aria-label="War code">{formatCode(code)}</div>
        <div className="btn-group">
          <a className="btn btn-whatsapp flex-1" href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
          <button type="button" className="btn btn-secondary flex-1" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
        </div>
        <h3 className="card-title mt-lg">Players ({view.players.length}/{WAR.maxPlayers})</h3>
        {view.players.map((p) => (
          <div key={p.id} className="friend-row">
            <Avatar player={p} />
            <strong className="flex-1">{p.name}{p.isMe && ' (you)'}</strong>
            <span className="chip chip-teal">{p.isHost ? 'Host' : 'Ready'}</span>
          </div>
        ))}
        {view.isHost ? (
          <button className="btn btn-primary btn-block btn-lg mt-lg" onClick={() => act({ action: 'start' })} disabled={busy || view.players.length < 2}>
            {view.players.length < 2 ? 'Waiting for a friend to join…' : 'Start war ⚔️'}
          </button>
        ) : (
          <p className="muted text-center mt-lg">Waiting for the host to start…</p>
        )}
        {actionError && <p className="field-error mt-md" role="alert">{actionError.error}</p>}
      </div>
    );
  }

  // 3, 2, 1.
  if (view.phase === 'countdown') {
    return (
      <div className="war-stage war-countdown">
        <p>{title}</p>
        <div className="war-big">{Math.max(1, Math.ceil(((view.qStartsAt ?? t) - t) / 1000))}</div>
        <p>Get ready…</p>
      </div>
    );
  }

  // Results.
  if (view.phase === 'done') {
    const waiting = view.mode === 'challenge' && view.players.some((p) => !p.finished);
    const winner = view.players[0];
    const won = winner?.isMe && (view.players[1]?.score ?? -1) < winner.score;
    const alone = view.players.filter((p) => p.finished).length < 2;
    return (
      <div className="stack max-reading war-results">
        <div className="war-stage war-result">
          <div className="war-cup" aria-hidden="true">{alone ? '🎯' : won ? '🏆' : '⚔️'}</div>
          <h2>{alone ? 'Your score is in' : won ? 'You won!' : `${winner?.name} won`}</h2>
          <p>{me?.correct ?? 0} correct · {me?.score.toLocaleString('en-IN') ?? 0} points</p>
          <div className="war-board">
            {view.players.filter((p) => p.finished).map((p, i) => (
              <div key={p.id} className="war-board-row">
                <span>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} {p.name}{p.isMe && ' (you)'}</span>
                <strong>{p.score.toLocaleString('en-IN')}</strong>
              </div>
            ))}
          </div>
          {alone && view.mode === 'challenge' && <p className="text-small">Send the link: whoever plays it shows up here.</p>}
          <div className="btn-group justify-center mt-md">
            {view.mode === 'challenge' || waiting ? (
              <a className="btn btn-whatsapp" href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer">Send the challenge</a>
            ) : (
              <button className="btn btn-primary" onClick={rematch} disabled={busy}>{view.rematch ? 'Join the rematch' : 'Rematch'}</button>
            )}
            {!alone && <a className="btn btn-whatsapp" href={whatsappUrl(won ? `I won a Quiz War on NEXT GEN ⚔️ (${title}) with ${me?.score} points. Think you can beat me? ${window.location.origin}/war` : `Just played a Quiz War on NEXT GEN ⚔️ (${title}). Play me: ${window.location.origin}/war`)} target="_blank" rel="noopener noreferrer">Share result</a>}
            <button className="btn btn-secondary" onClick={() => setShowReview((s) => !s)}>{showReview ? 'Hide answers' : 'Review answers'}</button>
            <Link className="btn btn-secondary" href="/war">New war</Link>
          </div>
        </div>
        {showReview && view.review?.map((r) => {
          const q = asQuestion(r, lang, r.answer);
          const mine = r.picks.find((p) => p.playerId === 'me');
          const explanation = lang === 'en' && r.en ? r.en.explanation : r.explanation;
          return (
            <div key={r.index} className="card">
              <div className="flex-between mb-sm">
                <strong>Q{r.index + 1} · Week {r.week}</strong>
                <span className={`chip ${mine?.correct ? 'chip-teal' : 'chip-red'}`}>{mine ? (mine.correct ? 'CORRECT' : 'WRONG') : 'NO ANSWER'}</span>
              </div>
              <QuestionView question={q} selected={mine?.choice ?? null} reveal />
              <div className="explain"><strong>Answer: {letter(r.answer)}. </strong><InlineText text={explanation} /></div>
            </div>
          );
        })}
      </div>
    );
  }

  // A question, or the reveal after it.
  const q = view.question;
  const revealing = view.phase === 'reveal' && view.reveal;
  const myPick = view.mine?.choice ?? (sent?.index === view.index ? sent.choice : null);
  const rival = others[0];
  return (
    <div className="war-stage war-play">
      <div className="war-scorebar">
        <span className="war-who"><Avatar player={me ?? { name: 'You', isMe: true }} /> You <strong>{me?.score ?? 0}</strong></span>
        <span className="war-qcount">Q {view.index + 1}/{view.total}</span>
        {view.mode === 'challenge' ? (
          <span className="war-who">{rival ? <>{rival.name} <strong>{rival.score}</strong></> : 'Solo run'}</span>
        ) : (
          <span className="war-who">{rival && <>{others.length > 1 ? `${others.length} rivals` : rival.name} <strong>{rival.score}</strong> <Avatar player={rival} /></>}</span>
        )}
      </div>
      {!revealing && (
        <div className="war-timer" style={{ '--ring-value': `${(secondsLeft / WAR.seconds) * 100}%` } as React.CSSProperties} aria-label={`${secondsLeft} seconds left`}>
          <span>{secondsLeft}</span>
        </div>
      )}
      {q && (
        <div className="war-question">
          <p className="war-week">Week {q.week} · {q.weekTitle}</p>
          <QuestionView
            question={asQuestion(q, lang, revealing ? view.reveal!.answer : -1)}
            selected={myPick}
            onSelect={!revealing && myPick === null ? answer : undefined}
            reveal={Boolean(revealing)}
          />
        </div>
      )}
      <div className="war-status" role="status">
        {revealing ? (
          <div className="war-picks">
            {view.players.map((p) => {
              const pick = view.reveal!.picks.find((x) => x.playerId === p.id);
              return (
                <span key={p.id} className={`chip ${pick?.correct ? 'chip-teal' : 'chip-red'}`}>
                  {p.isMe ? 'You' : p.name}: {pick ? `${letter(pick.choice ?? -1)} ${pick.correct ? '✓' : '✗'} · ${(pick.ms / 1000).toFixed(1)} s` : 'no answer'}
                </span>
              );
            })}
          </div>
        ) : view.mine ? (
          <span>{view.mine.correct ? `✓ Correct · +${view.mine.points}` : '✗ Not this time'}{view.mode !== 'challenge' && others.some((p) => !p.answered) ? ' · waiting for the others' : ''}</span>
        ) : myPick !== null ? (
          <span>Locking in…</span>
        ) : (
          <span>{others.filter((p) => p.answered).length > 0 && view.mode !== 'challenge' ? `⚡ ${others.filter((p) => p.answered).map((p) => p.name).join(', ')} answered` : 'Fastest right answer gets the most points'}</span>
        )}
      </div>
      {actionError && <p className="field-error mt-sm" role="alert">{actionError.error}</p>}
    </div>
  );
}
