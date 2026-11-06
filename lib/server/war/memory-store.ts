import 'server-only';
import { getQuestion } from '@/lib/content';
import { points, WAR } from '@/lib/war';
import type { AnswerRow, PlayerRow, WarRow, WarStore } from './store';

/**
 * Demo mode (npm run dev:demo) keeps wars in this server process's memory, and a bot,
 * "Rahul S.", joins and plays so a war can be tried with one browser. Never used in production.
 */
type Db = { wars: Map<string, WarRow>; players: PlayerRow[]; answers: AnswerRow[] };
const g = globalThis as typeof globalThis & { __demoWars?: Db };
const db: Db = (g.__demoWars ??= { wars: new Map(), players: [], answers: [] });

const BOT = { id: '00000000-0000-4000-8000-00000000b07a', name: 'Rahul S.' };
const now = () => Date.now();
const iso = (t: number) => new Date(t).toISOString();

/** The bot answers within 3–12 s, right about 70% of the time (the same each run of a war). */
function botAnswer(war: WarRow, q: number) {
  const seed = [...`${war.code}:${q}`].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const question = getQuestion(war.question_ids[q]);
  const right = seed % 10 < 7;
  const choice = question ? (right ? question.answer : (question.answer + 1 + (seed % 3)) % 4) : 0;
  return { delay: 3000 + (seed % 9000), choice, correct: Boolean(question) && right };
}

function addBot(code: string, patch: Partial<PlayerRow> = {}) {
  if (db.players.some((p) => p.code === code && p.user_id === BOT.id)) return;
  db.players.push({ code, user_id: BOT.id, name: BOT.name, joined_at: iso(now()), current_q: 0, q_started_at: null, finished_at: null, score: 0, correct: 0, ...patch });
}

export const memoryWarStore: WarStore = {
  async getWar(code) {
    const w = db.wars.get(code);
    return w ? { ...w } : null;
  },
  async insertWar(row) {
    if (db.wars.has(row.code)) return false;
    db.wars.set(row.code, { open: false, rematch: null, created_at: iso(now()), ...row });
    return true;
  },
  async updateWar(code, patch, ifQ) {
    const w = db.wars.get(code);
    if (!w || (ifQ !== undefined && w.current_q !== ifQ)) return false;
    Object.assign(w, patch);
    return true;
  },
  async players(code) {
    return db.players.filter((p) => p.code === code).map((p) => ({ ...p }));
  },
  async insertPlayer(row) {
    if (db.players.some((p) => p.code === row.code && p.user_id === row.user_id)) return;
    db.players.push({ joined_at: iso(now()), current_q: 0, q_started_at: null, finished_at: null, score: 0, correct: 0, ...row });
  },
  async updatePlayer(code, userId, patch, ifQ) {
    const p = db.players.find((x) => x.code === code && x.user_id === userId);
    if (!p || (ifQ !== undefined && p.current_q !== ifQ)) return false;
    Object.assign(p, patch);
    return true;
  },
  async answers(code, q) {
    return db.answers.filter((a) => a.code === code && (q === undefined || a.q === q)).map((a) => ({ ...a }));
  },
  async insertAnswer(row) {
    if (db.answers.some((a) => a.code === row.code && a.user_id === row.user_id && a.q === row.q)) return false;
    db.answers.push(row);
    return true;
  },
  async joinsSince(userId, since) {
    return db.players.filter((p) => p.user_id === userId && p.joined_at >= since).length;
  },
  async findRandomLobby() {
    // Demo mode never matches you with another browser; the bot joins your lobby instead.
    return null;
  },
  async findOpenChallenge() {
    return null;
  },
  async recentWars(userId, limit) {
    return db.players.filter((p) => p.user_id === userId && p.finished_at).slice(-limit).reverse().map((p) => p.code);
  },
  async playersOf(codes) {
    return db.players.filter((p) => codes.includes(p.code)).map((p) => ({ ...p }));
  },

  async tick(war) {
    const t = now();
    const age = t - Date.parse(war.created_at);
    const players = db.players.filter((p) => p.code === war.code);
    const hasBot = players.some((p) => p.user_id === BOT.id);

    // The bot joins a lobby after a couple of seconds (a random match after four).
    if (war.status === 'lobby' && !hasBot && age > (war.mode === 'random' ? 4000 : 2500)) addBot(war.code);

    // A challenge: the bot has already played it.
    if (war.mode === 'challenge' && !hasBot && age > 1000) {
      let score = 0;
      let correct = 0;
      war.question_ids.forEach((_, q) => {
        const a = botAnswer(war, q);
        const got = points(a.correct, a.delay);
        score += got;
        correct += a.correct ? 1 : 0;
        db.answers.push({ code: war.code, user_id: BOT.id, q, choice: a.choice, correct: a.correct, ms: a.delay, points: got });
      });
      addBot(war.code, { score, correct, finished_at: iso(t), current_q: war.question_ids.length - 1 });
    }

    // A live war: the bot answers the current question after its delay.
    if (war.status === 'live' && war.mode !== 'challenge' && hasBot && war.q_started_at) {
      const started = Date.parse(war.q_started_at);
      const answered = db.answers.some((a) => a.code === war.code && a.user_id === BOT.id && a.q === war.current_q);
      const a = botAnswer(war, war.current_q);
      if (!answered && t >= started + a.delay && t <= started + WAR.seconds * 1000) {
        const got = points(a.correct, a.delay);
        db.answers.push({ code: war.code, user_id: BOT.id, q: war.current_q, choice: a.choice, correct: a.correct, ms: a.delay, points: got });
        const bot = db.players.find((p) => p.code === war.code && p.user_id === BOT.id)!;
        bot.score += got;
        bot.correct += a.correct ? 1 : 0;
      }
    }
  },
};
