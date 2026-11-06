import 'server-only';
import type { WarMode } from '@/lib/war';

/** Rows of wars, war_players and war_answers (migration 0013). Times are ISO strings, as Postgres returns them. */
export type WarRow = {
  code: string;
  host_id: string;
  mode: WarMode;
  subject_id: string;
  from_week: number;
  to_week: number;
  question_ids: string[];
  status: 'lobby' | 'live' | 'done';
  current_q: number;
  q_started_at: string | null;
  open: boolean;
  rematch: string | null;
  created_at: string;
};

export type PlayerRow = {
  code: string;
  user_id: string;
  name: string;
  joined_at: string;
  current_q: number;
  q_started_at: string | null;
  finished_at: string | null;
  score: number;
  correct: number;
};

export type AnswerRow = { code: string; user_id: string; q: number; choice: number | null; correct: boolean; ms: number; points: number };

/** Who is playing: their account id, the name others see ("Rahul S."), and whether they have Pro. */
export type WarUser = { id: string; name: string; pro: boolean };

/**
 * Where wars are kept: Supabase in production (supabase-store.ts), memory in demo mode
 * (memory-store.ts, with a bot opponent). The conditional updates (`ifQ`) are what keep two
 * players' requests from moving a war on twice.
 */
export interface WarStore {
  getWar(code: string): Promise<WarRow | null>;
  /** False when the code is already taken. */
  insertWar(row: Omit<WarRow, 'created_at' | 'rematch' | 'open'> & { open?: boolean }): Promise<boolean>;
  /** Applies the patch only while current_q is still `ifQ` (when given); true when it did. */
  updateWar(code: string, patch: Partial<WarRow>, ifQ?: number): Promise<boolean>;
  players(code: string): Promise<PlayerRow[]>;
  insertPlayer(row: Pick<PlayerRow, 'code' | 'user_id' | 'name'> & Partial<PlayerRow>): Promise<void>;
  updatePlayer(code: string, userId: string, patch: Partial<PlayerRow>, ifQ?: number): Promise<boolean>;
  answers(code: string, q?: number): Promise<AnswerRow[]>;
  /** False when this player already answered this question. */
  insertAnswer(row: AnswerRow): Promise<boolean>;
  /** Wars this account joined since the given time (for the free plan's daily limit). */
  joinsSince(userId: string, since: string): Promise<number>;
  /** A random war waiting for an opponent, made by someone else after `since`. */
  findRandomLobby(subjectId: string, fromWeek: number, toWeek: number, notUser: string, since: string): Promise<WarRow | null>;
  /** An open challenge in this subject that this account hasn't played yet, made after `since`. */
  findOpenChallenge(subjectId: string, notUser: string, since: string): Promise<WarRow | null>;
  /** This account's most recent finished wars (codes). */
  recentWars(userId: string, limit: number): Promise<string[]>;
  playersOf(codes: string[]): Promise<PlayerRow[]>;
  /** Demo mode only: lets the bot opponent join and answer. */
  tick?(war: WarRow): Promise<void>;
}
