'use client';

import { authedFetch } from '@/lib/supabase/client';
import type { AiFeatureId, AiResponse } from './features';

/**
 * Calls an AI feature as the signed-in student. Every feature goes through
 * /api/ai/<feature>, so components never know which model or vendor answers.
 */
export async function askAi<T>(feature: AiFeatureId, input: unknown): Promise<AiResponse<T>> {
  try {
    const res = await authedFetch(`/api/ai/${feature}`, { method: 'POST', body: JSON.stringify(input) });
    return (await res.json()) as AiResponse<T>;
  } catch {
    return { ok: false, code: 'failed', message: 'Check your internet connection and try again.' };
  }
}
