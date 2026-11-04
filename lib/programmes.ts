import data from '@/content/programmes.json';
import subjectList from '@/content/subjects.json';
import { QUALIFIERS, type QualifierId } from './qualifier';
import type { Programme, ProgrammeLevel, Subject, WeekRef } from './types';

/** Every programme, from content/programmes.json. Shared by the server and the browser. */
export const PROGRAMMES = data.programmes as Programme[];

/** Data Science, the programme the app started with. */
export const DEFAULT_PROGRAMME = PROGRAMMES[0];

/**
 * What a student is preparing for: one level of one programme ("es/foundation"), or one qualifier exam
 * ("qualifier/ds", "qualifier/es") for students not admitted yet. A qualifier's level is its four courses,
 * and only their first `weeks` weeks, since that's what the qualifier covers; its own pages live under /qualifier.
 */
export type Choice = {
  id: string;
  programme: Programme;
  level: ProgrammeLevel;
  /** The qualifier being prepared for, or null for an admitted student. */
  qualifier: QualifierId | null;
  /** Only weeks 1 to this are part of the choice; undefined means every week. */
  weeks?: number;
};

export const QUALIFIER = 'qualifier';
export const QUALIFIER_PATH = '/qualifier';
export const DEFAULT_CHOICE_ID = `${DEFAULT_PROGRAMME.id}/${DEFAULT_PROGRAMME.levels[0].id}`;
/** The qualifier covers the first four weeks of each of its courses. */
export const QUALIFIER_WEEK_COUNT = 4;

/** Which qualifier admits to each programme (Management uses the Data Science one, Aeronautics the Electronic Systems one). */
const QUALIFIER_OF: Record<string, QualifierId> = { ds: 'ds', mg: 'ds', es: 'es', ae: 'es' };

const planned = new Set((subjectList as { id: string; status?: string }[]).filter((s) => s.status === 'planned').map((s) => s.id));

/** Every option, in the order the onboarding step and the switch show them. */
export const CHOICES = [
  ...PROGRAMMES.flatMap((p) =>
    p.levels.map((l) => ({
      id: `${p.id}/${l.id}`,
      programme: p as Programme | undefined,
      label: `${p.short} – ${l.name}`,
      /** No notes in any of the level's subjects yet. */
      comingSoon: l.subjects.every((id) => planned.has(id)),
    })),
  ),
  ...QUALIFIERS.map((q) => ({
    id: `${QUALIFIER}/${q.id}`,
    programme: undefined,
    label: `Qualifier – ${PROGRAMMES.find((p) => p.id === q.id)?.short ?? q.short}`,
    comingSoon: false,
  })),
];

export const qualifierChoiceId = (id: QualifierId) => `${QUALIFIER}/${id}`;

/** The qualifier a programme's students take, for pointing a student at the right one. */
export const qualifierFor = (programmeId: string): QualifierId => QUALIFIER_OF[programmeId] ?? 'ds';

/**
 * Reads a saved choice. Accepts a bare programme id (an older save) as that programme's first level,
 * and a bare "qualifier" (saved before there were two) as the Data Science qualifier.
 */
export function parseChoice(value: string | null | undefined): Choice | undefined {
  if (!value) return undefined;
  const [first, second] = value.split('/');
  if (first === QUALIFIER) {
    const q = QUALIFIERS.find((x) => x.id === (second ?? 'ds'));
    const programme = q && PROGRAMMES.find((p) => p.id === q.id);
    if (!q || !programme) return undefined;
    const subjects = q.sections.flatMap((s) => (s.subjectId ? [s.subjectId] : []));
    return { id: qualifierChoiceId(q.id), programme, level: { id: QUALIFIER, name: q.title, subjects }, qualifier: q.id, weeks: QUALIFIER_WEEK_COUNT };
  }
  const programme = PROGRAMMES.find((p) => p.id === first);
  const level = programme && (second ? programme.levels.find((l) => l.id === second) : programme.levels[0]);
  return programme && level ? { id: `${programme.id}/${level.id}`, programme, level, qualifier: null } : undefined;
}

export const DEFAULT_CHOICE = parseChoice(DEFAULT_CHOICE_ID)!;

/** How the choice is named on screen: "Electronic Systems – Foundation", "Data Science qualifier". */
export const choiceLabel = (choice: Choice) => (choice.qualifier ? choice.level.name : `${choice.programme.short} – ${choice.level.name}`);

/**
 * A logged-in student's choice is kept in their profile's `subjects` list as `programme:<choice>`,
 * so it syncs across devices without a new column. Everything that reads `subjects` as subject ids
 * goes through `termSubjects()`.
 */
const TAG = 'programme:';

export const choiceInProfile = (subjects: string[] = []): string | undefined =>
  subjects.find((s) => s.startsWith(TAG))?.slice(TAG.length);

/** The profile's current-term subject ids, without the programme tag. */
export const termSubjects = (subjects: string[] = []): string[] => subjects.filter((s) => !s.startsWith(TAG));

export const withChoice = (subjects: string[], choiceId: string): string[] => [...termSubjects(subjects), `${TAG}${choiceId}`];

/** The chosen level's subjects in catalogue order, each with the code its programme knows it by. */
export function choiceSubjects(choice: Choice, subjects: Subject[]): Subject[] {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return choice.level.subjects.flatMap((id) => {
    const s = byId.get(id);
    return s ? [{ ...s, code: choice.programme.codes?.[id] ?? s.code }] : [];
  });
}

/** Whether a subject (and, given one, a week of it) is part of the choice. */
export function inChoice(choice: Choice, subjectId: string, week?: number): boolean {
  if (!choice.level.subjects.includes(subjectId)) return false;
  return week === undefined || choice.weeks === undefined || week <= choice.weeks;
}

/** The catalogue with each subject's weeks cut to the ones the choice covers (a qualifier's first four). */
export function choiceCatalog(choice: Choice, catalog: Record<string, WeekRef[]>): Record<string, WeekRef[]> {
  if (choice.weeks === undefined) return catalog;
  const max = choice.weeks;
  return Object.fromEntries(Object.entries(catalog).map(([id, weeks]) => [id, weeks.filter((w) => w.week <= max)]));
}

/** The tools in the sidebar that only some choices have. Every other page is for everyone. */
export type Tool = 'qualifier' | 'tests' | 'lab' | 'grades' | 'planner';

/**
 * Qualifier Prep is for qualifier students only. Course mock tests, the Exam Planner and the Grade Calculator are
 * for admitted students (qualifier students have their own mocks and their own plan to the exam date). The Coding
 * Lab's Python problems and OPPE sets are for the Data Science programme, Foundation and Diplomas alike.
 */
export function choiceHas(choice: Choice, tool: Tool): boolean {
  switch (tool) {
    case 'qualifier':
      return choice.qualifier !== null;
    case 'tests':
    case 'grades':
    case 'planner':
      return choice.qualifier === null;
    case 'lab':
      return choice.qualifier === null && choice.programme.id === 'ds';
  }
}

/** The first choice (not coming soon) that has a subject, for "switch to …" offers. Prefers the student's own programme. */
export function choiceWithSubject(subjectId: string, prefer?: Programme): (typeof CHOICES)[number] | undefined {
  const candidates = CHOICES.filter((c) => c.programme && !c.comingSoon && parseChoice(c.id)?.level.subjects.includes(subjectId));
  return candidates.find((c) => c.programme === prefer) ?? candidates[0];
}
