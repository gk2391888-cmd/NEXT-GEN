import type { Metadata } from 'next';
import Link from 'next/link';
import { mocksFor, QUALIFIER_FACTS_CHECKED, QUALIFIERS } from '@/lib/qualifier';
import { QualifierCountdown } from '@/components/qualifier/countdown';
import { QualifierFacts } from '@/components/qualifier/facts';

export const metadata: Metadata = {
  title: 'IITM BS Qualifier Prep',
  description:
    'Free countdown, study plan and timed mock tests for the IIT Madras BS qualifier exam (Data Science and Electronic Systems), with original questions in English and Hinglish.',
};

export default function QualifierPage() {
  return (
    <>
      <QualifierCountdown title="IITM BS qualifier prep">
        <Link className="btn btn-primary" href="/qualifier/ds">Data Science qualifier</Link>
        <Link className="btn btn-secondary" href="/qualifier/es">Electronic Systems qualifier</Link>
      </QualifierCountdown>

      <h2 className="section-title mt-xl">Pick your qualifier</h2>
      <div className="grid grid-2">
        {QUALIFIERS.map((q) => (
          <section key={q.id} className="card stack">
            <div>
              <h3>{q.title}</h3>
              <div className="muted">For {q.programmes.map((p) => p.name).join(' · ')}</div>
            </div>
            <div className="flex gap-xs wrap">
              {q.sections.map((s) => <span key={s.id} className="chip chip-blue">{s.name}</span>)}
            </div>
            <p className="muted m-0">
              Weeks 1–4 of each course · {mocksFor(q.id).length} timed mocks ({mocksFor(q.id).filter((m) => !m.pro).length} free) · a day-by-day study plan
              {q.sections.some((s) => s.subjectId) && ' · links to our week 1–4 notes and practice'}
            </p>
            <div className="btn-group">
              <Link className="btn btn-primary" href={`/qualifier/${q.id}`}>Open {q.short} prep →</Link>
              <Link className="btn btn-secondary" href={`/qualifier/${q.id}/plan`}>Study plan</Link>
            </div>
          </section>
        ))}
      </div>

      <h2 className="section-title mt-xl">How the qualifier works</h2>
      <QualifierFacts />

      <div className="alert mt-xl">
        NEXT GEN is an independent study site, not affiliated with IIT Madras. The rules above are summarised from the official admissions pages (checked {QUALIFIER_FACTS_CHECKED}) and change from term to term, so always check the official site before you rely on them. Our mocks use original questions, not IIT Madras papers.
      </div>
    </>
  );
}
