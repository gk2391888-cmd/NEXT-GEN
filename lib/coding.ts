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

export const PROBLEMS = problems as CodingProblem[];

export type OppeSet = { id: string; title: string; minutes: number };

/** `minutes` is the time limit of the set's timed simulation (/lab/oppe/<id>). */
export const OPPE_SETS: OppeSet[] = [
  { id: 'oppe-1', title: 'OPPE practice set 1', minutes: 60 },
  { id: 'oppe-2', title: 'OPPE practice set 2', minutes: 60 },
  { id: 'oppe-3', title: 'OPPE practice set 3', minutes: 60 },
];

export function getProblem(id: string) {
  return PROBLEMS.find((p) => p.id === id);
}

export function getOppeSet(id: string) {
  return OPPE_SETS.find((s) => s.id === id);
}

export function setProblems(setId: string) {
  return PROBLEMS.filter((p) => p.tier === 'oppe' && p.set === setId);
}

type Passed = { publicPassed: number; publicTotal: number; hiddenPassed: number; hiddenTotal: number };

/** Share of a problem's tests (public and hidden) that passed, 0–1. */
export const problemShare = (r: Passed) => {
  const total = r.publicTotal + r.hiddenTotal;
  return total ? (r.publicPassed + r.hiddenPassed) / total : 0;
};

/** OPPE-style marks out of 100: every problem is worth the same, split by the share of its tests passed. */
export const examScore = (results: Passed[]) =>
  results.length ? Math.round((results.reduce((n, r) => n + problemShare(r), 0) / results.length) * 100) : 0;

/** The problem's neighbours in the same list (practice, or the same OPPE set). */
export function siblings(p: CodingProblem) {
  const list = PROBLEMS.filter((x) => x.tier === p.tier && x.set === p.set);
  const i = list.findIndex((x) => x.id === p.id);
  return { prev: list[i - 1], next: list[i + 1], position: i + 1, total: list.length };
}
