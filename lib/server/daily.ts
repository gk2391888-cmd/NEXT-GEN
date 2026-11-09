import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSubject, getWeeks } from '@/lib/content';
import { DEFAULT_CHOICE_ID, parseChoice } from '@/lib/programmes';
import { applyPatch, type QuestionPatch } from '@/lib/question-text';
import { indiaClock } from '@/lib/reminders';
import type { DailyQuestion } from '@/lib/daily';
import type { Question } from '@/lib/types';

/** FNV-1a: a small stable hash, so the same day and programme always give the same question. */
export function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

type Picked = Question & { subjectId: string; week: number; weekTitle: string };

/**
 * Today's question for a programme choice: everyone with the same choice gets the same one.
 * A subject, then a week (a qualifier's first weeks only), then a question, each from the hash.
 */
export function pickDaily(choiceId: string, day = indiaClock().day): Picked | undefined {
  const choice = parseChoice(choiceId) ?? parseChoice(DEFAULT_CHOICE_ID)!;
  const subjects = choice.level.subjects.filter((id) => getWeeks(id).length > 0);
  if (!subjects.length) return undefined;
  const seed = hash(`${day}:${choice.id}`);
  const subjectId = subjects[seed % subjects.length];
  const weeks = getWeeks(subjectId).filter((w) => !choice.weeks || w.week <= choice.weeks);
  const week = weeks[hash(`${seed}:week`) % weeks.length];
  const question = week.questions[hash(`${seed}:question`) % week.questions.length];
  return { ...question, subjectId, week: week.week, weekTitle: week.title };
}

/** The question with any admin correction applied (content_overrides, as the doubt solver does). */
/**
 * Admin corrections, kept per server instance for a minute: Quiz War asks for the same questions on
 * every poll, and a fresh query each time was most of its database traffic. An admin's fix still shows
 * within a minute.
 */
const OVERRIDE_TTL_MS = 60_000;
const overrideMemo = new Map<string, { patch: QuestionPatch | undefined; at: number }>();

export async function withOverride<T extends Question>(admin: SupabaseClient | null, q: T): Promise<T> {
  if (!admin) return q;
  const hit = overrideMemo.get(q.id);
  if (hit && Date.now() - hit.at < OVERRIDE_TTL_MS) return applyPatch(q, hit.patch);
  const { data, error } = await admin.from('content_overrides').select('data').eq('key', `q:${q.id}`).maybeSingle();
  const patch = data?.data as QuestionPatch | undefined;
  if (!error) overrideMemo.set(q.id, { patch, at: Date.now() });
  return applyPatch(q, patch);
}

export function publicDaily(q: Picked, day: string): DailyQuestion {
  return {
    day,
    id: q.id,
    subjectId: q.subjectId,
    subjectName: getSubject(q.subjectId)?.name ?? q.subjectId,
    week: q.week,
    weekTitle: q.weekTitle,
    difficulty: q.difficulty,
    question: q.question,
    code: q.code,
    options: q.options,
    en: q.en ? { question: q.en.question, options: q.en.options } : undefined,
  };
}
