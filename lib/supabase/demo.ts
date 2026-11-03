'use client';

/**
 * Demo mode, for development only: a stand-in for the Supabase client that keeps
 * dummy data in this browser, so every logged-in screen can be built and checked
 * without a real account and without touching the production database.
 *
 * Start it with `npm run dev:demo`, then pick who you are with ?demo=<persona> on
 * any URL: guest · new · free · trial · pro · admin. It never runs in production.
 */
import math1 from '@/content/weeks/math1.json';
import stat1 from '@/content/weeks/stat1.json';
import { AI_FEATURES, isAiFeatureId, limitsFor } from '@/lib/ai/features';
import { PRICING } from '@/lib/plans';
import { cleanUtr, isUtr } from '@/lib/upi';

export const DEMO = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export const PERSONAS = ['guest', 'new', 'free', 'trial', 'pro', 'admin'] as const;
export type Persona = (typeof PERSONAS)[number];

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

const DB_KEY = 'nextgen-demo-db';
const PERSONA_KEY = 'nextgen-demo-persona';
const GUEST_PROGRESS_KEY = 'nextgen-progress-v2';
const DAY = 86_400_000;

const NAMES: Record<Exclude<Persona, 'guest'>, string> = {
  new: 'Neha Verma',
  free: 'Rahul Kumar',
  trial: 'Ananya Iyer',
  pro: 'Arjun Mehta',
  admin: 'Gaurav Gupta',
};

/** Tables a student can only see their own rows of (Row Level Security). */
const OWN_ROWS: Record<string, string> = { profiles: 'id', answers: 'user_id', test_attempts: 'user_id', coding_attempts: 'user_id', week_status: 'user_id', ai_usage: 'user_id', payments: 'user_id' };

/* ---------------- storage ---------------- */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => window.localStorage.setItem(key, JSON.stringify(value));

const loadDb = () => read<Db>(DB_KEY, {});
const saveDb = (db: Db) => write(DB_KEY, db);

function persona(): Persona {
  const fromUrl = new URLSearchParams(window.location.search).get('demo') as Persona | null;
  if (fromUrl && PERSONAS.includes(fromUrl)) write(PERSONA_KEY, fromUrl);
  return read<Persona>(PERSONA_KEY, 'trial');
}

const userId = (p: Persona) => `demo-${p}`;

