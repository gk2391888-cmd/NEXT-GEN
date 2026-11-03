import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cache } from 'react';
import type { Question, Subject, SubjectContent, Week, WeekRef } from './types';

const CONTENT_DIR = join(process.cwd(), 'content');

export const getSubjects = cache((): Subject[] =>
  JSON.parse(readFileSync(join(CONTENT_DIR, 'subjects.json'), 'utf8')),
);

export function getSubject(id: string): Subject | undefined {
  return getSubjects().find((s) => s.id === id);
}

/** Weeks for a subject; empty while its content file has not been written yet. */
export const getWeeks = cache((subjectId: string): Week[] => {
  const file = join(CONTENT_DIR, 'weeks', `${subjectId}.json`);
  if (!existsSync(file)) return [];
  const data: SubjectContent = JSON.parse(readFileSync(file, 'utf8'));
  return data.weeks;
});

export function getWeek(subjectId: string, week: number): Week | undefined {
  return getWeeks(subjectId).find((w) => w.week === week);
}

/** Lightweight week list (no notes or questions) for navigation and progress views. */
export function getWeekRefs(subjectId: string): WeekRef[] {
  return getWeeks(subjectId).map((w) => ({ week: w.week, title: w.title, questionCount: w.questions.length }));
}

export function getQuestionsForWeeks(subjectId: string, from: number, to: number): Question[] {
  return getWeeks(subjectId)
    .filter((w) => w.week >= from && w.week <= to)
    .flatMap((w) => w.questions.map((q) => ({ ...q, week: w.week })));
}

/** Map of subjectId → week refs, for client components that show titles next to progress. */
export function getCatalog(): Record<string, WeekRef[]> {
  return Object.fromEntries(getSubjects().map((s) => [s.id, getWeekRefs(s.id)]));
}

/** One question by id (e.g. "stat1-w3-q2"), with its subject and week, or undefined. */
export function getQuestion(id: string): (Question & { subjectId: string; week: number; weekTitle: string }) | undefined {
  const match = /^([a-z0-9]+)-w(\d+)-q\d+$/.exec(id);
  if (!match) return undefined;
  const [, subjectId, week] = match;
  const data = getWeek(subjectId, Number(week));
  const question = data?.questions.find((q) => q.id === id);
  return data && question ? { ...question, subjectId, week: data.week, weekTitle: data.title } : undefined;
}
