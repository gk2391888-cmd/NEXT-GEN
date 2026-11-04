import { getSubjects, getWeeks } from '@/lib/content';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/** Every question with its subject and week (for admin, My Mistakes, search and AI doubts), for trial and Pro students and admins. */
export async function GET(req: Request) {
  const denied = await requirePro(req);
  if (denied) return denied;
  const questions = getSubjects().flatMap((s) =>
    getWeeks(s.id).flatMap((w) => w.questions.map((q) => ({ ...q, subjectId: s.id, week: w.week, weekTitle: w.title }))),
  );
  return proJson({ ok: true, questions });
}
