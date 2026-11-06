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

/** Practice days in a row earn a streak freeze; a student can hold this many. */
export const FREEZE_EVERY_DAYS = 7;
export const MAX_FREEZES = 2;

export type StreakInfo = {
  /** Days in a row with at least one answer (India time), ending today or yesterday; frozen days keep it going. */
  streak: number;
  /** Streak freezes in hand. */
  freezes: number;
  /** The most recent day a freeze covered, if any (YYYY-MM-DD). */
  lastFrozen: string | null;
};

/**
 * The streak with freezes, worked out from the answer history alone (no stored state): every
 * FREEZE_EVERY_DAYS practice days in a row earn a freeze (at most MAX_FREEZES), and a missed
 * day uses one instead of breaking the streak. Today never breaks it: the day isn't over.
 */
export function streakInfo(answers: AnswerRecord[], today = new Date()): StreakInfo {
  const days = new Set(answers.map((a) => istDay(Date.parse(a.at))));
  if (!days.size) return { streak: 0, freezes: 0, lastFrozen: null };
  const todayKey = istDay(today.getTime());
  const first = [...days].sort()[0];
  let streak = 0;
  let run = 0;
  let freezes = 0;
  let lastFrozen: string | null = null;
  for (let t = Date.parse(`${first}T12:00:00Z`); istDay(t) <= todayKey; t += DAY_MS) {
    const key = istDay(t);
    if (days.has(key)) {
      streak++;
      run++;
      if (run % FREEZE_EVERY_DAYS === 0 && freezes < MAX_FREEZES) freezes++;
    } else if (key === todayKey) {
      break;
    } else if (streak > 0 && freezes > 0) {
      freezes--;
      lastFrozen = key;
      run = 0;
    } else {
      streak = 0;
      run = 0;
    }
  }
  return { streak, freezes, lastFrozen };
}

/** Consecutive practice days (with streak freezes), ending today or yesterday, India time. */
export function studyStreak(answers: AnswerRecord[], today = new Date()): number {
  return streakInfo(answers, today).streak;
}

const DAY_MS = 86_400_000;
/** The calendar day in India (UTC+5:30), so days roll over at midnight like the AI limits do. */
const istDay = (t: number) => new Date(t + 5.5 * 3_600_000).toISOString().slice(0, 10);
