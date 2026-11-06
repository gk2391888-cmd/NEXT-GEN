// Checks content/programmes.json (every programme's levels point at real subjects; FAQ subjects; qualifier ids), every
// content/weeks/<subject>.json against the shape the app expects, and that
// content/weeks-en/<subject>.json has an English version of every question. Then checks the
// qualifier mocks: content/qualifier/qualifiers.json and content/qualifier/mocks{,-en}/<mock>.json.
// A subject in content/subjects.json can be marked "status": "partial" (weeks 1..n written, n < 12)
// or "planned" (no notes yet); without a status it needs all 12 weeks.
// Usage: node scripts/validate-content.mjs [subjectId ... | qualifier]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const subjects = JSON.parse(readFileSync(join(root, 'content/subjects.json'), 'utf8'));
const { programmes } = JSON.parse(readFileSync(join(root, 'content/programmes.json'), 'utf8'));
const WEEKS = 12;
const STATUSES = new Set(['partial', 'planned']);
const MIN_QUESTIONS_PER_WEEK = 6;
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
// Students can practise one level at a time (Easy / Medium / Hard), so in these subjects every week
// needs at least PER_LEVEL questions of each level, in both languages. Add a subject here once its weeks have them.
const LEVELLED_SUBJECTS = new Set(['math1', 'stat1', 'ct', 'eng1', 'math2', 'stat2', 'python', 'eng2', 'mfe1', 'econ', 'estc', 'facc', 'dbms', 'cprog', 'linux', 'digital', 'eec', 'embc', 'mfe2', 'aero']);
const PER_LEVEL = 5;
const EN_FIELDS = ['question', 'options', 'explanation'];

const requested = process.argv.slice(2);
const checkQualifiers = !requested.length || requested.includes('qualifier');
// Qualifier mocks: questions per section, and the limits of test_attempts (test_id ≤ 20 characters, ≤ 100 questions).
const QUALIFIER_SECTION_QUESTIONS = [5, 25];
const MAX_TEST_QUESTIONS = 100;
let failures = 0;

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isTextList = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max && v.every(isText);
const letter = (i) => 'ABCD'[i];
const count = (text, mark) => text.split(mark).length - 1;
/** The numbers in a text, so a translation that changes one shows up for a check. */
const numbers = (text) => (text.match(/\d+(\.\d+)?/g) ?? []).sort().join(' ');

/**
 * One question and its English version: the same options in the same order, with the same `code` and **bold** marks.
 * Answer, code and difficulty are shared, so they're not repeated in the English file.
 */
function checkQuestion(q, expectedId, qat, english, enLabel, ids, answerCounts, err, warnings) {
  if (q.id !== expectedId) err(`${qat}: id should be "${expectedId}"`);
  if (ids.has(q.id)) err(`${qat}: duplicate id`);
  ids.add(q.id);
  if (!isText(q.question)) err(`${qat}: question missing`);
  if (q.code !== undefined && !isText(q.code)) err(`${qat}: code must be a non-empty string when present`);
  if (!isTextList(q.options, 4, 4)) err(`${qat}: needs exactly 4 options`);
  else if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) err(`${qat}: options must be distinct`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) err(`${qat}: answer must be 0–3`);
  else answerCounts[q.answer]++;
  if (!isText(q.explanation)) err(`${qat}: explanation missing`);
  if (!DIFFICULTIES.has(q.difficulty)) err(`${qat}: difficulty must be easy, medium or hard`);

  const e = english[q.id];
  if (!e) return err(`${qat}: English version missing in ${enLabel}`);
  const extra = Object.keys(e).filter((k) => !EN_FIELDS.includes(k));
  if (extra.length) err(`${qat} (English): unexpected field(s) ${extra.join(', ')}; only ${EN_FIELDS.join(', ')} are translated`);
  if (!isText(e.question)) err(`${qat} (English): question missing`);
  if (!isText(e.explanation)) err(`${qat} (English): explanation missing`);
  if (!isTextList(e.options, 4, 4) || e.options.length !== q.options?.length) return err(`${qat} (English): needs exactly 4 options, like the Hinglish`);
  if (new Set(e.options.map((o) => o.trim().toLowerCase())).size !== 4) err(`${qat} (English): options must be distinct`);
  if (!isText(q.question) || !isTextList(q.options, 4, 4)) return;
  const pairs = [['question', q.question, e.question], ...q.options.map((o, k) => [`option ${letter(k)}`, o, e.options[k]])];
  if (isText(q.explanation) && isText(e.explanation)) pairs.push(['explanation', q.explanation, e.explanation]);
  for (const [what, hi, eng] of pairs) {
    if (!isText(eng)) continue;
    if (count(hi, '`') !== count(eng, '`')) err(`${qat} (English): ${what} has a different number of \` marks`);
    if (count(hi, '**') !== count(eng, '**')) err(`${qat} (English): ${what} has a different number of ** marks`);
    if (what !== 'explanation' && numbers(hi) !== numbers(eng)) warnings.push(`${qat} (English): ${what} numbers differ: "${hi}" → "${eng}"`);
  }
}

