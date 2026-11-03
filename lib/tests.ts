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
};

export const MOCK_TESTS: MockTest[] = [
  { id: 'quiz-1', title: 'Quiz 1 practice', fromWeek: 1, toWeek: 4, questionCount: 15, minutes: 25 },
  { id: 'quiz-2', title: 'Quiz 2 practice', fromWeek: 5, toWeek: 8, questionCount: 15, minutes: 25 },
  { id: 'end-term', title: 'End term practice', fromWeek: 1, toWeek: 12, questionCount: 30, minutes: 60 },
];

export function getMockTest(id: string): MockTest | undefined {
  return MOCK_TESTS.find((t) => t.id === id);
}

export const testKey = (subjectId: string, testId: string) => `${subjectId}/${testId}`;

/**
 * Picks questions spread evenly across the test's weeks, so a 15-question test
 * over 4 weeks never ends up with 10 questions from one week.
 */
export function pickQuestions<T extends { id: string; week?: number }>(pool: T[], count: number, random = Math.random): T[] {
  const byWeek = new Map<number, T[]>();
  for (const q of pool) {
    const list = byWeek.get(q.week ?? 0) ?? [];
    list.push(q);
    byWeek.set(q.week ?? 0, list);
  }
  const buckets = [...byWeek.values()].map((list) => shuffle(list, random));
  const picked: T[] = [];
  while (picked.length < Math.min(count, pool.length)) {
    for (const bucket of buckets) {
      const next = bucket.pop();
      if (next && picked.length < count) picked.push(next);
    }
  }
  return picked.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
