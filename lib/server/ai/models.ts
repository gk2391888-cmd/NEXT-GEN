import 'server-only';
import type { ModelTier } from '@/lib/ai/features';
import { isProviderId, PROVIDERS, type ProviderId } from './providers';

/**
 * Which model serves each tier, across the whole product. Change a line here
 * (or set the env var, no code change needed) and every feature on that tier
 * switches model. Format: "provider:model", first is primary, the rest are
 * fallbacks tried in order if it fails.
 */
const DEFAULT_MODELS: Record<ModelTier, string[]> = {
  smart: ['groq:openai/gpt-oss-120b'],
  fast: ['groq:openai/gpt-oss-20b'],
};

/** Env overrides, e.g. AI_MODEL_SMART="groq:openai/gpt-oss-120b, gemini:gemini-2.5-flash". */
const ENV_KEYS: Record<ModelTier, string> = { smart: 'AI_MODEL_SMART', fast: 'AI_MODEL_FAST' };

export type ModelRef = { provider: ProviderId; model: string; apiKey: string; baseUrl: string; label: string };

/** Parses "provider:model" (the model part may itself contain ":" or "/"). */
function parse(ref: string): { provider: string; model: string } | null {
  const i = ref.indexOf(':');
  return i > 0 ? { provider: ref.slice(0, i).trim().toLowerCase(), model: ref.slice(i + 1).trim() } : null;
}

/**
 * The models to try for a tier, in order, skipping any whose provider isn't
 * known or has no API key (with a warning, so a typo in env is visible in logs).
 */
export function modelsFor(tier: ModelTier, env: Record<string, string | undefined> = process.env): ModelRef[] {
  const configured = env[ENV_KEYS[tier]];
  const refs = configured ? configured.split(',') : DEFAULT_MODELS[tier];

  const out: ModelRef[] = [];
  for (const raw of refs) {
    const ref = parse(raw);
    if (!ref || !ref.model) {
      console.warn(`[ai] ignoring "${raw.trim()}" in ${ENV_KEYS[tier]}: use provider:model`);
      continue;
    }
    if (!isProviderId(ref.provider)) {
      console.warn(`[ai] unknown provider "${ref.provider}" (known: ${Object.keys(PROVIDERS).join(', ')})`);
      continue;
    }
    const apiKey = env[PROVIDERS[ref.provider].keyEnv];
    if (!apiKey) {
      console.warn(`[ai] skipping ${ref.provider}:${ref.model}: ${PROVIDERS[ref.provider].keyEnv} is not set`);
      continue;
    }
    const preset: { baseUrl: string; baseUrlEnv?: string } = PROVIDERS[ref.provider];
    const baseUrl = (preset.baseUrlEnv && env[preset.baseUrlEnv]) || preset.baseUrl;
    out.push({ provider: ref.provider, model: ref.model, apiKey, baseUrl, label: `${ref.provider}:${ref.model}` });
  }
  return out;
}
