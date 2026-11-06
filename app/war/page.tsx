import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHead } from '@/components/ui';
import { WarHome } from '@/components/war';
import { getSubjects, getWeeks } from '@/lib/content';

export const metadata: Metadata = { title: 'Quiz War' };

export default function WarPage() {
  const subjects = getSubjects();
  return (
    <>
      <PageHead
        kicker="Play with friends"
        title="Quiz War ⚔️"
        description="PYQ-style questions, head to head. Same questions, same timer, and the fastest right answer wins the most points."
      />
      <Suspense>
        <WarHome subjects={subjects} weeks={Object.fromEntries(subjects.map((s) => [s.id, getWeeks(s.id).length]))} />
      </Suspense>
    </>
  );
}
