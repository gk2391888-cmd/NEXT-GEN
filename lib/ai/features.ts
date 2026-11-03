/**
 * Every AI feature in the product, with its Free and Pro limits. This is the
 * one place to change "how much AI does a plan get": the server enforces these
 * numbers and the UI shows them, so they can't drift apart.
 *
 * Shared by the browser and the server; no secrets here.
 */
import type { Access } from '@/lib/plans';

/**
 * Which kind of model a feature needs. Features ask for a tier, never a vendor
 * or model name; lib/server/ai/models.ts decides which model serves each tier.
 */
export type ModelTier = 'smart' | 'fast';

export type FeatureLimits = {
  /** Requests per day (India time, resets at midnight). */
  perDay: number;
  /** Seconds a student must wait between two requests. */
  cooldownSec: number;
  /** Previous chat messages sent along for context (older ones are dropped). */
  historyMessages: number;
  /** Longest message a student can send. */
  maxInputChars: number;
  /** Longest answer the model may write. */
  maxOutputTokens: number;
};

export type AiFeature = {
  id: string;
  name: string;
  model: ModelTier;
  /** Limits per plan. A plan that's missing can't use the feature. */
  limits: Partial<Record<Access, FeatureLimits>>;
};

export const AI_FEATURES = {
  doubt: {
    id: 'doubt',
    name: 'AI Doubt Solver',
    model: 'smart',
    limits: {
      free: { perDay: 5, cooldownSec: 15, historyMessages: 6, maxInputChars: 1500, maxOutputTokens: 900 },
      pro: { perDay: 200, cooldownSec: 3, historyMessages: 12, maxInputChars: 4000, maxOutputTokens: 1800 },
    },
  },
} as const satisfies Record<string, AiFeature>;

export type AiFeatureId = keyof typeof AI_FEATURES;

export const isAiFeatureId = (id: string): id is AiFeatureId => id in AI_FEATURES;

/** The limits a plan gets for a feature, or null when the plan can't use it. */
export function limitsFor(feature: AiFeatureId, access: Access): FeatureLimits | null {
  return (AI_FEATURES[feature].limits as AiFeature['limits'])[access] ?? null;
}

/** Shape of every /api/ai/<feature> response, success or failure. */
export type AiUsage = { used: number; limit: number };

export type AiErrorCode =
  | 'login_required'
  | 'not_in_plan'
  | 'limit'
  | 'cooldown'
  | 'invalid'
  | 'unavailable'
  | 'failed';

export type AiResponse<T> =
  | { ok: true; data: T; usage: AiUsage }
  | { ok: false; code: AiErrorCode; message: string; usage?: AiUsage; retryAfter?: number };
