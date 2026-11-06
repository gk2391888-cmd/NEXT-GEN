import { createWar, findMatch, rivalsOf, WarFail } from '@/lib/server/war/engine';
import { warError, warJson, warStore, warUser } from '@/lib/server/war/identity';

export const dynamic = 'force-dynamic';

function failed(e: unknown) {
  if (e instanceof WarFail) return warError(e.message, e.status, e.code);
  console.error('[war]', e);
  return warError('Something went wrong. Please try again.', 500);
}

/** This player's rivals (head-to-head records). */
export async function GET(req: Request) {
  const store = warStore();
  if (!store) return warError('Quiz War is being set up.', 503);
  const user = await warUser(req);
  if (!user) return warJson({ rivals: [] });
  try {
    return warJson({ rivals: await rivalsOf(store, user) });
  } catch (e) {
    return failed(e);
  }
}

/**
 * Starts a war: { action: 'create', mode: 'live' | 'challenge', subjectId, fromWeek, toWeek }
 * or looks for a random opponent: { action: 'match', subjectId, fromWeek, toWeek }. Returns { code }.
 */
export async function POST(req: Request) {
  const store = warStore();
  if (!store) return warError('Quiz War is being set up.', 503);
  const user = await warUser(req);
  if (!user) return warError('Log in to play Quiz War.', 401, 'login_required');
  const body = await req.json().catch(() => null);
  const settings = { subjectId: String(body?.subjectId ?? ''), fromWeek: Number(body?.fromWeek), toWeek: Number(body?.toWeek) };
  try {
    if (body?.action === 'match') return warJson({ code: await findMatch(store, user, settings) });
    const mode = body?.mode === 'challenge' ? 'challenge' : 'live';
    return warJson({ code: await createWar(store, user, mode, settings) });
  } catch (e) {
    return failed(e);
  }
}
