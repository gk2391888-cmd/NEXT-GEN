import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog, getSubjects } from '@/lib/content';
import { PageHead } from '@/components/ui';
import { LibraryGrid } from '@/components/library/library-grid';
import { AllNoteFiles } from '@/components/library/note-files';

export const metadata: Metadata = { title: 'Study Library' };

export default function LibraryPage() {
  const subjects = getSubjects();
  const catalog = getCatalog();

  return (
    <>
      <PageHead
        kicker="Learn week by week"
        title="Study Library"
        description="Week-by-week notes for every subject in your programme, each with key concepts, a solved example, common mistakes and quick revision points."
        action={<Link className="btn btn-secondary" href="/search">⌕ Search notes</Link>}
      />
      <LibraryGrid subjects={subjects} catalog={catalog} />
      <AllNoteFiles subjects={subjects} />
      <p className="muted mt-xl">
        These notes are written independently by NEXT GEN and are not official IIT Madras course material. Use them alongside the official lectures and notes.
      </p>
    </>
  );
}
