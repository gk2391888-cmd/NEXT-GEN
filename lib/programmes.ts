import data from '@/content/programmes.json';
import subjectList from '@/content/subjects.json';
import type { Programme, ProgrammeLevel, Subject } from './types';

/** Every programme, from content/programmes.json. Shared by the server and the browser. */
export const PROGRAMMES = data.programmes as Programme[];

/** Data Science, the programme the app started with. */
export const DEFAULT_PROGRAMME = PROGRAMMES[0];

/**
 * What a student is preparing for: one level of one programme ("es/foundation"), or the qualifier exam
 * for students not admitted yet. The qualifier covers the first Foundation weeks, so its subject lists
 * are Data Science Foundation's, and its own pages live under /qualifier.
 */
export type Choice = { id: string; programme: Programme; level: ProgrammeLevel; qualifier: boolean };

export const QUALIFIER = 'qualifier';
export const QUALIFIER_PATH = '/qualifier';
export const DEFAULT_CHOICE_ID = `${DEFAULT_PROGRAMME.id}/${DEFAULT_PROGRAMME.levels[0].id}`;

const planned = new Set((subjectList as { id: string; status?: string }[]).filter((s) => s.status === 'planned').map((s) => s.id));

/** Every option, in the order the onboarding step and the switch show them. */
export const CHOICES = [
  ...PROGRAMMES.flatMap((p) =>
    p.levels.map((l) => ({
      id: `${p.id}/${l.id}`,
      programme: p,
      label: `${p.short} – ${l.name}`,
      /** No notes in any of the level's subjects yet. */
      comingSoon: l.subjects.every((id) => planned.has(id)),
    })),
  ),
  { id: QUALIFIER, programme: undefined, label: 'Qualifier exam (not admitted yet)', comingSoon: false },
];

/** Reads a saved choice. Accepts a bare programme id (an older save) as that programme's first level. */
export function parseChoice(value: string | null | undefined): Choice | undefined {
  if (!value) return undefined;
  if (value === QUALIFIER) return { id: QUALIFIER, programme: DEFAULT_PROGRAMME, level: DEFAULT_PROGRAMME.levels[0], qualifier: true };
  const [programmeId, levelId] = value.split('/');
  const programme = PROGRAMMES.find((p) => p.id === programmeId);
  const level = programme && (levelId ? programme.levels.find((l) => l.id === levelId) : programme.levels[0]);
  return programme && level ? { id: `${programme.id}/${level.id}`, programme, level, qualifier: false } : undefined;
}

export const DEFAULT_CHOICE = parseChoice(DEFAULT_CHOICE_ID)!;

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
