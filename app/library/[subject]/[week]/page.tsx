import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject, getSubjects, getWeek, getWeekRefs, getWeeks } from '@/lib/content';
import { InlineText } from '@/components/ui';
import { WeekNav } from '@/components/library/week-nav';
import { WeekActions, VisitTracker } from '@/components/library/week-actions';

type Params = { subject: string; week: string };

export function generateStaticParams(): Params[] {
  return getSubjects().flatMap((s) => getWeeks(s.id).map((w) => ({ subject: s.id, week: String(w.week) })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { subject: subjectId, week } = await params;
  const subject = getSubject(subjectId);
  const data = getWeek(subjectId, Number(week));
  return { title: subject && data ? `${subject.short} week ${data.week}: ${data.title}` : 'Study Library' };
}

export default async function WeekPage({ params }: { params: Promise<Params> }) {
  const { subject: subjectId, week: weekParam } = await params;
  const subject = getSubject(subjectId);
  const week = getWeek(subjectId, Number(weekParam));
  if (!subject || !week) notFound();

  const weeks = getWeekRefs(subjectId);
  const prev = weeks.find((w) => w.week === week.week - 1);
  const next = weeks.find((w) => w.week === week.week + 1);

  return (
    <>
      <VisitTracker subjectId={subject.id} week={week.week} />
      <div className="crumb no-print" style={{ marginBottom: 16 }}>
        <Link href="/library">Study Library</Link><span className="sep">/</span>
        {subject.short}<span className="sep">/</span><strong>Week {week.week}</strong>
      </div>

      <div className="row" style={{ alignItems: 'flex-start' }}>
        <WeekNav subject={subject} weeks={weeks} current={week.week} />

        <article className="card notes">
          <div className="notes-head">
            <div style={{ minWidth: 0, flex: '1 1 300px' }}>
              <span className="chip chip-teal">WEEK {week.week} · {week.readMinutes} MIN READ</span>
              <h1>{week.title}</h1>
              <p>{week.summary}</p>
              <p className="muted" style={{ marginTop: 6 }}>{subject.name} · {subject.code}</p>
            </div>
            <WeekActions subjectId={subject.id} week={week.week} variant="top" />
          </div>

          <section className="notes-section">
            <h3><span className="num">1</span>Concept</h3>
            <ul>{week.concepts.map((c, i) => <li key={i}><InlineText text={c} /></li>)}</ul>
          </section>

          <section className="notes-section">
            <h3><span className="num">2</span>Solved example</h3>
            <div className="example">
              <div style={{ color: 'var(--ink)', fontWeight: 600 }}><InlineText text={week.example.problem} /></div>
              {week.example.code && <pre className="code-block">{week.example.code}</pre>}
              <ol>{week.example.steps.map((s, i) => <li key={i}><InlineText text={s} /></li>)}</ol>
            </div>
          </section>

          <section className="notes-section">
            <h3><span className="num">3</span>Common mistakes</h3>
            {week.mistakes.map((m, i) => <div key={i} className="mistake"><InlineText text={m} /></div>)}
          </section>

          <section className="notes-section">
            <h3><span className="num">4</span>Quick revision</h3>
            <ul className="revision">{week.revision.map((r, i) => <li key={i}><InlineText text={r} /></li>)}</ul>
          </section>

          <div className="notes-foot no-print">
            <span className="muted">Padh liya? Ab {week.questions.length} questions se check karo.</span>
            <div className="btn-group">
              <WeekActions subjectId={subject.id} week={week.week} variant="done" />
              <Link className="btn btn-primary" href={`/practice/${subject.id}/${week.week}`}>Practice week {week.week} →</Link>
            </div>
          </div>

          <div className="notes-foot no-print" style={{ borderTop: 0, paddingTop: 0 }}>
            {prev ? <Link className="link" href={`/library/${subject.id}/${prev.week}`}>← Week {prev.week}: {prev.title}</Link> : <span />}
            {next && <Link className="link" href={`/library/${subject.id}/${next.week}`}>Week {next.week}: {next.title} →</Link>}
          </div>
        </article>
      </div>
    </>
  );
}
