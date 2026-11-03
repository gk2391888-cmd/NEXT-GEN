import type { ModelTier } from '@/lib/ai/features';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** What a feature asks the AI layer for. No vendor or model names: just the tier. */
export type GenerateRequest = {
  tier: ModelTier;
  /** Instructions for the model (sent as the system message). */
  system: string;
  messages: ChatMessage[];
  maxOutputTokens: number;
  temperature?: number;
};

export type GenerateResult = {
  text: string;
  /** "provider:model" that answered, for logs. */
  model: string;
  /** Prompt + completion tokens, when the provider reports them. */
  tokens: number;
};

/** Why a call failed, so the caller can try the next model and log something useful. */
export type AiErrorKind = 'config' | 'auth' | 'rate_limit' | 'timeout' | 'upstream' | 'empty';

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: AiErrorKind,
    readonly model: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}
