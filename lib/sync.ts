'use client';

import { useSyncExternalStore } from 'react';
import { getSupabase } from './supabase/client';
import { progress, type ServerProgress } from './progress/store';
import { weekKey, type AnswerRecord, type CodingAttempt, type SyncOp, type TestAttempt } from './progress/types';

/* ---------------- status (for the topbar chip) ---------------- */

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';
let status: SyncStatus = 'idle';
const statusListeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => 'idle',
  );
}

/* ---------------- upload ---------------- */

const PAGE = 1000;
let running: Promise<void> | null = null;

/** Uploads queued changes, then (optionally) pulls the latest server copy. Calls never overlap. */
export function sync(userId: string, { pull = true } = {}): Promise<void> {
  if (running) return running.then(() => sync(userId, { pull }));
  running = (async () => {
    setStatus('syncing');
    try {
      await flush(userId);
      if (pull) await pullAll(userId);
      setStatus(progress.getState().pending.length ? 'syncing' : 'synced');
    } catch (error) {
      console.warn('[sync] will retry later', error);
      setStatus('offline');
    } finally {
      running = null;
    }
  })();
  return running;
}

async function flush(userId: string) {
  const ops = progress.getState().pending;
  if (!ops.length) return;
  const db = getSupabase();

  for (let i = 0; i < ops.length; ) {
    const op = ops[i];
    let next = i + 1;
    if (op.kind === 'answers') {
      // Neighbouring answer uploads go in one request.
      const records: AnswerRecord[] = [...op.records];
      while (next < ops.length && ops[next].kind === 'answers') {
        records.push(...(ops[next] as Extract<SyncOp, { kind: 'answers' }>).records);
        next++;
      }
      for (let j = 0; j < records.length; j += 500) {
        const { error } = await db
          .from('answers')
          .upsert(records.slice(j, j + 500).map((r) => answerRow(userId, r)), { onConflict: 'user_id,id', ignoreDuplicates: true });
        if (error) throw error;
      }
    } else {
      await sendOne(userId, op);
    }
    // Stop if the student logged out mid-upload; their queue stays on the device.
    if (progress.getScope() !== userId) return;
    // New changes are only ever appended, so the sent ones are still at the front.
    progress.acknowledge(next - i);
    i = next;
  }
}

async function sendOne(userId: string, op: Exclude<SyncOp, { kind: 'answers' }>) {
  const db = getSupabase();
  const check = ({ error }: { error: unknown }) => {
    if (error) throw error;
  };
  switch (op.kind) {
    case 'week':
      return check(
        await db.from('week_status').upsert(
          { user_id: userId, subject_id: op.subjectId, week: op.week, done: op.status.done, saved: op.status.saved, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,subject_id,week' },
        ),
      );
    case 'test':
      return check(await db.from('test_attempts').upsert(testRow(userId, op.attempt), { onConflict: 'user_id,id', ignoreDuplicates: true }));
    case 'coding': {
      const { error } = await db.from('coding_attempts').upsert(codingRow(userId, op.attempt), { onConflict: 'user_id,id', ignoreDuplicates: true });
      // Before migration 0007 is run the attempt stays on this device only, rather than blocking every later upload.
      if (missingTable(error)) return console.warn('[sync] coding_attempts table missing; run supabase/migrations/0007_coding_attempts.sql');
      return check({ error });
    }
    case 'visit':
      return check(await db.from('profiles').update({ last_visited: op.lastVisited, updated_at: new Date().toISOString() }).eq('id', userId));
    case 'profile':
      return check(
        await db.from('profiles').update({ full_name: op.profile.fullName, subjects: op.profile.subjects, updated_at: new Date().toISOString() }).eq('id', userId),
      );
    case 'exam':
      return check(
        await db.from('profiles').update({ exam_name: op.exam?.name ?? null, exam_date: op.exam?.date ?? null, updated_at: new Date().toISOString() }).eq('id', userId),
      );
    case 'reset':
      check(await db.from('answers').delete().eq('user_id', userId));
      check(await db.from('test_attempts').delete().eq('user_id', userId));
      {
        const { error } = await db.from('coding_attempts').delete().eq('user_id', userId);
        if (!missingTable(error)) check({ error });
      }
      check(await db.from('week_status').delete().eq('user_id', userId));
      return check(await db.from('profiles').update({ last_visited: null }).eq('id', userId));
  }
}

const answerRow = (userId: string, a: AnswerRecord) => ({
  user_id: userId,
  id: a.id,
  question_id: a.questionId,
  subject_id: a.subjectId,
  week: a.week,
  correct: a.correct,
  mode: a.mode,
  answered_at: a.at,
});

const testRow = (userId: string, t: TestAttempt) => ({
  user_id: userId,
  id: t.id,
  subject_id: t.subjectId,
  test_id: t.testId,
  started_at: t.startedAt,
  submitted_at: t.submittedAt,
  duration_sec: t.durationSec,
  question_ids: t.questionIds,
  responses: t.responses,
  correct: t.correct,
  total: t.total,
  time_spent: t.timeSpent ?? null,
});

const codingRow = (userId: string, a: CodingAttempt) => ({
  user_id: userId,
  id: a.id,
  set_id: a.setId,
  started_at: a.startedAt,
  submitted_at: a.submittedAt,
  duration_sec: a.durationSec,
  score: a.score,
  problems: a.problems,
});

/** PostgREST's "no such table" (older and newer codes), e.g. a migration that hasn't been run yet. */
const missingTable = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205' || code === '42P01';
};

