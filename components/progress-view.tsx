'use client';

import Link from 'next/link';
import { progress, useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent, score, weakWeeks } from '@/lib/progress/insights';
import type { Subject, WeekRef } from '@/lib/types';
import { accuracyColor, ProgressBar, SubjectIcon } from '@/components/ui';
import { useAuth } from '@/components/auth/auth-provider';

type Props = { subjects: Subject[]; catalog: Record<string, WeekRef[]>; testTitles: Record<string, string> };

export function ProgressView({ subjects, catalog, testTitles }: Props) {
  const state = useProgress();
  const { user } = useAuth();
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

  function reset() {
    const where = user ? 'your account (on all devices)' : 'this browser';
    if (window.confirm(`This will permanently delete all progress (answers, tests and completed weeks) from ${where}. This can’t be undone. Continue?`)) {
      progress.reset();
    }
  }

  return (
    <>
      <div className="grid grid-4">
        <div className="metric"><strong>{totals.attempted}</strong><small>Questions attempted</small></div>
        <div className="metric"><strong>{totals.correct}</strong><small>Correct answers</small></div>
        <div className="metric"><strong style={{ color: totals.attempted ? accuracyColor(totals.accuracy) : undefined }}>{totals.accuracy}%</strong><small>Overall accuracy</small></div>
        <div className="metric"><strong>{state.tests.length}</strong><small>Mock tests taken</small></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Subject performance</h3>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Subject</th><th>Weeks done</th><th>Answered</th><th>Accuracy</th></tr></thead>
              <tbody>
                {subjects.map((s) => {
                  const weeks = catalog[s.id] ?? [];
                  const done = weeks.filter((w) => state.weeks[weekKey(s.id, w.week)]?.done).length;
                  const sc = score(state.answers.filter((a) => a.subjectId === s.id));
                  return (
                    <tr key={s.id}>
                      <td><div className="subject-row" style={{ gap: 10 }}><SubjectIcon subject={s} size={28} /><strong>{s.short}</strong></div></td>
                      <td style={{ minWidth: 110 }}>
                        <div className="muted">{done}/{weeks.length}</div>
                        <ProgressBar value={percent(done, weeks.length)} color={s.color} />
                      </td>
                      <td>{sc.attempted}</td>
                      <td>{sc.attempted ? <strong style={{ color: accuracyColor(sc.accuracy) }}>{sc.accuracy}%</strong> : <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 6 }}>Weak weeks to revise</h3>
          <p className="muted" style={{ marginBottom: 8 }}>Weeks with at least 3 answers and accuracy below 60%.</p>
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

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Mock test history</h3>
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
                      <td><strong style={{ color: accuracyColor(percent(t.correct, t.total)) }}>{t.correct}/{t.total}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Saved for revision</h3>
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

      <div className="alert" style={{ marginTop: 16 }}>
        {user ? (
          <>Your progress is saved to your account and is visible only to you. Log in on any device to continue.</>
        ) : (
          <>Your progress is currently saved only in this browser and will be lost if you clear browser data. <Link href="/login?next=/progress">Log in</Link> to save it across devices.</>
        )}
      </div>
      <button className="btn btn-danger" style={{ marginTop: 12 }} onClick={reset}>Reset my progress</button>
    </>
  );
}
