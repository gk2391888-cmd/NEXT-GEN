import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHead } from '@/components/ui';
import { NotesSearch } from '@/components/notes-search';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <>
      <PageHead kicker="Find anything" title="Search" description="Search your programme’s notes and practice questions by topic, formula or keyword." />
      <Suspense>
        {/* The notes' text comes from /api/pro/search, which checks the plan. */}
        <NotesSearch />
      </Suspense>
    </>
  );
}
