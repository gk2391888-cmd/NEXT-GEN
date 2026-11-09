'use client';

import { useEffect, useState } from 'react';
import type { Question } from './types';
import { fetchProContent } from './pro-content';

export type BankQuestion = Question & { subjectId: string; week: number; weekTitle: string };

let cache: Promise<BankQuestion[]> | null = null;

/**
 * Every question (several MB), fetched once from /api/pro/questions and shared. Only the admin
 * panel's editor needs this; pages for students use loadQuestions or searchQuestions instead.
 */
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

/** Questions already fetched on this page, by id. */
const byId = new Map<string, BankQuestion>();

/** Just these questions (trial, Pro and admins only), fetching only the ones this page hasn't got yet. */
export async function loadQuestions(ids: string[]): Promise<BankQuestion[]> {
  const missing = [...new Set(ids)].filter((id) => !byId.has(id));
  for (let i = 0; i < missing.length; i += 300) {
    const batch = missing.slice(i, i + 300);
    const { questions } = await fetchProContent<{ questions: BankQuestion[] }>(`/api/pro/questions?ids=${batch.map(encodeURIComponent).join(',')}`);
    questions.forEach((q) => byId.set(q.id, q));
  }
  return ids.map((id) => byId.get(id)).filter((q): q is BankQuestion => q !== undefined);
}

export type QuestionHit = Pick<BankQuestion, 'id' | 'subjectId' | 'week' | 'weekTitle' | 'question'> & { en?: { question: string } };

/** The best few questions containing every search word, searched on the server. */
export async function searchQuestions(query: string, subjects: string[], maxWeek?: number): Promise<QuestionHit[]> {
  const params = new URLSearchParams({ q: query, subjects: subjects.join(',') });
  if (maxWeek) params.set('weeks', String(maxWeek));
  const { hits } = await fetchProContent<{ hits: QuestionHit[] }>(`/api/pro/questions?${params}`);
  return hits;
}
