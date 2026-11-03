/**
 * IITM BS Foundation grade maths, for the Grade Calculator. Pure functions only.
 *
 * The standard formula for the theory courses (Maths, Statistics, Computational
 * Thinking, English) is
 *   T = 0.1·GAA + max(0.6·F + 0.2·max(Qz1, Qz2), 0.4·F + 0.2·Qz1 + 0.3·Qz2)
 * where GAA is the average of the graded assignments and F the end-term score,
 * all out of 100. IITM can change it by course and term, so the page says so.
 */

export type Scores = { gaa: number; qz1: number; qz2: number };

export const GRADES = [
  { letter: 'S', min: 90 },
  { letter: 'A', min: 80 },
  { letter: 'B', min: 70 },
  { letter: 'C', min: 60 },
  { letter: 'D', min: 50 },
  { letter: 'E', min: 40 },
] as const;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** The total out of 100 for a given end-term score. */
export function total({ gaa, qz1, qz2 }: Scores, endTerm: number) {
  const f = clamp(endTerm);
  return 0.1 * clamp(gaa) + Math.max(0.6 * f + 0.2 * Math.max(clamp(qz1), clamp(qz2)), 0.4 * f + 0.2 * clamp(qz1) + 0.3 * clamp(qz2));
}

export function gradeFor(t: number) {
  return GRADES.find((g) => t >= g.min)?.letter ?? 'U';
}

/**
 * The lowest end-term score that reaches `target`: 0 when it's already reached,
 * null when even 100 isn't enough. Both branches of the max() grow with F, so the
 * answer is the smaller of the two branch solutions.
 */
export function endTermNeeded(s: Scores, target: number): number | null {
  if (total(s, 0) >= target) return 0;
  if (total(s, 100) < target) return null;
  const base = 0.1 * clamp(s.gaa);
  const viaBest = (target - base - 0.2 * Math.max(clamp(s.qz1), clamp(s.qz2))) / 0.6;
  const viaBoth = (target - base - 0.2 * clamp(s.qz1) - 0.3 * clamp(s.qz2)) / 0.4;
  return Math.ceil(clamp(Math.min(viaBest, viaBoth)) * 10) / 10;
}
