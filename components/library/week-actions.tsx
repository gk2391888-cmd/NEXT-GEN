'use client';

import { useEffect } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';

/** Remembers the last week opened, for "Continue where you left off". */
export function VisitTracker({ subjectId, week }: { subjectId: string; week: number }) {
  useEffect(() => progress.visit(subjectId, week), [subjectId, week]);
  return null;
}

export function WeekActions({ subjectId, week, variant }: { subjectId: string; week: number; variant: 'top' | 'done' }) {
  const status = useProgress().weeks[weekKey(subjectId, week)] ?? {};

  if (variant === 'done') {
    return (
      <button className="btn btn-secondary" onClick={() => progress.setWeek(subjectId, week, { done: !status.done })} aria-pressed={Boolean(status.done)}>
        {status.done ? '✓ Done' : 'Mark as done'}
      </button>
    );
  }

  return (
    <div className="btn-group no-print">
      <button className="btn btn-secondary" onClick={() => window.print()}>⤓ Save as PDF</button>
      <button className="btn btn-secondary" onClick={() => progress.setWeek(subjectId, week, { saved: !status.saved })} aria-pressed={Boolean(status.saved)}>
        {status.saved ? '★ Saved for revision' : '☆ Revise later'}
      </button>
    </div>
  );
}
