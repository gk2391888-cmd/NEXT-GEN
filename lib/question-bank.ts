'use client';

import { useEffect, useState } from 'react';
import type { Question } from './types';
import { fetchProContent } from './pro-content';

export type BankQuestion = Question & { subjectId: string; week: number; weekTitle: string };

let cache: Promise<BankQuestion[]> | null = null;

/** All questions, fetched once from /api/pro/questions (trial, Pro and admins only) and shared. */
export function loadQuestionBank(): Promise<BankQuestion[]> {
  cache ??= fetchProContent<{ questions: BankQuestion[] }>('/api/pro/questions')
    .then((d) => d.questions)
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
