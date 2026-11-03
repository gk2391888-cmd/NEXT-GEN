import 'server-only';

/**
 * Where each AI vendor lives. Every one of them speaks the OpenAI Chat
 * Completions format, so they all share one client (chat-completions.ts);
 * adding a vendor is one entry here, not a new file.
 */
export type ProviderPreset = {
  baseUrl: string;
  /** Env var that overrides baseUrl (for self-hosted or custom endpoints). */
  baseUrlEnv?: string;
  /** Env var holding the API key. */
  keyEnv: string;
  /** Newer APIs use max_completion_tokens; others still use max_tokens. */
  tokenParam: 'max_tokens' | 'max_completion_tokens';
  /** Extra request fields for particular models. */
  params?: (model: string) => Record<string, unknown>;
};

export const PROVIDERS = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    tokenParam: 'max_completion_tokens',
    // GPT-OSS models think before answering; "low" keeps answers quick and leaves the token budget for the reply.
    params: (model) => (model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    keyEnv: 'OPENAI_API_KEY',
    tokenParam: 'max_completion_tokens',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    tokenParam: 'max_tokens',
  },
  gemini: {
    // Google's OpenAI-compatible endpoint.
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyEnv: 'GEMINI_API_KEY',
    tokenParam: 'max_tokens',
  },
  /** Anything else that speaks the same format (DeepSeek, Together, Mistral, a local Ollama…). */
  custom: {
    baseUrl: 'http://localhost:11434/v1',
    baseUrlEnv: 'AI_CUSTOM_BASE_URL',
    keyEnv: 'AI_CUSTOM_API_KEY',
    tokenParam: 'max_tokens',
  },
} satisfies Record<string, ProviderPreset>;

export type ProviderId = keyof typeof PROVIDERS;

export const isProviderId = (id: string): id is ProviderId => id in PROVIDERS;
