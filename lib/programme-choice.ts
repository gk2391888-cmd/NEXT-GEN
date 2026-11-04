'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { progress, useProgress } from './progress/store';
import type { Profile } from './progress/types';
import { choiceCatalog, choiceInProfile, choiceSubjects, DEFAULT_CHOICE, inChoice, parseChoice, withChoice, type Choice } from './programmes';
import type { Programme, Subject, WeekRef } from './types';

/**
 * What the student is preparing for (see `Choice`). A logged-in student's choice lives in their profile,
 * so it follows them to every device; a guest's lives in this browser's localStorage and is copied to the
 * profile on sign-up. The profile wins when both exist, since it's the one other devices see.
 */
const KEY = 'nextgen-programme';

const listeners = new Set<() => void>();
// The choice made on this page, so the switch works even when localStorage can't be written.
let memory: string | null = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    memory = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Saves a choice id on this device and, for a logged-in student (`profile` loaded), in their account. */
export function setChoice(choiceId: string, profile?: Profile) {
  try {
    window.localStorage.setItem(KEY, choiceId);
  } catch {
    // Private mode: the choice lasts until the page is closed.
  }
  memory = choiceId;
  listeners.forEach((l) => l());
  if (profile && choiceInProfile(profile.subjects) !== choiceId) {
    progress.updateProfile({ ...profile, subjects: withChoice(profile.subjects, choiceId) });
  }
}

/** The raw choice saved on this device (null until the student picks), for the onboarding step. */
export function useLocalChoice(): string | null {
  return useSyncExternalStore(subscribe, () => memory ?? read(), () => null);
}

/** The student's choice, or Data Science Foundation (what everyone saw before programmes existed) until they pick. */
export function useChoice(): Choice {
  const state = useProgress();
  const local = useLocalChoice();
  return parseChoice(choiceInProfile(state.profile?.subjects)) ?? parseChoice(local) ?? DEFAULT_CHOICE;
}

/** False until the student has picked (they see Data Science Foundation meanwhile), so nothing is hidden from them yet. */
export function useChosen(): boolean {
  const state = useProgress();
  const local = useLocalChoice();
  return Boolean(parseChoice(choiceInProfile(state.profile?.subjects)) ?? parseChoice(local));
}

export function useProgramme(): Programme {
  return useChoice().programme;
}

/** The course code the chosen programme uses for a subject (English I is HS1101 in Electronic Systems, BSHS1001 in Data Science). */
export function useSubjectCode(subject: Subject): string {
  return useProgramme().codes?.[subject.id] ?? subject.code;
}

/** Only the chosen programme level's subjects (see `choiceSubjects`), for every page that lists subjects. */
export function useChoiceSubjects(subjects: Subject[]): Subject[] {
  const choice = useChoice();
  return useMemo(() => choiceSubjects(choice, subjects), [choice.id, subjects]); // eslint-disable-line react-hooks/exhaustive-deps -- choice is rebuilt each render; its id identifies it
}

/** The catalogue cut to the weeks the choice covers (a qualifier's first four), for every page that lists weeks. */
export function useChoiceCatalog(catalog: Record<string, WeekRef[]>): Record<string, WeekRef[]> {
  const choice = useChoice();
  return useMemo(() => choiceCatalog(choice, catalog), [choice.id, catalog]); // eslint-disable-line react-hooks/exhaustive-deps -- as above
}

/** Whether a subject, or a week of it, is part of the choice: for filtering answers, mistakes and tests. */
export function useInChoice(): (subjectId: string, week?: number) => boolean {
  const choice = useChoice();
  return useMemo(() => (subjectId: string, week?: number) => inChoice(choice, subjectId, week), [choice.id]); // eslint-disable-line react-hooks/exhaustive-deps -- as above
}
