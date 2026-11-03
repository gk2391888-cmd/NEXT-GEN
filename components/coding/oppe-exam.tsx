'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CodingProblem, ProblemAnswers } from '@/lib/coding';
import { examScore, problemShare, type OppeSet } from '@/lib/coding-score';
import { runPython, warmUpPython, type RunResult } from '@/lib/python-runner';
import { progress, useProgress } from '@/lib/progress/store';
import type { ActiveExam, CodingAttempt, CodingProblemResult } from '@/lib/progress/types';
import { accuracyTone, formatClock, InlineText } from '@/components/ui';
import { useConfirm } from '@/components/confirm-dialog';

/**
 * `problems` come from /api/pro/oppe/<set> without hidden tests or solutions (blank placeholders
 * keep the counts right). `loadAnswers` fetches them, by problem id, only on Submit and for the report.
 */
type Props = { set: OppeSet; problems: CodingProblem[]; loadAnswers: () => Promise<Record<string, ProblemAnswers>> };
type GetAnswers = () => Promise<Record<string, ProblemAnswers>>;

/* The exam's code lives in its own keys, apart from the practice drafts, so an exam starts from the starter code. */
const codeKey = (setId: string, problemId: string) => `nextgen-oppe-code:${setId}:${problemId}`;

function readCode(setId: string, p: CodingProblem) {
  try {
    return window.localStorage.getItem(codeKey(setId, p.id)) ?? p.starter;
  } catch {
    return p.starter;
  }
}

function writeCode(setId: string, problemId: string, code: string) {
  try {
    window.localStorage.setItem(codeKey(setId, problemId), code);
  } catch {
    // Code just won't survive a reload.
  }
}

function clearCode(setId: string, problems: CodingProblem[]) {
  try {
    problems.forEach((p) => window.localStorage.removeItem(codeKey(setId, p.id)));
  } catch {
    // Nothing saved to clear.
  }
}

const formatDate = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const solvedCount = (a: CodingAttempt) => a.problems.filter((r) => problemShare(r) === 1).length;

