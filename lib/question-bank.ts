'use client';

import { useEffect, useState } from 'react';
import type { Question } from './types';

export type BankQuestion = Question & { subjectId: string; week: number; weekTitle: string };

let cache: Promise<BankQuestion[]> | null = null;

/** All questions, fetched once from /api/content/questions and shared. */
export function loadQuestionBank(): Promise<BankQuestion[]> {
  cache ??= fetch('/api/content/questions')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .catch((error) => {
      cache = null;
      throw error;
    });
  return cache;
}

export function useQuestionBank(): BankQuestion[] | null {
  const [bank, setBank] = useState<BankQuestion[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadQuestionBank().then((b) => alive && setBank(b)).catch(() => alive && setBank([]));
    return () => {
      alive = false;
    };
  }, []);
  return bank;
}
