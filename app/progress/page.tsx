import type { Metadata } from 'next';
import { getCatalog, getSubjects } from '@/lib/content';
import { MOCK_TESTS } from '@/lib/tests';
import { PageHead } from '@/components/ui';
import { ProgressView } from '@/components/progress-view';

export const metadata: Metadata = { title: 'My Progress' };

export default function ProgressPage() {
  return (
    <>
      <PageHead
        kicker="Personal learning insights"
        title="My Progress"
        description="Your accuracy by subject, weeks to revise and mock test history. Log in to keep it in sync across devices."
      />
      <ProgressView subjects={getSubjects()} catalog={getCatalog()} testTitles={Object.fromEntries(MOCK_TESTS.map((t) => [t.id, t.title]))} />
    </>
  );
}
