import 'server-only';
import type { ModelTier } from '@/lib/ai/features';
import { chatCompletion } from './chat-completions';
import { modelsFor } from './models';
import { AiError, type GenerateRequest, type GenerateResult } from './types';

/** Each model gets this long; two tries still fit inside a 60s serverless function. */
const TIMEOUT_MS = 25_000;

/** True when at least one model is available for the tier. */
export const canGenerate = (tier: ModelTier) => modelsFor(tier).length > 0;

/**
 * Asks the tier's primary model, then each fallback in turn if one fails.
 * Throws the last error when all of them fail.
 */
export async function generate({ tier, system, messages, maxOutputTokens, temperature = 0.3 }: GenerateRequest): Promise<GenerateResult> {
  const models = modelsFor(tier);
  if (!models.length) throw new AiError(`No model is configured for the "${tier}" tier`, 'config', tier);

  let lastError: unknown;
  for (const ref of models) {
    try {
      return await chatCompletion(ref, { system, messages, maxOutputTokens, temperature, timeoutMs: TIMEOUT_MS });
    } catch (error) {
      lastError = error;
      console.error(`[ai] ${ref.label} failed:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError;
}
