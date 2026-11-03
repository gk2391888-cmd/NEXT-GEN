'use client';

import { useSyncExternalStore } from 'react';
import {
  emptyProgress,
  weekKey,
  type ActiveExam,
  type ActiveTest,
  type AnswerRecord,
  type CodingAttempt,
  type ExamTarget,
  type NewAnswer,
  type Profile,
  type ProgressState,
  type SyncOp,
  type TestAttempt,
  type WeekStatus,
} from './types';

const GUEST_KEY = 'nextgen-progress-v2';
const userKey = (userId: string) => `${GUEST_KEY}:${userId}`;
/** Keeps the browser copy small; older answers matter less for weak-topic detection. */
const MAX_ANSWERS = 3000;
const MAX_TESTS = 200;

const SERVER_SNAPSHOT = emptyProgress();
/** Logged-in student's id, or null for a guest. Decides which copy the app reads and writes. */
let scope: string | null = null;
let snapshot: ProgressState | null = null;
const listeners = new Set<() => void>();

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function read(key: string): ProgressState {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const state = { ...emptyProgress(), ...parsed, version: 2 as const };
    // Answers saved before ids existed get one now, so they can be uploaded safely.
    state.answers = state.answers.map((a) => (a.id ? a : { ...a, id: newId() }));
    return state;
  } catch {
    return emptyProgress();
  }
}

function write(key: string, state: ProgressState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): progress still works for this tab.
  }
}

const currentKey = () => (scope ? userKey(scope) : GUEST_KEY);

function getSnapshot(): ProgressState {
  if (!snapshot) snapshot = read(currentKey());
  return snapshot;
}

