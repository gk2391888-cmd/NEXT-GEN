import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject, getSubjects, getWeeks } from '@/lib/content';
import { FlashcardSession } from '@/components/flashcards';
import { deckRefs } from '@/lib/server/flashcards';

type Params = { subject: string; week: string };

export function generateStaticParams(): Params[] {
  return getSubjects().flatMap((s) => [...getWeeks(s.id).map((w) => ({ subject: s.id, week: String(w.week) })), { subject: s.id, week: 'review' }]);
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { subject, week } = await params;
  const s = getSubject(subject);
  return { title: s ? `${s.short} ${week === 'review' ? 'review' : `week ${week}`} flashcards` : 'Flashcards' };
}

export default async function FlashcardWeekPage({ params }: { params: Promise<Params> }) {
  const { subject: subjectId, week } = await params;
  const subject = getSubject(subjectId);
  if (!subject) notFound();
  return (
    <>
      <div className="crumb page-crumb">
        <Link href="/flashcards">Flashcards</Link><span className="sep">/</span>
        {subject.short}<span className="sep">/</span><strong>{week === 'review' ? 'Review' : `Week ${week}`}</strong>
      </div>
      <FlashcardSession subject={subject} week={week === 'review' ? 'review' : Number(week)} decks={deckRefs(subjectId)} />
    </>
  );
}
