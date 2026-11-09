'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent } from '@/lib/progress/insights';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar, subjectColor } from '@/components/ui';
import { useInChoice, useSubjectCode } from '@/lib/programme-choice';

export function WeekNav({ subject, weeks: allWeeks, current }: { subject: Subject; weeks: WeekRef[]; current: number }) {
  const state = useProgress();
  const inChoice = useInChoice();
  // A qualifier student sees the weeks the qualifier covers; another programme's subject shows whole.
  const weeks = inChoice(subject.id) ? allWeeks.filter((w) => inChoice(subject.id, w.week)) : allWeeks;
  const isDone = (week: number) => Boolean(state.weeks[weekKey(subject.id, week)]?.done);
  const doneCount = weeks.filter((w) => isDone(w.week)).length;
  const code = useSubjectCode(subject);

  return (
    <nav className="card week-list" aria-label={`${subject.name} weeks`}>
      <div className="week-list-head">
        <h3>{subject.name}</h3>
        <div className="muted mb-sm">{code} · {doneCount} of {weeks.length} done</div>
        <ProgressBar value={percent(doneCount, weeks.length)} color={subjectColor(subject.id)} />
        <Link className="link inline-block mt-md" href={`/library/${subject.id}/formulas`}>Formula sheet →</Link>
      </div>
      {weeks.map((w) => {
        const active = w.week === current;
        const done = isDone(w.week);
        return (
          // No prefetch: a week page would otherwise fetch all 12 sibling weeks in the background.
          <Link key={w.week} href={`/library/${subject.id}/${w.week}`} prefetch={false} className={`week-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className={`dot${active ? ' current' : done ? ' done' : ''}`}>{done && !active ? '✓' : w.week}</span>
            <span>Week {w.week} · {w.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
