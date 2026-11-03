'use client';

import { useSyncExternalStore } from 'react';
import {
  emptyProgress,
  weekKey,
  type ActiveTest,
  type AnswerRecord,
  type ProgressState,
  type TestAttempt,
  type WeekStatus,
} from './types';

const STORAGE_KEY = 'nextgen-progress-v2';
/** Keeps the browser copy small; older answers matter less for weak-topic detection. */
const MAX_ANSWERS = 3000;
const MAX_TESTS = 200;

const SERVER_SNAPSHOT = emptyProgress();
let snapshot: ProgressState | null = null;
const listeners = new Set<() => void>();

function read(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return { ...emptyProgress(), ...parsed, version: 2 };
  } catch {
    return emptyProgress();
  }
}

function getSnapshot(): ProgressState {
  if (!snapshot) snapshot = read();
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = read();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function update(change: (draft: ProgressState) => ProgressState) {
  const next = change(getSnapshot());
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode): progress still works for this tab.
  }
  listeners.forEach((l) => l());
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

export const progress = {
  setWeek(subjectId: string, week: number, patch: WeekStatus) {
    const key = weekKey(subjectId, week);
    update((s) => ({ ...s, weeks: { ...s.weeks, [key]: { ...s.weeks[key], ...patch } } }));
  },

  visit(subjectId: string, week: number) {
    update((s) => ({ ...s, lastVisited: { subjectId, week, at: new Date().toISOString() } }));
  },

  recordAnswers(records: AnswerRecord[]) {
    update((s) => ({ ...s, answers: [...s.answers, ...records].slice(-MAX_ANSWERS) }));
  },

  saveActiveTest(key: string, active: ActiveTest) {
    update((s) => ({ ...s, active: { ...s.active, [key]: active } }));
  },

  discardActiveTest(key: string) {
    update((s) => {
      const { [key]: _removed, ...rest } = s.active;
      return { ...s, active: rest };
    });
  },

  submitTest(key: string, attempt: TestAttempt, answers: AnswerRecord[]) {
    update((s) => {
      const { [key]: _removed, ...rest } = s.active;
      return {
        ...s,
        active: rest,
        tests: [...s.tests, attempt].slice(-MAX_TESTS),
        answers: [...s.answers, ...answers].slice(-MAX_ANSWERS),
      };
    });
  },

  reset() {
    update(() => emptyProgress());
  },
};
