'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_LEVEL, isLevel, type Level } from './levels';

/**
 * The level a student practises at (Easy, Medium, Hard or Mixed), chosen on the practice pages.
 * Kept in this browser's localStorage like the question language, shared by every tab.
 */
const KEY = 'nextgen-practice-level';

const listeners = new Set<() => void>();
// The choice made on this page, so the switch works even when localStorage can't be written.
let memory: Level | null = null;

function read(): Level {
  try {
    const saved = window.localStorage.getItem(KEY);
    return isLevel(saved) ? saved : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
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

export function setPracticeLevel(level: Level) {
  try {
    window.localStorage.setItem(KEY, level);
  } catch {
    // Private mode: the choice lasts until the page is closed.
  }
  memory = level;
  listeners.forEach((l) => l());
}

export function usePracticeLevel(): Level {
  return useSyncExternalStore(subscribe, () => memory ?? read(), () => DEFAULT_LEVEL);
}
