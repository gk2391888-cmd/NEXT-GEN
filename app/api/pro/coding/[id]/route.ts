import { getProblem, withoutAnswers, type ProblemAnswers } from '@/lib/coding';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/**
 * An OPPE problem, for trial and Pro students only.
 * GET /api/pro/coding/<id> → the problem without hidden tests or solution.
 * GET /api/pro/coding/<id>?part=answers → every test plus the model solution (fetched on Submit).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = getProblem(id);
  if (!problem || problem.tier !== 'oppe') return proJson({ ok: false, code: 'not_found', message: 'Problem not found.' }, 404);

  const denied = await requirePro(req);
  if (denied) return denied;

  if (new URL(req.url).searchParams.get('part') === 'answers') {
    const answers: ProblemAnswers = { tests: problem.tests, solution: problem.solution };
    return proJson({ ok: true, answers });
  }
  return proJson({ ok: true, problem: withoutAnswers(problem) });
}
