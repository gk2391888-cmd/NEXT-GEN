import type { Question } from './types';

/** Today's question as the browser first gets it: no answer, no explanation (they come with the result). */
export type DailyQuestion = {
  day: string;
  id: string;
  subjectId: string;
  subjectName: string;
  week: number;
  weekTitle: string;
  difficulty: Question['difficulty'];
  question: string;
  code?: string;
  options: string[];
  en?: { question: string; options: string[] };
};

export type DailyResult = {
  pick: number;
  correct: boolean;
  answer: number;
  explanation: string;
  en?: { explanation: string };
  /** Share of logged-in students who got it right today, once a few have answered. */
  percentRight: number | null;
};

/** Below this many answers the "% got it right" figure isn't shown. */
export const MIN_ANSWERS_FOR_STATS = 5;

/** Turns the pre-answer question and its result into a full Question for QuestionView and Explanation. */
export function dailyAsQuestion(q: DailyQuestion, result?: DailyResult): Question {
  return {
    id: q.id,
    question: q.question,
    code: q.code,
    options: q.options,
    answer: result?.answer ?? -1,
    explanation: result?.explanation ?? '',
    difficulty: q.difficulty,
    week: q.week,
    en: q.en ? { ...q.en, explanation: result?.en?.explanation ?? '' } : undefined,
  };
}
