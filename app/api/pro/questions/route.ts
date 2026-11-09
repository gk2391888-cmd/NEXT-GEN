import { getQuestion, getSubjects, getWeeks } from '@/lib/content';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/** Most a student's browser may ask for in one go (My Mistakes revises at most this many). */
const MAX_IDS = 300;
/** Search results returned. */
const MAX_HITS = 10;

/** Kept for a while in the student's own browser (never a shared cache): content only changes on a deploy. */
const cached = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': 'private, max-age=3600' } });

/**
 * Questions for trial and Pro students and admins, in three sizes (the whole bank is several MB,
 * so pages ask only for what they show):
 * - `?ids=a,b,c`: just those questions (My Mistakes, the AI Doubt Solver).
 * - `?q=words&subjects=math1,stat1&weeks=4`: the best few matches, text only (Search).
 * - no parameters: every question (the admin panel's editor).
 */
export async function GET(req: Request) {
  const denied = await requirePro(req);
  if (denied) return denied;
  const url = new URL(req.url);

  const ids = url.searchParams.get('ids');
  if (ids !== null) {
    const questions = ids
      .split(',')
      .slice(0, MAX_IDS)
      .map((id) => getQuestion(id.trim()))
      .filter((q) => q !== undefined);
    return cached({ ok: true, questions });
  }

  const query = url.searchParams.get('q');
  if (query !== null) {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1).slice(0, 8);
    const subjects = new Set((url.searchParams.get('subjects') ?? '').split(',').filter(Boolean));
    const maxWeek = Number(url.searchParams.get('weeks')) || Infinity;
    const hits: { id: string; subjectId: string; week: number; weekTitle: string; question: string; en?: { question: string } }[] = [];
    if (words.length) {
      for (const s of getSubjects()) {
        if (subjects.size && !subjects.has(s.id)) continue;
        for (const w of getWeeks(s.id)) {
          if (w.week > maxWeek) continue;
          for (const q of w.questions) {
            const text = [q.question, ...q.options, q.en?.question ?? '', ...(q.en?.options ?? [])].join(' ').toLowerCase();
            if (words.every((word) => text.includes(word))) hits.push({ id: q.id, subjectId: s.id, week: w.week, weekTitle: w.title, question: q.question, en: q.en ? { question: q.en.question } : undefined });
            if (hits.length >= MAX_HITS) return cached({ ok: true, hits });
          }
        }
      }
    }
    return cached({ ok: true, hits });
  }

  const questions = getSubjects().flatMap((s) =>
    getWeeks(s.id).flatMap((w) => w.questions.map((q) => ({ ...q, subjectId: s.id, week: w.week, weekTitle: w.title }))),
  );
  return proJson({ ok: true, questions });
}
