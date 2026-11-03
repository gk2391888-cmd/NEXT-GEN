import 'server-only';
import problems from '@/content/coding/problems.json';

export type CodingTest = { call: string; expected: string; hidden: boolean };

export type CodingProblem = {
  id: string;
  tier: 'practice' | 'oppe';
  set: string | null;
  week: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  statement: string;
  functionName: string;
  starter: string;
  solution: string;
  hint: string;
  tests: CodingTest[];
};

/** What any page may send to the browser about a problem, Pro or not. */
export type ProblemSummary = Pick<CodingProblem, 'id' | 'tier' | 'set' | 'week' | 'title' | 'difficulty'>;

/** The hidden tests and model solution of an OPPE problem, sent only when the student submits or asks for it. */
export type ProblemAnswers = Pick<CodingProblem, 'tests' | 'solution'>;

// Server only: OPPE problems are Pro content, so they reach the browser through
// /api/pro/coding/<id> (which checks the plan), never through page data.
export const PROBLEMS = problems as CodingProblem[];

export const OPPE_SETS = [
  { id: 'oppe-1', title: 'OPPE practice set 1', minutes: 60 },
  { id: 'oppe-2', title: 'OPPE practice set 2', minutes: 60 },
  { id: 'oppe-3', title: 'OPPE practice set 3', minutes: 60 },
];

export function getProblem(id: string) {
  return PROBLEMS.find((p) => p.id === id);
}

/** The problem's neighbours in the same list (practice, or the same OPPE set). */
export function siblings(p: CodingProblem) {
  const list = PROBLEMS.filter((x) => x.tier === p.tier && x.set === p.set);
  const i = list.findIndex((x) => x.id === p.id);
  return { prev: list[i - 1], next: list[i + 1], position: i + 1, total: list.length };
}

export const summaryOf = ({ id, tier, set, week, title, difficulty }: CodingProblem): ProblemSummary => ({ id, tier, set, week, title, difficulty });

/** An OPPE problem without its answers: hidden tests are blanked out (kept in place so the UI can count them). */
export const withoutAnswers = (p: CodingProblem): CodingProblem => ({
  ...p,
  solution: '',
  tests: p.tests.map((t) => (t.hidden ? { call: '', expected: '', hidden: true } : t)),
});