/* ---------------- download ---------------- */

async function fetchAll<T>(table: string, userId: string, order: string): Promise<T[]> {
  const db = getSupabase();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*').eq('user_id', userId).order(order).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

type AnswerRow = ReturnType<typeof answerRow>;
type TestRow = ReturnType<typeof testRow>;
type CodingRow = ReturnType<typeof codingRow>;
type WeekRow = { subject_id: string; week: number; done: boolean; saved: boolean };

/** Like fetchAll, but undefined when the table doesn't exist yet. */
async function fetchOptional<T>(table: string, userId: string, order: string): Promise<T[] | undefined> {
  try {
    return await fetchAll<T>(table, userId, order);
  } catch (error) {
    if (missingTable(error)) return undefined;
    throw error;
  }
}

async function pullAll(userId: string) {
  const db = getSupabase();
  const [profileRes, weeks, answers, tests, coding] = await Promise.all([
    db.from('profiles').select('full_name, subjects, last_visited, trial_ends_at, pro_until, exam_name, exam_date').eq('id', userId).maybeSingle(),
    fetchAll<WeekRow>('week_status', userId, 'subject_id'),
    fetchAll<AnswerRow>('answers', userId, 'answered_at'),
    fetchAll<TestRow>('test_attempts', userId, 'submitted_at'),
    fetchOptional<CodingRow>('coding_attempts', userId, 'submitted_at'),
  ]);
  if (profileRes.error) throw profileRes.error;

  const server: ServerProgress = {
    weeks: Object.fromEntries(weeks.map((w) => [weekKey(w.subject_id, w.week), { done: w.done, saved: w.saved }])),
    answers: answers.map((a) => ({
      id: a.id,
      questionId: a.question_id,
      subjectId: a.subject_id,
      week: a.week,
      correct: a.correct,
      mode: a.mode as AnswerRecord['mode'],
      at: a.answered_at,
    })),
    tests: tests.map((t) => ({
      id: t.id,
      subjectId: t.subject_id,
      testId: t.test_id,
      startedAt: t.started_at,
      submittedAt: t.submitted_at,
      durationSec: t.duration_sec,
      questionIds: t.question_ids,
      responses: t.responses,
      correct: t.correct,
      total: t.total,
      timeSpent: t.time_spent ?? undefined,
    })),
    codingAttempts: coding?.map((a) => ({
      id: a.id,
      setId: a.set_id,
      startedAt: a.started_at,
      submittedAt: a.submitted_at,
      durationSec: a.duration_sec,
      score: a.score,
      problems: a.problems,
    })),
    lastVisited: profileRes.data?.last_visited ?? undefined,
    profile: profileRes.data ? { fullName: profileRes.data.full_name ?? '', subjects: profileRes.data.subjects ?? [] } : undefined,
    plan: profileRes.data ? { trialEndsAt: profileRes.data.trial_ends_at ?? undefined, proUntil: profileRes.data.pro_until ?? undefined } : undefined,
    exam: profileRes.data?.exam_date ? { name: profileRes.data.exam_name ?? 'Exam', date: profileRes.data.exam_date } : undefined,
  };
  // The user may have switched accounts while this was loading.
  if (progress.getScope() === userId) progress.replaceFromServer(server);
}
