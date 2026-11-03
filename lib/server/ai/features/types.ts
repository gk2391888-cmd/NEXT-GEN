import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeatureLimits } from '@/lib/ai/features';
import type { ChatMessage, GenerateResult } from '../types';

/**
 * What a feature provides: how to turn the student's request into a prompt,
 * and what to send back. Auth, plans, limits, model choice and fallbacks are
 * handled once for every feature, in ../handler.ts.
 */
export type FeatureHandler<Output> = {
  /** Validates the request against the plan's limits. Return { error } for bad input (it doesn't use up quota). */
  prepare(
    body: unknown,
    context: { limits: FeatureLimits; userId: string; admin: SupabaseClient },
  ): Promise<{ system: string; messages: ChatMessage[] } | { error: string }>;
  /** What the browser receives on success. */
  respond(result: GenerateResult): Output;
};
