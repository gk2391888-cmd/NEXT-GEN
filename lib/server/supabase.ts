import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://vpeugyyhasnawycbmjou.supabase.co';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_M8kI-wjBK1EAyRLQYQrCyg_pAoQ7M_D';

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** A client that acts as the signed-in student (Row Level Security applies). */
export function clientForToken(accessToken: string): SupabaseClient {
  return createClient(URL, PUBLISHABLE_KEY, { ...noSession, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
}

/** The parts of the signed-in student that routes use; all of them are in the access token. */
export type RequestUser = Pick<User, 'id' | 'email' | 'user_metadata'>;

// One client per server instance for verifying tokens, so Supabase's signing keys (JWKS) are
// fetched once and reused instead of on every request.
let verifier: SupabaseClient | undefined;

/**
 * Reads the student's access token from `Authorization: Bearer …` and verifies it. With Supabase's
 * asymmetric signing keys getClaims() checks the signature locally (no network call per request);
 * on a project still using the legacy shared secret it falls back to asking the Auth server.
 */
export async function getUserFromRequest(req: Request): Promise<{ user: RequestUser; token: string } | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  verifier ??= createClient(URL, PUBLISHABLE_KEY, noSession);
  const { data, error } = await verifier.auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { user: { id: claims.sub, email: claims.email as string | undefined, user_metadata: (claims.user_metadata ?? {}) as User['user_metadata'] }, token };
}

let admin: SupabaseClient | null | undefined;

/** Server-only client that bypasses Row Level Security, one per server instance. Only for trusted writes (e.g. confirmed payments). */
export function adminClient(): SupabaseClient | null {
  if (admin === undefined) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    admin = key ? createClient(URL, key, noSession) : null;
  }
  return admin;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
