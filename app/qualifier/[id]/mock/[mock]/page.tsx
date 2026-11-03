import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getQualifier, getQualifierMock, QUALIFIER_MOCKS } from '@/lib/qualifier';
import { getQualifierPool } from '@/lib/qualifier-content';
import { ProLock } from '@/components/pro-lock';
import { ProQualifierMockRunner, QualifierMockRunner } from '@/components/qualifier/mock-runner';

type Params = { id: string; mock: string };

export function generateStaticParams(): Params[] {
  return QUALIFIER_MOCKS.map((m) => ({ id: m.qualifier, mock: m.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const mock = getQualifierMock((await params).mock);
  return { title: mock?.title ?? 'Qualifier mock', description: 'A timed IIT Madras BS qualifier-style mock test with one section per course and explanations in English and Hinglish.' };
}

export default async function QualifierMockPage({ params }: { params: Promise<Params> }) {
  const { id, mock: mockId } = await params;
  const qualifier = getQualifier(id);
  const mock = getQualifierMock(mockId);
  if (!qualifier || !mock || mock.qualifier !== qualifier.id || getQualifierPool(mock.id).length === 0) notFound();

  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/qualifier">Qualifier Prep</Link><span className="sep">/</span>
        <Link href={`/qualifier/${qualifier.id}`}>{qualifier.short}</Link><span className="sep">/</span><strong>{mock.title}</strong>
      </div>
      {mock.pro ? (
        // The questions aren't put in the page: Pro mocks fetch them from /api/pro/qualifier/<mock>.
        <ProLock feature={mock.title}>
          <ProQualifierMockRunner qualifier={qualifier} mock={mock} />
        </ProLock>
      ) : (
        <QualifierMockRunner qualifier={qualifier} mock={mock} pool={getQualifierPool(mock.id)} />
      )}
    </>
  );
}
