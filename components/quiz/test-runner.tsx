'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { percent } from '@/lib/progress/insights';
import type { ActiveTest, NewAnswer, TestAttempt } from '@/lib/progress/types';
import { pickQuestions, testKey, type MockTest } from '@/lib/tests';
import type { Question, Subject } from '@/lib/types';
import { accuracyColor, InlineText, ProgressBar } from '@/components/ui';
import { Explanation, letter, QuestionView } from './question-view';

type Props = { subject: Subject; test: MockTest; pool: Question[]; weekTitles: Record<number, string> };

export function TestRunner({ subject, test, pool, weekTitles }: Props) {
  const state = useProgress();
  const key = testKey(subject.id, test.id);
  const active = state.active[key];
  const byId = useMemo(() => new Map(pool.map((q) => [q.id, q])), [pool]);
  const attempts = state.tests.filter((a) => a.subjectId === subject.id && a.testId === test.id);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = viewingId ? attempts.find((a) => a.id === viewingId) : undefined;

  function start() {
    const questions = pickQuestions(pool, test.questionCount);
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
    return <RunningTest key={active.startedAt} active={active} storeKey={key} test={test} subject={subject} byId={byId} onSubmitted={setViewingId} />;
  }

  if (viewing) {
    return <TestResult attempt={viewing} byId={byId} weekTitles={weekTitles} subject={subject} onRetake={start} />;
  }

  return (
    <div className="quiz-wrap stack">
      <div className="card" style={{ padding: '24px 26px' }}>
        <span className="chip chip-blue">{subject.short.toUpperCase()} · WEEKS {test.fromWeek}–{test.toWeek}</span>
        <h1 style={{ margin: '12px 0 6px' }}>{test.title}</h1>
        <p>{subject.name} · {test.questionCount} questions · {test.minutes} minutes</p>
        <ul style={{ margin: '16px 0' }}>
          <li>The timer starts as soon as you begin. The test is submitted automatically when time runs out.</li>
          <li>Use the question palette to jump to any question, and <strong>Mark for review</strong> anything you want to revisit.</li>
          <li>Each correct answer scores 1 mark. Wrong or skipped answers score 0; there is no negative marking.</li>
          <li>If the page is refreshed or closed, the test resumes where you left off.</li>
        </ul>
        <button className="btn btn-primary" onClick={start}>Start test →</button>
      </div>

      {attempts.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Your previous attempts</h3>
          <table className="table">
            <thead><tr><th>Date</th><th>Score</th><th>Time</th><th /></tr></thead>
            <tbody>
              {[...attempts].reverse().map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><strong style={{ color: accuracyColor(percent(a.correct, a.total)) }}>{a.correct}/{a.total}</strong></td>
                  <td>{formatClock(a.durationSec)}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-secondary" onClick={() => setViewingId(a.id)}>View result</button></td>
                </tr>
              ))}
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
  onSubmitted: (attemptId: string) => void;
};

function RunningTest({ active, storeKey, test, subject, byId, onSubmitted }: RunningProps) {
  const [remaining, setRemaining] = useState(() => active.endsAt - Date.now());
  const submitted = useRef(false);
  const questions = active.questionIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  const current = Math.min(active.current, questions.length - 1);
  const question = questions[current];

  const save = (patch: Partial<ActiveTest>) => progress.saveActiveTest(storeKey, { ...active, ...patch });

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
    };
    // Skipped questions don't count towards weak-topic detection; only answered ones do.
    const answers: NewAnswer[] = qs.flatMap((q, i) =>
      q && active.responses[i] !== null
        ? [{ questionId: q.id, subjectId: active.subjectId, week: q.week ?? 0, correct: active.responses[i] === q.answer, mode: 'test' as const, at: submittedAt }]
        : [],
    );
    onSubmitted(attempt.id);
    progress.submitTest(storeKey, attempt, answers);
  }, [active, byId, onSubmitted, storeKey]);

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

  function confirmSubmit() {
    const unanswered = questions.length - answered;
    const message = unanswered
      ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
      : 'Submit the test? You can’t change your answers after submitting.';
    if (window.confirm(message)) submit();
  }

  if (!question) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div className="kicker" style={{ marginBottom: 2 }}>Mock test · {subject.short}</div>
          <h2>{test.title} · Weeks {test.fromWeek}–{test.toWeek}</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="card" style={{ padding: '6px 16px', textAlign: 'center' }} aria-live="off">
            <div className="muted" style={{ fontSize: 10.5, letterSpacing: 1 }}>TIME LEFT</div>
            <div className={`timer${remaining < 5 * 60_000 ? ' low' : ''}`}>{formatClock(Math.max(0, Math.ceil(remaining / 1000)))}</div>
          </div>
          <button className="btn btn-danger" onClick={confirmSubmit}>Submit test</button>
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 1, minWidth: 0, padding: '22px 24px' }}>
          <div className="quiz-top">
            <span className="chip chip-blue">QUESTION {current + 1} OF {questions.length}</span>
            <span className="muted">1 mark · Week {question.week}</span>
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
            <span><i style={{ background: '#9fe3d7' }} />Answered {answered}</span>
            <span><i style={{ background: '#f6d39a' }} />Review {markedCount}</span>
            <span><i style={{ background: '#e4eaf2' }} />Left {questions.length - answered}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- Result ---------------- */