function sessionFor(p: Persona) {
  if (p === 'guest') return null;
  const user = { id: userId(p), email: `${p}@demo.nextgen.local`, user_metadata: { full_name: NAMES[p] }, app_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() };
  return { access_token: 'demo', refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
}

/* ---------------- dummy data ---------------- */

const iso = (t: number) => new Date(t).toISOString();
const day = (offset: number) => iso(Date.now() + offset * DAY);
const dateOnly = (offset: number) => day(offset).slice(0, 10);
const todayIST = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

type Week = { week: number; questions: { id: string; answer: number }[] };
const WEEKS: Record<string, Week[]> = { math1: math1.weeks, stat1: stat1.weeks };

/** Deterministic "random" so the dummy data is the same on every reload. */
const pick = (seed: string) => [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000, 7) / 1000;

function seedUser(db: Db, p: Persona) {
  const uid = userId(p);
  if ((db.profiles ?? []).some((r) => r.id === uid)) return;
  const now = Date.now();
  const add = (table: string, rows: Row[]) => (db[table] = [...(db[table] ?? []), ...rows]);

  add('profiles', [{
    id: uid,
    full_name: NAMES[p as Exclude<Persona, 'guest'>],
    subjects: p === 'new' ? [] : ['math1', 'stat1', 'ct', 'eng1'],
    last_visited: p === 'new' ? null : { subjectId: 'math1', week: 4, at: day(-1) },
    trial_ends_at: p === 'free' || p === 'pro' || p === 'admin' ? day(-20) : day(p === 'new' ? 7 : 4),
    pro_until: p === 'pro' || p === 'admin' ? day(21) : null,
    exam_name: p === 'new' ? null : 'Quiz 2',
    exam_date: p === 'new' ? null : dateOnly(10),
  }]);
  if (p === 'new') return;

  // Answers over the last week: strong in Maths I, a weak Statistics I week 3, and a few old mistakes due for revision.
  const answers: Row[] = [];
  for (const [subjectId, weeks] of Object.entries(WEEKS)) {
    for (const w of weeks.slice(0, 5)) {
      w.questions.forEach((q, i) => {
        const r = pick(`${uid}${q.id}`);
        const weak = subjectId === 'stat1' && w.week === 3;
        const correct = weak ? r > 0.7 : r > 0.25;
        const ageDays = (w.week * 2 + i) % 7;
        answers.push({ user_id: uid, id: `${uid}-${q.id}`, question_id: q.id, subject_id: subjectId, week: w.week, correct, mode: 'practice', answered_at: iso(now - ageDays * DAY - i * 60_000) });
      });
    }
  }
  add('answers', answers);

  const weekStatus = (subject_id: string, week: number, done: boolean, saved = false) => ({ user_id: uid, subject_id, week, done, saved, updated_at: day(-2) });
  add('week_status', [weekStatus('math1', 1, true), weekStatus('math1', 2, true), weekStatus('math1', 3, true), weekStatus('math1', 4, false, true), weekStatus('stat1', 1, true), weekStatus('stat1', 2, true, true)]);

  // One finished Maths I Quiz 1 with a mix of right, wrong and skipped answers.
  const pool = WEEKS.math1.slice(0, 4).flatMap((w) => w.questions.slice(0, 4).map((q) => ({ ...q, week: w.week }))).slice(0, 15);
  const responses = pool.map((q, i) => (i % 7 === 6 ? null : i % 4 === 3 ? (q.answer + 1) % 4 : q.answer));
  add('test_attempts', [{
    user_id: uid,
    id: `${uid}-quiz1`,
    subject_id: 'math1',
    test_id: 'quiz-1',
    started_at: iso(now - 2 * DAY - 21 * 60_000),
    submitted_at: iso(now - 2 * DAY),
    duration_sec: 21 * 60 + 14,
    question_ids: pool.map((q) => q.id),
    responses,
    correct: pool.filter((q, i) => responses[i] === q.answer).length,
    total: pool.length,
    time_spent: pool.map((q, i) => 40 + Math.round(pick(q.id + i) * 110)),
  }]);

  if (p === 'free') add('ai_usage', [{ user_id: uid, day: todayIST(), feature: 'doubt', count: 3, last_at: null, tokens: 0 }]);
}

function seedShared(db: Db) {
  db.note_files ??= [
    { id: 1, subject_id: 'math1', week: 1, title: 'Sets and functions: handwritten notes', path: 'math1/1/demo-sets.pdf', size_bytes: 1_840_000, pro_only: false, created_at: day(-2) },
    { id: 2, subject_id: 'stat1', week: null, title: 'Statistics I: previous year quiz papers', path: 'stat1/all/demo-pyq.pdf', size_bytes: 3_400_000, pro_only: true, created_at: day(-5) },
  ];
  db.upi_requests ??= [
    { id: 1, user_id: 'demo-free', email: 'free@demo.nextgen.local', utr: '412345678901', amount_inr: PRICING.proMonthlyInr, status: 'pending', note: '', reviewed_at: null, created_at: day(-0.1) },
    { id: 2, user_id: 'demo-new', email: 'new@demo.nextgen.local', utr: '412345678902', amount_inr: PRICING.proMonthlyInr, status: 'pending', note: '', reviewed_at: null, created_at: day(-0.4) },
    { id: 3, user_id: 'demo-pro', email: 'pro@demo.nextgen.local', utr: '412345678800', amount_inr: PRICING.proMonthlyInr, status: 'approved', note: '', reviewed_at: day(-9), created_at: day(-9) },
  ];
  if (db.announcements) return;
  db.announcements = [
    { id: 1, title: 'Quiz 2 mock tests are live', body: 'Practise weeks 5–8 of every subject with timed tests and detailed results.', active: true, created_at: day(-1) },
    { id: 2, title: 'Maintenance on Sunday night', body: 'The AI doubt solver may be slow between 1 and 2 AM.', active: false, created_at: day(-6) },
  ];
  db.reports = [
    { id: 1, user_id: 'demo-free', question_id: 'stat1-w3-q2', kind: 'wrong_answer', message: 'Option C also looks correct because the median doesn’t change.', status: 'open', created_at: day(-1) },
    { id: 2, user_id: 'demo-trial', question_id: 'stat1-w3-q2', kind: 'unclear', message: '', status: 'open', created_at: day(-2) },
    { id: 3, user_id: 'demo-pro', question_id: 'math1-w2-q5', kind: 'typo', message: '“funtion” in the question.', status: 'open', created_at: day(-3) },
    { id: 4, user_id: 'demo-free', question_id: 'math1-w1-q3', kind: 'other', message: '', status: 'fixed', created_at: day(-9) },
  ];
  db.content_overrides = [
    { key: 'q:math1-w1-q4', data: { explanation: '(Edited by an admin in demo mode.) Is set me 3 elements hain, isliye power set me 2³ = 8 subsets honge.' }, updated_at: day(-4), updated_by: 'demo-admin' },
  ];
}

/** A logged-out student with some progress on this device, so the "save to my account" prompt shows. */
function seedGuestProgress() {
  if (read<{ answers?: unknown[] }>(GUEST_PROGRESS_KEY, {}).answers?.length) return;
  const at = day(-1);
  const answers = WEEKS.math1[0].questions.map((q, i) => ({ id: `guest-${q.id}`, questionId: q.id, subjectId: 'math1', week: 1, correct: i !== 2, mode: 'practice', at }));
  write(GUEST_PROGRESS_KEY, { version: 2, weeks: { 'math1:1': { done: true, saved: false } }, answers, tests: [], active: {}, pending: [] });
}

/* ---------------- storage ---------------- */

/** Files "uploaded" this session, as blob URLs; seeded and older files open a one-page sample PDF. */
const demoFiles = new Map<string, string>();
const SAMPLE_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
  '4 0 obj<</Length 58>>stream',
  'BT /F1 22 Tf 72 760 Td (NEXT GEN demo PDF) Tj ET',
  'endstream endobj',
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
  'trailer<</Root 1 0 R>>',
  '%%EOF',
].join('\n');

