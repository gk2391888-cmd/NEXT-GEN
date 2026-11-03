'use client';

import Link from 'next/link';
import { progress, useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent, score, weakWeeks } from '@/lib/progress/insights';
import type { Subject, WeekRef } from '@/lib/types';
import { accuracyTone, ProgressBar, SubjectIcon, subjectColor } from '@/components/ui';
import { useAuth } from '@/components/auth/auth-provider';
import { useConfirm } from '@/components/confirm-dialog';

type Props = { subjects: Subject[]; catalog: Record<string, WeekRef[]>; testTitles: Record<string, string> };

export function ProgressView({ subjects, catalog, testTitles }: Props) {
  const state = useProgress();
  const { user } = useAuth();
  const { confirm, dialog } = useConfirm();
  const totals = score(state.answers);
  const weak = weakWeeks(state.answers);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const titleOf = (subjectId: string, week: number) => catalog[subjectId]?.find((w) => w.week === week)?.title ?? '';
  const saved = Object.entries(state.weeks)
    .filter(([, w]) => w.saved)
    .map(([key]) => {
      const [subjectId, week] = key.split(':');
      return { subjectId, week: Number(week) };
    });

  async function reset() {
    const where = user ? 'your account, on all your devices' : 'this browser';
    const ok = await confirm({
      title: 'Reset all your progress?',
      message: `This permanently deletes your answers, mock tests and completed weeks from ${where}. It can’t be undone.`,
      confirmLabel: 'Reset progress',
      tone: 'danger',
    });
    if (ok) progress.reset();
  }

  return (
    <>
      <div className="grid grid-4">
        <div className="metric"><strong>{totals.attempted}</strong><small>Questions attempted</small></div>
        <div className="metric"><strong>{totals.correct}</strong><small>Correct answers</small></div>
        <div className="metric"><strong className={totals.attempted ? accuracyTone(totals.accuracy) : undefined}>{totals.accuracy}%</strong><small>Overall accuracy</small></div>
        <div className="metric"><strong>{state.tests.length}</strong><small>Mock tests taken</small></div>
      </div>

      <div className="grid grid-2 stack-laptop mt-lg">
        <section className="card">
          <h3 className="card-title">Subject performance</h3>
          <div className="table-scroll">
            <table className="table table-stack">
              <thead><tr><th>Subject</th><th>Weeks done</th><th>Answered</th><th>Accuracy</th></tr></thead>
              <tbody>
                {subjects.map((s) => {
                  const weeks = catalog[s.id] ?? [];
                  const done = weeks.filter((w) => state.weeks[weekKey(s.id, w.week)]?.done).length;
                  const sc = score(state.answers.filter((a) => a.subjectId === s.id));
                  return (
                    <tr key={s.id}>
                      <td><div className="subject-row"><SubjectIcon subject={s} size="sm" /><strong>{s.short}</strong></div></td>
                      <td className="cell-grow">
                        <div className="muted">{done}/{weeks.length}<span className="show-phone"> weeks done</span></div>
                        <ProgressBar value={percent(done, weeks.length)} color={subjectColor(s.id)} />
                      </td>
                      <td data-label="Answered">{sc.attempted}</td>
                      <td>{sc.attempted ? <strong className={accuracyTone(sc.accuracy)}>{sc.accuracy}%</strong> : <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3 className="mb-xs">Weak weeks to revise</h3>
          <p className="muted mb-sm">Weeks with at least 3 answers and accuracy below 60%.</p>
          {weak.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">◇</div>
              {totals.attempted ? 'No weak weeks right now. Great work!' : 'Practise or take a mock test, and your weak weeks will appear here.'}
            </div>
          ) : (
            weak.map((w) => (
              <div key={`${w.subjectId}:${w.week}`} className="weak-row">
                <div>
                  <strong>{subjectById.get(w.subjectId)?.short} · Week {w.week}</strong>
                  <div className="muted">{titleOf(w.subjectId, w.week)} · {w.correct}/{w.attempted} correct</div>
                </div>
                <div className="btn-group">
                  <span className="chip chip-red">{w.accuracy}%</span>
                  <Link className="btn btn-secondary" href={`/library/${w.subjectId}/${w.week}`}>Notes</Link>
                  <Link className="btn btn-secondary" href={`/practice/${w.subjectId}/${w.week}`}>Practice</Link>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="grid grid-2 mt-lg">
        <section className="card">
          <h3 className="card-title">Mock test history</h3>
          {state.tests.length === 0 ? (
            <div className="empty"><div className="empty-icon">◷</div>You haven’t taken a mock test yet. <Link href="/tests">Start one →</Link></div>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Test</th><th>Date</th><th>Score</th></tr></thead>
                <tbody>
                  {[...state.tests].reverse().slice(0, 15).map((t) => (
                    <tr key={t.id}>
                      <td><Link href={`/tests/${t.subjectId}/${t.testId}`}>{subjectById.get(t.subjectId)?.short} · {testTitles[t.testId] ?? t.testId}</Link></td>
                      <td className="muted">{new Date(t.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td><strong className={accuracyTone(percent(t.correct, t.total))}>{t.correct}/{t.total}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h3 className="card-title">Saved for revision</h3>
          {saved.length === 0 ? (
            <div className="empty"><div className="empty-icon">☆</div>Select “Revise later” on any notes page to save the week here.</div>
          ) : (
            saved.map((s) => (
              <div key={`${s.subjectId}:${s.week}`} className="weak-row">
                <div>
                  <strong>{subjectById.get(s.subjectId)?.short} · Week {s.week}</strong>
                  <div className="muted">{titleOf(s.subjectId, s.week)}</div>
                </div>
                <Link className="btn btn-secondary" href={`/library/${s.subjectId}/${s.week}`}>Open</Link>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="alert mt-lg">
        {user ? (
          <>Your progress is saved to your account and is visible only to you. Log in on any device to continue.</>
        ) : (
          <>Your progress is currently saved only in this browser and will be lost if you clear browser data. <Link href="/login?next=/progress">Log in</Link> to save it across devices.</>
        )}
      </div>
      <button className="btn btn-danger mt-md" onClick={reset}>Reset my progress</button>
      {dialog}
    </>
  );
}
