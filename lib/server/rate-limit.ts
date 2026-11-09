import 'server-only';

/**
 * A best-effort limit on how often one caller can hit an endpoint, kept in this server instance's
 * memory (each instance counts on its own, so it slows abuse rather than stopping it exactly). It's
 * for endpoints anyone can call without signing in, so a bot or a stuck tab can't run up usage.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
/** Callers remembered at most, so the map can't grow without limit. */
const MAX_KEYS = 10_000;

/** The caller's address as the host reports it (the first hop of x-forwarded-for). */
export function callerKey(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** True while `key` has made at most `limit` calls in the current `windowMs` window for `scope`. */
export function allow(scope: string, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const id = `${scope}:${key}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}

export const tooMany = () =>
  Response.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