function demoStorage(persona: () => Persona) {
  const canRead = (path: string) => {
    const row = (loadDb().note_files ?? []).find((r) => r.path === path);
    return Boolean(row) && (!row?.pro_only || ['new', 'trial', 'pro', 'admin'].includes(persona()));
  };
  return {
    from: () => ({
      upload: async (path: string, file: Blob) => {
        if (persona() !== 'admin') return { data: null, error: { message: 'Only admins can upload' } };
        demoFiles.set(path, URL.createObjectURL(file));
        return { data: { path }, error: null };
      },
      remove: async (paths: string[]) => {
        paths.forEach((p) => demoFiles.delete(p));
        return { data: [], error: null };
      },
      createSignedUrl: async (path: string) => {
        if (!canRead(path) && persona() !== 'admin') return { data: null, error: { message: 'Object not found' } };
        const url = demoFiles.get(path) ?? URL.createObjectURL(new Blob([SAMPLE_PDF], { type: 'application/pdf' }));
        return { data: { signedUrl: url }, error: null };
      },
    }),
  };
}

/* ---------------- query builder ---------------- */

type Result = { data: unknown; error: { message: string } | null };

class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private conflict: string[] | null = null;
  private ignoreDuplicates = false;
  private filters: [string, unknown][] = [];
  private sort: { col: string; asc: boolean } | null = null;
  private max: number | null = null;
  private window: [number, number] | null = null;
  private oneRow: 'maybe' | 'one' | null = null;

  constructor(private readonly table: string, private readonly uid: string | null) {}

  select() { return this; }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = rows; return this; }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this; }
  upsert(rows: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = 'upsert';
    this.payload = rows;
    this.conflict = opts?.onConflict?.split(',') ?? null;
    this.ignoreDuplicates = Boolean(opts?.ignoreDuplicates);
    return this;
  }
  delete() { this.op = 'delete'; return this; }
  eq(col: string, value: unknown) { this.filters.push([col, value]); return this; }
  order(col: string, opts: { ascending?: boolean } = {}) { this.sort = { col, asc: opts.ascending ?? true }; return this; }
  limit(n: number) { this.max = n; return this; }
  range(from: number, to: number) { this.window = [from, to]; return this; }
  maybeSingle() { this.oneRow = 'maybe'; return this; }
  single() { this.oneRow = 'one'; return this; }

  then<A = Result, B = never>(ok?: ((r: Result) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return new Promise<Result>((resolve) => setTimeout(() => resolve(this.run()), 120)).then(ok, fail);
  }

  private visible(row: Row) {
    const owner = OWN_ROWS[this.table];
    return !owner || row[owner] === this.uid;
  }

  private matches = (row: Row) => this.visible(row) && this.filters.every(([c, v]) => row[c] === v);

  private run(): Result {
    if (OWN_ROWS[this.table] && !this.uid) return { data: null, error: { message: 'not signed in' } };
    const db = loadDb();
    const rows = (db[this.table] ??= []);

    if (this.op === 'select') {
      let out = rows.filter(this.matches).map((r) => ({ ...r }));
      if (this.sort) {
        const { col, asc } = this.sort;
        out.sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? ''), undefined, { numeric: true }) * (asc ? 1 : -1));
      }
      if (this.window) out = out.slice(this.window[0], this.window[1] + 1);
      if (this.max !== null) out = out.slice(0, this.max);
      if (this.oneRow) return out.length || this.oneRow === 'maybe' ? { data: out[0] ?? null, error: null } : { data: null, error: { message: 'no rows' } };
      return { data: out, error: null };
    }

    const list = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
    if (this.op === 'insert') {
      for (const r of list) {
        const id = Math.max(0, ...rows.map((x) => Number(x.id) || 0)) + 1;
        rows.push({ id, created_at: new Date().toISOString(), ...(this.table === 'reports' ? { user_id: this.uid, status: 'open' } : {}), ...(this.table === 'announcements' ? { active: true } : {}), ...r });
      }
    } else if (this.op === 'upsert') {
      const keys = this.conflict ?? [this.table === 'content_overrides' ? 'key' : 'id'];
      for (const r of list) {
        const existing = rows.find((x) => keys.every((k) => x[k] === r[k]));
        if (existing && !this.ignoreDuplicates) Object.assign(existing, r);
        if (!existing) rows.push({ ...r });
      }
    } else if (this.op === 'update') {
      rows.filter(this.matches).forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === 'delete') {
      db[this.table] = rows.filter((r) => !this.matches(r));
    }
    saveDb(db);
    return { data: null, error: null };
  }
}

