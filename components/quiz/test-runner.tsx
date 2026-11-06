'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { useCorrectedQuestions } from '@/lib/overrides';
import { usePlan } from '@/lib/plan';
import { ProTag } from '@/components/pro-lock';
import { useConfirm } from '@/components/confirm-dialog';
import { percent } from '@/lib/progress/insights';
import type { ActiveTest, NewAnswer, TestAttempt } from '@/lib/progress/types';
import { pickQuestions, testKey, testMix, type MockTest } from '@/lib/tests';
import { countByLevel, DIFFICULTIES, DIFFICULTY_CHIP, levelLabel, levelOf, type Level } from '@/lib/levels';
import type { Question, Subject } from '@/lib/types';
import { ShareResult } from '@/components/share-result';
import { accuracyColor, accuracyTone, formatClock, InlineText, ProgressBar } from '@/components/ui';
import { Explanation, letter, QuestionView } from './question-view';
import { LanguageSwitch } from './language-switch';
import { availableLevel, LevelSwitch } from './level-switch';

/**
 * A section of a test that mixes subjects (the qualifier mocks): each question's `week` is then its
 * section number `n`, and results are shown per section instead of per week.
 */
export type TestSection = { n: number; name: string; short?: string; revise?: { href: string; label: string } };

/** Right answers out of the total in one section (or week) of a submitted test. */
export type SectionScore = { n: number; right: number; total: number };

type Props = {
  subject: Subject;
  test: MockTest;
  pool: Question[];
  weekTitles: Record<number, string>;
  /** Group by these sections instead of by week. Answers then stay out of course progress (My Mistakes, weak weeks). */
  sections?: TestSection[];
  /** Replaces the default rules on the intro screen. */
  rules?: React.ReactNode;
  /** Shown at the top of the result, from the score in each section (or week). */
  resultExtra?: (scores: SectionScore[]) => React.ReactNode;
};

/** How a test names a group of questions: "Week 3", or a section's name. */
type Grouping = {
  label: (n: number) => string;
  /** For the small "Weakest" tile. */
  short: (n: number) => string;
  /** The longer name in the result, e.g. "Week 3 · Probability". */
  title: (n: number) => string;
  revise: (n: number) => { href: string; label: string } | undefined;
  noun: string;
};

function grouping(subject: Subject, weekTitles: Record<number, string>, sections?: TestSection[]): Grouping {
  if (sections) {
    const byN = new Map(sections.map((s) => [s.n, s]));
    const name = (n: number) => byN.get(n)?.name ?? `Section ${n}`;
    return { label: name, short: (n) => byN.get(n)?.short ?? name(n), title: name, revise: (n) => byN.get(n)?.revise, noun: 'section' };
  }
  return {
    label: (w) => `Week ${w}`,
    short: (w) => `Week ${w}`,
    title: (w) => `Week ${w} · ${weekTitles[w]}`,
    revise: (w) => ({ href: `/library/${subject.id}/${w}`, label: `Revise week ${w} notes →` }),
    noun: 'topic',
  };
}

