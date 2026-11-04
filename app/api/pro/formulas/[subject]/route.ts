import { getSubject, getWeeks } from '@/lib/content';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/** Every week's quick-revision points for a subject's formula sheet, for trial and Pro students. */
export async function GET(req: Request, { params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const weeks = getSubject(subject) ? getWeeks(subject) : [];
  if (weeks.length === 0) return proJson({ ok: false, code: 'not_found', message: 'Subject not found.' }, 404);

  const denied = await requirePro(req);
  if (denied) return denied;
  return proJson({ ok: true, weeks: weeks.map((w) => ({ week: w.week, title: w.title, revision: w.revision })) });
}
