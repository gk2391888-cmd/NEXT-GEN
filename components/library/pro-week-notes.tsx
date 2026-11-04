'use client';

import { useProContent } from '@/lib/pro-content';
import type { Week } from '@/lib/types';
import { ProContentStatus } from '@/components/pro-lock';
import { WeekNotes } from './week-notes';

/** A week's notes from /api/pro/week/…, which checks the plan, so they aren't in the page itself. */
export function ProWeekNotes({ subjectId, week }: { subjectId: string; week: number }) {
  const { data, error, retry } = useProContent<{ week: Week }>(`/api/pro/week/${subjectId}/${week}`);
  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return <WeekNotes week={data.week} />;
}
