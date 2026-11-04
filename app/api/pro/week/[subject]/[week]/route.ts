import { getSubject, getWeek } from '@/lib/content';
import { PREVIEW_WEEK } from '@/lib/access';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/** A week's notes and practice questions, for trial and Pro students (week 1 is a free preview). */
export async function GET(req: Request, { params }: { params: Promise<{ subject: string; week: string }> }) {
  const { subject, week: weekParam } = await params;
  // The subject is checked against subjects.json first, since it becomes a file name.
  const week = getSubject(subject) ? getWeek(subject, Number(weekParam)) : undefined;
  if (!week) return proJson({ ok: false, code: 'not_found', message: 'Week not found.' }, 404);

  if (week.week !== PREVIEW_WEEK) {
    const denied = await requirePro(req);
    if (denied) return denied;
  }
  return proJson({ ok: true, week: { ...week, questions: week.questions.map((q) => ({ ...q, week: week.week })) } });
}
