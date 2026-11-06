import 'server-only';
import { getQuestion, getQuestionsForWeeks, getSubject, getWeeks } from '@/lib/content';
import { adminClient } from '@/lib/server/supabase';
import { withOverride } from '@/lib/server/daily';
import { indiaClock } from '@/lib/reminders';
import { phaseOf, points, questionOver, WAR, type WarError, type WarMode, type WarPlayer, type WarQuestion, type WarReviewItem, type WarRival, type WarView } from '@/lib/war';
import type { AnswerRow, PlayerRow, WarRow, WarStore, WarUser } from './store';

/** A refusal the route turns into a JSON error. */
export class WarFail extends Error {
  constructor(public code: WarError['code'], message: string, public status = 400) {
    super(message);
  }
}

const at = (iso: string | null) => (iso ? Date.parse(iso) : null);
const iso = (t: number) => new Date(t).toISOString();
const todayStart = () => iso(Date.parse(`${indiaClock().day}T00:00:00+05:30`));

async function checkLimit(store: WarStore, user: WarUser) {
  if (user.pro) return;
  if ((await store.joinsSince(user.id, todayStart())) >= WAR.freePerDay) {
    throw new WarFail('limit', `The free plan has ${WAR.freePerDay} Quiz Wars a day. Get Pro for unlimited wars.`, 403);
  }
}

function pickQuestions(subjectId: string, from: number, to: number) {
  const pool = getQuestionsForWeeks(subjectId, from, to).map((q) => q.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, WAR.questions);
}

export type WarSettings = { subjectId: string; fromWeek: number; toWeek: number };

function checkSettings({ subjectId, fromWeek, toWeek }: WarSettings) {
  const weeks = getSubject(subjectId) ? getWeeks(subjectId).length : 0;
  if (!weeks) throw new WarFail('not_found', 'Pick a subject.');
  if (!Number.isInteger(fromWeek) || !Number.isInteger(toWeek) || fromWeek < 1 || toWeek > weeks || fromWeek > toWeek) throw new WarFail(undefined, 'Pick the weeks again.');
}

async function insertWithCode(store: WarStore, row: Omit<WarRow, 'code' | 'created_at' | 'rematch' | 'open'>) {
  for (let i = 0; i < 8; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (await store.insertWar({ ...row, code })) return code;
  }
  throw new WarFail(undefined, 'Could not create the war. Please try again.', 503);
}

/** A new war. A live one waits in its lobby; a challenge starts the host's run straight away. */
export async function createWar(store: WarStore, user: WarUser, mode: Exclude<WarMode, 'random'>, settings: WarSettings) {
  checkSettings(settings);
  await checkLimit(store, user);
  const questionIds = pickQuestions(settings.subjectId, settings.fromWeek, settings.toWeek);
  if (questionIds.length < 3) throw new WarFail(undefined, 'These weeks don’t have enough questions yet.');
  const code = await insertWithCode(store, {
    host_id: user.id,
    mode,
    subject_id: settings.subjectId,
    from_week: settings.fromWeek,
    to_week: settings.toWeek,
    question_ids: questionIds,
    status: mode === 'challenge' ? 'live' : 'lobby',
    current_q: 0,
    q_started_at: null,
  });
  await store.insertPlayer({ code, user_id: user.id, name: user.name, q_started_at: mode === 'challenge' ? iso(Date.now() + WAR.countdownMs) : null });
  return code;
}

async function startLive(store: WarStore, code: string) {
  await store.updateWar(code, { status: 'live', current_q: 0, q_started_at: iso(Date.now() + WAR.countdownMs) });
}

