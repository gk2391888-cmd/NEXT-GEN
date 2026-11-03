'use client';

import { fetchProContent } from './pro-content';
import { getQualifier, QUALIFIER_MOCKS, QUALIFIER_TEST_SUBJECT } from './qualifier';
import type { BankQuestion } from './question-bank';
import type { Question } from './types';

/**
 * A qualifier mock question by id (e.g. "ds-1-math1-q3"), shaped like a question-bank entry, for the
 * doubt solver. Free mocks come from /api/content/qualifier/<mock>; Pro ones from /api/pro/qualifier/<mock>,
 * which checks the plan.
 */
export async function findQualifierQuestion(id: string): Promise<BankQuestion | undefined> {
  const mock = QUALIFIER_MOCKS.find((m) => id.startsWith(`${m.id}-`));
  if (!mock) return undefined;
  const path = mock.pro ? `/api/pro/qualifier/${mock.id}` : `/api/content/qualifier/${mock.id}`;
  const { pool } = mock.pro
    ? await fetchProContent<{ pool: Question[] }>(path)
    : await fetch(path).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
  const q = (pool as Question[]).find((x) => x.id === id);
  const section = q && getQualifier(mock.qualifier)?.sections[(q.week ?? 1) - 1];
  return q && { ...q, subjectId: QUALIFIER_TEST_SUBJECT, week: q.week ?? 1, weekTitle: section?.name ?? mock.title };
}
