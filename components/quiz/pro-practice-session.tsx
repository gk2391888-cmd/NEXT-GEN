'use client';

import { useProContent } from '@/lib/pro-content';
import type { Week } from '@/lib/types';
import { ProContentStatus } from '@/components/pro-lock';
import { PracticeSession } from './practice-session';

type Props = { subjectId: string; subjectName: string; week: number; weekTitle: string };

/** A week's practice: its questions come from /api/pro/week/…, which checks the plan. */
export function ProPracticeSession(props: Props) {
  const { data, error, retry } = useProContent<{ week: Week }>(`/api/pro/week/${props.subjectId}/${props.week}`);
  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return <PracticeSession {...props} questions={data.week.questions} />;
}
