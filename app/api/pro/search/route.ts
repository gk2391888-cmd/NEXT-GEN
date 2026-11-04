import { getSubjects, getWeeks } from '@/lib/content';
import { proJson, requirePro } from '@/lib/server/pro-access';
import type { SearchEntry } from '@/components/notes-search';

export const dynamic = 'force-dynamic';

/** The text of every week's notes, for /search, for trial and Pro students. */
export async function GET(req: Request) {
  const denied = await requirePro(req);
  if (denied) return denied;
  const entries: SearchEntry[] = getSubjects().flatMap((s) =>
    getWeeks(s.id).map((w) => ({
      subjectId: s.id,
      subject: s.short,
      week: w.week,
      title: w.title,
      summary: w.summary,
      text: [w.title, w.summary, ...w.concepts, ...w.revision].join(' ').replace(/[*`]/g, ''),
    })),
  );
  return proJson({ ok: true, entries });
}
