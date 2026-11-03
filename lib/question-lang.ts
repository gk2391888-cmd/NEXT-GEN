'use client';

import { useSyncExternalStore } from 'react';
import type { QuestionLang } from './types';

/**
 * The language questions are shown in, chosen by each student: English (the default) or Hinglish.
 * Kept in this browser's localStorage, shared by every tab, and the same for every account on the device.
 */
const KEY = 'nextgen-question-lang';
export const DEFAULT_LANG: QuestionLang = 'en';

const listeners = new Set<() => void>();
// The choice made on this page, so the switch works even when localStorage can't be written.
let memory: QuestionLang | null = null;

function read(): QuestionLang {
  try {
    return window.localStorage.getItem(KEY) === 'hi' ? 'hi' : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
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

export function setQuestionLang(lang: QuestionLang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // Private mode: the choice lasts until the page is closed.
  }
  memory = lang;
  listeners.forEach((l) => l());
}

export function useQuestionLang(): QuestionLang {
  return useSyncExternalStore(subscribe, () => memory ?? read(), () => DEFAULT_LANG);
}

