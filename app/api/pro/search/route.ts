import { getSubjects, getWeeks } from '@/lib/content';
import { requirePro } from '@/lib/server/pro-access';
import type { SearchEntry } from '@/components/notes-search';

export const dynamic = 'force-dynamic';

/** The text of every week's notes (of `?subjects=a,b` when given), for /search, for trial and Pro students. */
export async function GET(req: Request) {
  const denied = await requirePro(req);
  if (denied) return denied;
  const only = new Set((new URL(req.url).searchParams.get('subjects') ?? '').split(',').filter(Boolean));
  const entries: SearchEntry[] = getSubjects().filter((s) => !only.size || only.has(s.id)).flatMap((s) =>
    getWeeks(s.id).map((w) => ({
      subjectId: s.id,
      subject: s.short,
      week: w.week,
      title: w.title,
      summary: w.summary,
      text: [w.title, w.summary, ...w.concepts, ...w.revision].join(' ').replace(/[*`]/g, ''),
    })),
  );
  // Kept for an hour in the student's own browser: notes only change on a deploy.
  return Response.json({ ok: true, entries }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}
