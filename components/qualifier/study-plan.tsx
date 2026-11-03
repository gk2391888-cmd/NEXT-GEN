'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { usePlan } from '@/lib/plan';
import { formatExamDate, QUALIFIER_EXAM_DATE, type Qualifier, type QualifierMock } from '@/lib/qualifier';
import { buildQualifierPlan, QUALIFIER_WEEKS, type QualifierPlanItem } from '@/lib/qualifier-plan';
import { ProTag } from '@/components/pro-lock';

type Props = {
  qualifier: Qualifier;
  mocks: QualifierMock[];
  /** Week titles of the NEXT GEN notes, by subject id, for sections that have notes. */
  weekTitles: Record<string, Record<number, string>>;
};

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The study plan from today to QUALIFIER_EXAM_DATE, worked out in the browser (the page itself is static). */
export function QualifierStudyPlan({ qualifier, mocks, weekTitles }: Props) {
  const state = useProgress();
  const [today, setToday] = useState('');
  useEffect(() => setToday(todayLocal()), []);

  const plan = useMemo(
    () =>
      today
        ? buildQualifierPlan({
            today,
            examDate: QUALIFIER_EXAM_DATE,
            qualifier,
            mocks,
            // Weeks with NEXT GEN notes can be marked done there; the plan then leaves them out.
            isDone: (s, w) => Boolean(s.subjectId && state.weeks[weekKey(s.subjectId, w)]?.done),
          })
        : [],
    [today, qualifier, mocks, state.weeks],
  );

  if (!today) return <div className="card"><p className="muted">Loading your plan…</p></div>;

  const units = qualifier.sections.length * QUALIFIER_WEEKS.length;
  const done = qualifier.sections.reduce((n, s) => n + QUALIFIER_WEEKS.filter((w) => s.subjectId && state.weeks[weekKey(s.subjectId, w)]?.done).length, 0);
  const planned = plan.reduce((n, d) => n + d.items.filter((i) => i.kind === 'study').length, 0);
  const unplanned = units - done - planned;
  const busiest = Math.max(0, ...plan.map((d) => d.items.filter((i) => i.kind === 'study').length));

  return (
    <div className="row">
      <section className="card row-main">
        <div className="quiz-top">
          <h3>Day by day</h3>
          <span className="chip chip-blue">Exam: {formatExamDate()}</span>
        </div>
        {plan.length === 0 ? (
          <p className="muted">The exam date we have ({formatExamDate()}) has passed. Check the next qualifier date on the official site.</p>
        ) : (
          plan.map((day, i) => (
            <div key={day.date} className="plan-day">
              <div className={`plan-date${i === 0 ? ' today' : ''}`}>
                {new Date(`${day.date}T00:00:00`).getDate()}
                <small>{i === 0 ? 'TODAY' : new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</small>
              </div>
              <div className="flex-1">
                {day.items.length === 0 ? (
                  <span className="muted">Catch-up day: redo any week you found hard, or rest.</span>
                ) : (
                  day.items.map((item, j) => <PlanLine key={j} item={item} qualifier={qualifier} weekTitles={weekTitles} />)
                )}
              </div>
            </div>
          ))
        )}
      </section>
      <aside className="card test-side stack">
        <div>
          <div className="muted">Course weeks left to study</div>
          <strong className="stat-value">{units - done} of {units}</strong>
        </div>
        {unplanned > 0 && (
          <div className="alert alert-warn">
            {unplanned} course week{unplanned === 1 ? '' : 's'} didn’t fit before the exam. Focus on the courses where you’re weakest: an exam pass needs a minimum score in every course.
          </div>
        )}
        {busiest > 3 && (
          <div className="alert alert-warn">That’s up to {busiest} course weeks a day. Start with the courses you find hardest.</div>
        )}
        {qualifier.sections.some((s) => s.subjectId) && (
          <p className="muted">Marking a week as done on its notes page takes it out of the plan, and the rest is spread again.</p>
        )}
        <p className="muted">
          Watch the official lectures and do the graded assignments on your qualifier portal first: your assignment scores decide whether you get a hall ticket. This plan is for revision and practice around them.
        </p>
        <Link className="btn btn-secondary" href={`/qualifier/${qualifier.id}`}>Back to the {qualifier.short}</Link>
      </aside>
    </div>
  );
}

function PlanLine({ item, qualifier, weekTitles }: { item: QualifierPlanItem; qualifier: Qualifier; weekTitles: Props['weekTitles'] }) {
  const { isPro } = usePlan();
  if (item.kind === 'study') {
    const { section, week } = item;
    const title = section.subjectId ? weekTitles[section.subjectId]?.[week] : undefined;
    if (!section.subjectId) {
      return (
        <div className="plan-line">
          <strong>{section.name} · Week {week}</strong>
          <span className="muted"> · official lectures + assignment on your portal, then the {section.short} questions in our mocks</span>
        </div>
      );
    }
    return (
      <div className="plan-line">
        <Link href={`/library/${section.subjectId}/${week}`}><strong>{section.short} · Week {week}</strong></Link>
        <span className="muted"> {title ? `${title} · ` : ''}notes + <Link href={`/practice/${section.subjectId}/${week}`}>practice</Link></span>
      </div>
    );
  }
  if (item.kind === 'mock') {
    return (
      <div className="plan-line">
        <Link href={`/qualifier/${qualifier.id}/mock/${item.mock.id}`}><strong>{item.mock.title}</strong></Link>{' '}
        {item.mock.pro && !isPro && <ProTag />}
        <span className="muted"> · {item.mock.minutes} min, timed, in one sitting</span>
      </div>
    );
  }
  if (item.kind === 'weak') {
    return <div className="plan-line"><strong>Fix your weakest course</strong><span className="muted"> · from your mock result: re-read its notes and redo its practice</span></div>;
  }
  if (item.kind === 'review') {
    return <div className="plan-line"><strong>Go through every wrong answer</strong><span className="muted"> · then revise the weakest course’s notes</span></div>;
  }
  return (
    <div className="plan-line">
      <strong>Light revision</strong>
      <span className="muted">
        {' '}· {qualifier.sections.some((s) => s.subjectId) ? 'formula sheets and your saved weeks, ' : ''}check your hall ticket, ID and centre address, and sleep early
      </span>
    </div>
  );
}