/** Correct answers spread over A–D: each position at least 15% of them. */
const bunched = (counts) => {
  const total = counts.reduce((a, b) => a + b, 0);
  return total > 0 && counts.some((c) => c < total * 0.15);
};

/* ---------------- Subjects and programmes ---------------- */
{
  const errors = [];
  const ids = new Set();
  for (const s of subjects) {
    // Question ids are "<subject>-w<week>-q<n>", parsed back with /^([a-z0-9]+)-w/, so no dashes.
    if (!/^[a-z0-9]+$/.test(s.id ?? '')) errors.push(`subject id "${s.id}" must be lowercase letters and digits only`);
    if (ids.has(s.id)) errors.push(`subject "${s.id}" is listed twice`);
    ids.add(s.id);
    for (const f of ['code', 'name', 'short', 'icon']) if (!isText(s[f])) errors.push(`subject "${s.id}": ${f} missing`);
    if (s.status !== undefined && !STATUSES.has(s.status)) errors.push(`subject "${s.id}": status must be "partial" or "planned"`);
  }
  const inProgramme = new Set();
  const programmeIds = new Set();
  if (!Array.isArray(programmes) || !programmes.length) errors.push('content/programmes.json: needs at least one programme');
  for (const p of programmes ?? []) {
    if (!/^[a-z0-9]+$/.test(p.id ?? '')) errors.push(`programme id "${p.id}" must be lowercase letters and digits only`);
    if (programmeIds.has(p.id)) errors.push(`programme "${p.id}" is listed twice`);
    programmeIds.add(p.id);
    if (!isText(p.name) || !isText(p.short)) errors.push(`programme "${p.id}": name and short are needed`);
    if (!Array.isArray(p.levels) || !p.levels.length) errors.push(`programme "${p.id}": needs at least one level`);
    for (const [id, code] of Object.entries(p.codes ?? {})) {
      if (!p.levels?.some((l) => l.subjects?.includes(id))) errors.push(`programme "${p.id}": codes has "${id}", which isn't one of its subjects`);
      if (!isText(code)) errors.push(`programme "${p.id}": code for "${id}" missing`);
    }
    for (const l of p.levels ?? []) {
      if (!isText(l.id) || !isText(l.name)) errors.push(`programme "${p.id}": every level needs an id and a name`);
      if (!Array.isArray(l.subjects) || !l.subjects.length) errors.push(`programme "${p.id}" level "${l.id}": needs subjects`);
      for (const id of l.subjects ?? []) {
        if (!ids.has(id)) errors.push(`programme "${p.id}" level "${l.id}": unknown subject "${id}" (add it to content/subjects.json)`);
        inProgramme.add(id);
      }
    }
  }
  for (const id of ids) if (!inProgramme.has(id)) errors.push(`subject "${id}" isn't in any programme in content/programmes.json`);
  // Doubt Solver quick answers are shown only to choices with their subject.
  const faqs = JSON.parse(readFileSync(join(root, 'content/faqs.json'), 'utf8'));
  faqs.forEach((f, i) => {
    if (!ids.has(f.subject)) errors.push(`content/faqs.json #${i + 1}: subject "${f.subject}" isn't in content/subjects.json`);
  });
  // A qualifier choice ("qualifier/es") uses the programme with the same id for its course codes.
  const { qualifiers } = JSON.parse(readFileSync(join(root, 'content/qualifier/qualifiers.json'), 'utf8'));
  for (const q of qualifiers ?? []) if (!programmeIds.has(q.id)) errors.push(`qualifier "${q.id}" needs a programme with the same id`);
  if (errors.length) {
    failures++;
    console.log(`✗ programmes: ${errors.length} problem(s)`);
    errors.forEach((e) => console.log(`   - ${e}`));
  } else {
    for (const p of programmes) {
      const levels = p.levels.map((l) => {
        const list = l.subjects.map((id) => subjects.find((s) => s.id === id));
        const ready = list.filter((s) => !s.status).length;
        const partial = list.filter((s) => s.status === 'partial').length;
        return `${l.name} ${ready}/${list.length} complete${partial ? `, ${partial} partial` : ''}`;
      });
      console.log(`✓ programme ${p.id} (${p.short}): ${levels.join(' · ')}`);
    }
  }
}

