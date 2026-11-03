'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getSupabase } from './supabase/client';
import type { Question } from './types';

/** Fields an admin can correct on a question; everything else comes from the built-in content. */
export type QuestionPatch = Partial<Pick<Question, 'question' | 'code' | 'options' | 'answer' | 'explanation'>>;

type Overrides = Record<string, QuestionPatch>;

const EMPTY: Overrides = {};
let overrides: Overrides = EMPTY;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Loads every admin correction once per page load (the table stays small). */
export function loadOverrides(force = false): Promise<void> {
  if (loading && !force) return loading;
  loading = (async () => {
    const { data, error } = await getSupabase().from('content_overrides').select('key, data');
    if (error) return;
    overrides = Object.fromEntries((data ?? []).filter((r) => r.key.startsWith('q:')).map((r) => [r.key.slice(2), r.data as QuestionPatch]));
    listeners.forEach((l) => l());
  })();
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  loadOverrides();
  return () => listeners.delete(listener);
}

export function applyPatch(q: Question, patch?: QuestionPatch): Question {
  return patch ? { ...q, ...patch } : q;
}

/** The questions with any admin corrections applied. */
export function useCorrectedQuestions<T extends Question>(questions: T[]): T[] {
  const current = useSyncExternalStore(subscribe, () => overrides, () => EMPTY);
  return useMemo(() => questions.map((q) => (current[q.id] ? { ...q, ...current[q.id] } : q)), [questions, current]);
}

export function getOverride(id: string): QuestionPatch | undefined {
  return overrides[id];
}
