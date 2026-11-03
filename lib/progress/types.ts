/**
 * Student progress model. The browser keeps a copy (localStorage) so the app
 * is instant and works offline; for logged-in students every change is also
 * queued in `pending` and pushed to Supabase tables of the same shape.
 */
export type AnswerRecord = {
  /** Generated on the device so retried uploads never duplicate a row. */
  id: string;
  questionId: string;
  subjectId: string;
  week: number;
  correct: boolean;
  mode: 'practice' | 'test';
  at: string;
};

export type NewAnswer = Omit<AnswerRecord, 'id'>;

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
  /** Seconds spent on each question, in questionIds order. */
  timeSpent?: number[];
};

/** A mock test the student has started but not submitted, so a refresh doesn't lose it. Device-only. */
export type ActiveTest = {
  subjectId: string;
  testId: string;
  questionIds: string[];
  responses: (number | null)[];
  marked: boolean[];
  current: number;
  startedAt: number;
  endsAt: number;
  timeSpent?: number[];
};

/** One problem's result in a timed OPPE simulation. */
export type CodingProblemResult = {
  problemId: string;
  publicPassed: number;
  publicTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  /** Seconds spent on this problem. */
  timeSec: number;
  /** The code that was graded. */
  code: string;
};

/** A submitted timed OPPE simulation (Coding Lab exam mode). */
export type CodingAttempt = {
  id: string;
  setId: string;
  startedAt: string;
  submittedAt: string;
  durationSec: number;
  /** 0–100: every problem carries equal marks, split by the share of its tests passed. */
  score: number;
  problems: CodingProblemResult[];
};

/** An OPPE simulation in progress. Device-only; the code itself is kept in separate draft keys (components/coding/oppe-exam.tsx) so typing doesn't rewrite the whole store. */
export type ActiveExam = {
  setId: string;
  problemIds: string[];
  current: number;
  startedAt: number;
  endsAt: number;
  timeSpent: number[];
};

export type WeekStatus = { done?: boolean; saved?: boolean };

export type LastVisited = { subjectId: string; week: number; at: string };

export type Profile = { fullName: string; subjects: string[] };

/** Plan dates come from the server and can't be changed by the student. */
export type PlanDates = { trialEndsAt?: string; proUntil?: string };

/** The exam the planner works towards; `date` is YYYY-MM-DD. */
export type ExamTarget = { name: string; date: string };

/** A change waiting to be uploaded. Applied locally first, then sent in order. */
export type SyncOp =
  | { kind: 'answers'; records: AnswerRecord[] }
  | { kind: 'week'; subjectId: string; week: number; status: Required<WeekStatus> }
  | { kind: 'test'; attempt: TestAttempt }
  | { kind: 'coding'; attempt: CodingAttempt }
  | { kind: 'visit'; lastVisited: LastVisited }
  | { kind: 'profile'; profile: Profile }
  | { kind: 'exam'; exam: ExamTarget | null }
  | { kind: 'reset' };

export type ProgressState = {
  version: 2;
  /** Keyed by `${subjectId}:${week}`. */
  weeks: Record<string, WeekStatus>;
  answers: AnswerRecord[];
  tests: TestAttempt[];
  /** Keyed by `${subjectId}/${testId}`. */
  active: Record<string, ActiveTest>;
  lastVisited?: LastVisited;
  profile?: Profile;
  plan?: PlanDates;
  exam?: ExamTarget;
  /** Submitted OPPE simulations. Optional so copies saved before they existed still load. */
  codingAttempts?: CodingAttempt[];
  /** OPPE simulations in progress, keyed by set id. Device-only. */
  activeExams?: Record<string, ActiveExam>;
  /** Coding Lab problems solved on this device, keyed by problem id. */
  coding?: Record<string, { solvedAt: string }>;
  /** Logged-in only: changes not yet confirmed by the server. */
  pending: SyncOp[];
  /** Logged-in only: the "save this device's progress?" question has been answered. */
  guestImportHandled?: boolean;
};

export const weekKey = (subjectId: string, week: number) => `${subjectId}:${week}`;

export const emptyProgress = (): ProgressState => ({ version: 2, weeks: {}, answers: [], tests: [], active: {}, pending: [] });

export const hasProgress = (s: ProgressState) =>
  s.answers.length > 0 || s.tests.length > 0 || Boolean(s.codingAttempts?.length) || Object.values(s.weeks).some((w) => w.done || w.saved);
