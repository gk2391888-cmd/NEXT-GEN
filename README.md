# NEXT GEN — Student Learning Hub

Powered by **THE TECH HUB** · Created by **GAURAV GUPTA**

An independent learning and exam-preparation site for IITM BS Foundation students (not affiliated with IIT Madras).

## What's in Phase 1

- **Study Library**: 8 Foundation subjects × 12 weeks of original Hinglish notes (concept, solved example, common mistakes, quick revision). "Save as PDF" prints a clean copy.
- **Practice Quiz**: 6 MCQs per week (576 total) with instant Hinglish explanations.
- **Mock Tests**: Quiz 1 (weeks 1–4), Quiz 2 (weeks 5–8) and End term (all weeks) per subject, with timer, question palette, mark-for-review, auto-submit, resume after refresh, and a result page with week-wise performance and answer review.
- **My Progress**: accuracy by subject, weak weeks, mock test history, weeks saved for revision.

Progress is stored in the browser (`localStorage`) for now. Phase 2 moves it to Supabase with student login; the record shapes in `lib/progress/types.ts` are designed to map to tables directly.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

| Path | What it holds |
| --- | --- |
| `content/subjects.json` | The 8 subjects (code, name, colours) |
| `content/weeks/<subject>.json` | 12 weeks of notes and questions per subject |
| `content/lab.json`, `content/faqs.json` | Python & CT lab exercises, Doubt Help answers |
| `app/` | Pages (Next.js App Router, statically generated) |
| `components/` | UI; `components/quiz/` has practice and mock test logic |
| `lib/content.ts` | Reads content at build time |
| `lib/progress/` | Progress store, types and weak-topic insights |
| `lib/tests.ts` | Mock test definitions and question picking |
| `legacy/` | The original single-file prototype, kept for reference |

## Editing content

Edit the JSON in `content/weeks/`, then check it:

```bash
npm run validate:content
```

The validator checks every week has the right fields, 6 questions with 4 distinct options, valid answer indexes and ids, and that correct answers aren't bunched on one option. `npm run build` runs it first, so broken content never deploys.

Formatting inside content strings: only `**bold**` and `` `code` ``. Multi-line code goes in a `code` field.

All notes and questions are original. Don't paste official IITM lecture notes, assignments or previous-year papers into the content.

## Deploy

The site is a Next.js app, so Vercel needs it from Git (Vercel Drop only works for plain static files):

1. Push this folder to a GitHub repo.
2. In the Vercel project, click **Connect Git** and pick that repo. Framework preset: Next.js.
3. Every push to `main` then deploys automatically.
