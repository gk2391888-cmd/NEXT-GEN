import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject, getSubjects, getWeek, getWeeks } from '@/lib/content';
import { PracticeSession } from '@/components/quiz/practice-session';
import { ProPracticeSession } from '@/components/quiz/pro-practice-session';
import { PREVIEW_WEEK } from '@/lib/access';

type Params = { subject: string; week: string };

export function generateStaticParams(): Params[] {
  return getSubjects().flatMap((s) => getWeeks(s.id).map((w) => ({ subject: s.id, week: String(w.week) })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { subject, week } = await params;
  return { title: `Practice ${getSubject(subject)?.short ?? ''} week ${week}` };
}

export default async function PracticeWeekPage({ params }: { params: Promise<Params> }) {
  const { subject: subjectId, week: weekParam } = await params;
  const subject = getSubject(subjectId);
  const week = getWeek(subjectId, Number(weekParam));
  if (!subject || !week) notFound();

  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/practice">Practice</Link><span className="sep">/</span>
        {subject.short}<span className="sep">/</span><strong>Week {week.week}</strong>
      </div>
      {/* Only the free preview week's questions are in the page; the others come from /api/pro/week/…, which checks the plan. */}
      {week.week === PREVIEW_WEEK ? (
        <PracticeSession
          subjectId={subject.id}
          subjectName={subject.short}
          week={week.week}
          weekTitle={week.title}
          questions={week.questions.map((q) => ({ ...q, week: week.week }))}
        />
      ) : (
        <ProPracticeSession subjectId={subject.id} subjectName={subject.short} week={week.week} weekTitle={week.title} />
      )}
    </>
  );
}
