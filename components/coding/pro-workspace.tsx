'use client';

import { useCallback } from 'react';
import type { CodingProblem, ProblemAnswers } from '@/lib/coding';
import { fetchProContent, useProContent } from '@/lib/pro-content';
import { ProContentStatus } from '@/components/pro-lock';
import { CodingWorkspace } from './workspace';

type Props = { id: string; prev?: string; next?: string; position: number; total: number };

/**
 * An OPPE problem: its statement comes from /api/pro/coding/<id> (Pro only), and its
 * hidden tests and solution only when the student submits or asks for the solution.
 */
export function ProCodingWorkspace({ id, ...nav }: Props) {
  const path = `/api/pro/coding/${encodeURIComponent(id)}`;
  const { data, error, retry } = useProContent<{ problem: CodingProblem }>(path);
  const loadAnswers = useCallback(() => fetchProContent<{ answers: ProblemAnswers }>(`${path}?part=answers`).then((d) => d.answers), [path]);

  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return <CodingWorkspace problem={data.problem} loadAnswers={loadAnswers} {...nav} />;
}
