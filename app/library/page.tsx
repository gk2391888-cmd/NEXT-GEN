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
        description={`Sab 8 Foundation subjects ke week-wise Hinglish notes: concept, solved example, common mistakes aur quick revision. ${totalWeeks} weeks of notes ready.`}
      />
      <LibraryGrid subjects={subjects} catalog={catalog} />
      <p className="muted" style={{ marginTop: 22 }}>
        Notes NEXT GEN ne independently likhe hain. Ye official IITM course material ki copy nahi hain, isliye official lectures aur notes bhi zaroor dekho.
      </p>
    </>
  );
}
