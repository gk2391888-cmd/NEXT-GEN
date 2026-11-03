'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { percent } from '@/lib/progress/insights';
import { testKey, type MockTest } from '@/lib/tests';
import { orderSubjects } from '@/lib/subjects';
import type { Subject } from '@/lib/types';
import { accuracyColor, SubjectIcon } from '@/components/ui';

export function TestList({ subjects: allSubjects, tests }: { subjects: Subject[]; tests: MockTest[] }) {
  const state = useProgress();
  const subjects = orderSubjects(allSubjects, state.profile?.subjects);

  return (
    <div className="stack">
      {subjects.map((s) => (
        <section key={s.id} className="card">
          <div className="subject-row" style={{ marginBottom: 14 }}>
            <SubjectIcon subject={s} size={36} />
            <div>
              <h3>{s.name}</h3>
              <div className="muted">{s.code}</div>
            </div>
          </div>
          <div className="grid grid-3">
            {tests.map((t) => {
              const attempts = state.tests.filter((a) => a.subjectId === s.id && a.testId === t.id);
              const best = attempts.reduce((m, a) => Math.max(m, percent(a.correct, a.total)), 0);
              const inProgress = Boolean(state.active[testKey(s.id, t.id)]);
              return (
                <div key={t.id} className="card test-card" style={{ background: 'var(--bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{t.title}</strong>
                    {inProgress && <span className="chip chip-yellow">IN PROGRESS</span>}
                  </div>
                  <div className="test-meta">
                    <span>Weeks {t.fromWeek}–{t.toWeek}</span>
                    <span>{t.questionCount} questions</span>
                    <span>{t.minutes} min</span>
                  </div>
                  <div className="muted">
                    {attempts.length ? (
                      <>Best: <strong style={{ color: accuracyColor(best) }}>{best}%</strong> · {attempts.length} attempt{attempts.length > 1 ? 's' : ''}</>
                    ) : 'Not attempted yet'}
                  </div>
                  <Link className={`btn ${inProgress ? 'btn-primary' : 'btn-secondary'}`} href={`/tests/${s.id}/${t.id}`}>
                    {inProgress ? 'Resume test' : attempts.length ? 'Take again' : 'Start test'} →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