export async function joinWar(store: WarStore, user: WarUser, code: string) {
  const war = await store.getWar(code);
  if (!war) throw new WarFail('not_found', 'No war with this code. Check it and try again.', 404);
  const players = await store.players(code);
  if (players.some((p) => p.user_id === user.id)) return;
  if (war.mode !== 'challenge') {
    if (war.status !== 'lobby') throw new WarFail('started', 'This war has already started. Ask for a rematch!', 409);
    if (players.length >= WAR.maxPlayers) throw new WarFail('full', `This war is full (${WAR.maxPlayers} players).`, 409);
  }
  await checkLimit(store, user);
  await store.insertPlayer({ code, user_id: user.id, name: user.name, q_started_at: war.mode === 'challenge' ? iso(Date.now() + WAR.countdownMs) : null });
  // A random match starts as soon as the second player is in.
  if (war.mode === 'random' && players.length + 1 >= 2) await startLive(store, code);
}

export async function startWar(store: WarStore, user: WarUser, code: string) {
  const war = await store.getWar(code);
  if (!war) throw new WarFail('not_found', 'War not found.', 404);
  if (war.host_id !== user.id) throw new WarFail(undefined, 'Only the player who made the war can start it.', 403);
  if (war.status !== 'lobby') return;
  if ((await store.players(code)).length < 2) throw new WarFail(undefined, 'Wait for at least one friend to join.');
  await startLive(store, code);
}

/** Moves a live war on when everyone answered or time ran out (lazily, on each request). */
async function advanceLive(store: WarStore, war: WarRow, players: PlayerRow[], now: number) {
  const started = at(war.q_started_at);
  if (war.status !== 'live' || started === null || now < started) return;
  const answered = (await store.answers(war.code, war.current_q)).length;
  if (!questionOver(started, now, answered >= players.length)) return;
  if (war.current_q + 1 >= war.question_ids.length) {
    if (await store.updateWar(war.code, { status: 'done' }, war.current_q)) {
      await Promise.all(players.map((p) => store.updatePlayer(war.code, p.user_id, { finished_at: iso(now) })));
    }
  } else {
    await store.updateWar(war.code, { current_q: war.current_q + 1, q_started_at: iso(now + WAR.revealMs) }, war.current_q);
  }
}

/** The same for one player's own run through a challenge. */
async function advanceRun(store: WarStore, war: WarRow, player: PlayerRow, now: number) {
  const started = at(player.q_started_at);
  if (player.finished_at || started === null || now < started) return;
  const answered = (await store.answers(war.code, player.current_q)).some((a) => a.user_id === player.user_id);
  if (!questionOver(started, now, answered)) return;
  const patch = player.current_q + 1 >= war.question_ids.length
    ? { finished_at: iso(now) }
    : { current_q: player.current_q + 1, q_started_at: iso(now + WAR.revealMs) };
  await store.updatePlayer(war.code, player.user_id, patch, player.current_q);
}

const runOf = (war: WarRow, me: PlayerRow | undefined) =>
  war.mode === 'challenge'
    ? { status: me ? ('live' as const) : ('lobby' as const), currentQ: me?.current_q ?? 0, qStartedAt: at(me?.q_started_at ?? null), finished: Boolean(me?.finished_at) }
    : { status: war.status, currentQ: war.current_q, qStartedAt: at(war.q_started_at) };

async function loadQuestion(id: string) {
  const q = getQuestion(id);
  return q ? withOverride(adminClient(), q) : undefined;
}

function publicQuestion(index: number, q: NonNullable<Awaited<ReturnType<typeof loadQuestion>>>): WarQuestion {
  return { index, week: q.week, weekTitle: q.weekTitle, question: q.question, code: q.code, options: q.options, en: q.en ? { question: q.en.question, options: q.en.options } : undefined };
}

