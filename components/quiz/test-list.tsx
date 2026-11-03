'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { percent } from '@/lib/progress/insights';
import { testKey, type MockTest } from '@/lib/tests';
import { orderSubjects } from '@/lib/subjects';
import { useChoiceSubjects } from '@/lib/programme-choice';
import { termSubjects } from '@/lib/programmes';
import type { Subject, WeekRef } from '@/lib/types';
import { accuracyTone, SubjectIcon } from '@/components/ui';
import { ProTag } from '@/components/pro-lock';

export function TestList({ subjects: allSubjects, catalog, tests }: { subjects: Subject[]; catalog: Record<string, WeekRef[]>; tests: MockTest[] }) {
  const state = useProgress();
  // Only subjects with notes, and only the tests whose weeks are written (a subject still being written may have weeks 1–4 only).
  const subjects = orderSubjects(useChoiceSubjects(allSubjects), termSubjects(state.profile?.subjects)).filter((s) => (catalog[s.id] ?? []).length > 0);
  const testsFor = (subjectId: string) => tests.filter((t) => (catalog[subjectId] ?? []).some((w) => w.week >= t.fromWeek && w.week <= t.toWeek));

  if (subjects.length === 0) return <div className="card empty"><div className="empty-icon">◷</div>Mock tests for your programme are coming soon.</div>;

  return (
    <div className="stack">
      {subjects.map((s) => (
        <section key={s.id} className="card">
          <div className="subject-row mb-lg">
            <SubjectIcon subject={s} size="md" />
            <div>
              <h3>{s.name}</h3>
              <div className="muted">{s.code}</div>
            </div>
          </div>
          <div className="grid grid-3">
            {testsFor(s.id).map((t) => {
              const attempts = state.tests.filter((a) => a.subjectId === s.id && a.testId === t.id);
              const best = attempts.reduce((m, a) => Math.max(m, percent(a.correct, a.total)), 0);
              const inProgress = Boolean(state.active[testKey(s.id, t.id)]);
              return (
                <div key={t.id} className="card test-card">
                  <div className="flex-between items-start">
                    <strong>{t.title} {t.pro && <ProTag />}</strong>
                    {inProgress && <span className="chip chip-yellow">IN PROGRESS</span>}
                  </div>
                  <div className="test-meta">
                    <span>Weeks {t.fromWeek}–{t.toWeek}</span>
                    <span>{t.questionCount} questions</span>
                    <span>{t.minutes} min</span>
                  </div>
                  <div className="muted">
                    {attempts.length ? (
                      <>Best: <strong className={accuracyTone(best)}>{best}%</strong> · {attempts.length} attempt{attempts.length > 1 ? 's' : ''}</>
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
