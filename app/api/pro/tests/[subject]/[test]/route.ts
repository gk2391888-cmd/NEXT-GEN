import { getQuestionsForWeeks, getSubject } from '@/lib/content';
import { getMockTest } from '@/lib/tests';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/** The question pool of a Pro mock test (End term), for trial and Pro students only. */
export async function GET(req: Request, { params }: { params: Promise<{ subject: string; test: string }> }) {
  const { subject, test: testId } = await params;
  const test = getMockTest(testId);
  // The subject is checked against subjects.json first, since it becomes a file name.
  const pool = test?.pro && getSubject(subject) ? getQuestionsForWeeks(subject, test.fromWeek, test.toWeek) : [];
  if (pool.length === 0) return proJson({ ok: false, code: 'not_found', message: 'Test not found.' }, 404);

  const denied = await requirePro(req);
  if (denied) return denied;
  return proJson({ ok: true, pool });
}
