export type Subject = {
  id: string;
  code: string;
  name: string;
  short: string;
  icon: string;
  color: string;
  tone: string;
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Question = {
  id: string;
  question: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: Difficulty;
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
