import 'server-only';
import type { ModelRef } from './models';
import { PROVIDERS, type ProviderPreset } from './providers';
import { AiError, type ChatMessage, type GenerateResult } from './types';

type Call = { system: string; messages: ChatMessage[]; maxOutputTokens: number; temperature: number; timeoutMs: number };

/** One request to an OpenAI-format Chat Completions endpoint. The only place the app talks HTTP to an AI vendor. */
export async function chatCompletion(ref: ModelRef, call: Call): Promise<GenerateResult> {
  const preset: ProviderPreset = PROVIDERS[ref.provider];
  let res: Response;
  try {
    res = await fetch(`${ref.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ref.apiKey}` },
      body: JSON.stringify({
        model: ref.model,
        messages: [{ role: 'system', content: call.system }, ...call.messages],
        temperature: call.temperature,
        [preset.tokenParam]: call.maxOutputTokens,
        ...preset.params?.(ref.model),
      }),
      signal: AbortSignal.timeout(call.timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new AiError(timedOut ? `${ref.label} timed out` : `${ref.label} unreachable: ${String(error)}`, timedOut ? 'timeout' : 'upstream', ref.label);
  }

  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300);
    const kind = res.status === 401 || res.status === 403 ? 'auth' : res.status === 429 ? 'rate_limit' : 'upstream';
    throw new AiError(`${ref.label} returned ${res.status}: ${body}`, kind, ref.label, res.status);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[]; usage?: { total_tokens?: number } };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AiError(`${ref.label} returned an empty answer`, 'empty', ref.label);
  return { text, model: ref.label, tokens: data.usage?.total_tokens ?? 0 };
}
