import type { Subject } from './types';

/** The student's current-term subjects first (in catalogue order), then the rest. */
export function orderSubjects(subjects: Subject[], current: string[] = []): Subject[] {
  if (!current.length) return subjects;
  return [...subjects.filter((s) => current.includes(s.id)), ...subjects.filter((s) => !current.includes(s.id))];
}
