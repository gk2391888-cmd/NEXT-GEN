import type { WeekRef } from './types';

export type PlanItem =
  | { kind: 'week'; subjectId: string; week: number; title: string }
  | { kind: 'mistakes' }
  | { kind: 'mock'; subjectId: string };

export type PlanDay = { date: string; items: PlanItem[] };

/** Which weeks each exam covers, following the Foundation course pattern. */
export const EXAMS = [
  { name: 'Quiz 1', fromWeek: 1, toWeek: 4 },
  { name: 'Quiz 2', fromWeek: 5, toWeek: 8 },
  { name: 'End term', fromWeek: 1, toWeek: 12 },
] as const;

export const examWeeks = (name: string) => EXAMS.find((e) => e.name === name) ?? EXAMS[2];

const DAY_MS = 86_400_000;
const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Days from `today` up to (not including) `examDate`, both YYYY-MM-DD. */
export function daysUntil(examDate: string, today: string) {
  return Math.round((Date.parse(examDate) - Date.parse(today)) / DAY_MS);
}

/**
 * Spreads the weeks still to study evenly over the days before the exam,
 * interleaving subjects, with a My Mistakes slot every third day and the last
 * two days kept for mock tests and revision.
 */
export function buildPlan(params: {
  today: string;
  examDate: string;
  subjectIds: string[];
  catalog: Record<string, WeekRef[]>;
  isDone: (subjectId: string, week: number) => boolean;
  fromWeek?: number;
  toWeek?: number;
}): PlanDay[] {
  const { today, examDate, subjectIds, catalog, isDone, fromWeek = 1, toWeek = 99 } = params;
  const total = daysUntil(examDate, today);
  if (total <= 0) return [];

  const queues = subjectIds.map((id) => (catalog[id] ?? []).filter((w) => w.week >= fromWeek && w.week <= toWeek && !isDone(id, w.week)).map((w) => ({ subjectId: id, week: w.week, title: w.title })));
  const pending: PlanItem[] = [];
  while (queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) pending.push({ kind: 'week', ...next });
    }
  }

  const reviewDays = total >= 4 ? 2 : 0;
  const studyDays = total - reviewDays;
  const perDay = studyDays > 0 ? Math.ceil(pending.length / studyDays) : 0;

  const days: PlanDay[] = [];
  for (let d = 0; d < total; d++) {
    const date = isoDate(Date.parse(today) + d * DAY_MS);
    const items: PlanItem[] = [];
    if (d < studyDays) {
      items.push(...pending.splice(0, perDay));
      if (d % 3 === 2) items.push({ kind: 'mistakes' });
    } else {
      for (const id of subjectIds) items.push({ kind: 'mock', subjectId: id });
      items.push({ kind: 'mistakes' });
    }
    days.push({ date, items });
  }
  return days;
}