export function OppeExam({ set, problems, loadAnswers }: Props) {
  const state = useProgress();
  // Fetched once, then reused by grading and every report.
  const answersRef = useRef<Promise<Record<string, ProblemAnswers>> | null>(null);
  const getAnswers = useCallback<GetAnswers>(() => {
    answersRef.current ??= loadAnswers().catch((e) => {
      answersRef.current = null;
      throw e;
    });
    return answersRef.current;
  }, [loadAnswers]);
  const active = state.activeExams?.[set.id];
  const attempts = (state.codingAttempts ?? []).filter((a) => a.setId === set.id);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = viewingId ? attempts.find((a) => a.id === viewingId) : undefined;

  // Download Python while the student reads the rules, so the timer doesn't start on a loading screen.
  useEffect(() => {
    warmUpPython().catch(() => undefined);
  }, []);

  function start() {
    clearCode(set.id, problems);
    const now = Date.now();
    progress.saveActiveExam({
      setId: set.id,
      problemIds: problems.map((p) => p.id),
      current: 0,
      startedAt: now,
      endsAt: now + set.minutes * 60_000,
      timeSpent: problems.map(() => 0),
    });
    setViewingId(null);
  }

  if (active) {
    return <RunningExam key={active.startedAt} active={active} set={set} problems={problems} getAnswers={getAnswers} onSubmitted={setViewingId} />;
  }

  if (viewing) {
    return <ExamReport attempt={viewing} set={set} problems={problems} getAnswers={getAnswers} onRetry={start} onBack={() => setViewingId(null)} />;
  }

  const hidden = problems.reduce((n, p) => n + p.tests.filter((t) => t.hidden).length, 0);

  return (
    <div className="quiz-wrap stack">
      <div className="card card-loose">
        <span className="chip chip-blue">OPPE SIMULATION · PYTHON</span>
        <h1 className="mt-md mb-sm">{set.title}</h1>
        <p>{problems.length} problems · {set.minutes} minutes · {hidden} hidden tests</p>
        <ul className="my-lg">
          <li>The timer starts as soon as you begin. Everything is submitted automatically when time runs out.</li>
          <li><strong>Run</strong> checks your code against the public tests only. Hidden tests are checked once, when you submit.</li>
          <li>Each problem carries {Math.round(100 / Math.max(1, problems.length))} marks, split by the share of its tests (public and hidden) that pass.</li>
          <li>No hints or model solutions during the exam. You’ll see them in the score report.</li>
          <li>If the page is refreshed or closed, the exam resumes where you left off, with your code saved on this device.</li>
        </ul>
        <button className="btn btn-primary" onClick={start}>Start exam →</button>
      </div>

      {attempts.length > 0 && (
        <div className="card">
          <h3 className="card-title">Your previous attempts</h3>
          <table className="table table-stack">
            <thead><tr><th>Date</th><th>Score</th><th>Solved</th><th>Time</th><th /></tr></thead>
            <tbody>
              {[...attempts].reverse().map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.submittedAt)}</td>
                  <td data-label="Score:"><strong className={accuracyTone(a.score)}>{a.score}/100</strong></td>
                  <td data-label="Solved:">{solvedCount(a)}/{a.problems.length}</td>
                  <td data-label="Time:">{formatClock(a.durationSec)}</td>
                  <td className="text-right"><button className="btn btn-secondary" onClick={() => setViewingId(a.id)}>View report</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Running exam ---------------- */

type RunningProps = { active: ActiveExam; set: OppeSet; problems: CodingProblem[]; getAnswers: GetAnswers; onSubmitted: (attemptId: string) => void };

function RunningExam({ active, set, problems, getAnswers, onSubmitted }: RunningProps) {
  const list = useMemo(() => {
    const byId = new Map(problems.map((p) => [p.id, p]));
    return active.problemIds.map((id) => byId.get(id)).filter((p): p is CodingProblem => Boolean(p));
  }, [active.problemIds, problems]);
  const current = Math.min(active.current, list.length - 1);
  const problem = list[current];

  const [codes, setCodes] = useState(() => list.map((p) => readCode(set.id, p)));
  const [outputs, setOutputs] = useState<(RunResult | null)[]>(() => list.map(() => null));
  const [pythonState, setPythonState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [running, setRunning] = useState(false);
  const [grading, setGrading] = useState<{ done: number } | null>(null);
  const [gradeError, setGradeError] = useState(false);
  const [remaining, setRemaining] = useState(() => active.endsAt - Date.now());
  const submitted = useRef(false);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    warmUpPython().then(() => setPythonState('ready')).catch(() => setPythonState('failed'));
  }, []);

  // Time on the current problem is added when the student moves away from it or submits.
  const enteredAt = useRef(Date.now());
  useEffect(() => {
    enteredAt.current = Date.now();
  }, [current]);
  const withElapsed = useCallback(() => {
    const spent = active.problemIds.map((_, i) => active.timeSpent[i] ?? 0);
    // Never negative: an exam reopened after its end time adds nothing.
    spent[current] += Math.max(0, Math.round((Math.min(Date.now(), active.endsAt) - enteredAt.current) / 1000));
    return spent;
  }, [active, current]);

  const goTo = (i: number) => {
    if (i === current) return;
    progress.saveActiveExam({ ...active, current: i, timeSpent: withElapsed() });
  };

  function update(value: string) {
    setCodes((c) => c.map((x, j) => (j === current ? value : x)));
    writeCode(set.id, problem.id, value);
  }

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setGradeError(false);
    setGrading({ done: 0 });
    const timeSpent = withElapsed();
    const results: CodingProblemResult[] = [];
    try {
      const answers = await getAnswers();
      for (const [i, p] of list.entries()) {
        const tests = answers[p.id]?.tests ?? p.tests;
        const run = await runPython(codes[i], tests);
        const passed = (hidden: boolean) => tests.filter((t, j) => t.hidden === hidden && run.results[j]?.pass && !run.error).length;
        results.push({
          problemId: p.id,
          publicPassed: passed(false),
          publicTotal: tests.filter((t) => !t.hidden).length,
          hiddenPassed: passed(true),
          hiddenTotal: tests.filter((t) => t.hidden).length,
          timeSec: timeSpent[i] ?? 0,
          code: codes[i],
        });
        setGrading({ done: i + 1 });
      }
    } catch {
      // Python or the hidden tests couldn't load (usually offline). Keep the exam open so nothing is lost; grading can be retried.
      submitted.current = false;
      setGrading(null);
      setGradeError(true);
      return;
    }
    const now = Date.now();
    const attempt: CodingAttempt = {
      id: now.toString(36),
      setId: set.id,
      startedAt: new Date(active.startedAt).toISOString(),
      submittedAt: new Date(now).toISOString(),
      durationSec: Math.round((Math.min(now, active.endsAt) - active.startedAt) / 1000),
      score: examScore(results),
      problems: results,
    };
    results.forEach((r) => problemShare(r) === 1 && progress.markSolved(r.problemId));
    clearCode(set.id, list);
    onSubmitted(attempt.id);
    progress.submitCodingExam(attempt);
  }, [active, codes, getAnswers, list, onSubmitted, set.id, withElapsed]);

  useEffect(() => {
    const tick = () => {
      const left = active.endsAt - Date.now();
      setRemaining(left);
      // After a failed grading attempt, wait for the student to retry instead of retrying every second.
      if (left <= 0 && !gradeError) submit();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active.endsAt, gradeError, submit]);

  async function run() {
    const i = current;
    setRunning(true);
    const result = await runPython(codes[i], problem.tests.filter((t) => !t.hidden)).catch(
      (): RunResult => ({ stdout: '', error: 'Python couldn’t load. Check your connection; your code is saved.', results: [] }),
    );
    setOutputs((o) => o.map((x, j) => (j === i ? result : x)));
    setRunning(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const code = codes[current];
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = el;
      update(code.slice(0, s) + '    ' + code.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!running && pythonState === 'ready') run();
    }
  }

  const touched = list.map((p, i) => codes[i] !== p.starter);
  const attempted = touched.filter(Boolean).length;

  async function confirmSubmit() {
    const left = list.length - attempted;
    const ok = await confirm({
      title: 'Submit all problems?',
      message: `${left ? `You haven’t started ${left} problem${left > 1 ? 's' : ''}. ` : ''}Every problem is graded against its hidden tests, and you can’t change your code after submitting.`,
      confirmLabel: 'Submit all',
      cancelLabel: 'Keep coding',
    });
    if (ok) submit();
  }

  if (grading) {
    return (
      <div className="quiz-wrap">
        <div className="card card-loose text-center" aria-live="polite">
          <div className="kicker mb-xs">{set.title}</div>
          <h2 className="mb-sm">Grading your code…</h2>
          <p className="muted">Checked {grading.done} of {list.length} problems against all their tests. Please keep this page open.</p>
        </div>
      </div>
    );
  }

  if (!problem) return null;
  const output = outputs[current];
  const publicTests = problem.tests.filter((t) => !t.hidden);
  const hiddenCount = problem.tests.length - publicTests.length;

  return (
    <div>
      <div className="test-header">
        <div>
          <div className="kicker mb-xs">OPPE simulation · Coding Lab</div>
          <h2>{set.title}</h2>
        </div>
        <div className="flex gap-md items-center">
          <div className="card timer-box" aria-live="off">
            <div className="timer-label">TIME LEFT</div>
            <div className={`timer${remaining < 5 * 60_000 ? ' low' : ''}`}>{formatClock(Math.max(0, Math.ceil(remaining / 1000)))}</div>
          </div>
          <button className="btn btn-danger" onClick={confirmSubmit}>Submit all</button>
        </div>
      </div>

      {gradeError && (
        <div className="explain bad mb-lg" role="alert">
          <strong>Python or the hidden tests couldn’t load, so your code wasn’t graded yet.</strong> Your code is saved on this device. Check your connection, then{' '}
          <button className="text-btn" onClick={submit}>try grading again</button>.
        </div>
      )}

      <div className="row">
        <div className="card row-main">
          <div className="quiz-top">
            <span className="chip chip-blue">PROBLEM {current + 1} OF {list.length}</span>
            <span className="muted">{Math.round(100 / list.length)} marks · {publicTests.length} public + {hiddenCount} hidden tests</span>
          </div>
          <h2 className="mb-sm">{problem.title}</h2>
          <p className="text-body"><InlineText text={problem.statement} /></p>

          <div className="editor-wrap">
            <textarea
              className="code-editor"
              value={codes[current]}
              onChange={(e) => update(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label={`Your Python code for ${problem.title}`}
              rows={Math.max(10, codes[current].split('\n').length + 2)}
            />
          </div>

          <div className="quiz-actions">
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={run} disabled={running || pythonState !== 'ready'}>
                {running ? 'Running…' : '▶ Run public tests'}
              </button>
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" disabled={current === 0} onClick={() => goTo(current - 1)}>← Previous</button>
              {current < list.length - 1 ? (
                <button className="btn btn-primary" onClick={() => goTo(current + 1)}>Next problem →</button>
              ) : (
                <button className="btn btn-primary" onClick={confirmSubmit}>Finish exam</button>
              )}
            </div>
          </div>
          <p className="muted mt-sm">
            {pythonState === 'loading' && 'Loading Python… (first time takes a few seconds)'}
            {pythonState === 'failed' && 'Python couldn’t load. Check your connection and refresh the page; your code is saved.'}
            {pythonState === 'ready' && 'Tip: Ctrl + Enter runs your code. Your code is saved on this device as you type.'}
          </p>

          {output && (
            <div className="mt-lg">
              <span className="field-label">Output</span>
              {output.stdout && <pre className="code-block">{output.stdout}</pre>}
              {output.error ? (
                <pre className="code-block error-block">{output.error}</pre>
              ) : (
                !output.stdout && output.results.length === 0 && <p className="muted">Your code ran without printing anything.</p>
              )}
            </div>
          )}
        </div>

        <aside className="card test-side">
          <h3>Problems</h3>
          <div className="palette">
            {list.map((p, i) => (
              <button
                key={p.id}
                className={i === current ? 'current' : touched[i] ? 'answered' : ''}
                onClick={() => goTo(i)}
                aria-label={`Problem ${i + 1}: ${p.title}`}
                aria-current={i === current ? 'step' : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="legend">
            <span><i className="answered" />Started {attempted}</span>
            <span><i />Not started {list.length - attempted}</span>
          </div>

          <h3 className="mt-lg">Public tests</h3>
          {publicTests.map((t, i) => {
            const r = output && !output.error ? output.results[i] : undefined;
            return (
              <div key={i} className="test-row">
                <code className="test-call">{t.call}</code>
                {r ? <span className={`chip ${r.pass ? 'chip-teal' : 'chip-red'}`}>{r.pass ? 'PASS' : 'FAIL'}</span> : <span className="muted">→ {t.expected}</span>}
                {r && !r.pass && <div className="test-detail">Expected {t.expected}, got {r.got ?? r.error}</div>}
              </div>
            );
          })}
          <p className="muted mt-sm">+ {hiddenCount} hidden test{hiddenCount === 1 ? '' : 's'}, checked when you submit.</p>
        </aside>
      </div>
      {dialog}
    </div>
  );
}

/* ---------------- Score report ---------------- */

type ReportProps = { attempt: CodingAttempt; set: OppeSet; problems: CodingProblem[]; getAnswers: GetAnswers; onRetry: () => void; onBack: () => void };

function ExamReport({ attempt, set, problems, getAnswers, onRetry, onBack }: ReportProps) {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const [answers, setAnswers] = useState<Record<string, ProblemAnswers> | null>(null);
  const [answersFailed, setAnswersFailed] = useState(false);
  useEffect(() => {
    getAnswers().then(setAnswers).catch(() => setAnswersFailed(true));
  }, [getAnswers]);
  const marksEach = 100 / Math.max(1, attempt.problems.length);
  const sum = (key: 'publicPassed' | 'publicTotal' | 'hiddenPassed' | 'hiddenTotal') => attempt.problems.reduce((n, r) => n + r[key], 0);
  const marks = (share: number) => {
    const m = share * marksEach;
    return Number.isInteger(m) ? String(m) : m.toFixed(1);
  };

  return (
    <div>
      <div className="test-header">
        <div>
          <div className="kicker mb-xs">OPPE simulation · Score report</div>
          <h2>{set.title}</h2>
          <p className="muted">Submitted {formatDate(attempt.submittedAt)}</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={onRetry}>Retry this set</button>
          <button className="btn btn-secondary" onClick={onBack}>All attempts</button>
        </div>
      </div>

      <div className="grid grid-4 mb-lg">
        <div className="stat"><strong className={accuracyTone(attempt.score)}>{attempt.score} / 100</strong><span className="muted">Score</span></div>
        <div className="stat"><strong>{solvedCount(attempt)} / {attempt.problems.length}</strong><span className="muted">Problems fully solved</span></div>
        <div className="stat"><strong>{sum('hiddenPassed')} / {sum('hiddenTotal')}</strong><span className="muted">Hidden tests passed ({sum('publicPassed')}/{sum('publicTotal')} public)</span></div>
        <div className="stat"><strong>{formatClock(attempt.durationSec)}</strong><span className="muted">Time taken (of {set.minutes} min)</span></div>
      </div>

      <div className="card mb-lg">
        <h3 className="card-title">Problem-wise results</h3>
        <div className="table-scroll">
          <table className="table table-stack">
            <thead><tr><th>Problem</th><th>Public tests</th><th>Hidden tests</th><th>Time spent</th><th>Marks</th></tr></thead>
            <tbody>
              {attempt.problems.map((r, i) => {
                const share = problemShare(r);
                return (
                  <tr key={r.problemId}>
                    <td><strong>{i + 1}. {byId.get(r.problemId)?.title ?? r.problemId}</strong></td>
                    <td data-label="Public:"><span className={r.publicPassed === r.publicTotal ? 'tone-good' : 'tone-poor'}>{r.publicPassed}/{r.publicTotal}</span></td>
                    <td data-label="Hidden:"><span className={r.hiddenPassed === r.hiddenTotal ? 'tone-good' : 'tone-poor'}>{r.hiddenPassed}/{r.hiddenTotal}</span></td>
                    <td data-label="Time:">{formatClock(r.timeSec)}</td>
                    <td data-label="Marks:"><strong className={accuracyTone(Math.round(share * 100))}>{marks(share)}/{marks(1)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Review your code</h3>
        {attempt.problems.map((r, i) => {
          const p = byId.get(r.problemId);
          const share = problemShare(r);
          const status = share === 1 ? 'SOLVED' : share > 0 ? 'PARTIAL' : 'NOT SOLVED';
          return (
            <div key={r.problemId} className="review">
              <div className="review-head">
                <strong>{i + 1}. {p?.title ?? r.problemId}</strong>
                <span className="review-tags">
                  <span className="chip chip-gray">⏱ {formatClock(r.timeSec)}</span>
                  <span className={`chip ${status === 'SOLVED' ? 'chip-teal' : status === 'PARTIAL' ? 'chip-yellow' : 'chip-red'}`}>{status}</span>
                </span>
              </div>
              {r.hiddenPassed < r.hiddenTotal && r.publicPassed === r.publicTotal && (
                <p className="muted mt-sm">All public tests passed but some hidden ones failed: check edge cases like empty input, a single item, or ties.</p>
              )}
              <details className="solution">
                <summary>Your code</summary>
                <pre className="code-block">{r.code}</pre>
              </details>
              {p && (
                <details className="solution">
                  <summary>Model solution</summary>
                  {answers?.[p.id] ? (
                    <pre className="code-block">{answers[p.id].solution}</pre>
                  ) : (
                    <p className="muted">{answersFailed ? 'Couldn’t load the solution. Check your connection and reopen this report.' : 'Loading the solution…'}</p>
                  )}
                  <p className="muted"><strong>Hint:</strong> <InlineText text={p.hint} /></p>
                </details>
              )}
              {p && <div className="mt-sm"><Link className="link" href={`/lab/${p.id}`}>Practise this problem →</Link></div>}
            </div>
          );
        })}
        <div className="notes-foot">
          <Link className="link" href="/lab">← Back to Coding Lab</Link>
          <button className="text-btn" onClick={onRetry}>Retry {set.title} →</button>
        </div>
      </div>
    </div>
  );
}