export function TestRunner({ subject, test, pool: original, weekTitles, sections, rules, resultExtra }: Props) {
  const pool = useCorrectedQuestions(original);
  const state = useProgress();
  const key = testKey(subject.id, test.id);
  const active = state.active[key];
  const byId = useMemo(() => new Map(pool.map((q) => [q.id, q])), [pool]);
  const attempts = state.tests.filter((a) => a.subjectId === subject.id && a.testId === test.id);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = viewingId ? attempts.find((a) => a.id === viewingId) : undefined;
  const group = grouping(subject, weekTitles, sections);
  // Mixed by default. A single level is offered when the pool has a whole test's worth of it; sectioned tests are always mixed.
  const levelCounts = countByLevel(pool);
  const [chosenLevel, setLevel] = useState<Level>('mixed');
  const level = sections ? 'mixed' : availableLevel(chosenLevel, levelCounts, test.questionCount);
  const levelChoice = !sections && DIFFICULTIES.some((d) => levelCounts[d] >= test.questionCount);
  const mix = testMix(test.questionCount);

  function start() {
    const questions = pickQuestions(pool, test.questionCount, Math.random, level);
    const now = Date.now();
    progress.saveActiveTest(key, {
      subjectId: subject.id,
      testId: test.id,
      questionIds: questions.map((q) => q.id),
      responses: questions.map(() => null),
      marked: questions.map(() => false),
      current: 0,
      startedAt: now,
      endsAt: now + test.minutes * 60_000,
    });
    setViewingId(null);
  }

  if (active) {
    return <RunningTest key={active.startedAt} active={active} storeKey={key} test={test} subject={subject} byId={byId} group={group} sectioned={Boolean(sections)} onSubmitted={setViewingId} />;
  }

  if (viewing) {
    return <TestResult attempt={viewing} byId={byId} group={group} extra={resultExtra} onRetake={start} shareTitle={`${subject.name} · ${test.title}`} />;
  }

  return (
    <div className="quiz-wrap stack">
      <div className="card card-loose">
        <div className="quiz-top">
          <span className="chip chip-blue">
            {subject.short.toUpperCase()} · {sections ? `${sections.length} SECTIONS` : `WEEKS ${test.fromWeek}–${test.toWeek}`}
          </span>
          <LanguageSwitch />
        </div>
        <h1 className="mt-md mb-sm">{test.title}</h1>
        <p>{subject.name} · {test.questionCount} questions · {test.minutes} minutes</p>
        {!sections && (
          <div className="mt-md">
            {levelChoice && (
              <div className="level-row mb-xs">
                <span className="muted">Question level</span>
                <LevelSwitch value={level} onChange={setLevel} counts={levelCounts} min={test.questionCount} showCounts={false} />
              </div>
            )}
            <p className="muted">
              {level === 'mixed'
                ? `A balanced mix: ${mix.easy} easy, ${mix.medium} medium and ${mix.hard} hard questions, spread across the weeks.`
                : `Only ${levelLabel(level).toLowerCase()} questions, spread across the weeks (${levelCounts[level]} in this test's question bank).`}
            </p>
          </div>
        )}
        {rules ?? (
          <ul className="my-lg">
            <li>The timer starts as soon as you begin. The test is submitted automatically when time runs out.</li>
            <li>Use the question palette to jump to any question, and <strong>Mark for review</strong> anything you want to revisit.</li>
            <li>Each correct answer scores 1 mark. Wrong or skipped answers score 0; there is no negative marking.</li>
            <li>If the page is refreshed or closed, the test resumes where you left off.</li>
          </ul>
        )}
        <button className="btn btn-primary" onClick={start}>Start test →</button>
      </div>

      {attempts.length > 0 && (
        <div className="card">
          <h3 className="card-title">Your previous attempts</h3>
          <table className="table table-stack">
            <thead><tr><th>Date</th><th>Score</th><th>Time</th><th /></tr></thead>
            <tbody>
              {[...attempts].reverse().map((a) => {
                const attemptLevel = sections ? 'mixed' : levelOf(a.questionIds.flatMap((id) => byId.get(id) ?? []));
                return (
                  <tr key={a.id}>
                    <td>
                      {new Date(a.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {attemptLevel !== 'mixed' && <> <span className={`chip ${DIFFICULTY_CHIP[attemptLevel]}`}>{levelLabel(attemptLevel).toUpperCase()}</span></>}
                    </td>
                    <td data-label="Score:"><strong className={accuracyTone(percent(a.correct, a.total))}>{a.correct}/{a.total}</strong></td>
                    <td data-label="Time:">{formatClock(a.durationSec)}</td>
                    <td className="text-right"><button className="btn btn-secondary" onClick={() => setViewingId(a.id)}>View result</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Running test ---------------- */

type RunningProps = {
  active: ActiveTest;
  storeKey: string;
  test: MockTest;
  subject: Subject;
  byId: Map<string, Question>;
  group: Grouping;
  /** Sectioned (qualifier) tests don't add their answers to course progress. */
  sectioned: boolean;
  onSubmitted: (attemptId: string) => void;
};

function RunningTest({ active, storeKey, test, subject, byId, group, sectioned, onSubmitted }: RunningProps) {
  const [remaining, setRemaining] = useState(() => active.endsAt - Date.now());
  const submitted = useRef(false);
  const { confirm, dialog } = useConfirm();
  const questions = active.questionIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  const current = Math.min(active.current, questions.length - 1);
  const question = questions[current];

  // Time on the current question is added when the student moves away from it or submits.
  const enteredAt = useRef(Date.now());
  useEffect(() => {
    enteredAt.current = Date.now();
  }, [current]);
  const withElapsed = useCallback(() => {
    const spent = active.questionIds.map((_, i) => active.timeSpent?.[i] ?? 0);
    spent[current] += Math.round((Date.now() - enteredAt.current) / 1000);
    return spent;
  }, [active, current]);

  const save = (patch: Partial<ActiveTest>) => {
    const moving = patch.current !== undefined && patch.current !== current;
    progress.saveActiveTest(storeKey, { ...active, ...patch, ...(moving ? { timeSpent: withElapsed() } : {}) });
  };

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    const now = Date.now();
    const submittedAt = new Date(now).toISOString();
    const qs = active.questionIds.map((id) => byId.get(id));
    const correct = qs.filter((q, i) => q && active.responses[i] === q.answer).length;
    const attempt: TestAttempt = {
      id: now.toString(36),
      subjectId: active.subjectId,
      testId: active.testId,
      startedAt: new Date(active.startedAt).toISOString(),
      submittedAt,
      durationSec: Math.round((Math.min(now, active.endsAt) - active.startedAt) / 1000),
      questionIds: active.questionIds,
      responses: active.responses,
      correct,
      total: active.questionIds.length,
      timeSpent: withElapsed(),
    };
    // Skipped questions don't count towards weak-topic detection; only answered ones do.
    const answers: NewAnswer[] = qs.flatMap((q, i) =>
      q && !sectioned && active.responses[i] !== null
        ? [{ questionId: q.id, subjectId: active.subjectId, week: q.week ?? 0, correct: active.responses[i] === q.answer, mode: 'test' as const, at: submittedAt }]
        : [],
    );
    onSubmitted(attempt.id);
    progress.submitTest(storeKey, attempt, answers);
  }, [active, byId, onSubmitted, sectioned, storeKey, withElapsed]);

  useEffect(() => {
    const tick = () => {
      const left = active.endsAt - Date.now();
      setRemaining(left);
      if (left <= 0) submit();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active.endsAt, submit]);

  const answered = active.responses.filter((r) => r !== null).length;
  const markedCount = active.marked.filter(Boolean).length;

  async function confirmSubmit() {
    const unanswered = questions.length - answered;
    const ok = await confirm({
      title: 'Submit the test?',
      message: unanswered
        ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. You can’t change your answers after submitting.`
        : 'You can’t change your answers after submitting.',
      confirmLabel: 'Submit test',
      cancelLabel: 'Keep working',
    });
    if (ok) submit();
  }

  if (!question) return null;

  return (
    <div>
      <div className="test-header">
        <div>
          <div className="kicker mb-xs">Mock test · {subject.short}</div>
          <h2>{test.title}{!sectioned && ` · Weeks ${test.fromWeek}–${test.toWeek}`}</h2>
        </div>
        <div className="flex gap-md items-center">
          <div className="card timer-box" aria-live="off">
            <div className="timer-label">TIME LEFT</div>
            <div className={`timer${remaining < 5 * 60_000 ? ' low' : ''}`}>{formatClock(Math.max(0, Math.ceil(remaining / 1000)))}</div>
          </div>
          <button className="btn btn-danger" onClick={confirmSubmit}>Submit test</button>
        </div>
      </div>

      <div className="row">
        <div className="card row-main card-loose">
          <div className="quiz-top">
            <span className="chip chip-blue">QUESTION {current + 1} OF {questions.length}</span>
            <span className="btn-group items-center">
              <span className="muted">1 mark · {group.label(question.week ?? 0)}</span>
              <LanguageSwitch />
            </span>
          </div>
          <QuestionView
            question={question}
            selected={active.responses[current]}
            onSelect={(i) => save({ responses: active.responses.map((r, j) => (j === current ? i : r)) })}
          />
          <div className="quiz-actions">
            <div className="btn-group">
              <button className="btn btn-secondary" disabled={current === 0} onClick={() => save({ current: current - 1 })}>← Previous</button>
              {active.responses[current] !== null && (
                <button className="btn btn-secondary" onClick={() => save({ responses: active.responses.map((r, j) => (j === current ? null : r)) })}>Clear</button>
              )}
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => save({ marked: active.marked.map((m, j) => (j === current ? !m : m)) })}>
                {active.marked[current] ? '⚑ Unmark' : '⚑ Mark for review'}
              </button>
              {current < questions.length - 1 ? (
                <button className="btn btn-primary" onClick={() => save({ current: current + 1 })}>Save &amp; next →</button>
              ) : (
                <button className="btn btn-primary" onClick={confirmSubmit}>Finish test</button>
              )}
            </div>
          </div>
        </div>

        <aside className="card test-side">
          <h3>Question palette</h3>
          <div className="palette">
            {questions.map((q, i) => {
              const cls = i === current ? 'current' : active.marked[i] ? 'marked' : active.responses[i] !== null ? 'answered' : '';
              return (
                <button key={q.id} className={cls} onClick={() => save({ current: i })} aria-label={`Question ${i + 1}`}>{i + 1}</button>
              );
            })}
          </div>
          <div className="legend">
            <span><i className="answered" />Answered {answered}</span>
            <span><i className="marked" />Review {markedCount}</span>
            <span><i />Left {questions.length - answered}</span>
          </div>
        </aside>
      </div>
      {dialog}
    </div>
  );
}

/* ---------------- Result ---------------- */

type ResultProps = { attempt: TestAttempt; byId: Map<string, Question>; group: Grouping; extra?: Props['resultExtra']; onRetake: () => void; shareTitle: string };
type Filter = 'all' | 'wrong' | 'skipped';

function TestResult({ attempt, byId, group, extra, onRetake, shareTitle }: ResultProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const { isPro } = usePlan();
  const rows = attempt.questionIds
    .map((id, i) => ({ q: byId.get(id), pick: attempt.responses[i], n: i + 1, secs: attempt.timeSpent?.[i] }))
    .filter((r): r is { q: Question; pick: number | null; n: number; secs: number | undefined } => Boolean(r.q));
  const timed = rows.filter((r) => r.secs !== undefined);
  const slowest = [...timed].sort((a, b) => (b.secs ?? 0) - (a.secs ?? 0)).slice(0, 3);
  const avgSecs = timed.length ? Math.round(timed.reduce((n, r) => n + (r.secs ?? 0), 0) / timed.length) : 0;

  const wrong = rows.filter((r) => r.pick !== null && r.pick !== r.q.answer);
  const skipped = rows.filter((r) => r.pick === null);
  const accuracy = percent(attempt.correct, attempt.total);

  const byWeek = new Map<number, { right: number; total: number }>();
  for (const r of rows) {
    const w = r.q.week ?? 0;
    const s = byWeek.get(w) ?? { right: 0, total: 0 };
    s.total++;
    if (r.pick === r.q.answer) s.right++;
    byWeek.set(w, s);
  }
  const weeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0]);
  const weakest = weeks.reduce<[number, { right: number; total: number }] | null>(
    (worst, cur) => (!worst || cur[1].right / cur[1].total < worst[1].right / worst[1].total ? cur : worst),
    null,
  );
  const weak = weakest && percent(weakest[1].right, weakest[1].total) < 75 ? weakest[0] : null;
  const revise = weak === null ? undefined : group.revise(weak);

  const shown = filter === 'wrong' ? wrong : filter === 'skipped' ? skipped : rows;

  return (
    <div>
      {extra?.(weeks.map(([n, s]) => ({ n, ...s })))}
      <div className="grid grid-4 mb-lg">
        <div className="stat"><strong>{attempt.correct} / {attempt.total}</strong><span className="muted">Score</span></div>
        <div className="stat"><strong className={accuracyTone(accuracy)}>{accuracy}%</strong><span className="muted">Accuracy</span></div>
        <div className="stat"><strong>{formatClock(attempt.durationSec)}</strong><span className="muted">Time taken</span></div>
        <div className="stat">
          <strong className={weak !== null ? 'tone-poor' : 'tone-good'}>{weak !== null ? group.short(weak) : 'None'}</strong>
          <span className="muted">Weakest {group.noun}</span>
        </div>
      </div>

      <div className="row">
        <div className="card test-side">
          <h3 className="mb-md">{group.noun === 'section' ? 'Section-wise' : 'Week-wise'} performance</h3>
          {weeks.map(([w, s]) => (
            <div key={w} className="week-score">
              <div>
                <span>{group.title(w)}</span><b>{s.right}/{s.total}</b>
              </div>
              <ProgressBar value={percent(s.right, s.total)} color={accuracyColor(percent(s.right, s.total))} />
            </div>
          ))}
          <div className="stack mt-lg">
            {revise && <Link className="btn btn-primary btn-block" href={revise.href}>{revise.label}</Link>}
            <ShareResult correct={attempt.correct} total={attempt.total} title={shareTitle} />
            <button className="btn btn-secondary btn-block" onClick={onRetake}>Take a new test</button>
          </div>
          <div className="divider-top">
            <h3 className="card-title">Time per question {!isPro && <ProTag />}</h3>
            {!isPro ? (
              <p className="muted">See how long you spent on each question and which ones slowed you down. <Link href="/pricing">Go Pro</Link></p>
            ) : timed.length === 0 ? (
              <p className="muted">Timing is recorded from your next test.</p>
            ) : (
              <>
                <p className="muted">Average {avgSecs}s per question. Slowest:</p>
                {slowest.map((r) => (
                  <div key={r.q.id} className="weak-row"><span>Q{r.n} · {group.label(r.q.week ?? 0)}</span><b>{r.secs}s</b></div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="card row-main">
          <div className="flex-between">
            <h3>Answer review</h3>
            <LanguageSwitch />
            <div className="filters">
              <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All {rows.length}</button>
              <button className={filter === 'wrong' ? 'on' : ''} onClick={() => setFilter('wrong')}>Wrong {wrong.length}</button>
              <button className={filter === 'skipped' ? 'on' : ''} onClick={() => setFilter('skipped')}>Skipped {skipped.length}</button>
            </div>
          </div>
          {shown.length === 0 && <div className="empty">No questions match this filter.</div>}
          {shown.map(({ q, pick, n, secs }) => {
            const status = pick === null ? 'SKIPPED' : pick === q.answer ? 'CORRECT' : 'WRONG';
            return (
              <div key={q.id} className="review">
                <div className="review-head">
                  <strong>Q{n} · <InlineText text={q.question} /></strong>
                  <span className="review-tags">
                    {isPro && secs !== undefined && <span className="chip chip-gray">⏱ {secs}s</span>}
                    <span className={`chip ${status === 'CORRECT' ? 'chip-teal' : status === 'WRONG' ? 'chip-red' : 'chip-gray'}`}>{status}</span>
                  </span>
                </div>
                {q.code && <pre className="code-block">{q.code}</pre>}
                <div className="muted mt-sm">
                  Your answer: <b className={status === 'CORRECT' ? 'tone-good' : 'tone-poor'}>{pick === null ? '—' : `${letter(pick)}. ${q.options[pick]}`}</b>
                  {status !== 'CORRECT' && <> · Correct: <b className="tone-good">{letter(q.answer)}. {q.options[q.answer]}</b></>}
                </div>
                <Explanation question={q} selected={pick} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
