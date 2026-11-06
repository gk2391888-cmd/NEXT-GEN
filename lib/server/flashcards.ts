import 'server-only';
import { getWeeks } from '@/lib/content';
import { cardsForWeek } from '@/lib/flashcards';
import type { DeckRef } from '@/components/flashcards';

/** Each week's card ids (no text: the notes of locked weeks stay behind /api/pro). */
export function deckRefs(subjectId: string): DeckRef[] {
  return getWeeks(subjectId).map((w) => ({ week: w.week, title: w.title, cardIds: cardsForWeek(subjectId, w).map((c) => c.id) }));
}
