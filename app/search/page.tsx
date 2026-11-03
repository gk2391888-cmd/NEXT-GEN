import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getSubjects, getWeeks } from '@/lib/content';
import { PageHead } from '@/components/ui';
import { NotesSearch, type SearchEntry } from '@/components/notes-search';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  const entries: SearchEntry[] = getSubjects().flatMap((s) =>
    getWeeks(s.id).map((w) => ({
      subjectId: s.id,
      subject: s.short,
      week: w.week,
      title: w.title,
      summary: w.summary,
      text: [w.title, w.summary, ...w.concepts, ...w.revision].join(' ').replace(/[*`]/g, ''),
    })),
  );
  return (
    <>
      <PageHead kicker="Find anything" title="Search" description="Search all 96 weeks of notes and practice questions by topic, formula or keyword." />
      <Suspense>
        <NotesSearch entries={entries} />
      </Suspense>
    </>
  );
}
