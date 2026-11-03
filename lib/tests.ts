import type { Level } from './levels';
import type { Difficulty } from './types';

/**
 * Mock tests are generated from the week-wise question bank, following the
 * Foundation course pattern: Quiz 1 (weeks 1–4), Quiz 2 (weeks 5–8), End term (all weeks).
 */
export type MockTest = {
  id: string;
  title: string;
  fromWeek: number;
  toWeek: number;
  questionCount: number;
  minutes: number;
  /** Only for Pro (and trial) students. */
  pro?: boolean;
};

export const MOCK_TESTS: MockTest[] = [
  { id: 'quiz-1', title: 'Quiz 1 practice', fromWeek: 1, toWeek: 4, questionCount: 15, minutes: 25 },
  { id: 'quiz-2', title: 'Quiz 2 practice', fromWeek: 5, toWeek: 8, questionCount: 15, minutes: 25 },
  { id: 'end-term', title: 'End term practice', fromWeek: 1, toWeek: 12, questionCount: 30, minutes: 60, pro: true },
];

export function getMockTest(id: string): MockTest | undefined {
  return MOCK_TESTS.find((t) => t.id === id);
}

export const testKey = (subjectId: string, testId: string) => `${subjectId}/${testId}`;

/**
 * The default mix of a mock test, like a real quiz: about 30% easy, 40% medium and 30% hard.
 * Medium takes whatever easy and hard leave (15 questions → 4 easy, 7 medium, 4 hard; 30 → 9, 12, 9).
 */
export function testMix(count: number): Record<Difficulty, number> {
  const easy = Math.floor(count * 0.3);
  const hard = Math.floor(count * 0.3);
  return { easy, medium: count - easy - hard, hard };
}

type Pickable = { id: string; week?: number; difficulty?: Difficulty };

/**
 * Picks a test's questions, spread evenly across the test's weeks, so a 15-question test over 4 weeks
 * never ends up with 10 questions from one week. Mixed follows testMix(); a single level takes only
 * that level's questions, topped up from the others if there aren't enough.
 */
export function pickQuestions<T extends Pickable>(pool: T[], count: number, random = Math.random, level: Level = 'mixed'): T[] {
  const atLevel = level === 'mixed' ? pool : pool.filter((q) => q.difficulty === level);
  const picked = spread(atLevel, count, random, level === 'mixed' ? testMix(count) : undefined);
  if (picked.length < Math.min(count, pool.length)) {
    const chosen = new Set(picked.map((q) => q.id));
    picked.push(...spread(pool.filter((q) => !chosen.has(q.id)), count - picked.length, random));
  }
  return picked.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
}

/**
 * Up to `count` questions, one week at a time in turn (starting at a random week). With a quota, each week
 * gives the difficulty the test still needs most of, so both the weeks and the levels come out even.
 */
function spread<T extends Pickable>(pool: T[], count: number, random: () => number, quota?: Record<Difficulty, number>): T[] {
  const byWeek = new Map<number, T[]>();
  for (const q of pool) {
    const list = byWeek.get(q.week ?? 0) ?? [];
    list.push(q);
    byWeek.set(q.week ?? 0, list);
  }
  const buckets = shuffle([...byWeek.values()], random).map((list) => shuffle(list, random));
  const left: Partial<Record<Difficulty, number>> = { ...quota };
  const need = (q: T) => (q.difficulty ? (left[q.difficulty] ?? 0) : 0);
  const target = Math.min(count, pool.length);
  const picked: T[] = [];
  while (picked.length < target) {
    for (const bucket of buckets) {
      if (!bucket.length || picked.length >= target) continue;
      // The bucket is shuffled, so ties between difficulties fall randomly.
      const k = quota ? bucket.reduce((best, q, i) => (need(q) > need(bucket[best]) ? i : best), 0) : bucket.length - 1;
      const [next] = bucket.splice(k, 1);
      if (next.difficulty && left[next.difficulty] !== undefined) left[next.difficulty]!--;
      picked.push(next);
    }
  }
  return picked;
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