/* ---------------- client ---------------- */

type AuthListener = (event: string, session: ReturnType<typeof sessionFor>) => void;

export function createDemoClient() {
  let current = persona();
  const listeners = new Set<AuthListener>();
  const db = loadDb();
  seedShared(db);
  if (current !== 'guest') seedUser(db, current);
  saveDb(db);
  // Only the "new" persona should be asked to import this device's progress.
  if (current === 'new') seedGuestProgress();
  else if (read<{ answers?: { id: string }[] }>(GUEST_PROGRESS_KEY, {}).answers?.[0]?.id.startsWith('guest-')) window.localStorage.removeItem(GUEST_PROGRESS_KEY);

  const signIn = (p: Persona) => {
    current = p;
    write(PERSONA_KEY, p);
    const next = loadDb();
    seedUser(next, p);
    saveDb(next);
    const session = sessionFor(p);
    listeners.forEach((l) => l('SIGNED_IN', session));
    return session;
  };
  const uid = () => (current === 'guest' ? null : userId(current));

  return {
    from: (table: string) => new Query(table, uid()),
    storage: demoStorage(() => current),
    rpc: async (name: string) => {
      if (name === 'is_admin') return { data: current === 'admin', error: null };
      if (name === 'delete_my_account') {
        const next = loadDb();
        for (const [table, owner] of Object.entries(OWN_ROWS)) next[table] = (next[table] ?? []).filter((r) => r[owner] !== uid());
        saveDb(next);
        return { data: null, error: null };
      }
      return { data: null, error: { message: `${name} isn't available in demo mode` } };
    },
    auth: {
      getSession: async () => ({ data: { session: sessionFor(current) }, error: null }),
      onAuthStateChange: (listener: AuthListener) => {
        listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
      },
      signOut: async () => {
        current = 'guest';
        write(PERSONA_KEY, 'guest');
        listeners.forEach((l) => l('SIGNED_OUT', null));
        return { error: null };
      },
      // Any email and any 6-digit code log in as a trial student.
      signInWithOtp: async () => ({ data: {}, error: null }),
      verifyOtp: async () => ({ data: { session: signIn('trial') }, error: null }),
      signInWithOAuth: async () => {
        signIn('trial');
        return { data: {}, error: null };
      },
    },
  };
}

