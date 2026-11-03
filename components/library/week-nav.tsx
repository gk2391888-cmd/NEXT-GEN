'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent } from '@/lib/progress/insights';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar } from '@/components/ui';

export function WeekNav({ subject, weeks, current }: { subject: Subject; weeks: WeekRef[]; current: number }) {
  const state = useProgress();
  const isDone = (week: number) => Boolean(state.weeks[weekKey(subject.id, week)]?.done);
  const doneCount = weeks.filter((w) => isDone(w.week)).length;

  return (
    <nav className="card week-list" aria-label={`${subject.name} weeks`}>
      <div className="week-list-head">
        <h3>{subject.name}</h3>
        <div className="muted" style={{ marginBottom: 8 }}>{subject.code} · {doneCount} of {weeks.length} done</div>
        <ProgressBar value={percent(doneCount, weeks.length)} color={subject.color} />
        <Link className="link" style={{ display: 'inline-block', marginTop: 10 }} href={`/library/${subject.id}/formulas`}>Formula sheet →</Link>
      </div>
      {weeks.map((w) => {
        const active = w.week === current;
        const done = isDone(w.week);
        return (
          <Link key={w.week} href={`/library/${subject.id}/${w.week}`} className={`week-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className={`dot${active ? ' current' : done ? ' done' : ''}`}>{done && !active ? '✓' : w.week}</span>
            <span>Week {w.week} · {w.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
