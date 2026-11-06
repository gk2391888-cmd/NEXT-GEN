import 'server-only';
import { adminClient, getUserFromRequest } from '@/lib/server/supabase';
import { memoryWarStore } from './memory-store';
import { supabaseWarStore } from './supabase-store';
import type { WarStore, WarUser } from './store';
import type { WarError } from '@/lib/war';

// Demo mode has no real session: lib/supabase/demo.ts sends the persona in this header. Production ignores it.
const DEMO = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === '1';
export const DEMO_WAR_USER_HEADER = 'x-demo-war-user';

export const warJson = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export const warError = (error: string, status: number, code?: WarError['code']) => warJson({ error, code } satisfies WarError, status);

export function warStore(): WarStore | null {
  if (DEMO) return memoryWarStore;
  const admin = adminClient();
  return admin ? supabaseWarStore(admin) : null;
}

/** "Rahul Kumar" → "Rahul K.", so other players never see a full name or an email. */
export function shortName(fullName: string | null | undefined, email?: string | null) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length) {
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1, 16);
    return parts[1] ? `${first} ${parts[1].charAt(0).toUpperCase()}.` : first;
  }
  const local = (email ?? '').split('@')[0].replace(/[^a-zA-Z]/g, '');
  return local ? local.charAt(0).toUpperCase() + local.slice(1, 12) : 'Player';
}

/** The player behind a request, or null when logged out. */
export async function warUser(req: Request): Promise<WarUser | null> {
  if (DEMO) {
    const header = req.headers.get(DEMO_WAR_USER_HEADER);
    if (!header) return null;
    const [id, name, pro] = header.split('|');
    return { id, name: shortName(decodeURIComponent(name)), pro: pro === '1' };
  }
  const auth = await getUserFromRequest(req);
  const admin = adminClient();
  if (!auth || !admin) return null;
  const [profile, pro] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', auth.user.id).maybeSingle(),
    admin.rpc('is_pro', { uid: auth.user.id }),
  ]);
  const name = profile.data?.full_name || auth.user.user_metadata?.full_name || auth.user.user_metadata?.name;
  return { id: auth.user.id, name: shortName(name, auth.user.email), pro: pro.data === true };
}
