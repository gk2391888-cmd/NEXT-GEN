import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeekRefs } from '@/lib/content';
import { formatExamDate, getQualifier, mocksFor, QUALIFIERS } from '@/lib/qualifier';
import { QUALIFIER_WEEKS } from '@/lib/qualifier-plan';
import { PageHead } from '@/components/ui';
import { QualifierStudyPlan } from '@/components/qualifier/study-plan';

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return QUALIFIERS.map((q) => ({ id: q.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const q = getQualifier((await params).id);
  return { title: `${q?.short ?? 'Qualifier'} study plan`, description: q && `A day-by-day study plan for the IIT Madras BS ${q.title}, up to the exam.` };
}

export default async function QualifierPlanPage({ params }: { params: Promise<Params> }) {
  const qualifier = getQualifier((await params).id);
  if (!qualifier) notFound();
  const weekTitles = Object.fromEntries(
    qualifier.sections.flatMap((s) =>
      s.subjectId ? [[s.subjectId, Object.fromEntries(getWeekRefs(s.subjectId).filter((w) => QUALIFIER_WEEKS.includes(w.week)).map((w) => [w.week, w.title]))]] : [],
    ),
  );

  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/qualifier">Qualifier Prep</Link><span className="sep">/</span>
        <Link href={`/qualifier/${qualifier.id}`}>{qualifier.short}</Link><span className="sep">/</span><strong>Study plan</strong>
      </div>
      <PageHead
        kicker={qualifier.title}
        title="Your study plan"
        description={`Every day from today to the exam on ${formatExamDate()}: weeks 1–4 of all 4 courses, then timed mocks and a light last day. If your exam is on another date, follow the same order and squeeze or stretch it.`}
      />
      <QualifierStudyPlan qualifier={qualifier} mocks={mocksFor(qualifier.id)} weekTitles={weekTitles} />
    </>
  );
}
