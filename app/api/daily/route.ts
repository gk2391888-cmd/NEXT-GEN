import { adminClient, getUserFromRequest } from '@/lib/server/supabase';
import { pickDaily, publicDaily, withOverride } from '@/lib/server/daily';
import { indiaClock } from '@/lib/reminders';
import { MIN_ANSWERS_FOR_STATS, type DailyResult } from '@/lib/daily';
import { allow, callerKey, tooMany } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** "% got it right", kept per server instance for a minute so a burst of answers doesn't mean two counts each. */
const percentMemo = new Map<string, { value: number | null; at: number }>();

async function percentRight(day: string, questionId: string) {
  const memoKey = `${day}:${questionId}`;
  const hit = percentMemo.get(memoKey);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const admin = adminClient();
  if (!admin) return null;
  const count = (correctOnly: boolean) => {
    let q = admin.from('daily_answers').select('user_id', { count: 'exact', head: true }).eq('day', day).eq('question_id', questionId);
    if (correctOnly) q = q.eq('correct', true);
    return q;
  };
  const [all, right] = await Promise.all([count(false), count(true)]);
  const total = all.count ?? 0;
  const value = total >= MIN_ANSWERS_FOR_STATS ? Math.round(((right.count ?? 0) / total) * 100) : null;
  if (percentMemo.size > 1000) percentMemo.clear();
  percentMemo.set(memoKey, { value, at: Date.now() });
  return value;
}

function result(q: { answer: number; explanation: string; en?: { explanation: string } }, pick: number, percent: number | null): DailyResult {
  return { pick, correct: pick === q.answer, answer: q.answer, explanation: q.explanation, en: q.en ? { explanation: q.en.explanation } : undefined, percentRight: percent };
}

/**
 * Today's Question of the Day for a programme choice (?choice=ds/foundation&day=YYYY-MM-DD). Open to
 * everyone, and the same for everyone with that choice, so the CDN serves it: no function runs for most
 * visits. Whether this student already answered is kept on their device.
 */
export async function GET(req: Request) {
  const { day } = indiaClock();
  const params = new URL(req.url).searchParams;
  // The CDN caches by the full URL, so URLs the app never asks for (extra parameters) are refused, and
  // another day (a device with a wrong clock, or someone varying it to dodge the cache) is answered but
  // rate-limited, since each such URL is a fresh, uncached function run.
  if ([...params.keys()].some((k) => k !== 'choice' && k !== 'day')) return reply({ error: 'Not a valid request.' }, 400);
  const asked = params.get('day');
  if (asked !== null && asked !== day && !allow('daily-day', callerKey(req), 30, 60_000)) return tooMany();
  const picked = pickDaily(params.get('choice') ?? '', day);
  if (!picked) return reply({ error: 'No question today.' }, 404);
  const q = await withOverride(adminClient(), picked);
  // The day is in the URL, so a cached copy never outlives its day.
  return Response.json({ question: publicDaily(q, day), answered: null }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800' } });
}

/** Checks an answer ({ choice, pick }). A logged-in student's first answer of the day is the one recorded. */
export async function POST(req: Request) {
  // Anyone can answer without signing in, so one address gets a fair number of tries a minute.
  if (!allow('daily', callerKey(req), 30, 60_000)) return tooMany();
  const body = await req.json().catch(() => null);
  const pick = Number(body?.pick);
  if (!Number.isInteger(pick) || pick < 0 || pick > 3) return reply({ error: 'Pick an option.' }, 400);
  const { day } = indiaClock();
  const picked = pickDaily(typeof body?.choice === 'string' ? body.choice : '', day);
  if (!picked) return reply({ error: 'No question today.' }, 404);
  const admin = adminClient();
  const q = await withOverride(admin, picked);

  const auth = await getUserFromRequest(req);
  if (auth && admin) {
    await admin.from('daily_answers').upsert(
      { user_id: auth.user.id, day, question_id: q.id, correct: pick === q.answer },
      { onConflict: 'user_id,day', ignoreDuplicates: true },
    );
  }
  return reply(result(q, pick, await percentRight(day, q.id)));
}
