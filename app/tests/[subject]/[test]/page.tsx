import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getQuestionsForWeeks, getSubject, getSubjects, getWeekRefs, getWeeks } from '@/lib/content';
import { getMockTest, MOCK_TESTS } from '@/lib/tests';
import { ProTestRunner } from '@/components/quiz/pro-test-runner';

type Params = { subject: string; test: string };

export function generateStaticParams(): Params[] {
  return getSubjects()
    .filter((s) => getWeeks(s.id).length > 0)
    .flatMap((s) => MOCK_TESTS.map((t) => ({ subject: s.id, test: t.id })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { subject, test } = await params;
  return { title: `${getSubject(subject)?.short ?? ''} ${getMockTest(test)?.title ?? 'Mock test'}` };
}

export default async function TestPage({ params }: { params: Promise<Params> }) {
  const { subject: subjectId, test: testId } = await params;
  const subject = getSubject(subjectId);
  const test = getMockTest(testId);
  const pool = test ? getQuestionsForWeeks(subjectId, test.fromWeek, test.toWeek) : [];
  if (!subject || !test || pool.length === 0) notFound();

  const weekTitles = Object.fromEntries(getWeekRefs(subjectId).map((w) => [w.week, w.title]));

  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/tests">Mock Tests</Link><span className="sep">/</span>
        {subject.short}<span className="sep">/</span><strong>{test.title}</strong>
      </div>
      {/* The questions aren't put in the page: they come from /api/pro/tests/<subject>/<test>, which checks the plan. */}
      <ProTestRunner subject={subject} test={test} weekTitles={weekTitles} />
    </>
  );
}
