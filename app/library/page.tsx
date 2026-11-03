import type { Metadata } from 'next';
import { getCatalog, getSubjects } from '@/lib/content';
import { PageHead } from '@/components/ui';
import { LibraryGrid } from '@/components/library/library-grid';

export const metadata: Metadata = { title: 'Study Library' };

export default function LibraryPage() {
  const subjects = getSubjects();
  const catalog = getCatalog();
  const totalWeeks = Object.values(catalog).reduce((n, weeks) => n + weeks.length, 0);

  return (
    <>
      <PageHead
        kicker="Learn week by week"
        title="Study Library"
        description={`Week-by-week notes for all 8 Foundation subjects, each with key concepts, a solved example, common mistakes and quick revision points. ${totalWeeks} weeks available.`}
      />
      <LibraryGrid subjects={subjects} catalog={catalog} />
      <p className="muted" style={{ marginTop: 22 }}>
        These notes are written independently by NEXT GEN and are not official IIT Madras course material. Use them alongside the official lectures and notes.
      </p>
    </>
  );
}
