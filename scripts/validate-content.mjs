// Checks every content/weeks/<subject>.json against the shape the app expects.
// Usage: node scripts/validate-content.mjs [subjectId ...]
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const subjects = JSON.parse(readFileSync(join(root, 'content/subjects.json'), 'utf8'));
const WEEKS = 12;
const QUESTIONS_PER_WEEK = 6;
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

const requested = process.argv.slice(2);
const targets = requested.length ? requested : subjects.map((s) => s.id);
let failures = 0;

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isTextList = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max && v.every(isText);

for (const id of targets) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  const file = join(root, 'content/weeks', `${id}.json`);

  if (!subjects.some((s) => s.id === id)) err(`unknown subject id "${id}"`);
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

  if (data.subjectId !== id) err(`subjectId should be "${id}"`);
  if (!Array.isArray(data.weeks) || data.weeks.length !== WEEKS) err(`expected ${WEEKS} weeks`);

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
    });
  });

  const total = answerCounts.reduce((a, b) => a + b, 0);
  if (total && answerCounts.some((c) => c < total * 0.15)) {
    err(`correct answers are bunched on one position (A–D counts: ${answerCounts.join(', ')}); spread them out`);
  }

  if (errors.length) {
    failures++;
    console.log(`✗ ${id}: ${errors.length} problem(s)`);
    errors.slice(0, 40).forEach((e) => console.log(`   - ${e}`));
  } else {
    console.log(`✓ ${id}: ${data.weeks.length} weeks, ${total} questions`);
  }
}

process.exit(failures ? 1 : 0);
