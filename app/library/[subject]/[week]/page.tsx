import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject, getSubjects, getWeek, getWeekRefs, getWeeks } from '@/lib/content';
import { ChoiceWeek, SubjectCode } from '@/components/programme-switch';
import { PREVIEW_WEEK } from '@/lib/access';
import { WeekNav } from '@/components/library/week-nav';
import { WeekActions, VisitTracker } from '@/components/library/week-actions';
import { WeekNoteFiles } from '@/components/library/note-files';
import { WeekNotes } from '@/components/library/week-notes';
import { ProWeekNotes } from '@/components/library/pro-week-notes';

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
      <div className="crumb page-crumb no-print">
        <Link href="/library">Study Library</Link><span className="sep">/</span>
        {subject.short}<span className="sep">/</span><strong>Week {week.week}</strong>
      </div>

      <div className="row">
        <WeekNav subject={subject} weeks={weeks} current={week.week} />

        <article className="card notes">
          <div className="notes-head">
            <div>
              <span className="chip chip-teal">WEEK {week.week} · {week.readMinutes} MIN READ</span>
              <h1>{week.title}</h1>
              <p>{week.summary}</p>
              <p className="muted mt-sm">{subject.name} · <SubjectCode subject={subject} /></p>
            </div>
            <WeekActions subjectId={subject.id} week={week.week} variant="top" />
          </div>

          <WeekNoteFiles subjectId={subject.id} week={week.week} />

          {/* Only the free preview week is in the page; the others come from /api/pro/week/…, which checks the plan. */}
          {week.week === PREVIEW_WEEK ? <WeekNotes week={week} /> : <ProWeekNotes subjectId={subject.id} week={week.week} />}

          <div className="notes-foot no-print">
            <span className="muted">Finished reading? Check your understanding with {week.questions.length} questions.</span>
            <div className="btn-group">
              <WeekActions subjectId={subject.id} week={week.week} variant="done" />
              <Link className="btn btn-primary" href={`/practice/${subject.id}/${week.week}`}>Practice week {week.week} →</Link>
            </div>
          </div>

          <div className="notes-foot flush no-print">
            {prev ? <Link className="link" href={`/library/${subject.id}/${prev.week}`}>← Week {prev.week}: {prev.title}</Link> : <span />}
            {next && (
              <ChoiceWeek subjectId={subject.id} week={next.week}>
                <Link className="link" href={`/library/${subject.id}/${next.week}`}>Week {next.week}: {next.title} →</Link>
              </ChoiceWeek>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
