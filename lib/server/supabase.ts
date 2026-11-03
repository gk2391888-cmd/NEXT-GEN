import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://vpeugyyhasnawycbmjou.supabase.co';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_M8kI-wjBK1EAyRLQYQrCyg_pAoQ7M_D';

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** A client that acts as the signed-in student (Row Level Security applies). */
export function clientForToken(accessToken: string): SupabaseClient {
  return createClient(URL, PUBLISHABLE_KEY, { ...noSession, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
}

/** Reads the student's access token from `Authorization: Bearer …` and checks it with Supabase. */
export async function getUserFromRequest(req: Request): Promise<{ user: User; token: string } | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await clientForToken(token).auth.getUser(token);
  return error || !data.user ? null : { user: data.user, token };
}

/** Server-only client that bypasses Row Level Security. Only for trusted writes (e.g. confirmed payments). */
export function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createClient(URL, key, noSession) : null;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
