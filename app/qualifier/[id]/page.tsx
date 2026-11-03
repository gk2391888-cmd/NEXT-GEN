import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeekRefs } from '@/lib/content';
import { getQualifier, mocksFor, QUALIFIERS } from '@/lib/qualifier';
import { getQualifierPool } from '@/lib/qualifier-content';
import { QualifierCountdown } from '@/components/qualifier/countdown';
import { QualifierFacts } from '@/components/qualifier/facts';
import { QualifierMockList } from '@/components/qualifier/mock-list';

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return QUALIFIERS.map((q) => ({ id: q.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const q = getQualifier((await params).id);
  return {
    title: `IITM BS ${q?.title ?? 'qualifier'} prep`,
    description: q && `Countdown, study plan and free timed mock tests for the IIT Madras BS ${q.title}: ${q.sections.map((s) => s.name).join(', ')}.`,
  };
}

export default async function QualifierOverviewPage({ params }: { params: Promise<Params> }) {
  const qualifier = getQualifier((await params).id);
  if (!qualifier) notFound();
  const mocks = mocksFor(qualifier.id);
  // Counts only: Pro mocks' questions never go into the page.
  const questionCounts = Object.fromEntries(mocks.map((m) => [m.id, getQualifierPool(m.id).length]));
  const firstFree = mocks.find((m) => !m.pro);

  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/qualifier">Qualifier Prep</Link><span className="sep">/</span><strong>{qualifier.title}</strong>
      </div>
      <QualifierCountdown title={qualifier.title}>
        <Link className="btn btn-primary" href={`/qualifier/${qualifier.id}/plan`}>See my study plan</Link>
        {firstFree && <Link className="btn btn-secondary" href={`/qualifier/${qualifier.id}/mock/${firstFree.id}`}>Take the free mock</Link>}
      </QualifierCountdown>

      <p className="muted mt-lg">
        For {qualifier.programmes.map((p, i) => (
          <span key={p.href}>{i > 0 && ' and '}<a className="link" href={p.href} target="_blank" rel="noopener noreferrer">{p.name}</a></span>
        ))}. The exam covers the first 4 weeks of these 4 courses.
      </p>

      <h2 className="section-title mt-xl">The 4 courses</h2>
      {qualifier.note && <div className="alert mb-md">{qualifier.note}</div>}
      <div className="grid grid-2">
        {qualifier.sections.map((s) => {
          const weeks = s.subjectId ? getWeekRefs(s.subjectId).filter((w) => w.week <= 4) : [];
          return (
            <section key={s.id} className="card">
              <h3 className="card-title">{s.name}</h3>
              {weeks.length > 0 ? (
                weeks.map((w) => (
                  <div key={w.week} className="weak-row">
                    <Link href={`/library/${s.subjectId}/${w.week}`}><strong>Week {w.week}</strong> · {w.title}</Link>
                    <Link className="text-btn" href={`/practice/${s.subjectId}/${w.week}`}>Practice →</Link>
                  </div>
                ))
              ) : (
                <p className="muted m-0">Weeks 1–4: study the lectures and do the assignments on your qualifier portal, then test yourself with the {s.short} section of our mocks.</p>
              )}
            </section>
          );
        })}
      </div>

      <h2 className="section-title mt-xl">Timed mocks</h2>
      <p className="muted">One section per course, like the real paper. Your result shows your score in each course against the published pass rule.</p>
      <QualifierMockList mocks={mocks} sections={qualifier.sections.length} questionCounts={questionCounts} />

      <h2 className="section-title mt-xl">Exam pattern and rules</h2>
      <QualifierFacts />

      <div className="alert mt-xl">
        NEXT GEN is an independent study site, not affiliated with IIT Madras. Rules and dates change from term to term: check the official site and your hall ticket. Our mocks use original questions, not IIT Madras papers.
      </div>
    </>
  );
}
