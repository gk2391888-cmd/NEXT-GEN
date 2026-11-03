/**
 * Student progress model. Phase 1 keeps it in the browser (localStorage);
 * Phase 2 moves the same records to Supabase tables of the same names.
 */
export type AnswerRecord = {
  questionId: string;
  subjectId: string;
  week: number;
  correct: boolean;
  mode: 'practice' | 'test';
  at: string;
};

export type TestAttempt = {
  id: string;
  subjectId: string;
  testId: string;
  startedAt: string;
  submittedAt: string;
  durationSec: number;
  questionIds: string[];
  responses: (number | null)[];
  correct: number;
  total: number;
};

/** A mock test the student has started but not submitted, so a refresh doesn't lose it. */
export type ActiveTest = {
  subjectId: string;
  testId: string;
  questionIds: string[];
  responses: (number | null)[];
  marked: boolean[];
  current: number;
  startedAt: number;
  endsAt: number;
};

export type WeekStatus = { done?: boolean; saved?: boolean };

export type LastVisited = { subjectId: string; week: number; at: string };

export type ProgressState = {
  version: 2;
  /** Keyed by `${subjectId}:${week}`. */
  weeks: Record<string, WeekStatus>;
  answers: AnswerRecord[];
  tests: TestAttempt[];
  /** Keyed by `${subjectId}/${testId}`. */
  active: Record<string, ActiveTest>;
  lastVisited?: LastVisited;
};

export const weekKey = (subjectId: string, week: number) => `${subjectId}:${week}`;

export const emptyProgress = (): ProgressState => ({ version: 2, weeks: {}, answers: [], tests: [], active: {} });
