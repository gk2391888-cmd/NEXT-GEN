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

/** Consecutive days (ending today or yesterday) with at least one answer. */
export function studyStreak(answers: AnswerRecord[], today = new Date()): number {
  const days = new Set(answers.map((a) => a.at.slice(0, 10)));
  const cursor = new Date(today);
  if (!days.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(isoDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
