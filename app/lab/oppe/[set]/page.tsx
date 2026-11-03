import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOppeSet, OPPE_SETS, setProblems } from '@/lib/coding';
import { OppeExam } from '@/components/coding/oppe-exam';
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
      <ProLock feature="The timed OPPE simulation">
        <OppeExam set={set} problems={problems} />
      </ProLock>
    </>
  );
}
