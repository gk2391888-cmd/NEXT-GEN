import type { Metadata } from 'next';
import { getCatalog, getSubjects } from '@/lib/content';
import { MOCK_TESTS } from '@/lib/tests';
import { PageHead } from '@/components/ui';
import { TestList } from '@/components/quiz/test-list';

export const metadata: Metadata = { title: 'Mock Tests' };

export default function TestsPage() {
  const catalog = getCatalog();
  const subjects = getSubjects().filter((s) => (catalog[s.id] ?? []).length > 0);

  return (
    <>
      <PageHead
        kicker="Exam-style practice"
        title="Mock Tests"
        description="Timed Quiz 1, Quiz 2 and End term practice tests for every subject, with a question palette and a detailed result with explanations."
      />
      {subjects.length === 0 ? (
        <div className="card empty"><div className="empty-icon">◷</div>Mock tests are coming soon.</div>
      ) : (
        <TestList subjects={subjects} tests={MOCK_TESTS} />
      )}
      <div className="alert" style={{ marginTop: 20 }}>
        These are original practice tests, not actual IIT Madras quizzes or previous-year papers. Questions are drawn fresh from the question bank each time, so you can retake them.
      </div>
    </>
  );
}
