'use client';

import type { MockTest } from '@/lib/tests';
import type { Question, Subject } from '@/lib/types';
import { useProContent } from '@/lib/pro-content';
import { ProContentStatus } from '@/components/pro-lock';
import { TestRunner } from './test-runner';

type Props = { subject: Subject; test: MockTest; weekTitles: Record<number, string> };

/** A Pro mock test (End term): its questions come from /api/pro/tests/…, which checks the plan. */
export function ProTestRunner({ subject, test, weekTitles }: Props) {
  const { data, error, retry } = useProContent<{ pool: Question[] }>(`/api/pro/tests/${subject.id}/${test.id}`);
  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return <TestRunner subject={subject} test={test} pool={data.pool} weekTitles={weekTitles} />;
}
