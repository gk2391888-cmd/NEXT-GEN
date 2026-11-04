import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject, getSubjects, getWeeks } from '@/lib/content';
import { SubjectCode } from '@/components/programme-switch';
import { PageHead } from '@/components/ui';
import { PrintButton } from '@/components/library/print-button';
import { ProFormulaSheet } from '@/components/library/pro-formula-sheet';

type Params = { subject: string };

export function generateStaticParams(): Params[] {
  return getSubjects().filter((s) => getWeeks(s.id).length > 0).map((s) => ({ subject: s.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { subject } = await params;
  return { title: `${getSubject(subject)?.short ?? ''} formula sheet` };
}

export default async function FormulaSheetPage({ params }: { params: Promise<Params> }) {
  const { subject: subjectId } = await params;
  const subject = getSubject(subjectId);
  const weeks = getWeeks(subjectId);
  if (!subject || weeks.length === 0) notFound();

  return (
    <>
      <div className="crumb page-crumb no-print">
        <Link href="/library">Study Library</Link><span className="sep">/</span>
        <Link href={`/library/${subject.id}`}>{subject.short}</Link><span className="sep">/</span><strong>Formula sheet</strong>
      </div>
      <article className="card legal wide">
        <PageHead
          kicker={<SubjectCode subject={subject} />}
          title={`${subject.name}: quick revision sheet`}
          description="Every week’s key formulas and points on one page, for last-minute revision."
          action={<PrintButton />}
        />
        {/* The revision points come from /api/pro/formulas/<subject>, which checks the plan. */}
        <ProFormulaSheet subjectId={subject.id} />
      </article>
    </>
  );
}
