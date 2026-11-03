import type { Question, QuestionLang, QuestionText } from './types';

/**
 * Fields an admin can correct on a question; everything else comes from the built-in content.
 * The top-level text fields are the Hinglish, `en` the English. Answer and code are shared by both.
 */
export type QuestionPatch = Partial<Pick<Question, 'question' | 'code' | 'options' | 'answer' | 'explanation'>> & {
  en?: Partial<QuestionText>;
};

/** The question with an admin correction applied, in both languages. Shared by the browser and the server. */
export function applyPatch<T extends Question>(q: T, patch?: QuestionPatch): T {
  if (!patch) return q;
  const { en, ...rest } = patch;
  return { ...q, ...rest, en: q.en && en ? { ...q.en, ...en } : q.en };
}

/** The question with its text in the chosen language. Hinglish is the fallback if the English is missing. */
export function localize<T extends Question>(q: T, lang: QuestionLang): T {
  return lang === 'en' && q.en ? { ...q, ...q.en } : q;
}
