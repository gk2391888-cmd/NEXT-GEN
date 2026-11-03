import { getOppeSet, setProblems, withoutAnswers, type ProblemAnswers } from '@/lib/coding';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/**
 * A timed OPPE set, for trial and Pro students only.
 * GET /api/pro/oppe/<set> → its problems without hidden tests or solutions.
 * GET /api/pro/oppe/<set>?part=answers → every problem's tests and model solution, by id (fetched on Submit and for the report).
 */
export async function GET(req: Request, { params }: { params: Promise<{ set: string }> }) {
  const { set: setId } = await params;
  const problems = setProblems(setId);
  if (!getOppeSet(setId) || problems.length === 0) return proJson({ ok: false, code: 'not_found', message: 'Set not found.' }, 404);

  const denied = await requirePro(req);
  if (denied) return denied;

  if (new URL(req.url).searchParams.get('part') === 'answers') {
    const answers: Record<string, ProblemAnswers> = Object.fromEntries(problems.map((p) => [p.id, { tests: p.tests, solution: p.solution }]));
    return proJson({ ok: true, answers });
  }
  return proJson({ ok: true, problems: problems.map(withoutAnswers) });
}
