import { answerWar, joinWar, rematchWar, startWar, viewWar, WarFail } from '@/lib/server/war/engine';
import { warError, warJson, warStore, warUser } from '@/lib/server/war/identity';
import { parseCode } from '@/lib/war';
import { allow, callerKey, tooMany } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

function failed(e: unknown) {
  if (e instanceof WarFail) return warError(e.message, e.status, e.code);
  console.error('[war]', e);
  return warError('Something went wrong. Please try again.', 500);
}

/** The war as this player sees it right now (polled about once a second while playing). */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  // A player polls ~30 times a minute; this leaves room for a hostel or college network sharing one
  // address, while a runaway script gets turned away before any database work.
  if (!allow('war-view', callerKey(req), 600, 60_000)) return tooMany();
  const code = parseCode((await params).code);
  const store = warStore();
  if (!code) return warError('That isn’t a war code.', 400, 'not_found');
  if (!store) return warError('Quiz War is being set up.', 503);
  try {
    return warJson(await viewWar(store, await warUser(req, true), code));
  } catch (e) {
    return failed(e);
  }
}

/** { action: 'join' | 'start' | 'rematch' } or { action: 'answer', index, choice }. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = parseCode((await params).code);
  const store = warStore();
  if (!code) return warError('That isn’t a war code.', 400, 'not_found');
  if (!store) return warError('Quiz War is being set up.', 503);
  const user = await warUser(req);
  if (!user) return warError('Log in to play Quiz War.', 401, 'login_required');
  const body = await req.json().catch(() => null);
  try {
    switch (body?.action) {
      case 'join':
        await joinWar(store, user, code);
        return warJson(await viewWar(store, user, code));
      case 'start':
        await startWar(store, user, code);
        return warJson(await viewWar(store, user, code));
      case 'rematch':
        return warJson({ code: await rematchWar(store, user, code) });
      case 'answer': {
        const index = Number(body.index);
        const choice = body.choice === null ? null : Number(body.choice);
        if (!Number.isInteger(index) || (choice !== null && (!Number.isInteger(choice) || choice < 0 || choice > 3))) return warError('Bad answer.', 400);
        return warJson(await answerWar(store, user, code, index, choice));
      }
      default:
        return warError('Unknown action.', 400);
    }
  } catch (e) {
    return failed(e);
  }
}
