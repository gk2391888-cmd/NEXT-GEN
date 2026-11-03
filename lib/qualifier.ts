/**
 * The IITM BS qualifier exams: which courses each covers, the published rules, and NEXT GEN's
 * mock papers for them. Shared by the server and the browser (no questions in here; those are in
 * content/qualifier/ and read by lib/qualifier-content.ts).
 *
 * Facts below were checked on the official admissions pages on 4 Nov 2026 (see QUALIFIER_SOURCES).
 * They change from term to term, so every page that shows them also tells students to check the official site.
 */
import config from '@/content/qualifier/qualifiers.json';

/**
 * The next qualifier exam date (YYYY-MM-DD), used for the countdown and the study plan.
 * Change only this when the date changes. Students are told to confirm their own date on their hall ticket.
 */
export const QUALIFIER_EXAM_DATE = '2026-11-15';

/** When the facts on the qualifier pages were last checked against the official site. */
export const QUALIFIER_FACTS_CHECKED = '4 November 2026';

export const QUALIFIER_SOURCES = [
  { label: 'BS in Data Science and Applications: admissions', href: 'https://study.iitm.ac.in/ds/admissions.html' },
  { label: 'BS in Electronic Systems: admissions', href: 'https://study.iitm.ac.in/es/admissions.html' },
  { label: 'BS in Management and Data Science: admissions', href: 'https://study.iitm.ac.in/mg/admissions.html' },
  { label: 'BS in Aeronautics and Space Technology: admissions', href: 'https://study.iitm.ac.in/ae/admissions.html' },
];

export type QualifierId = 'ds' | 'es';

export type QualifierSection = {
  /** Section id inside a mock paper, e.g. "math1"; question ids are `<mock>-<section>-q<n>`. */
  id: string;
  name: string;
  short: string;
  /** The NEXT GEN subject with week 1–4 notes and practice for this course, when there is one. */
  subjectId?: string;
};

export type QualifierMock = {
  id: string;
  qualifier: QualifierId;
  title: string;
  minutes: number;
  /** Pro mocks are served by /api/pro/qualifier/<id> after a plan check; free ones are in the page. */
  pro?: boolean;
};

export type Qualifier = {
  id: QualifierId;
  /** The programme(s) whose qualifier this is. */
  title: string;
  short: string;
  programmes: { name: string; href: string }[];
  /** In the order they appear in our mock papers. */
  sections: QualifierSection[];
  /** Anything specific to this qualifier that the page should say. */
  note?: string;
};

// The qualifiers and their mocks live in content/qualifier/qualifiers.json, so scripts/validate-content.mjs checks
// the mock papers against the same list.
export const QUALIFIERS = config.qualifiers as Qualifier[];
export const QUALIFIER_MOCKS = config.mocks as QualifierMock[];

/** Mock attempts are stored like course mock tests, under this subject id (test_attempts.subject_id). */
export const QUALIFIER_TEST_SUBJECT = 'qualifier';

export const getQualifier = (id: string) => QUALIFIERS.find((q) => q.id === id);
export const getQualifierMock = (id: string) => QUALIFIER_MOCKS.find((m) => m.id === id);
export const mocksFor = (id: QualifierId) => QUALIFIER_MOCKS.filter((m) => m.qualifier === id);

/**
 * Published rules (identical on the DS, ES and MG admissions pages), in %: the assignment average needed in
 * every course to get a hall ticket, and the exam score needed in each course and on average to pass.
 */
export const PASS_RULES = [
  { category: 'General', eachCourse: 40, average: 50, assignments: 40 },
  { category: 'OBC-NCL / EWS', eachCourse: 35, average: 45, assignments: 35 },
  { category: 'SC / ST / PwD (40% disability)', eachCourse: 30, average: 40, assignments: 30 },
];

/** Courses allowed in the first term, by the average qualifier exam score. */
export const COURSE_LIMITS = [
  { range: 'Minimum required up to 50%', courses: 2 },
  { range: '50% up to 70%', courses: 3 },
  { range: '70% or more', courses: 4 },
];

/** Whole days from today (local date) until the exam day; 0 on the day itself. */
export function daysToExam(today: Date, examDate = QUALIFIER_EXAM_DATE): number {
  const [y, m, d] = examDate.split('-').map(Number);
  const exam = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((exam - now) / 86_400_000);
}

/** "15 November 2026" */
export const formatExamDate = (date = QUALIFIER_EXAM_DATE) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
