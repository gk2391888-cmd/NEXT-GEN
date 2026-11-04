import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProblem, OPPE_SETS, PROBLEMS, siblings } from '@/lib/coding';
import { ProCodingWorkspace } from '@/components/coding/pro-workspace';

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return PROBLEMS.map((p) => ({ id: p.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${getProblem(id)?.title ?? 'Problem'} · Coding Lab` };
}

export default async function ProblemPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const problem = getProblem(id);
  if (!problem) notFound();

  const { prev, next, position, total } = siblings(problem);
  const setTitle = problem.set ? OPPE_SETS.find((s) => s.id === problem.set)?.title : 'Practice problems';
  const nav = { prev: prev?.id, next: next?.id, position, total };

  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/lab">Coding Lab</Link><span className="sep">/</span>
        {setTitle}<span className="sep">/</span><strong>{problem.title}</strong>
      </div>
      {/* Only the id goes into the page: the problem comes from /api/pro/coding/<id>, which checks the plan. */}
      <ProCodingWorkspace id={problem.id} {...nav} />
    </>
  );
}
