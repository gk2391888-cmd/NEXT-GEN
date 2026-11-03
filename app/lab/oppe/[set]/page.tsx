import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOppeSet, OPPE_SETS, setProblems } from '@/lib/coding';
import { ProOppeExam } from '@/components/coding/pro-oppe-exam';
import { ProLock } from '@/components/pro-lock';

type Params = { set: string };

export function generateStaticParams(): Params[] {
  return OPPE_SETS.map((s) => ({ set: s.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { set } = await params;
  return { title: `${getOppeSet(set)?.title ?? 'OPPE'} · Timed exam` };
}

export default async function OppeExamPage({ params }: { params: Promise<Params> }) {
  const { set: setId } = await params;
  const set = getOppeSet(setId);
  const problems = setProblems(setId);
  if (!set || problems.length === 0) notFound();

  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/lab">Coding Lab</Link><span className="sep">/</span>
        {set.title}<span className="sep">/</span><strong>Timed exam</strong>
      </div>
      {/* Only the set's id, title and time limit go into the page: the problems are Pro content, fetched from /api/pro/oppe/<set>. */}
      <ProLock feature="The timed OPPE simulation">
        <ProOppeExam set={set} />
      </ProLock>
    </>
  );
}
