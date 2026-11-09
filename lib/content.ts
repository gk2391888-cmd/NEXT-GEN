import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countByLevel } from './levels';
import type { Question, QuestionText, Subject, SubjectContent, Week, WeekRef } from './types';

const CONTENT_DIR = join(process.cwd(), 'content');

/*
 * Content files never change while the app runs, so each one is read and parsed
 * once per server instance and kept in memory. (React's cache() only lasts for
 * one page render and does nothing in route handlers, so every API request used
 * to re-read and re-parse whole subject files — the main cost of the API.)
 * Callers must treat what they get back as read-only.
 */
let subjectsMemo: Subject[] | undefined;
const weeksMemo = new Map<string, Week[]>();
const questionIndexMemo = new Map<string, Map<string, { question: Question; week: Week }>>();

export function getSubjects(): Subject[] {
  subjectsMemo ??= JSON.parse(readFileSync(join(CONTENT_DIR, 'subjects.json'), 'utf8')) as Subject[];
  return subjectsMemo;
}

export function getSubject(id: string): Subject | undefined {
  return getSubjects().find((s) => s.id === id);
}

/** English versions of a subject's questions, by question id. */
function getEnglishQuestions(subjectId: string): Record<string, QuestionText> {
  const file = join(CONTENT_DIR, 'weeks-en', `${subjectId}.json`);
  if (!existsSync(file)) return {};
  return (JSON.parse(readFileSync(file, 'utf8')) as { questions: Record<string, QuestionText> }).questions;
}

/** Weeks for a subject, each question with its English version in `en`; empty while its content file has not been written yet. */
export function getWeeks(subjectId: string): Week[] {
  const cached = weeksMemo.get(subjectId);
  if (cached) return cached;
  // Only ids that look like ours reach the disk, so a crafted id can't read other files.
  if (!/^[a-z0-9]+$/.test(subjectId)) return [];
  const file = join(CONTENT_DIR, 'weeks', `${subjectId}.json`);
  if (!existsSync(file)) return [];
  const data: SubjectContent = JSON.parse(readFileSync(file, 'utf8'));
  const english = getEnglishQuestions(subjectId);
  const weeks = data.weeks.map((w) => ({ ...w, questions: w.questions.map((q) => (english[q.id] ? { ...q, en: english[q.id] } : q)) }));
  weeksMemo.set(subjectId, weeks);
  return weeks;
}

/** Every question of a subject by id, built once alongside its weeks. */
function questionIndex(subjectId: string) {
  let index = questionIndexMemo.get(subjectId);
  if (!index) {
    index = new Map(getWeeks(subjectId).flatMap((week) => week.questions.map((question) => [question.id, { question, week }] as const)));
    questionIndexMemo.set(subjectId, index);
  }
  return index;
}

export function getWeek(subjectId: string, week: number): Week | undefined {
  return getWeeks(subjectId).find((w) => w.week === week);
}

/** Lightweight week list (no notes or questions) for navigation and progress views. */
export function getWeekRefs(subjectId: string): WeekRef[] {
  return getWeeks(subjectId).map((w) => ({ week: w.week, title: w.title, questionCount: w.questions.length, levels: countByLevel(w.questions) }));
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
  const hit = questionIndex(match[1]).get(id);
  return hit && hit.week.week === Number(match[2]) ? { ...hit.question, subjectId: match[1], week: hit.week.week, weekTitle: hit.week.title } : undefined;
}
