'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent } from '@/lib/progress/insights';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar, SubjectIcon } from '@/components/ui';

export function LibraryGrid({ subjects, catalog }: { subjects: Subject[]; catalog: Record<string, WeekRef[]> }) {
  const state = useProgress();

  return (
    <div className="grid grid-2">
      {subjects.map((s) => {
        const weeks = catalog[s.id] ?? [];
        const done = weeks.filter((w) => state.weeks[weekKey(s.id, w.week)]?.done).length;
        const next = weeks.find((w) => !state.weeks[weekKey(s.id, w.week)]?.done) ?? weeks[0];

        return (
          <div key={s.id} className="card stack">
            <div className="subject-row">
              <SubjectIcon subject={s} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{s.name}</h3>
                <div className="muted">{s.code} · {weeks.length ? `${weeks.length} weeks` : 'Notes coming soon'}</div>
              </div>
            </div>
            {weeks.length > 0 && (
              <>
                <div className="subject-row">
                  <ProgressBar value={percent(done, weeks.length)} color={s.color} />
                  <span className="muted">{done}/{weeks.length} done</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="muted">
                    {done === weeks.length ? 'Sab weeks complete. Revision ke liye mock test do.' : `Next: Week ${next.week} · ${next.title}`}
                  </span>
                  <Link className="btn btn-secondary" href={`/library/${s.id}/${next.week}`}>
                    {done ? 'Continue' : 'Start week 1'} →
                  </Link>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
