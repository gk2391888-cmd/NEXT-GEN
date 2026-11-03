import type { Metadata } from 'next';
import { getCatalog, getSubjects } from '@/lib/content';
import { PageHead } from '@/components/ui';
import { ExamPlanner } from '@/components/exam-planner';

export const metadata: Metadata = { title: 'Exam Planner' };

export default function PlannerPage() {
  return (
    <>
      <PageHead
        kicker="Plan your prep"
        title="Exam Planner"
        description="Enter your exam date and NEXT GEN builds a day-by-day plan from the weeks you haven’t finished, with time for revision and mock tests."
      />
      <ExamPlanner subjects={getSubjects()} catalog={getCatalog()} />
    </>
  );
}
