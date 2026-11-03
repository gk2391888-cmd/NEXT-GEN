import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiFeatureId, FeatureLimits } from '@/lib/ai/features';

export type QuotaResult =
  | { allowed: true; used: number }
  | { allowed: false; reason: 'limit' | 'cooldown'; used: number; retryAfter: number };

/**
 * Takes one request from today's allowance, atomically in the database
 * (consume_ai_quota in migration 0004). Needs the service-role client: the
 * function trusts the limits it's given, so students can't call it.
 */
export async function consumeQuota(admin: SupabaseClient, userId: string, feature: AiFeatureId, limits: FeatureLimits): Promise<QuotaResult> {
  const { data, error } = await admin
    .rpc('consume_ai_quota', { p_user: userId, p_feature: feature, p_daily_limit: limits.perDay, p_cooldown_sec: limits.cooldownSec })
    .single<{ allowed: boolean; reason: 'limit' | 'cooldown' | null; used: number; retry_after: number }>();
  if (error || !data) throw new Error(`consume_ai_quota failed: ${error?.message ?? 'no row'}`);
  return data.allowed ? { allowed: true, used: data.used } : { allowed: false, reason: data.reason ?? 'limit', used: data.used, retryAfter: data.retry_after };
}

/** Records tokens used, and gives the request back when the AI failed. Never throws. */
export async function finishRequest(admin: SupabaseClient, userId: string, feature: AiFeatureId, success: boolean, tokens: number) {
  const { error } = await admin.rpc('finish_ai_request', { p_user: userId, p_feature: feature, p_success: success, p_tokens: tokens });
  if (error) console.error('[ai] finish_ai_request failed:', error.message);
}
