/**
 * Quiz War: the rules, and the shape of a war as the browser sees it. Shared by the server
 * (lib/server/war) and the browser (components/war). The server keeps the answers and the clock;
 * the browser only ever gets the question that's live, without its answer.
 */
export const WAR = {
  questions: 10,
  /** Time for each question. */
  seconds: 30,
  /** "3, 2, 1" before the first question. */
  countdownMs: 3000,
  /** The right answer and everyone's picks, between questions. */
  revealMs: 3500,
  maxPlayers: 6,
  /** Wars a day on the free plan (Pro: unlimited). */
  freePerDay: 3,
  /** How long "Find a match" waits before turning into an open challenge. */
  matchWaitMs: 30_000,
  /** Points: a right answer, plus up to this for speed. */
  basePoints: 100,
  speedPoints: 50,
} as const;

export type WarMode = 'live' | 'challenge' | 'random';

export const points = (correct: boolean, ms: number) =>
  correct ? WAR.basePoints + Math.round(WAR.speedPoints * Math.max(0, 1 - ms / (WAR.seconds * 1000))) : 0;

/** Codes are six digits, shown as QW-482193. */
export const formatCode = (code: string) => `QW-${code}`;
export const parseCode = (input: string | null | undefined) => {
  const digits = (input ?? '').replace(/\D/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
};

export type WarPhase = 'lobby' | 'countdown' | 'question' | 'reveal' | 'done';

/** Where a run is: the war's clock in a live war, a player's own clock in a challenge. */
export function phaseOf(run: { status: 'lobby' | 'live' | 'done'; currentQ: number; qStartedAt: number | null; finished?: boolean }, now: number): { phase: WarPhase; index: number } {
  if (run.status === 'lobby') return { phase: 'lobby', index: 0 };
  if (run.status === 'done' || run.finished) return { phase: 'done', index: run.currentQ };
  if (run.qStartedAt === null) return { phase: 'lobby', index: 0 };
  if (now < run.qStartedAt) return run.currentQ === 0 ? { phase: 'countdown', index: 0 } : { phase: 'reveal', index: run.currentQ - 1 };
  return { phase: 'question', index: run.currentQ };
}

/** Moving on: everyone answered, or the time ran out. */
export const questionOver = (qStartedAt: number, now: number, allAnswered: boolean) =>
  now >= qStartedAt && (allAnswered || now >= qStartedAt + WAR.seconds * 1000);

/* ---------------- What the browser gets ---------------- */

export type WarQuestion = {
  index: number;
  week: number;
  weekTitle: string;
  question: string;
  code?: string;
  options: string[];
  en?: { question: string; options: string[] };
};

export type WarPlayer = { id: string; name: string; score: number; correct: number; answered: boolean; finished: boolean; isMe: boolean; isHost: boolean };

export type WarReviewItem = WarQuestion & {
  answer: number;
  explanation: string;
  en?: { question: string; options: string[]; explanation: string };
  picks: { playerId: string; choice: number | null; correct: boolean; ms: number }[];
};

export type WarView = {
  code: string;
  mode: WarMode;
  /** An open challenge: anyone searching for a match in this subject can take it on. */
  open: boolean;
  subject: { id: string; name: string; short: string };
  fromWeek: number;
  toWeek: number;
  total: number;
  /** Server time when this view was made, so the browser's timer matches the server's. */
  serverNow: number;
  phase: WarPhase;
  index: number;
  /** When the current question started (or the countdown/reveal ends), and when it ends. */
  qStartsAt: number | null;
  qEndsAt: number | null;
  createdAt: number;
  isHost: boolean;
  joined: boolean;
  /** The next war's code once someone tapped Rematch. */
  rematch: string | null;
  question?: WarQuestion;
  /** This player's answer to the live question, as soon as they've answered. */
  mine?: { choice: number | null; correct: boolean; points: number };
  /** Between questions: the last question's right answer and everyone's picks. */
  reveal?: { answer: number; picks: { playerId: string; choice: number | null; correct: boolean; ms: number }[] };
  players: WarPlayer[];
  /** Every question with answers, once this player's run is over. */
  review?: WarReviewItem[];
};

export type WarRival = { name: string; wins: number; losses: number; lastCode: string };

export type WarError = { error: string; code?: 'login_required' | 'limit' | 'full' | 'started' | 'not_found' };
