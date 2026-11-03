import { getSubjects, getWeeks } from '@/lib/content';

export const dynamic = 'force-static';

/** Every question with its subject and week, built once at deploy time (for admin, My Mistakes and AI doubts). */
export function GET() {
  const questions = getSubjects().flatMap((s) =>
    getWeeks(s.id).flatMap((w) => w.questions.map((q) => ({ ...q, subjectId: s.id, week: w.week, weekTitle: w.title }))),
  );
  return Response.json(questions);
}
