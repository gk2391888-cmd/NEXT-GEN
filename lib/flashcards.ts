import type { Week } from './types';

/**
 * Flashcards are made from a week's notes, nothing new is written: every key concept
 * ("**Term**: explanation") is a card with the term in front, and every common mistake is a
 * trap card. Shared by the server (card counts) and the browser.
 */
export type Flashcard = { id: string; kind: 'concept' | 'mistake'; front: string; back: string };

const strip = (text: string) => text.replace(/\*\*/g, '').trim();
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function cardsForWeek(subjectId: string, week: Pick<Week, 'week' | 'title' | 'concepts' | 'mistakes'>): Flashcard[] {
  const base = `${subjectId}-w${week.week}`;
  const concepts = week.concepts.map((text, i): Flashcard => {
    const m = /^\*\*(.+?)\*\*\s*[:—–-]?\s*([\s\S]*)$/.exec(text.trim());
    const back = m?.[2]?.trim() && capital(m[2].trim());
    return m && back
      ? { id: `${base}-c${i + 1}`, kind: 'concept', front: m[1].trim(), back }
      : { id: `${base}-c${i + 1}`, kind: 'concept', front: `Key idea ${i + 1} of ${week.title}`, back: text };
  });
  const mistakes = week.mistakes.map((text, i): Flashcard => {
    // "The trap. How to avoid it." → the trap in front, the fix on the back.
    const split = /^(.+?[.?!])\s+([\s\S]+)$/.exec(strip(text));
    return split
      ? { id: `${base}-m${i + 1}`, kind: 'mistake', front: split[1], back: split[2] }
      : { id: `${base}-m${i + 1}`, kind: 'mistake', front: `What’s a common trap in ${week.title}?`, back: strip(text) };
  });
  return [...concepts, ...mistakes];
}

/* ---------------- Review schedule (on this device) ---------------- */

/** "I knew it" pushes a card back this many days, a little more each time in a row. */
const INTERVAL_DAYS = [3, 7, 14];
const DAY_MS = 86_400_000;

export type CardState = { box: number; due: number };
export type DeckState = Record<string, CardState>;

const key = (owner: string) => `nextgen-flashcards:${owner}`;

export function loadCards(owner: string): DeckState {
  try {
    return JSON.parse(window.localStorage.getItem(key(owner)) ?? '{}') as DeckState;
  } catch {
    return {};
  }
}

export function markCard(owner: string, cardId: string, knew: boolean, now = Date.now()): DeckState {
  const all = loadCards(owner);
  const box = knew ? Math.min((all[cardId]?.box ?? 0) + 1, INTERVAL_DAYS.length) : 0;
  all[cardId] = { box, due: knew ? now + INTERVAL_DAYS[box - 1] * DAY_MS : now };
  try {
    window.localStorage.setItem(key(owner), JSON.stringify(all));
  } catch {
    // Progress lasts for this session only.
  }
  return all;
}

/** A card is due when it has been seen and its date has come; new cards aren't "due". */
export const isDue = (s: CardState | undefined, now = Date.now()) => Boolean(s && s.due <= now);
/** Known: answered "I knew it" and not due yet. */
export const isKnown = (s: CardState | undefined, now = Date.now()) => Boolean(s && s.box > 0 && s.due > now);

/** Cards of a week in the order to study them: due first, then new, then known. */
export function studyOrder(cards: Flashcard[], state: DeckState, now = Date.now()): Flashcard[] {
  const rank = (c: Flashcard) => (isDue(state[c.id], now) ? 0 : state[c.id] ? 2 : 1);
  return [...cards].sort((a, b) => rank(a) - rank(b));
}
