import { notFound, redirect } from 'next/navigation';
import { getSubject, getSubjects, getWeeks } from '@/lib/content';

export function generateStaticParams() {
  return getSubjects().map((s) => ({ subject: s.id }));
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  if (!getSubject(subject)) notFound();
  const first = getWeeks(subject)[0];
  redirect(first ? `/library/${subject}/${first.week}` : '/library');
}
