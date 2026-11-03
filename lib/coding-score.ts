/**
 * Timed OPPE scoring, shared by the browser and the server. Kept apart from
 * lib/coding.ts, which is server-only because it holds the Pro problems.
 */

export type OppeSet = { id: string; title: string; minutes: number };

type Passed = { publicPassed: number; publicTotal: number; hiddenPassed: number; hiddenTotal: number };

/** Share of a problem's tests (public and hidden) that passed, 0–1. */
export const problemShare = (r: Passed) => {
  const total = r.publicTotal + r.hiddenTotal;
  return total ? (r.publicPassed + r.hiddenPassed) / total : 0;
};

/** OPPE-style marks out of 100: every problem is worth the same, split by the share of its tests passed. */
export const examScore = (results: Passed[]) =>
  results.length ? Math.round((results.reduce((n, r) => n + problemShare(r), 0) / results.length) * 100) : 0;