const targets = requested.length ? requested.filter((r) => r !== 'qualifier') : subjects.filter((s) => s.status !== 'planned').map((s) => s.id);

function readJson(file, label, err) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(`${label}: invalid JSON — ${e.message}`);
    return undefined;
  }
}

for (const id of targets) {
  const errors = [];
  const warnings = [];
  const err = (msg) => errors.push(msg);
  const file = join(root, 'content/weeks', `${id}.json`);
  const enFile = join(root, 'content/weeks-en', `${id}.json`);

  const subject = subjects.find((s) => s.id === id);
  if (!subject) err(`unknown subject id "${id}"`);
  // A planned subject is only checked when named on the command line, while its weeks are being written.
  const planned = subject?.status === 'planned';
  const partial = subject?.status === 'partial';
  if (!existsSync(file)) {
    console.log(`✗ ${id}: missing content/weeks/${id}.json`);
    failures++;
    continue;
  }

  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`✗ ${id}: invalid JSON — ${e.message}`);
    failures++;
    continue;
  }

  let en;
  if (!existsSync(enFile)) err(`missing English questions file content/weeks-en/${id}.json`);
  else en = readJson(enFile, `content/weeks-en/${id}.json`, err);
  if (en && en.subjectId !== id) err(`content/weeks-en/${id}.json: subjectId should be "${id}"`);
  const english = en?.questions && typeof en.questions === 'object' ? en.questions : {};

  if (data.subjectId !== id) err(`subjectId should be "${id}"`);
  // A partial subject has weeks 1..n; the week numbers themselves are checked below.
  if (!Array.isArray(data.weeks) || (planned ? data.weeks.length < 1 || data.weeks.length > WEEKS : partial ? data.weeks.length < 1 || data.weeks.length >= WEEKS : data.weeks.length !== WEEKS)) {
    err(partial ? `"partial" subjects need 1–${WEEKS - 1} weeks; with all ${WEEKS}, remove "status" from content/subjects.json` : `expected ${WEEKS} weeks`);
  }

  const ids = new Set();
  const answerCounts = [0, 0, 0, 0];
  const levelCounts = { easy: 0, medium: 0, hard: 0 };

  (data.weeks || []).forEach((w, i) => {
    const at = `week ${i + 1}`;
    if (w.week !== i + 1) err(`${at}: "week" should be ${i + 1}`);
    if (!isText(w.title)) err(`${at}: title missing`);
    if (!isText(w.summary)) err(`${at}: summary missing`);
    if (!Number.isInteger(w.readMinutes) || w.readMinutes < 3 || w.readMinutes > 30) err(`${at}: readMinutes should be 3–30`);
    if (!isTextList(w.concepts, 4, 8)) err(`${at}: concepts should be 4–8 strings`);
    if (!w.example || !isText(w.example.problem) || !isTextList(w.example.steps, 1, 8)) err(`${at}: example needs problem and 1–8 steps`);
    if (w.example?.code !== undefined && !isText(w.example.code)) err(`${at}: example.code must be a non-empty string when present`);
    if (!isTextList(w.mistakes, 1, 3)) err(`${at}: mistakes should be 1–3 strings`);
    if (!isTextList(w.revision, 3, 6)) err(`${at}: revision should be 3–6 strings`);

    if (!Array.isArray(w.questions) || w.questions.length < MIN_QUESTIONS_PER_WEEK) {
      err(`${at}: expected at least ${MIN_QUESTIONS_PER_WEEK} questions`);
      return;
    }
    if (LEVELLED_SUBJECTS.has(id)) {
      for (const level of DIFFICULTIES) {
        const n = w.questions.filter((q) => q.difficulty === level).length;
        if (n < PER_LEVEL) err(`${at}: needs at least ${PER_LEVEL} ${level} questions, has ${n}`);
      }
    }
    for (const q of w.questions) if (q.difficulty in levelCounts) levelCounts[q.difficulty]++;
    w.questions.forEach((q, j) => {
      checkQuestion(q, `${id}-w${i + 1}-q${j + 1}`, `${at} q${j + 1}`, english, `content/weeks-en/${id}.json`, ids, answerCounts, err, warnings);
    });
  });

  const stray = Object.keys(english).filter((k) => !ids.has(k));
  if (stray.length) err(`content/weeks-en/${id}.json: unknown question id(s) ${stray.slice(0, 5).join(', ')}`);

  const total = answerCounts.reduce((a, b) => a + b, 0);
  if (bunched(answerCounts)) {
    err(`correct answers are bunched on one position (A–D counts: ${answerCounts.join(', ')}); spread them out`);
  }

  if (errors.length) {
    failures++;
    console.log(`✗ ${id}: ${errors.length} problem(s)`);
    errors.slice(0, 40).forEach((e) => console.log(`   - ${e}`));
  } else {
    console.log(`✓ ${id}: ${data.weeks.length}${partial || planned ? ` of ${WEEKS}` : ''} weeks, ${total} questions (${levelCounts.easy} easy, ${levelCounts.medium} medium, ${levelCounts.hard} hard) in Hinglish and English`);
  }
  // Not errors: a translation may write a number as a word. Listed so a person can check them.
  if (warnings.length) {
    console.log(`  ! ${id}: ${warnings.length} English text(s) whose numbers differ from the Hinglish; check they're faithful`);
    warnings.slice(0, 20).forEach((w) => console.log(`     - ${w}`));
  }
}

