import 'server-only';
import { AI_FEATURES, isAiFeatureId, limitsFor, type AiErrorCode, type AiResponse, type AiUsage } from '@/lib/ai/features';
import { accessOf, planFrom } from '@/lib/plans';
import { adminClient, getUserFromRequest } from '@/lib/server/supabase';
import { FEATURE_HANDLERS } from './features';
import { canGenerate, generate } from './generate';
import { consumeQuota, finishRequest } from './quota';

const STATUS: Record<AiErrorCode, number> = {
  login_required: 401,
  not_in_plan: 403,
  limit: 429,
  cooldown: 429,
  invalid: 400,
  unavailable: 503,
  failed: 502,
};

function fail(code: AiErrorCode, message: string, extra: { usage?: AiUsage; retryAfter?: number } = {}) {
  const body: AiResponse<never> = { ok: false, code, message, ...extra };
  return Response.json(body, { status: STATUS[code], headers: extra.retryAfter ? { 'Retry-After': String(extra.retryAfter) } : undefined });
}

/**
 * Runs one AI feature request, the same way for every feature:
 * feature → sign-in → plan → limits → input check → quota → model (with fallbacks) → usage.
 */
export async function handleAiRequest(req: Request, featureId: string): Promise<Response> {
  if (!isAiFeatureId(featureId)) return fail('invalid', 'Unknown AI feature.');
  const feature = AI_FEATURES[featureId];

  const admin = adminClient();
  if (!admin || !canGenerate(feature.model)) return fail('unavailable', `The ${feature.name} is being set up. Please check back soon.`);

  const auth = await getUserFromRequest(req);
  if (!auth) return fail('login_required', `Log in to use the ${feature.name}.`);

  // The plan comes from the database, never from the request.
  const { data: profile } = await admin.from('profiles').select('trial_ends_at, pro_until').eq('id', auth.user.id).maybeSingle();
  const plan = planFrom({ trialEndsAt: profile?.trial_ends_at, proUntil: profile?.pro_until }, true);
  const limits = limitsFor(featureId, accessOf(plan));
  if (!limits) return fail('not_in_plan', `The ${feature.name} is part of Pro.`);

  const prepared = await FEATURE_HANDLERS[featureId].prepare(await req.json().catch(() => null), { limits, userId: auth.user.id, admin });
  if ('error' in prepared) return fail('invalid', prepared.error);

  const quota = await consumeQuota(admin, auth.user.id, featureId, limits).catch((error) => {
    console.error('[ai]', error);
    return null;
  });
  if (!quota) return fail('failed', 'Could not check your daily limit. Please try again.');
  if (!quota.allowed) {
    const usage = { used: quota.used, limit: limits.perDay };
    return quota.reason === 'cooldown'
      ? fail('cooldown', `Please wait ${quota.retryAfter}s before asking again.`, { usage, retryAfter: quota.retryAfter })
      : fail('limit', `You’ve used today’s ${limits.perDay} ${feature.name} requests. They reset at midnight.`, { usage });
  }

  try {
    const result = await generate({ tier: feature.model, ...prepared, maxOutputTokens: limits.maxOutputTokens });
    await finishRequest(admin, auth.user.id, featureId, true, result.tokens);
    const body: AiResponse<unknown> = { ok: true, data: FEATURE_HANDLERS[featureId].respond(result), usage: { used: quota.used, limit: limits.perDay } };
    return Response.json(body);
  } catch {
    // The request is given back, so an outage never costs the student one.
    await finishRequest(admin, auth.user.id, featureId, false, 0);
    return fail('failed', 'The AI couldn’t answer right now. Please try again in a minute.', { usage: { used: quota.used - 1, limit: limits.perDay } });
  }
}
