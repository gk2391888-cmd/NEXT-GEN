import { clientForToken, getUserFromRequest, json } from '@/lib/server/supabase';
import { askGemini, geminiConfigured, type ChatTurn } from '@/lib/server/gemini';

export const maxDuration = 60;

const MAX_TURNS = 8;
const MAX_CHARS = 2000;

type Body = { messages?: ChatTurn[]; context?: string };

/** Answers a student's doubt. Each call uses one of the day's doubts (5 free, more on Pro). */
export async function POST(req: Request) {
  if (!geminiConfigured()) return json({ error: 'The AI doubt solver is being set up. Please check back soon.' }, 503);

  const auth = await getUserFromRequest(req);
  if (!auth) return json({ error: 'Log in to ask a doubt.' }, 401);

  const body = (await req.json().catch(() => null)) as Body | null;
  const turns = (body?.messages ?? [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }));
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') return json({ error: 'Type your doubt first.' }, 400);

  const { data: usage, error } = await clientForToken(auth.token).rpc('consume_doubt').single<{
    allowed: boolean;
    used: number;
    daily_limit: number;
    pro: boolean;
  }>();
  if (error || !usage) return json({ error: 'Could not check your daily limit. Please try again.' }, 500);
  if (!usage.allowed) {
    return json({ error: 'limit', used: usage.used, limit: usage.daily_limit, pro: usage.pro }, 429);
  }

  try {
    const answer = await askGemini(turns, body?.context?.slice(0, 3000));
    return json({ answer, used: usage.used, limit: usage.daily_limit, pro: usage.pro });
  } catch (e) {
    console.error('[doubt]', e);
    return json({ error: 'The AI couldn’t answer right now. Please try again in a minute.' }, 502);
  }
}
