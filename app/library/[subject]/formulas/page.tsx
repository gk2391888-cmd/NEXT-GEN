import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject, getSubjects, getWeeks } from '@/lib/content';
import { InlineText, PageHead } from '@/components/ui';
import { PrintButton } from '@/components/library/print-button';

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
      <div className="crumb no-print" style={{ marginBottom: 16 }}>
        <Link href="/library">Study Library</Link><span className="sep">/</span>
        <Link href={`/library/${subject.id}`}>{subject.short}</Link><span className="sep">/</span><strong>Formula sheet</strong>
      </div>
      <article className="card legal" style={{ maxWidth: 900 }}>
        <PageHead
          kicker={subject.code}
          title={`${subject.name}: quick revision sheet`}
          description="Every week’s key formulas and points on one page, for last-minute revision."
          action={<PrintButton />}
        />
        <div className="formula-grid">
          {weeks.map((w) => (
            <section key={w.week} className="formula-week">
              <h3><Link href={`/library/${subject.id}/${w.week}`}>Week {w.week} · {w.title}</Link></h3>
              <ul className="revision">{w.revision.map((r, i) => <li key={i}><InlineText text={r} /></li>)}</ul>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
