import 'server-only';
import { clientForToken, getUserFromRequest } from '@/lib/server/supabase';

export type ProContentError = { ok: false; code: 'login_required' | 'not_in_plan' | 'failed'; message: string };

// Demo mode (npm run dev:demo) has no real Supabase session: lib/supabase/demo.ts sends this
// header for its trial/pro personas. Production builds ignore it.
const DEMO = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === '1';
export const DEMO_PRO_HEADER = 'x-demo-pro';

/** Pro content is per student, so it must never be cached by a CDN or shared. */
export const proJson = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

const fail = (code: ProContentError['code'], message: string, status: number) => proJson({ ok: false, code, message } satisfies ProContentError, status);

/**
 * Lets the request through only for a signed-in trial or Pro student, or an admin. The plan
 * comes from `public.is_pro()` in the database (asked as the student), never from the browser.
 * Since migration 0009 is_pro() counts admins too; is_admin() is asked as well so admins keep
 * access on a database that hasn't run it yet.
 * Returns an error response to send back, or null when the student has Pro.
 */
export async function requirePro(req: Request): Promise<Response | null> {
  if (DEMO && req.headers.get(DEMO_PRO_HEADER) === '1') return null;

  const auth = await getUserFromRequest(req);
  if (!auth) return fail('login_required', 'Log in to start your free trial of Pro.', 401);

  const db = clientForToken(auth.token);
  const { data, error } = await db.rpc('is_pro', { uid: auth.user.id });
  if (error) {
    console.error('[pro]', error);
    return fail('failed', 'Could not check your plan. Please try again.', 502);
  }
  if (data === true) return null;
  const { data: admin } = await db.rpc('is_admin');
  return admin === true ? null : fail('not_in_plan', 'This needs an active free trial or Pro.', 403);
}
