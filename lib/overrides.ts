'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getSupabase } from './supabase/client';
import { useQuestionLang } from './question-lang';
import { applyPatch, localize, type QuestionPatch } from './question-text';
import type { Question } from './types';

export { applyPatch, type QuestionPatch } from './question-text';

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

/** The questions as students see them: with any admin corrections applied, in the student's chosen language. */
export function useCorrectedQuestions<T extends Question>(questions: T[]): T[] {
  const current = useSyncExternalStore(subscribe, () => overrides, () => EMPTY);
  const lang = useQuestionLang();
  return useMemo(() => questions.map((q) => localize(applyPatch(q, current[q.id]), lang)), [questions, current, lang]);
}

export function getOverride(id: string): QuestionPatch | undefined {
  return overrides[id];
}
