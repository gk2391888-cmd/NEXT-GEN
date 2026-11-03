'use client';

import Link from 'next/link';
import { PASS_RULES, QUALIFIER_TEST_SUBJECT, type Qualifier, type QualifierMock } from '@/lib/qualifier';
import type { MockTest } from '@/lib/tests';
import type { Question, Subject } from '@/lib/types';
import { useProContent } from '@/lib/pro-content';
import { percent } from '@/lib/progress/insights';
import { ProContentStatus } from '@/components/pro-lock';
import { TestRunner, type SectionScore, type TestSection } from '@/components/quiz/test-runner';

type Props = { qualifier: Qualifier; mock: QualifierMock; pool: Question[] };

const GENERAL = PASS_RULES[0];

/** A qualifier mock: the course mock test runner, with one section per course and the published pass rule on the result. */
export function QualifierMockRunner({ qualifier, mock, pool }: Props) {
  // Attempts are stored as test attempts of the subject "qualifier", one test id per mock.
  const subject: Subject = { id: QUALIFIER_TEST_SUBJECT, code: '', name: qualifier.title, short: qualifier.short, icon: '★' };
  const test: MockTest = { id: mock.id, title: mock.title, fromWeek: 1, toWeek: 4, questionCount: pool.length, minutes: mock.minutes, pro: mock.pro };
  const sections: TestSection[] = qualifier.sections.map((s, i) => ({
    n: i + 1,
    name: s.name,
    short: s.short,
    revise: s.subjectId
      ? { href: `/library/${s.subjectId}/1`, label: `Revise ${s.short} weeks 1–4 →` }
      : { href: `/qualifier/${qualifier.id}/plan`, label: `Plan your ${s.short} revision →` },
  }));
  const perSection = qualifier.sections.map((s, i) => ({ name: s.short, count: pool.filter((q) => q.week === i + 1).length }));

  return (
    <TestRunner
      subject={subject}
      test={test}
      pool={pool}
      weekTitles={{}}
      sections={sections}
      rules={
        <ul className="my-lg">
          <li>
            {qualifier.sections.length} sections, one per course, covering weeks 1–4: {perSection.map((s) => `${s.name} (${s.count})`).join(', ')}. Move between sections freely with the question palette.
          </li>
          <li>Take it in one sitting with the timer, like the real paper. It submits automatically when time runs out, and a refresh resumes it.</li>
          <li>Each correct answer scores 1 mark; there’s no negative marking in this mock. Check the real exam’s marking scheme and question types in your hall ticket instructions.</li>
          <li>
            The real qualifier is a 4-hour in-person exam. This mock is shorter, so use it to check your pace and your weakest course. Your result shows whether you’d clear the published pass rule (General: {GENERAL.eachCourse}% in every course and {GENERAL.average}% on average).
          </li>
          <li>All questions are original NEXT GEN practice questions, not IIT Madras papers.</li>
        </ul>
      }
      resultExtra={(scores) => <PassCheck scores={scores} qualifier={qualifier} />}
    />
  );
}

/** "Would this score clear the qualifier?" against the published rules: a minimum in every course and on average. */
function PassCheck({ scores, qualifier }: { scores: SectionScore[]; qualifier: Qualifier }) {
  const pcts = scores.map((s) => ({ n: s.n, pct: percent(s.right, s.total) }));
  const average = pcts.length ? Math.round(pcts.reduce((sum, s) => sum + s.pct, 0) / pcts.length) : 0;
  const low = pcts.filter((s) => s.pct < GENERAL.eachCourse).map((s) => qualifier.sections[s.n - 1]?.short ?? `Section ${s.n}`);
  const pass = low.length === 0 && average >= GENERAL.average;

  return (
    <div className={`alert ${pass ? '' : 'alert-warn'} mb-lg`}>
      <strong>{pass ? 'On track: this score would clear the General pass rule.' : 'Not yet at the General pass rule.'}</strong>{' '}
      Your average across the {pcts.length} courses is {average}% (needed: {GENERAL.average}%)
      {low.length > 0 ? `, and ${low.join(', ')} ${low.length === 1 ? 'is' : 'are'} under ${GENERAL.eachCourse}%.` : ', with every course at least ' + GENERAL.eachCourse + '%.'}{' '}
      Other categories have lower cut-offs; see the <Link href={`/qualifier/${qualifier.id}#rules`}>pass rules</Link>. A mock is only a guide to the real exam.
    </div>
  );
}

/** A Pro qualifier mock: its questions come from /api/pro/qualifier/<mock>, which checks the plan. */
export function ProQualifierMockRunner({ qualifier, mock }: Omit<Props, 'pool'>) {
  const { data, error, retry } = useProContent<{ pool: Question[] }>(`/api/pro/qualifier/${mock.id}`);
  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return <QualifierMockRunner qualifier={qualifier} mock={mock} pool={data.pool} />;
}
