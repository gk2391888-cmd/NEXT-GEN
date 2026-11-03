// Checks content/programmes.json (every programme's levels point at real subjects), every
// content/weeks/<subject>.json against the shape the app expects, and that
// content/weeks-en/<subject>.json has an English version of every question.
// A subject in content/subjects.json can be marked "status": "partial" (weeks 1..n written, n < 12)
// or "planned" (no notes yet); without a status it needs all 12 weeks.
// Usage: node scripts/validate-content.mjs [subjectId ...]
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const subjects = JSON.parse(readFileSync(join(root, 'content/subjects.json'), 'utf8'));
const { programmes } = JSON.parse(readFileSync(join(root, 'content/programmes.json'), 'utf8'));
const WEEKS = 12;
const STATUSES = new Set(['partial', 'planned']);
const QUESTIONS_PER_WEEK = 6;
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const EN_FIELDS = ['question', 'options', 'explanation'];

const requested = process.argv.slice(2);
let failures = 0;

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isTextList = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max && v.every(isText);
const letter = (i) => 'ABCD'[i];
const count = (text, mark) => text.split(mark).length - 1;
/** The numbers in a text, so a translation that changes one shows up for a check. */
const numbers = (text) => (text.match(/\d+(\.\d+)?/g) ?? []).sort().join(' ');

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

const targets = requested.length ? requested : subjects.filter((s) => s.status !== 'planned').map((s) => s.id);

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

    if (!Array.isArray(w.questions) || w.questions.length !== QUESTIONS_PER_WEEK) {
      err(`${at}: expected ${QUESTIONS_PER_WEEK} questions`);
      return;
    }
    w.questions.forEach((q, j) => {
      const qat = `${at} q${j + 1}`;
      const expectedId = `${id}-w${i + 1}-q${j + 1}`;
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

      // The English version: the same options in the same order, with the same `code` and **bold** marks.
      // Answer, code and difficulty are shared, so they're not repeated in the English file.
      const e = english[q.id];
      if (!e) return err(`${qat}: English version missing in content/weeks-en/${id}.json`);
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
    });
  });

  const stray = Object.keys(english).filter((k) => !ids.has(k));
  if (stray.length) err(`content/weeks-en/${id}.json: unknown question id(s) ${stray.slice(0, 5).join(', ')}`);

  const total = answerCounts.reduce((a, b) => a + b, 0);
  if (total && answerCounts.some((c) => c < total * 0.15)) {
    err(`correct answers are bunched on one position (A–D counts: ${answerCounts.join(', ')}); spread them out`);
  }

  if (errors.length) {
    failures++;
    console.log(`✗ ${id}: ${errors.length} problem(s)`);
    errors.slice(0, 40).forEach((e) => console.log(`   - ${e}`));
  } else {
    console.log(`✓ ${id}: ${data.weeks.length}${partial || planned ? ` of ${WEEKS}` : ''} weeks, ${total} questions in Hinglish and English`);
  }
  // Not errors: a translation may write a number as a word. Listed so a person can check them.
  if (warnings.length) {
    console.log(`  ! ${id}: ${warnings.length} English text(s) whose numbers differ from the Hinglish; check they're faithful`);
    warnings.slice(0, 20).forEach((w) => console.log(`     - ${w}`));
  }
}

process.exit(failures ? 1 : 0);
