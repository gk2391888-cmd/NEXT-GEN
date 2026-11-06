import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnswerRow, PlayerRow, WarRow, WarStore } from './store';

const WAR_COLUMNS = 'code, host_id, mode, subject_id, from_week, to_week, question_ids, status, current_q, q_started_at, open, rematch, created_at';
const PLAYER_COLUMNS = 'code, user_id, name, joined_at, current_q, q_started_at, finished_at, score, correct';

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** Wars in Supabase (migration 0013), through the service-role client. */
export function supabaseWarStore(db: SupabaseClient): WarStore {
  return {
    async getWar(code) {
      const { data, error } = await db.from('wars').select(WAR_COLUMNS).eq('code', code).maybeSingle();
      fail(error);
      return data as WarRow | null;
    },
    async insertWar(row) {
      const { error } = await db.from('wars').insert(row);
      if (error?.code === '23505') return false;
      fail(error);
      return true;
    },
    async updateWar(code, patch, ifQ) {
      let q = db.from('wars').update(patch).eq('code', code);
      if (ifQ !== undefined) q = q.eq('current_q', ifQ);
      const { data, error } = await q.select('code');
      fail(error);
      return (data ?? []).length > 0;
    },
    async players(code) {
      const { data, error } = await db.from('war_players').select(PLAYER_COLUMNS).eq('code', code).order('joined_at');
      fail(error);
      return (data ?? []) as PlayerRow[];
    },
    async insertPlayer(row) {
      const { error } = await db.from('war_players').insert(row);
      if (error?.code === '23505') return;
      fail(error);
    },
    async updatePlayer(code, userId, patch, ifQ) {
      let q = db.from('war_players').update(patch).eq('code', code).eq('user_id', userId);
      if (ifQ !== undefined) q = q.eq('current_q', ifQ);
      const { data, error } = await q.select('code');
      fail(error);
      return (data ?? []).length > 0;
    },
    async answers(code, q) {
      let query = db.from('war_answers').select('code, user_id, q, choice, correct, ms, points').eq('code', code);
      if (q !== undefined) query = query.eq('q', q);
      const { data, error } = await query;
      fail(error);
      return (data ?? []) as AnswerRow[];
    },
    async insertAnswer(row) {
      const { error } = await db.from('war_answers').insert(row);
      if (error?.code === '23505') return false;
      fail(error);
      return true;
    },
    async joinsSince(userId, since) {
      const { count, error } = await db.from('war_players').select('code', { count: 'exact', head: true }).eq('user_id', userId).gte('joined_at', since);
      fail(error);
      return count ?? 0;
    },
    async findRandomLobby(subjectId, fromWeek, toWeek, notUser, since) {
      const { data, error } = await db
        .from('wars')
        .select(WAR_COLUMNS)
        .eq('mode', 'random')
        .eq('status', 'lobby')
        .eq('subject_id', subjectId)
        .eq('from_week', fromWeek)
        .eq('to_week', toWeek)
        .neq('host_id', notUser)
        .gte('created_at', since)
        .order('created_at')
        .limit(1);
      fail(error);
      return (data?.[0] as WarRow | undefined) ?? null;
    },
    async findOpenChallenge(subjectId, notUser, since) {
      const { data, error } = await db
        .from('wars')
        .select(WAR_COLUMNS)
        .eq('open', true)
        .eq('subject_id', subjectId)
        .neq('host_id', notUser)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);
      fail(error);
      const candidates = (data ?? []) as WarRow[];
      if (!candidates.length) return null;
      const { data: mine } = await db.from('war_players').select('code').eq('user_id', notUser).in('code', candidates.map((w) => w.code));
      const played = new Set((mine ?? []).map((r) => r.code as string));
      return candidates.find((w) => !played.has(w.code)) ?? null;
    },
    async recentWars(userId, limit) {
      const { data, error } = await db.from('war_players').select('code').eq('user_id', userId).not('finished_at', 'is', null).order('joined_at', { ascending: false }).limit(limit);
      fail(error);
      return (data ?? []).map((r) => r.code as string);
    },
    async playersOf(codes) {
      if (!codes.length) return [];
      const { data, error } = await db.from('war_players').select(PLAYER_COLUMNS).in('code', codes);
      fail(error);
      return (data ?? []) as PlayerRow[];
    },
  };
}
