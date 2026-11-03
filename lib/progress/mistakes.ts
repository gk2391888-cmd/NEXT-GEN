import type { AnswerRecord } from './types';

/**
 * Spaced repetition for wrong answers: a question you got wrong is due straight
 * away; each correct answer after that pushes it back (3 days, then 7), and
 * three in a row clears it.
 */
const INTERVAL_DAYS = [0, 3, 7];
const DAY_MS = 86_400_000;

export type Mistake = {
  questionId: string;
  subjectId: string;
  week: number;
  /** Correct answers in a row since the last wrong one. */
  streak: number;
  dueAt: number;
  lastWrongAt: number;
};

export function computeMistakes(answers: AnswerRecord[]): Mistake[] {
  const byQuestion = new Map<string, AnswerRecord[]>();
  for (const a of answers) byQuestion.set(a.questionId, [...(byQuestion.get(a.questionId) ?? []), a]);

  const mistakes: Mistake[] = [];
  for (const [questionId, list] of byQuestion) {
    list.sort((a, b) => a.at.localeCompare(b.at));
    let lastWrong = -1;
    list.forEach((a, i) => !a.correct && (lastWrong = i));
    if (lastWrong === -1) continue;

    const streak = list.length - 1 - lastWrong;
    if (streak >= INTERVAL_DAYS.length) continue;

    const last = list[list.length - 1];
    const lastWrongAt = Date.parse(list[lastWrong].at);
    mistakes.push({
      questionId,
      subjectId: last.subjectId,
      week: last.week,
      streak,
      dueAt: Date.parse(last.at) + INTERVAL_DAYS[streak] * DAY_MS,
      lastWrongAt,
    });
  }
  return mistakes.sort((a, b) => a.dueAt - b.dueAt);
}

export const isDue = (m: Mistake, now = Date.now()) => m.dueAt <= now;