type ResultProps = { attempt: TestAttempt; byId: Map<string, Question>; weekTitles: Record<number, string>; subject: Subject; onRetake: () => void };
type Filter = 'all' | 'wrong' | 'skipped';

function TestResult({ attempt, byId, weekTitles, subject, onRetake }: ResultProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const rows = attempt.questionIds
    .map((id, i) => ({ q: byId.get(id), pick: attempt.responses[i], n: i + 1 }))
    .filter((r): r is { q: Question; pick: number | null; n: number } => Boolean(r.q));

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

  const shown = filter === 'wrong' ? wrong : filter === 'skipped' ? skipped : rows;

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="stat"><strong>{attempt.correct} / {attempt.total}</strong><span className="muted">Score</span></div>
        <div className="stat"><strong style={{ color: accuracyColor(accuracy) }}>{accuracy}%</strong><span className="muted">Accuracy</span></div>
        <div className="stat"><strong>{formatClock(attempt.durationSec)}</strong><span className="muted">Time taken</span></div>
        <div className="stat">
          <strong style={{ color: weakest && percent(weakest[1].right, weakest[1].total) < 75 ? 'var(--red)' : 'var(--green)' }}>
            {weakest && percent(weakest[1].right, weakest[1].total) < 75 ? `Week ${weakest[0]}` : 'None'}
          </strong>
          <span className="muted">Weakest topic</span>
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="card test-side">
          <h3 style={{ marginBottom: 12 }}>Week-wise performance</h3>
          {weeks.map(([w, s]) => (
            <div key={w} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                <span>Week {w} · {weekTitles[w]}</span><b>{s.right}/{s.total}</b>
              </div>
              <ProgressBar value={percent(s.right, s.total)} color={accuracyColor(percent(s.right, s.total))} />
            </div>
          ))}
          <div className="stack" style={{ marginTop: 16 }}>
            {weakest && percent(weakest[1].right, weakest[1].total) < 75 && (
              <Link className="btn btn-primary btn-block" href={`/library/${subject.id}/${weakest[0]}`}>Revise week {weakest[0]} notes →</Link>
            )}
            <button className="btn btn-secondary btn-block" onClick={onRetake}>Take a new test</button>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3>Answer review</h3>
            <div className="filters">
              <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All {rows.length}</button>
              <button className={filter === 'wrong' ? 'on' : ''} onClick={() => setFilter('wrong')}>Wrong {wrong.length}</button>
              <button className={filter === 'skipped' ? 'on' : ''} onClick={() => setFilter('skipped')}>Skipped {skipped.length}</button>
            </div>
          </div>
          {shown.length === 0 && <div className="empty">No questions match this filter.</div>}
          {shown.map(({ q, pick, n }) => {
            const status = pick === null ? 'SKIPPED' : pick === q.answer ? 'CORRECT' : 'WRONG';
            return (
              <div key={q.id} className="review">
                <div className="review-head">
                  <strong style={{ fontSize: 13.5 }}>Q{n} · <InlineText text={q.question} /></strong>
                  <span className={`chip ${status === 'CORRECT' ? 'chip-teal' : status === 'WRONG' ? 'chip-red' : 'chip-gray'}`}>{status}</span>
                </div>
                {q.code && <pre className="code-block">{q.code}</pre>}
                <div className="muted" style={{ marginTop: 6 }}>
                  Your answer: <b style={{ color: status === 'CORRECT' ? 'var(--green)' : 'var(--red)' }}>{pick === null ? '—' : `${letter(pick)}. ${q.options[pick]}`}</b>
                  {status !== 'CORRECT' && <> · Correct: <b style={{ color: 'var(--green)' }}>{letter(q.answer)}. {q.options[q.answer]}</b></>}
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

function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