export async function answerWar(store: WarStore, user: WarUser, code: string, index: number, choice: number | null) {
  const war = await store.getWar(code);
  if (!war) throw new WarFail('not_found', 'War not found.', 404);
  const players = await store.players(code);
  const me = players.find((p) => p.user_id === user.id);
  if (!me) throw new WarFail(undefined, 'Join the war first.', 403);
  const now = Date.now();
  const run = runOf(war, me);
  const { phase, index: live } = phaseOf(run, now);
  // A second and a half of grace for the network.
  if (phase !== 'question' || live !== index || now > (run.qStartedAt ?? 0) + WAR.seconds * 1000 + 1500) throw new WarFail(undefined, 'Time is up for this question.', 409);
  const q = await loadQuestion(war.question_ids[index]);
  if (!q) throw new WarFail('not_found', 'Question not found.', 404);

  const correct = choice !== null && choice === q.answer;
  const ms = Math.max(0, now - (run.qStartedAt ?? now));
  const got = points(correct, ms);
  if (await store.insertAnswer({ code, user_id: user.id, q: index, choice, correct, ms, points: got })) {
    await store.updatePlayer(code, user.id, { score: me.score + got, correct: me.correct + (correct ? 1 : 0) });
  }
  const fresh = (await store.players(code)).find((p) => p.user_id === user.id) ?? me;
  if (war.mode === 'challenge') await advanceRun(store, war, fresh, now);
  else await advanceLive(store, war, players, now);
  return { choice, correct, points: got };
}

/** Everything the browser shows, for this player, right now. */
export async function viewWar(store: WarStore, user: WarUser | null, code: string): Promise<WarView> {
  let war = await store.getWar(code);
  if (!war) throw new WarFail('not_found', 'No war with this code. Check it and try again.', 404);
  if (store.tick) {
    await store.tick(war);
    war = (await store.getWar(code))!;
  }
  let players = await store.players(code);
  const now = Date.now();

  if (war.mode === 'random' && war.status === 'lobby') {
    if (players.length >= 2) await startLive(store, code);
    else if (now - Date.parse(war.created_at) > WAR.matchWaitMs && players[0]) {
      // Nobody came: the host plays now, and the next student who searches takes on their score.
      await store.updateWar(code, { mode: 'challenge', open: true, status: 'live' });
      await store.updatePlayer(code, players[0].user_id, { q_started_at: iso(now + WAR.countdownMs) });
    }
  }
  war = (await store.getWar(code))!;
  if (war.mode === 'challenge') {
    const me = players.find((p) => p.user_id === user?.id);
    if (me) await advanceRun(store, war, me, now);
  } else {
    await advanceLive(store, war, players, now);
  }
  war = (await store.getWar(code))!;
  players = await store.players(code);

  const me = players.find((p) => p.user_id === user?.id);
  const run = runOf(war, me);
  const { phase, index } = phaseOf(run, now);
  const answers = await store.answers(code);
  const subject = getSubject(war.subject_id)!;
  const total = war.question_ids.length;
  const finished = (p: PlayerRow) => Boolean(p.finished_at) || war.status === 'done';

  const view: WarView = {
    code,
    mode: war.mode,
    open: war.open,
    subject: { id: subject.id, name: subject.name, short: subject.short },
    fromWeek: war.from_week,
    toWeek: war.to_week,
    total,
    serverNow: now,
    phase,
    index,
    qStartsAt: run.qStartedAt,
    qEndsAt: phase === 'question' && run.qStartedAt !== null ? run.qStartedAt + WAR.seconds * 1000 : run.qStartedAt,
    createdAt: Date.parse(war.created_at),
    isHost: war.host_id === user?.id,
    joined: Boolean(me),
    rematch: war.rematch,
    players: players
      .map((p): WarPlayer => ({
        id: p.user_id === user?.id ? 'me' : p.user_id.slice(0, 8),
        name: p.name,
        score: p.score,
        correct: p.correct,
        answered: answers.some((a) => a.user_id === p.user_id && a.q === (war.mode === 'challenge' ? p.current_q : war.current_q)),
        finished: finished(p),
        isMe: p.user_id === user?.id,
        isHost: p.user_id === war.host_id,
      }))
      .sort((a, b) => b.score - a.score),
  };
  const pickOf = (a: AnswerRow) => ({ playerId: a.user_id === user?.id ? 'me' : a.user_id.slice(0, 8), choice: a.choice, correct: a.correct, ms: a.ms });

  if (phase === 'question') {
    const q = await loadQuestion(war.question_ids[index]);
    if (q) view.question = publicQuestion(index, q);
    const mine = answers.find((a) => a.user_id === user?.id && a.q === index);
    if (mine) view.mine = { choice: mine.choice, correct: mine.correct, points: mine.points };
  } else if (phase === 'reveal') {
    const q = await loadQuestion(war.question_ids[index]);
    if (q) {
      view.question = publicQuestion(index, q);
      view.reveal = { answer: q.answer, picks: answers.filter((a) => a.q === index && (war.mode !== 'challenge' || a.user_id === user?.id)).map(pickOf) };
    }
  } else if (phase === 'done' && me) {
    view.review = (
      await Promise.all(
        war.question_ids.map(async (id, i): Promise<WarReviewItem | null> => {
          const q = await loadQuestion(id);
          if (!q) return null;
          return {
            ...publicQuestion(i, q),
            answer: q.answer,
            explanation: q.explanation,
            en: q.en,
            picks: answers.filter((a) => a.q === i && (war.mode !== 'challenge' || players.find((p) => p.user_id === a.user_id)?.finished_at)).map(pickOf),
          };
        }),
      )
    ).filter((r): r is WarReviewItem => r !== null);
  }
  return view;
}

