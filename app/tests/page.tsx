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
        kicker="Exam jaisi practice"
        title="Mock Tests"
        description="Har subject ke liye Quiz 1, Quiz 2 aur End term practice tests. Timer chalega, question palette milega, aur submit karne ke baad poora result Hinglish explanations ke saath."
      />
      {subjects.length === 0 ? (
        <div className="card empty"><div className="empty-icon">◷</div>Mock tests jaldi aa rahe hain.</div>
      ) : (
        <TestList subjects={subjects} tests={MOCK_TESTS} />
      )}
      <div className="alert" style={{ marginTop: 20 }}>
        Ye original practice tests hain, IITM ke actual quiz ya PYQ nahi. Har baar question bank se naye questions aate hain, isliye test repeat kar sakte ho.
      </div>
    </>
  );
}