const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === currentKey()) {
      snapshot = read(currentKey());
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function commit(next: ProgressState) {
  snapshot = next;
  write(currentKey(), next);
  notify();
}

/** Pure reducer: how each change affects the state. Also used to replay unsent changes over fresh server data. */
export function applyOp(s: ProgressState, op: SyncOp): ProgressState {
  switch (op.kind) {
    case 'answers': {
      const known = new Set(s.answers.map((a) => a.id));
      const fresh = op.records.filter((r) => !known.has(r.id));
      return { ...s, answers: [...s.answers, ...fresh].slice(-MAX_ANSWERS) };
    }
    case 'week':
      return { ...s, weeks: { ...s.weeks, [weekKey(op.subjectId, op.week)]: op.status } };
    case 'test':
      return s.tests.some((t) => t.id === op.attempt.id) ? s : { ...s, tests: [...s.tests, op.attempt].slice(-MAX_TESTS) };
    case 'coding': {
      const list = s.codingAttempts ?? [];
      return list.some((a) => a.id === op.attempt.id) ? s : { ...s, codingAttempts: [...list, op.attempt].slice(-MAX_TESTS) };
    }
    case 'visit':
      return { ...s, lastVisited: op.lastVisited };
    case 'profile':
      return { ...s, profile: op.profile };
    case 'exam':
      return { ...s, exam: op.exam ?? undefined };
    case 'reset':
      return { ...s, weeks: {}, answers: [], tests: [], codingAttempts: [], lastVisited: undefined };
  }
}

/** Applies changes locally and, for a logged-in student, queues them for upload. */
function dispatch(...ops: SyncOp[]) {
  let next = getSnapshot();
  for (const op of ops) next = applyOp(next, op);
  if (scope) next = { ...next, pending: [...next.pending, ...ops] };
  commit(next);
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

export const progress = {
  getState: getSnapshot,

  /** Calls `listener` after every change (for non-React code such as sync). */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setWeek(subjectId: string, week: number, patch: WeekStatus) {
    const current = getSnapshot().weeks[weekKey(subjectId, week)] ?? {};
    const status = { done: Boolean(current.done), saved: Boolean(current.saved), ...patch } as Required<WeekStatus>;
    dispatch({ kind: 'week', subjectId, week, status });
  },

  visit(subjectId: string, week: number) {
    dispatch({ kind: 'visit', lastVisited: { subjectId, week, at: new Date().toISOString() } });
  },

  recordAnswers(records: NewAnswer[]) {
    dispatch({ kind: 'answers', records: records.map((r) => ({ ...r, id: newId() })) });
  },

  saveActiveTest(key: string, active: ActiveTest) {
    const s = getSnapshot();
    commit({ ...s, active: { ...s.active, [key]: active } });
  },

  discardActiveTest(key: string) {
    const s = getSnapshot();
    const { [key]: _removed, ...rest } = s.active;
    commit({ ...s, active: rest });
  },

  submitTest(key: string, attempt: TestAttempt, answers: NewAnswer[]) {
    progress.discardActiveTest(key);
    dispatch(
      { kind: 'answers', records: answers.map((r) => ({ ...r, id: newId() })) },
      { kind: 'test', attempt },
    );
  },

  saveActiveExam(active: ActiveExam) {
    const s = getSnapshot();
    commit({ ...s, activeExams: { ...s.activeExams, [active.setId]: active } });
  },

  discardActiveExam(setId: string) {
    const s = getSnapshot();
    const { [setId]: _removed, ...rest } = s.activeExams ?? {};
    commit({ ...s, activeExams: rest });
  },

  submitCodingExam(attempt: CodingAttempt) {
    progress.discardActiveExam(attempt.setId);
    dispatch({ kind: 'coding', attempt });
  },

  updateProfile(profile: Profile) {
    dispatch({ kind: 'profile', profile });
  },

  markSolved(problemId: string) {
    const s = getSnapshot();
    if (s.coding?.[problemId]) return;
    commit({ ...s, coding: { ...s.coding, [problemId]: { solvedAt: new Date().toISOString() } } });
  },

  setExam(exam: ExamTarget | null) {
    dispatch({ kind: 'exam', exam });
  },

  reset() {
    dispatch({ kind: 'reset' });
  },

  /* ---------- account plumbing, used by the auth provider and sync ---------- */

  /** Switches between the guest copy and a logged-in student's copy. */
  setScope(userId: string | null) {
    if (scope === userId) return;
    scope = userId;
    snapshot = read(currentKey());
    notify();
  },

  getScope: () => scope,

  /** The device's logged-out progress, whatever the current scope. */
  readGuest: () => (typeof window === 'undefined' ? emptyProgress() : read(GUEST_KEY)),

  /** Copies the device's logged-out progress into the student's account and clears the guest copy. */
  importGuest() {
    const guest = read(GUEST_KEY);
    const ops: SyncOp[] = [];
    if (guest.answers.length) ops.push({ kind: 'answers', records: guest.answers });
    for (const attempt of guest.tests) ops.push({ kind: 'test', attempt });
    for (const attempt of guest.codingAttempts ?? []) ops.push({ kind: 'coding', attempt });
    const mine = getSnapshot().weeks;
    for (const [key, status] of Object.entries(guest.weeks)) {
      if (!status.done && !status.saved) continue;
      const [subjectId, week] = key.split(':');
      // Merged with the account's own flags, so a guest "revise later" never un-marks a week the account finished.
      const own = mine[key];
      ops.push({ kind: 'week', subjectId, week: Number(week), status: { done: Boolean(status.done || own?.done), saved: Boolean(status.saved || own?.saved) } });
    }
    dispatch(...ops);
    const s = getSnapshot();
    commit({ ...s, active: { ...guest.active, ...s.active }, activeExams: { ...guest.activeExams, ...s.activeExams }, coding: { ...guest.coding, ...s.coding }, guestImportHandled: true });
    write(GUEST_KEY, emptyProgress());
  },

  dismissGuestImport() {
    commit({ ...getSnapshot(), guestImportHandled: true });
  },

  /** Drops the first `count` queued changes once the server has stored them. */
  acknowledge(count: number) {
    const s = getSnapshot();
    commit({ ...s, pending: s.pending.slice(count) });
  },

  /** Replaces the local copy with server data, keeping device-only state and replaying unsent changes. */
  replaceFromServer(server: ServerProgress) {
    const local = getSnapshot();
    let next: ProgressState = {
      ...emptyProgress(),
      ...server,
      active: local.active,
      activeExams: local.activeExams,
      // Undefined when the server can't store them yet (migration 0007 not run): keep the device's copy.
      codingAttempts: server.codingAttempts ?? local.codingAttempts,
      pending: local.pending,
      guestImportHandled: local.guestImportHandled,
      coding: local.coding,
    };
    for (const op of local.pending) next = applyOp(next, op);
    commit(next);
  },
};

export type ServerProgress = {
  weeks: ProgressState['weeks'];
  answers: AnswerRecord[];
  tests: TestAttempt[];
  codingAttempts?: CodingAttempt[];
  lastVisited?: ProgressState['lastVisited'];
  profile?: Profile;
  plan?: ProgressState['plan'];
  exam?: ExamTarget;
};
