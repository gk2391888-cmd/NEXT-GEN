import { daysUntil } from './planner';
import type { Qualifier, QualifierMock, QualifierSection } from './qualifier';

/** The qualifier covers weeks 1–4 of each course. */
export const QUALIFIER_WEEKS = [1, 2, 3, 4];

export type QualifierPlanItem =
  | { kind: 'study'; section: QualifierSection; week: number }
  | { kind: 'mock'; mock: QualifierMock }
  | { kind: 'review' }
  | { kind: 'weak' }
  | { kind: 'final' };

export type QualifierPlanDay = { date: string; items: QualifierPlanItem[] };

const DAY_MS = 86_400_000;
const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * A day-by-day plan from `today` up to (not including) the exam:
 * - the day before the exam is light revision only;
 * - the mocks go near the end (the first one 4 days out, the second 2 days out, fewer when time is short),
 *   each followed by going through its wrong answers;
 * - the course weeks still to study are spread evenly over the days before the first mock, week 1 of every
 *   course first, so a mock comes after the whole syllabus; days between mocks go to the weakest course.
 * Weeks marked done on their notes page are left out.
 */
export function buildQualifierPlan(params: {
  today: string;
  examDate: string;
  qualifier: Qualifier;
  mocks: QualifierMock[];
  isDone: (section: QualifierSection, week: number) => boolean;
}): QualifierPlanDay[] {
  const { today, examDate, qualifier, mocks, isDone } = params;
  const total = daysUntil(examDate, today);
  if (total <= 0) return [];

  const reserved = new Map<number, QualifierPlanItem[]>();
  if (total >= 2) reserved.set(total - 1, [{ kind: 'final' }]);
  const mockDays = mocks.length >= 2 && total >= 6 ? [total - 4, total - 2] : total >= 3 ? [total - 2] : total === 2 ? [0] : [];
  mockDays.forEach((day, i) => {
    if (mocks[i]) reserved.set(day, [{ kind: 'mock', mock: mocks[i] }, { kind: 'review' }]);
  });
  if (total === 1) reserved.set(0, [{ kind: 'final' }]);

  const pending: QualifierPlanItem[] = QUALIFIER_WEEKS.flatMap((week) =>
    qualifier.sections.filter((section) => !isDone(section, week)).map((section) => ({ kind: 'study' as const, section, week })),
  );
  const free = Array.from({ length: total }, (_, d) => d).filter((d) => !reserved.has(d));
  const firstMock = Math.min(...[...reserved].filter(([, items]) => items[0].kind === 'mock').map(([d]) => d));
  const beforeMocks = free.filter((d) => d < firstMock);
  // With no free day before the first mock, study on whatever days are free.
  const studyDays = beforeMocks.length ? beforeMocks : free;
  // An even share per day: the first few days take one extra when it doesn't divide exactly.
  const share = new Map(studyDays.map((d, i) => [d, Math.floor(pending.length / studyDays.length) + (i < pending.length % studyDays.length ? 1 : 0)]));

  return Array.from({ length: total }, (_, d) => ({
    date: isoDate(Date.parse(today) + d * DAY_MS),
    items: reserved.get(d) ?? (share.has(d) ? pending.splice(0, share.get(d)) : [{ kind: 'weak' as const }]),
  }));
}
