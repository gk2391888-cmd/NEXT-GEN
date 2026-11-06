import type { Metadata } from 'next';
import { PageHead } from '@/components/ui';
import { FlashcardsHome } from '@/components/flashcards';
import { deckRefs } from '@/lib/server/flashcards';
import { getSubjects } from '@/lib/content';

export const metadata: Metadata = { title: 'Flashcards' };

export default function FlashcardsPage() {
  const subjects = getSubjects().filter((s) => deckRefs(s.id).length > 0);
  return (
    <>
      <PageHead
        kicker="Quick revision"
        title="Flashcards"
        description="Every week's key concepts and common mistakes as cards. Flip, say if you knew it, and the cards you know come back just before you'd forget them."
      />
      <FlashcardsHome subjects={subjects} decks={Object.fromEntries(subjects.map((s) => [s.id, deckRefs(s.id)]))} />
    </>
  );
}
