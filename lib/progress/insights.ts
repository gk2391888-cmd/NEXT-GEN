import type { AnswerRecord } from './types';

export type Score = { attempted: number; correct: number; accuracy: number };

export const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function score(answers: AnswerRecord[]): Score {
  const correct = answers.filter((a) => a.correct).length;
  return { attempted: answers.length, correct, accuracy: percent(correct, answers.length) };
}

export type WeekScore = Score & { subjectId: string; week: number };

export function scoresByWeek(answers: AnswerRecord[]): WeekScore[] {
  const groups = new Map<string, AnswerRecord[]>();
  for (const a of answers) {
    const key = `${a.subjectId}:${a.week}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups.values()].map((list) => ({ subjectId: list[0].subjectId, week: list[0].week, ...score(list) }));
}

/** Weeks with enough attempts to judge, and accuracy below the bar, weakest first. */
export function weakWeeks(answers: AnswerRecord[], { minAttempts = 3, below = 60 } = {}): WeekScore[] {
  return scoresByWeek(answers)
    .filter((w) => w.attempted >= minAttempts && w.accuracy < below)
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** Consecutive days (ending today or yesterday, India time) with at least one answer. */
export function studyStreak(answers: AnswerRecord[], today = new Date()): number {
  const days = new Set(answers.map((a) => istDay(Date.parse(a.at))));
  let cursor = today.getTime();
  if (!days.has(istDay(cursor))) cursor -= DAY_MS;
  let streak = 0;
  while (days.has(istDay(cursor))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

const DAY_MS = 86_400_000;
/** The calendar day in India (UTC+5:30), so days roll over at midnight like the AI limits do. */
const istDay = (t: number) => new Date(t + 5.5 * 3_600_000).toISOString().slice(0, 10);