/** Rematch: one new live war per finished war, shared by everyone who taps it. */
export async function rematchWar(store: WarStore, user: WarUser, code: string) {
  const war = await store.getWar(code);
  if (!war) throw new WarFail('not_found', 'War not found.', 404);
  if (war.rematch) {
    await joinWar(store, user, war.rematch);
    return war.rematch;
  }
  const next = await createWar(store, user, 'live', { subjectId: war.subject_id, fromWeek: war.from_week, toWeek: war.to_week });
  if (!(await store.updateWar(code, { rematch: next }))) return next;
  return next;
}

/** "Find a match": join someone waiting, else take on an open challenge, else wait for someone. */
export async function findMatch(store: WarStore, user: WarUser, settings: WarSettings) {
  checkSettings(settings);
  await checkLimit(store, user);
  const now = Date.now();
  const lobby = await store.findRandomLobby(settings.subjectId, settings.fromWeek, settings.toWeek, user.id, iso(now - WAR.matchWaitMs));
  if (lobby) {
    await joinWar(store, user, lobby.code);
    return lobby.code;
  }
  const open = await store.findOpenChallenge(settings.subjectId, user.id, iso(now - 86_400_000));
  if (open) {
    await joinWar(store, user, open.code);
    return open.code;
  }
  const questionIds = pickQuestions(settings.subjectId, settings.fromWeek, settings.toWeek);
  const code = await insertWithCode(store, {
    host_id: user.id,
    mode: 'random',
    subject_id: settings.subjectId,
    from_week: settings.fromWeek,
    to_week: settings.toWeek,
    question_ids: questionIds,
    status: 'lobby',
    current_q: 0,
    q_started_at: null,
  });
  await store.insertPlayer({ code, user_id: user.id, name: user.name });
  return code;
}

/** Head to head with everyone this player has finished a war with: wins and losses by score. */
export async function rivalsOf(store: WarStore, user: WarUser): Promise<WarRival[]> {
  const codes = await store.recentWars(user.id, 100);
  if (!codes.length) return [];
  const rows = (await store.playersOf(codes)).filter((p) => p.finished_at);
  const byCode = new Map<string, PlayerRow[]>();
  for (const r of rows) byCode.set(r.code, [...(byCode.get(r.code) ?? []), r]);
  const rivals = new Map<string, WarRival>();
  for (const code of codes) {
    const list = byCode.get(code) ?? [];
    const me = list.find((p) => p.user_id === user.id);
    if (!me) continue;
    for (const other of list) {
      if (other.user_id === user.id || other.score === me.score) continue;
      const r = rivals.get(other.user_id) ?? { name: other.name, wins: 0, losses: 0, lastCode: code };
      if (me.score > other.score) r.wins++;
      else r.losses++;
      rivals.set(other.user_id, r);
    }
  }
  return [...rivals.values()].sort((a, b) => b.wins + b.losses - (a.wins + a.losses)).slice(0, 8);
}