if (checkQualifiers) checkQualifierMocks();

process.exit(failures ? 1 : 0);

function checkQualifierMocks() {
  const errors = [];
  const err = (msg) => errors.push(msg);
  const warnings = [];
  const dir = join(root, 'content/qualifier');
  const config = readJson(join(dir, 'qualifiers.json'), 'content/qualifier/qualifiers.json', err);
  if (!config) return report();

  const qualifiers = new Map();
  for (const [i, q] of (Array.isArray(config.qualifiers) ? config.qualifiers : []).entries()) {
    const at = `qualifier ${q?.id ?? i + 1}`;
    if (!/^[a-z]+$/.test(q?.id ?? '')) err(`${at}: id should be lowercase letters`);
    if (qualifiers.has(q.id)) err(`${at}: duplicate id`);
    qualifiers.set(q.id, q);
    if (!isText(q.title) || !isText(q.short)) err(`${at}: title and short are needed`);
    if (!Array.isArray(q.programmes) || !q.programmes.length || !q.programmes.every((p) => isText(p.name) && /^https:\/\//.test(p.href ?? ''))) {
      err(`${at}: programmes need a name and an https link`);
    }
    if (!Array.isArray(q.sections) || q.sections.length === 0) err(`${at}: sections missing`);
    const sectionIds = (q.sections ?? []).map((s) => s.id);
    if (new Set(sectionIds).size !== sectionIds.length) err(`${at}: section ids must be unique`);
    for (const s of q.sections ?? []) {
      if (!/^[a-z0-9]+$/.test(s.id ?? '') || !isText(s.name) || !isText(s.short)) err(`${at}: section ${s.id}: needs an id (a–z, 0–9), name and short`);
      if (s.subjectId !== undefined && !subjects.some((x) => x.id === s.subjectId)) err(`${at}: section ${s.id}: unknown subjectId "${s.subjectId}"`);
    }
  }
  if (!qualifiers.size) err('content/qualifier/qualifiers.json: no qualifiers');

  const mocks = Array.isArray(config.mocks) ? config.mocks : [];
  const mockIds = new Set();
  let questionTotal = 0;
  for (const mock of mocks) {
    const at = `mock ${mock?.id}`;
    const qualifier = qualifiers.get(mock?.qualifier);
    if (!qualifier) {
      err(`${at}: unknown qualifier "${mock?.qualifier}"`);
      continue;
    }
    if (!new RegExp(`^${qualifier.id}-\\d+$`).test(mock.id ?? '') || mock.id.length > 20) err(`${at}: id should look like "${qualifier.id}-1"`);
    if (mockIds.has(mock.id)) err(`${at}: duplicate id`);
    mockIds.add(mock.id);
    if (!isText(mock.title)) err(`${at}: title missing`);
    if (!Number.isInteger(mock.minutes) || mock.minutes < 10 || mock.minutes > 240) err(`${at}: minutes should be 10–240`);
    if (mock.pro !== undefined && typeof mock.pro !== 'boolean') err(`${at}: pro must be true or false`);

    const file = join(dir, 'mocks', `${mock.id}.json`);
    const enFile = join(dir, 'mocks-en', `${mock.id}.json`);
    if (!existsSync(file)) {
      err(`${at}: missing content/qualifier/mocks/${mock.id}.json`);
      continue;
    }
    const data = readJson(file, `content/qualifier/mocks/${mock.id}.json`, err);
    let en;
    if (!existsSync(enFile)) err(`${at}: missing English questions file content/qualifier/mocks-en/${mock.id}.json`);
    else en = readJson(enFile, `content/qualifier/mocks-en/${mock.id}.json`, err);
    if (!data) continue;
    if (data.mockId !== mock.id) err(`${at}: mockId should be "${mock.id}"`);
    if (en && en.mockId !== mock.id) err(`content/qualifier/mocks-en/${mock.id}.json: mockId should be "${mock.id}"`);
    const english = en?.questions && typeof en.questions === 'object' ? en.questions : {};

    // The paper has one section per course, in the qualifier's order.
    const want = qualifier.sections.map((s) => s.id).join(', ');
    const got = (Array.isArray(data.sections) ? data.sections : []).map((s) => s.section).join(', ');
    if (got !== want) err(`${at}: sections should be ${want} (got ${got || 'none'})`);

    const ids = new Set();
    const answerCounts = [0, 0, 0, 0];
    for (const section of Array.isArray(data.sections) ? data.sections : []) {
      const questions = Array.isArray(section.questions) ? section.questions : [];
      const [min, max] = QUALIFIER_SECTION_QUESTIONS;
      if (questions.length < min || questions.length > max) err(`${at} ${section.section}: expected ${min}–${max} questions`);
      questions.forEach((q, j) =>
        checkQuestion(q, `${mock.id}-${section.section}-q${j + 1}`, `${at} ${section.section} q${j + 1}`, english, `content/qualifier/mocks-en/${mock.id}.json`, ids, answerCounts, err, warnings),
      );
    }
    if (ids.size > MAX_TEST_QUESTIONS) err(`${at}: at most ${MAX_TEST_QUESTIONS} questions`);
    const stray = Object.keys(english).filter((k) => !ids.has(k));
    if (stray.length) err(`content/qualifier/mocks-en/${mock.id}.json: unknown question id(s) ${stray.slice(0, 5).join(', ')}`);
    if (bunched(answerCounts)) err(`${at}: correct answers are bunched on one position (A–D counts: ${answerCounts.join(', ')}); spread them out`);
    questionTotal += ids.size;
  }

  for (const q of qualifiers.values()) {
    if (!mocks.some((m) => m.qualifier === q.id && !m.pro)) err(`qualifier ${q.id}: needs at least one free mock`);
  }
  for (const folder of ['mocks', 'mocks-en']) {
    const files = existsSync(join(dir, folder)) ? readdirSync(join(dir, folder)) : [];
    const unknown = files.filter((f) => !mockIds.has(f.replace(/\.json$/, '')));
    if (unknown.length) err(`content/qualifier/${folder}: file(s) not listed in qualifiers.json: ${unknown.join(', ')}`);
  }
  return report();

  function report() {
    if (errors.length) {
      failures++;
      console.log(`✗ qualifier: ${errors.length} problem(s)`);
      errors.slice(0, 40).forEach((e) => console.log(`   - ${e}`));
    } else {
      console.log(`✓ qualifier: ${qualifiers.size} qualifiers, ${mocks.length} mocks, ${questionTotal} questions in Hinglish and English`);
    }
    if (warnings.length) {
      console.log(`  ! qualifier: ${warnings.length} English text(s) whose numbers differ from the Hinglish; check they're faithful`);
      warnings.slice(0, 20).forEach((w) => console.log(`     - ${w}`));
    }
  }
}
