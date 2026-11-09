import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getQualifier, getQualifierMock, QUALIFIER_MOCKS } from './qualifier';
import type { Question, QuestionText } from './types';

/**
 * Reads the qualifier mock papers: content/qualifier/mocks/<mock>.json (Hinglish) and
 * content/qualifier/mocks-en/<mock>.json (English, by question id). Kept apart from lib/content.ts,
 * which reads the course weeks.
 */
const DIR = join(process.cwd(), 'content', 'qualifier');

type MockFile = { mockId: string; sections: { section: string; questions: Question[] }[] };

/** Parsed once per server instance, like lib/content.ts: the files never change while the app runs. */
const poolMemo = new Map<string, Question[]>();

/**
 * A mock's questions in paper order, each with its English in `en`. `week` holds the question's
 * section number (1 = the qualifier's first section), which is how the test runner groups them.
 */
export function getQualifierPool(mockId: string): Question[] {
  const cached = poolMemo.get(mockId);
  if (cached) return cached;
  // The id is checked against the config first, since it becomes a file name.
  const mock = getQualifierMock(mockId);
  const qualifier = mock && getQualifier(mock.qualifier);
  const file = join(DIR, 'mocks', `${mockId}.json`);
  if (!qualifier || !existsSync(file)) return [];

  const data: MockFile = JSON.parse(readFileSync(file, 'utf8'));
  const enFile = join(DIR, 'mocks-en', `${mockId}.json`);
  const english: Record<string, QuestionText> = existsSync(enFile) ? JSON.parse(readFileSync(enFile, 'utf8')).questions : {};
  const pool = qualifier.sections.flatMap((s, i) =>
    (data.sections.find((d) => d.section === s.id)?.questions ?? []).map((q) => ({ ...q, ...(english[q.id] ? { en: english[q.id] } : {}), week: i + 1 })),
  );
  poolMemo.set(mockId, pool);
  return pool;
}

/** One qualifier question by id (e.g. "ds-1-math1-q3"), for the doubt solver. Pro mocks only when `includePro`. */
export function getQualifierQuestion(id: string, includePro: boolean): Question | undefined {
  const mock = QUALIFIER_MOCKS.find((m) => id.startsWith(`${m.id}-`));
  if (!mock || (mock.pro && !includePro)) return undefined;
  return getQualifierPool(mock.id).find((q) => q.id === id);
}
