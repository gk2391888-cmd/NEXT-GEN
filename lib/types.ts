export type Subject = {
  id: string;
  code: string;
  name: string;
  short: string;
  icon: string;
  /** Unset when all 12 weeks are written; `partial` while some weeks are still to come; `planned` before any notes exist. */
  status?: 'partial' | 'planned';
};

/** A stage of a programme (Foundation, a Diploma, the Degree), with its subjects in catalogue order. */
export type ProgrammeLevel = { id: string; name: string; subjects: string[] };

/** An IITM BS programme. Subjects are shared by id, so a course in two programmes keeps one set of progress. */
export type Programme = {
  id: string;
  name: string;
  short: string;
  /** Course codes this programme uses for shared subjects, e.g. English I is HS1101 in Electronic Systems. */
  codes?: Record<string, string>;
  levels: ProgrammeLevel[];
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

export type WeekRef = {
  week: number;
  title: string;
  questionCount: number;
  /** Questions at each difficulty, for the Easy / Medium / Hard choice on practice. */
  levels?: Record<Difficulty, number>;
};
