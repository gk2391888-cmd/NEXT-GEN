import type { Metadata } from 'next';
import { getCatalog, getSubjects } from '@/lib/content';
import { PageHead } from '@/components/ui';
import { MistakesView } from '@/components/mistakes-view';

export const metadata: Metadata = { title: 'My Mistakes' };

export default function MistakesPage() {
  return (
    <>
      <PageHead
        kicker="Revise smarter"
        title="My Mistakes"
        description="Questions you got wrong come back for revision: right away, then after 3 days, then after 7. Answer one correctly three times in a row and it’s cleared."
      />
      <MistakesView subjects={getSubjects()} catalog={getCatalog()} />
    </>
  );
}
