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
        description="Subject-wise accuracy, weak weeks aur mock test history. Abhi ye sab isi browser mein save hota hai; student login aane ke baad cloud mein sync hoga."
      />
      <ProgressView subjects={getSubjects()} catalog={getCatalog()} testTitles={Object.fromEntries(MOCK_TESTS.map((t) => [t.id, t.title]))} />
    </>
  );
}
