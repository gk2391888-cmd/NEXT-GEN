'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { PRICING } from '@/lib/plan';
import { percent } from '@/lib/progress/insights';
import { QUALIFIER_TEST_SUBJECT, type QualifierMock } from '@/lib/qualifier';
import { testKey } from '@/lib/tests';
import { accuracyTone } from '@/components/ui';
import { ProTag } from '@/components/pro-lock';

/** A qualifier's mock papers, with this student's best score and any attempt in progress. */
export function QualifierMockList({ mocks, sections, questionCounts }: { mocks: QualifierMock[]; sections: number; questionCounts: Record<string, number> }) {
  const state = useProgress();
  return (
    <div className="grid grid-2">
      {mocks.map((m) => {
        const attempts = state.tests.filter((a) => a.subjectId === QUALIFIER_TEST_SUBJECT && a.testId === m.id);
        const best = attempts.reduce((n, a) => Math.max(n, percent(a.correct, a.total)), 0);
        const inProgress = Boolean(state.active[testKey(QUALIFIER_TEST_SUBJECT, m.id)]);
        return (
          <div key={m.id} className="card test-card">
            <div className="flex-between items-start">
              <strong>{m.title} {m.pro ? <ProTag /> : <span className="chip chip-teal chip-sm">FREE</span>}</strong>
              {inProgress && <span className="chip chip-yellow">IN PROGRESS</span>}
            </div>
            <div className="test-meta">
              <span>{sections} sections</span>
              <span>{questionCounts[m.id] ?? 0} questions</span>
              <span>{m.minutes} min</span>
            </div>
            <div className="muted">
              {attempts.length ? (
                <>Best: <strong className={accuracyTone(best)}>{best}%</strong> · {attempts.length} attempt{attempts.length > 1 ? 's' : ''}</>
              ) : m.pro ? `Part of Pro: included in the ${PRICING.trialDays}-day free trial` : 'Free, no login needed'}
            </div>
            <Link className={`btn ${inProgress || !attempts.length ? 'btn-primary' : 'btn-secondary'}`} href={`/qualifier/${m.qualifier}/mock/${m.id}`}>
              {inProgress ? 'Resume mock' : attempts.length ? 'Take again' : 'Start mock'} →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
