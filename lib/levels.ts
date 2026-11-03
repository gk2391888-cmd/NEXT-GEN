import type { Difficulty } from './types';

/**
 * Question levels a student can practise: one difficulty at a time, or all of them mixed.
 * Shared by the server (week lists) and the browser (practice, mock tests).
 */
export type Level = Difficulty | 'mixed';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const LEVELS: { id: Level; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'mixed', label: 'Mixed' },
];

export const DEFAULT_LEVEL: Level = 'mixed';

export const isLevel = (v: unknown): v is Level => LEVELS.some((l) => l.id === v);

export type LevelCounts = Record<Difficulty, number>;

export function countByLevel(questions: { difficulty: Difficulty }[]): LevelCounts {
  const counts: LevelCounts = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) counts[q.difficulty]++;
  return counts;
}

/** How many questions a level has: one difficulty's count, or all of them for Mixed. */
export const levelCount = (counts: LevelCounts, level: Level) =>
  level === 'mixed' ? counts.easy + counts.medium + counts.hard : counts[level];

/** A week's questions at one level. Mixed is every question, easy first and hard last. */
export function questionsAtLevel<T extends { difficulty: Difficulty }>(questions: T[], level: Level): T[] {
  if (level !== 'mixed') return questions.filter((q) => q.difficulty === level);
  return DIFFICULTIES.flatMap((d) => questions.filter((q) => q.difficulty === d));
}

/** The level of a set of questions: their one difficulty, or Mixed when they differ. */
export function levelOf(questions: { difficulty: Difficulty }[]): Level {
  const first = questions[0]?.difficulty;
  return first && questions.every((q) => q.difficulty === first) ? first : 'mixed';
}

export const levelLabel = (level: Level) => LEVELS.find((l) => l.id === level)?.label ?? level;

/** The chip colour for a difficulty, the same everywhere questions show one. */
export const DIFFICULTY_CHIP: Record<Difficulty, string> = { easy: 'chip-teal', medium: 'chip-yellow', hard: 'chip-red' };