/** Answers our own API routes in demo mode, since they need a real session. */
export async function demoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  // A demo UPI ID, so the pay-by-QR flow can be tried without real payment settings.
  if (path === '/api/payments/config') return reply({ enabled: false, upi: { id: 'nextgen.demo@okaxis', name: 'NEXT GEN (demo)', amountInr: PRICING.proMonthlyInr } });
  const p = read<Persona>(PERSONA_KEY, 'trial');
  if (p === 'guest') return reply({ ok: false, code: 'login_required', error: 'Log in to continue.', message: 'Log in to continue.' }, 401);

  // Same contract as /api/ai/<feature> (lib/server/ai/handler.ts), with the real limits from lib/ai/features.ts.
  const feature = /^\/api\/ai\/([\w-]+)$/.exec(path)?.[1];
  if (feature) {
    if (!isAiFeatureId(feature)) return reply({ ok: false, code: 'invalid', message: 'Unknown AI feature.' }, 400);
    const limits = limitsFor(feature, p === 'free' ? 'free' : 'pro');
    if (!limits) return reply({ ok: false, code: 'not_in_plan', message: 'This is part of Pro.' }, 403);
    const db = loadDb();
    const uid = userId(p);
    const usage = (db.ai_usage ??= []);
    let row = usage.find((r) => r.user_id === uid && r.day === todayIST() && r.feature === feature);
    if (!row) usage.push((row = { user_id: uid, day: todayIST(), feature, count: 0, last_at: null, tokens: 0 }));
    const used = row.count as number;
    const quota = { used, limit: limits.perDay };
    if (used >= limits.perDay) return reply({ ok: false, code: 'limit', message: `You’ve used today’s ${limits.perDay} ${AI_FEATURES[feature].name} requests. They reset at midnight.`, usage: quota }, 429);
    const wait = row.last_at ? limits.cooldownSec - Math.floor((Date.now() - Date.parse(String(row.last_at))) / 1000) : 0;
    if (wait > 0) return reply({ ok: false, code: 'cooldown', message: `Please wait ${wait}s before asking again.`, usage: quota, retryAfter: wait }, 429);
    row.count = used + 1;
    row.last_at = new Date().toISOString();
    saveDb(db);
    const question = (JSON.parse(String(init.body ?? '{}')).messages as { content: string }[] | undefined)?.at(-1)?.content ?? '';
    await new Promise((r) => setTimeout(r, 700));
    return reply({
      ok: true,
      usage: { used: used + 1, limit: limits.perDay },
      data: {
        answer: [
          `**Demo answer** (no AI call in demo mode) for: “${question.slice(0, 80)}”`,
          '',
          '1. **Mean** sab values ka average hai, isliye ek bada outlier use apni taraf kheench leta hai.',
          '2. **Median** beech wali value hai; outlier sirf ek position badalta hai, value nahi.',
          '3. Example: 2, 3, 4, 100 → mean = `27.25`, median = `3.5`.',
          '',
          '```python',
          'import statistics',
          'print(statistics.median([2, 3, 4, 100]))',
          '```',
        ].join('\n'),
      },
    });
  }

  if (path === '/api/payments/order' || path === '/api/payments/verify') return reply({ error: 'Payments are switched off in demo mode.' }, 503);

  // Same contract as /api/payments/upi and /api/payments/upi/review.
  if (path === '/api/payments/upi') {
    const utr = cleanUtr(String(JSON.parse(String(init.body ?? '{}')).utr ?? ''));
    if (!isUtr(utr)) return reply({ error: 'Enter the 12-digit UTR (UPI reference number) from your payment details.' }, 400);
    const db = loadDb();
    const rows = (db.upi_requests ??= []);
    if (rows.some((r) => r.utr === utr)) return reply({ error: 'This UTR has already been submitted.' }, 409);
    const request = { id: Math.max(0, ...rows.map((r) => Number(r.id))) + 1, user_id: userId(p), email: `${p}@demo.nextgen.local`, utr, amount_inr: PRICING.proMonthlyInr, status: 'pending', note: '', reviewed_at: null, created_at: new Date().toISOString() };
    rows.push(request);
    saveDb(db);
    return reply({ request });
  }
  if (path === '/api/payments/upi/review') {
    if (p !== 'admin') return reply({ error: 'Only admins can review payments.' }, 403);
    const { id, approve, note } = JSON.parse(String(init.body ?? '{}')) as { id: number; approve: boolean; note?: string };
    const db = loadDb();
    const row = (db.upi_requests ?? []).find((r) => r.id === id && r.status === 'pending');
    if (!row) return reply({ error: 'This payment was already reviewed.' }, 409);
    Object.assign(row, { status: approve ? 'approved' : 'rejected', note: approve ? '' : String(note ?? '').trim(), reviewed_at: new Date().toISOString() });
    const profile = (db.profiles ?? []).find((r) => r.id === row.user_id);
    const end = (v: unknown) => (v ? Date.parse(String(v)) : 0);
    if (approve && profile) profile.pro_until = iso(Math.max(Date.now(), end(profile.pro_until), end(profile.trial_ends_at)) + 30 * DAY);
    saveDb(db);
    return reply({ ok: true });
  }
  return reply({ error: `${path} isn't available in demo mode` }, 404);
}
