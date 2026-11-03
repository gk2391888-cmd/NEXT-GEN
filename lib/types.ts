export type Subject = {
  id: string;
  code: string;
  name: string;
  short: string;
  icon: string;
};

export type Difficulty = 'easy' | 'medium' | 'hard';

/** The languages a question can be shown in: English, or the original Hinglish. */
export type QuestionLang = 'en' | 'hi';

/** The parts of a question that are translated. Answer, code and difficulty are the same in both languages. */
export type QuestionText = { question: string; options: string[]; explanation: string };

export type Question = {
  id: string;
  /** Question, options and explanation are the Hinglish original; `en` has the English. */
  question: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: Difficulty;
  /** The English text, merged in by the content loader from content/weeks-en/<subject>.json. */
  en?: QuestionText;
  /** Filled in by the content loader; not stored in the JSON. */
  week?: number;
};

export type Week = {
  week: number;
  title: string;
  summary: string;
  readMinutes: number;
  concepts: string[];
  example: { problem: string; steps: string[]; code?: string };
  mistakes: string[];
  revision: string[];
  questions: Question[];
};

export type SubjectContent = { subjectId: string; weeks: Week[] };

export type WeekRef = { week: number; title: string; questionCount: number };
