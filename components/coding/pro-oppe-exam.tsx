'use client';

import { useCallback } from 'react';
import type { CodingProblem, ProblemAnswers } from '@/lib/coding';
import type { OppeSet } from '@/lib/coding-score';
import { fetchProContent, useProContent } from '@/lib/pro-content';
import { ProContentStatus } from '@/components/pro-lock';
import { OppeExam } from './oppe-exam';

/**
 * A timed OPPE set: its problems come from /api/pro/oppe/<set> (Pro only), and the hidden
 * tests and model solutions only when the student submits or opens a score report.
 */
export function ProOppeExam({ set }: { set: OppeSet }) {
  const path = `/api/pro/oppe/${encodeURIComponent(set.id)}`;
  const { data, error, retry } = useProContent<{ problems: CodingProblem[] }>(path);
  const loadAnswers = useCallback(() => fetchProContent<{ answers: Record<string, ProblemAnswers> }>(`${path}?part=answers`).then((d) => d.answers), [path]);

  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return <OppeExam set={set} problems={data.problems} loadAnswers={loadAnswers} />;
}
