import { notFound, redirect } from 'next/navigation';
import { getSubject, getSubjects, getWeeks } from '@/lib/content';

export function generateStaticParams() {
  return getSubjects().map((s) => ({ subject: s.id }));
}

// Only real subjects: any other path is a 404 instead of a page rendered (and cached) on demand.
export const dynamicParams = false;

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  if (!getSubject(subject)) notFound();
  const first = getWeeks(subject)[0];
  redirect(first ? `/library/${subject}/${first.week}` : '/library');
}
