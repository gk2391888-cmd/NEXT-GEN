# NEXT GEN — Student Learning Hub

Powered by **THE TECH HUB** · Created by **GAURAV GUPTA**

An independent learning and exam-preparation site for IIT Madras online BS students (not affiliated with IIT Madras).

## What's in Phase 1

- **Programmes**: right after sign-up (and once for existing students) NEXT GEN asks "What are you preparing for?": a programme level (Data Science Foundation or a Diploma, Electronic Systems, Aeronautics or Management & Data Science Foundation) or a qualifier exam (Data Science or Electronic Systems). From then on the student sees only that choice's material: its subjects, its tools in the sidebar, and numbers that count only it. See [Programmes](#programmes) below.
- **Study Library**: 12 weeks of original Hinglish notes per subject (concept, solved example, common mistakes, quick revision) for the Foundation level of all four programmes (Data Science 8, Electronic Systems 9 theory courses, Aeronautics 8, Management & Data Science 8) and both Data Science Diplomas (Programming 6, Data Science 7). Shared courses are written once, so that's 35 subjects and 3,384 questions. "Save as PDF" prints a clean copy.
- **Practice Quiz**: MCQs with instant explanations (15 per week, 1,440 in total, in the 8 Data Science Foundation subjects; 6 per week elsewhere), in English or Hinglish: each student picks with the English / Hinglish switch on practice, mock tests, My Mistakes and search (English by default, remembered in the browser).
  - **Levels**: every Data Science Foundation week has at least 5 Easy, 5 Medium and 5 Hard questions. Students pick Easy, Medium, Hard or Mixed (all of the week's questions, easy first) on the practice pages; each level shows how many questions it has, and the choice is remembered in the browser.
- **Mock Tests**: Quiz 1 (weeks 1–4), Quiz 2 (weeks 5–8) and End term (all weeks) per subject, with timer, question palette, mark-for-review, auto-submit, resume after refresh, and a result page with week-wise performance and answer review.
  - Each test is a balanced mix by default (about 30% easy, 40% medium, 30% hard, spread across the weeks). Before starting, a student can switch it to Easy, Medium or Hard only.
- **My Progress**: accuracy by subject, weak weeks, mock test history, weeks saved for revision.

## Qualifier Prep (`/qualifier`)

For people preparing for the IITM BS **qualifier exam**, who aren't students yet, so it's also a sign-up funnel.

- **Two qualifiers**, from `content/qualifier/qualifiers.json`:
  - **Data Science**: Maths I, Stats I, CT, English I. The Management and Data Science programme uses the same four courses.
  - **Electronic Systems**: English I, Math for Electronics I, Electronic Systems Thinking and Circuits, Intro to C. Aeronautics and Space Technology uses the same four.
- **Overview page** (`/qualifier/<ds|es>`):
  - a countdown to the exam
  - the 4 courses, with links to our week 1–4 notes and practice (DS only, since we have no ES notes yet)
  - the process and the published hall-ticket and pass rules, with sources
- **Study plan** (`/qualifier/<id>/plan`): a day-by-day plan to the exam, worked out in the browser.
  - It covers weeks 1–4 of every course, then two mocks, and keeps the last day light.
  - Weeks marked done on their notes page drop out of the plan.
- **Timed mocks** (`/qualifier/<id>/mock/<mock>`): the mock test runner with one section per course (32 questions, 80 min).
  - The result shows the score per course against the published pass rule (General: 40% in each course and 50% on average).
  - Qualifier Prep stays open without a plan. Mock 1 of each qualifier is free, even logged out. Mock 2 is Pro and comes from `/api/pro/qualifier/<mock>`. The week 2–4 notes it links to need a trial or Pro, like every other week after the first.
  - Attempts are stored as test attempts with `subject_id = 'qualifier'`. They don't feed My Mistakes or weak weeks.
- **Exam date:** `QUALIFIER_EXAM_DATE` in `lib/qualifier.ts` (2026-11-15) drives the countdown and the plan. Every page tells students to confirm their own date.
  - The official pages checked on 4 Nov 2026 did **not** show this date. They list the January 2027 term instead: apply by 29 Jan 2027, qualifier exam 14 Mar 2027 on the ES/AE/MG pages.
  - Update the date, and `QUALIFIER_FACTS_CHECKED`, each term.
- **Rules shown** (`PASS_RULES` and `COURSE_LIMITS` in `lib/qualifier.ts`) come from the official admissions pages, listed in `QUALIFIER_SOURCES`.
  - Question types, negative marking and per-course question counts aren't published. The pages say so and send students to their hall ticket.

## Phase 2: student accounts

- **Login** with an emailed link (no passwords), an emailed code once the template includes it, or Google once it's switched on in Supabase. The first login creates the account.
- **Cloud progress**: answers, mock tests, completed/saved weeks and the profile sync to Supabase. The browser keeps a copy, so the app stays instant and works offline; changes queue in `pending` and upload when the network is back.
- **First login on a device** offers to move that device's logged-out progress into the account.
- **My profile**: name, current-term subjects (shown first on Overview and Mock Tests), and delete account.
- Logged-out visitors can open the Overview, Qualifier Prep and week 1 of every subject; everything else asks them to sign up (see [Access and the free trial](#access-and-the-free-trial)). Their progress stays on the device.

Each student can only read and write their own rows. This is enforced by Row Level Security in the database, not just by the app.

### One-time Supabase setup

1. **SQL Editor** → paste `supabase/migrations/0001_student_accounts.sql` → **Run**.
2. **Authentication → URL Configuration**: Site URL = the live site URL; Redirect URLs = `<live site>/**` and `http://localhost:3200/**`. (Done for the current project.)
3. **Emails**: Supabase's built-in mailer sends only a handful of emails per hour and its templates can't be edited. Before launch, set up custom SMTP (e.g. Resend) under **Authentication → Emails → SMTP Settings**; then you can also add `{{ .Token }}` to the **Magic link or OTP** and **Confirm sign up** templates so students get a code as well as the link.
4. *(Optional, Google login)* Create an OAuth client in Google Cloud, then **Authentication → Sign In / Providers → Google**: paste the client ID and secret. The login page shows the Google button automatically once it's enabled.

The Supabase URL and publishable key default to the production project (`lib/supabase/client.ts`); set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to point at another project. Never put the `service_role`/secret key in this app.

## Phase 3: Pro, AI and practice tools

| Feature | No plan (guest, or trial over) | Free trial (7 days, once) and Pro (₹99 / 30 days) |
| --- | --- | --- |
| Overview, pricing, profile, privacy and terms | ✓ | ✓ |
| Week 1 of every subject: notes and practice | ✓ | ✓ |
| Qualifier Prep: countdown, study plan, mock 1 of each qualifier (logged out too) | ✓ | ✓ |
| Grade Calculator (`/grades`): total, grade and end-term score needed per grade | ✓ | ✓ |
| Weeks 2–12: notes, formula sheets, search, practice | | ✓ |
| Quiz 1, Quiz 2 and End term mock tests | | ✓ |
| Qualifier mock 2 (DS and ES) | | ✓ |
| My Mistakes (spaced revision), Exam Planner, My Progress | | ✓ |
| Coding Lab: practice problems, OPPE-style sets with hidden tests (Python in the browser via Pyodide) | | ✓ |
| Timed OPPE simulation (`/lab/oppe/<set>`): countdown, Submit all, score report | | ✓ |
| AI Doubt Solver (limits set in `lib/ai/features.ts`), with “Why was my answer wrong?” from any explanation | | 200 / day |
| Time per question in test results, Save as PDF | | ✓ |

### Access and the free trial

- **The paywall.** `lib/access.ts` (`isOpenPath`) lists the pages anyone can open (table above). Every other page is wrapped by `<AccessGate>` in the shell, which shows `<Paywall>` unless the student has an active trial or Pro, or is an admin (admins are never locked):
  - logged out: "Sign up free to keep studying", with the trial and a link to the free week 1;
  - trial or Pro over, or no trial given: why, a note that their progress is saved, and the same Razorpay / UPI buttons as `/pricing` (`useProCheckout()` in `components/pro-checkout.tsx`). A Razorpay payment refreshes the plan straight away, so the page opens at once; a UPI payment opens it once an admin approves the UTR.
  - The renew banner warns 2 days before a trial ends and 5 days before Pro ends.
- **What's checked on the server.** Pages only carry titles. Notes and questions for weeks 2–12, formula sheets, the search text, the question bank (My Mistakes, search, AI, admin), every mock test's questions and every Coding Lab problem come from `/api/pro/*`, which checks the session and `public.is_pro()` first (`requirePro()` in `lib/server/pro-access.ts`). The AI Doubt Solver checks the plan in `lib/server/ai/handler.ts`. Week 1 is in the page on purpose (free preview), and so are the free qualifier mocks.
- **UI only, on purpose:** the "Predict the output" cards on `/lab` (`content/lab.json`) and the doubt-solver FAQs (`content/faqs.json`) are small and ship in the page; PDF notes that an admin marks as free stay open to everyone (mark them Pro only to lock them).
- **One trial per person** (migration `0009_one_trial_per_person.sql`). New accounts start without a trial. After the first login, the app calls `POST /api/trial/start`, which calls `claim_trial()` with the service role. There's no trial when:
  - the email is a throwaway inbox (`lib/disposable-email.ts`; the login form refuses these too),
  - the same email already had one, ignoring case, `+tags` and Gmail's dots (`rahul.k+2@gmail.com` = `rahulk@gmail.com`),
  - this browser already had one (a random device ID kept in local storage and an `ng_device` cookie), or
  - 3 trials already started from this IP address in the last 24 hours (lenient, since hostels and mobile networks share IPs).
  - Without a trial the account still works and can buy Pro straight away. `trial_claims` keeps only SHA-256 hashes of the email and IP, and stays when an account is deleted, so deleting and signing up again doesn't give a new trial. Accounts that already had a trial record each device they log in on.

- **Admin panel** (`/admin`, accounts listed in `public.admins`): launch stats (sign-ups, trials, paying students, money received, sign-ups per day, what students are preparing for), review student error reports, correct questions (stored in `content_overrides`, live immediately), upload PDF notes, post announcements, confirm UPI payments.
- **PDF notes**: admins upload PDFs per subject and week (or for the whole subject) into the private Storage bucket `notes`, listed in `note_files`. Students open them from the Study Library and the week's notes through a one-hour signed link. Files marked Pro only open for trial and Pro students; Storage enforces that, not the browser.
- **Plans** live on `profiles.trial_ends_at` / `pro_until`, which students can't edit. `lib/plans.ts` turns them into a tier, the same way on the server and in the browser.
- **Paid content is checked on the server**, as above: `/api/pro/week/<subject>/<week>`, `/api/pro/formulas/<subject>`, `/api/pro/search`, `/api/pro/questions`, `/api/pro/tests/<subject>/<test>`, `/api/pro/coding/<id>`, `/api/pro/oppe/<set>` and `/api/pro/qualifier/<mock>`. Coding Lab hidden tests and solutions are only fetched on Submit. `<AccessGate>` and `<ProLock>` in the browser only decide what's shown.
- **Payments**, two ways, each adding 30 days via the service-role key. Either can be on alone, or both.
  - Razorpay Checkout → `/api/payments/verify` (signature check) and `/api/payments/webhook` (backup).
  - Pay by UPI QR: the student pays our UPI ID and submits the 12-digit UTR (`/api/payments/upi`, table `upi_requests`). An admin matches it in the bank statement and approves it in **Admin → UPI payments** (`/api/payments/upi/review`).

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Needed for |
| --- | --- |
| `GROQ_API_KEY` | AI features via Groq (console.groq.com → API Keys) |
| `AI_MODEL_SMART`, `AI_MODEL_FAST` | Optional: which models serve each tier. See **AI features** below. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required.** Free trials (`/api/trial/start`), AI features (counting daily limits) and payments (granting Pro). Without it new accounts can't start their trial. Never expose it to the browser. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments |
| `RAZORPAY_WEBHOOK_SECRET` | Payment webhook (`<site>/api/payments/webhook`, event `payment.captured`) |
| `UPI_ID` | Pay by UPI QR, e.g. `yourname@okaxis`. A business/merchant UPI ID is safer than a personal one for many payments. |
| `UPI_PAYEE_NAME` | Optional: the name shown in the UPI app, defaults to `NEXT GEN` |
| `PRO_PRICE_INR` | Optional, defaults to 99 |
| `REMINDERS_SECRET` | The secret migration 0014 creates (`select value from private.app_settings where name = 'reminders_secret';`). Once set, `/api/reminders/send` only runs for the hourly database call. |
| `FORCE_DEPLOY` | Optional: `1` builds every commit on `main`, not just `[deploy]` ones (see **Deploy**). |
| `NEXT_PUBLIC_SITE_URL` | Optional: the public address for link previews and the sitemap, e.g. `https://nextgen.in` once a custom domain is added. Defaults to the Vercel production domain. |

Without these the site still works: the AI shows "being set up" and the Pro button shows "launching soon".

Migrations: run `supabase/migrations/0001…0014` in order in the Supabase SQL Editor. `0007_coding_attempts.sql` adds the table that syncs timed OPPE attempts; until it's run, those attempts stay on the student's device and everything else keeps syncing. `0009_one_trial_per_person.sql` turns on one trial per person (see above); until it's run, every new account still gets 7 days from the column default.

## AI features

The product uses AI through one engine, so switching models or changing what each plan gets is a one-line change. Nothing in the app names an AI vendor except `lib/server/ai/providers.ts` and `lib/server/ai/models.ts`.

```
lib/ai/                        shared by the browser and the server (no secrets)
  features.ts                  every AI feature: its model tier and its Free / Pro limits
  client.ts                    askAi(feature, input): the one way the UI calls AI
lib/server/ai/                 server only
  providers.ts                 where each vendor lives (Groq, OpenAI, OpenRouter, Gemini, custom)
  models.ts                    which model serves each tier: smart, fast
  chat-completions.ts          the one HTTP client (OpenAI Chat Completions format)
  generate.ts                  generate(): tries the tier's models in order (fallback)
  quota.ts                     daily limits and cooldowns, counted atomically in Postgres
  handler.ts                   every request: sign-in → plan → limits → input → quota → model → usage
  features/<feature>.ts        one file per feature: its prompt and input rules
app/api/ai/[feature]/route.ts  one endpoint for every feature: POST /api/ai/doubt
```

### Change the model

Features ask for a **tier** (`smart` or `fast`), never a model. `lib/server/ai/models.ts` maps each tier to models, written as `provider:model`. The first model is used; the rest are fallbacks, tried in order if it fails. To switch every feature on a tier, either edit that file or set an env var in Vercel and redeploy (no code change):

| Env var | Default |
| --- | --- |
| `AI_MODEL_SMART` | `groq:openai/gpt-oss-120b` |
| `AI_MODEL_FAST` | `groq:openai/gpt-oss-20b` |

Examples:
- `AI_MODEL_SMART=groq:llama-3.3-70b-versatile`: a different Groq model.
- `AI_MODEL_SMART=groq:openai/gpt-oss-120b, openrouter:<model id>`: Groq, with OpenRouter as backup.
- `AI_MODEL_SMART=custom:deepseek-chat` with `AI_CUSTOM_BASE_URL=https://api.deepseek.com/v1`: any other OpenAI-compatible API.

Each provider needs its key: `GROQ_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` or `AI_CUSTOM_API_KEY`. A model whose key isn't set is skipped, with a warning in the logs.

### Change the limits

Edit the feature's `limits` in `lib/ai/features.ts`. The server enforces them and the UI shows them (pricing page, doubt counter, input length), so the numbers can't drift apart. Per plan you can set:
- `perDay`: requests per day
- `cooldownSec`: seconds between requests
- `historyMessages`: chat history sent to the model
- `maxInputChars`: longest message
- `maxOutputTokens`: longest answer

Trial students get the Pro limits, and logged-out visitors can't use AI. Postgres does the counting (`consume_ai_quota`, migration 0004), so two requests at once can't both get past a limit. Only the server can call it, since it trusts the limits it's given. If the AI fails, the request is given back, so an outage never costs a student a doubt.

### Add an AI feature

1. Add it to `AI_FEATURES` in `lib/ai/features.ts`, with its tier and limits.
2. Add `lib/server/ai/features/<id>.ts` with a `prepare()` (validate input, build the prompt) and a `respond()`, and register it in `features/index.ts`. TypeScript fails the build if you forget.
3. Call it from the UI with `askAi('<id>', input)`.

Sign-in, plans, limits, model choice, fallbacks and usage tracking all come for free.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

| Path | What it holds |
| --- | --- |
| `content/programmes.json` | Programme → levels → subject ids, plus each programme's own course codes for shared subjects |
| `content/subjects.json` | Every subject once (code, name, icon, `status`); colours live in `tokens/semantic/subject.json` |
| `content/weeks/<subject>.json` | 12 weeks of notes and questions per subject (Hinglish) |
| `content/weeks-en/<subject>.json` | The English text of every question (question, options, explanation), by question id |
| `content/qualifier/qualifiers.json` | The qualifiers (sections = courses) and their mocks (time, free or Pro) |
| `content/qualifier/mocks/<mock>.json`, `mocks-en/<mock>.json` | Qualifier mock papers (Hinglish, one section per course) and their English text, by question id |
| `content/lab.json`, `content/faqs.json` | Python & CT lab exercises, Doubt Help answers |
| `app/` | Pages (Next.js App Router, statically generated) |
| `components/` | UI; `components/quiz/` has practice and mock test logic |
| `lib/content.ts` | Reads content at build time |
| `lib/qualifier.ts`, `lib/qualifier-content.ts`, `lib/qualifier-plan.ts` | Qualifier config, exam date and rules · mock loader (server) · study plan |
| `lib/progress/` | Progress store, types and weak-topic insights |
| `lib/tests.ts` | Mock test definitions and question picking (balanced mix or one level) |
| `lib/levels.ts`, `lib/practice-level.ts` | Question levels (Easy / Medium / Hard / Mixed): counts and filtering, shared · the practice level each student picked (browser) |
| `legacy/` | The original single-file prototype, kept for reference |

## Programmes

`content/programmes.json` lists each programme's levels (Foundation, Diplomas) and their subject ids. A subject used by two programmes (English I/II, the Electronic Systems courses Aeronautics shares) is one subject with one set of notes and one set of progress; `codes` gives the code each programme uses for it (English I is BSHS1001 in Data Science, HS1101 in Electronic Systems).

- **Choosing**: a choice is `<programme>/<level>` (e.g. `es/foundation`) or `qualifier/<ds|es>`. An older saved `qualifier` reads as `qualifier/ds`.
  - `components/programme-prompt.tsx` asks once: after sign-up (after the guest-progress import), to existing students with no choice (Data Science Foundation pre-selected, so confirming changes nothing), and to guests on the Overview. A guest's choice is copied to the account on sign-up instead of asking again. A qualifier choice goes to `/qualifier/<id>`.
  - It can be changed any time with the sidebar's "Preparing for" menu or in My profile.
  - Storage: a logged-in student's choice is a `programme:<choice>` entry in their profile's `subjects` (an existing text[] column, so **no migration** and it syncs like the rest of the profile); anything reading `subjects` as subject ids uses `termSubjects()`. A guest's is localStorage `nextgen-programme`. With no choice, Data Science Foundation is shown.
  - Code: `lib/programmes.ts` (choices, parsing, `inChoice`, `choiceHas`, shared helpers) and `lib/programme-choice.ts` (`useChoice()`, `useChoiceSubjects()`, `useChoiceCatalog()`, `useInChoice()`).
- **What each choice shows**:

  | Choice | Subjects and weeks | Sidebar tools beyond the shared ones |
  |---|---|---|
  | Data Science – Foundation | Its 8 subjects, all 12 weeks | Mock Tests, Coding Lab, Exam Planner, Grade Calculator |
  | Data Science – a Diploma | Its subjects | Mock Tests, Coding Lab, Exam Planner, Grade Calculator |
  | Electronic Systems / Aeronautics / Management & DS – Foundation | That Foundation's subjects, all 12 weeks | Mock Tests, Exam Planner, Grade Calculator |
  | Qualifier – Data Science | Maths I, Stats I, CT, English I, weeks 1–4 only | Qualifier Prep (opens `/qualifier/ds`) |
  | Qualifier – Electronic Systems | English I, Maths for Electronics I, Electronic Systems Thinking and Circuits, C Programming, weeks 1–4 only | Qualifier Prep (opens `/qualifier/es`) |

  - Shared tools, for every choice: Overview, Study Library, Practice Quiz, My Mistakes, AI Doubt Solver, My Progress. The others follow `choiceHas()` in `lib/programmes.ts`.
- **The rules, and why**:
  - *Hidden tools leave the sidebar* rather than sit there greyed out: a student sees one clean menu for what they're preparing for, and the "Preparing for" switch brings the rest back.
  - *Until a visitor chooses, nothing is hidden*: Qualifier Prep is how many visitors arrive, so it must be findable before the question is asked.
  - *Qualifier Prep only for qualifier students*: admitted students have no qualifier to take.
  - *Two qualifier choices, weeks 1–4 only*: the DS and ES qualifiers test different courses, and only their first four weeks.
  - *Mock Tests, Exam Planner and Grade Calculator only for admitted students*: they're built around course quizzes, end terms and course grades. Qualifier students get their own timed mocks, day-by-day plan and pass rules in Qualifier Prep, and the Overview's quick actions point there.
  - *Coding Lab for every Data Science level*: its problems and Pro OPPE sets are Python, the programme's coding language from Foundation to the Diplomas. None of the other Foundations here has a Python course, so no Pro student loses a tool their courses use.
  - *Numbers count only the choice*: totals from another programme would make the Overview and My Progress misleading. Progress in a shared course such as English I counts in every choice that has it.
  - *Direct links still open, under a notice*: links shared by friends and found on Google must keep working, and the notice offers the right switch instead of a dead end.
  - Overview, Study Library (cards, PDF files, week list), Practice, Mock Tests, Exam Planner, Search (notes and questions), My Mistakes, My Progress, the formula sheets, the Doubt Solver's quick answers and its example question (each in `content/faqs.json` has a `subject`) and the profile show only the choice's subjects and weeks. Subjects without notes say "Notes coming soon"; when none of the level's subjects has notes, Overview, Planner and Search show a "coming soon" notice from `components/coming-soon.tsx`.
  - Numbers count only the choice: questions attempted, accuracy, streak, weak weeks, mistakes due, mock test history (a qualifier student sees their own qualifier's mocks). Nothing is deleted: switching back brings the other numbers back. "Reset progress" still resets everything.
  - **Direct links still open.** Week, practice, test and tool pages exist for every subject, so links from friends and Google keep working. When one isn't part of the student's choice (another programme's notes, the Coding Lab for an Electronic Systems student, the Exam Planner or week 7 for a qualifier student, the other qualifier), `components/choice-notice.tsx` shows a notice above the page with a button to switch to a choice that has it and a way back.
  - The admin editor and PDF uploads list every subject, grouped by programme and level.
- **Status**: in `content/subjects.json`, a subject without `status` has all 12 weeks; `"partial"` has weeks 1..n; `"planned"` has none yet.
- **Coverage** and the research behind it (programmes, levels, official course codes, with sources): [docs/iitm-programmes.md](docs/iitm-programmes.md).

To add a subject: add it to `content/subjects.json` (id: lowercase letters and digits), to a level in `content/programmes.json`, and a colour in `tokens/semantic/subject.json` (`npm run tokens`), then write `content/weeks/<id>.json` and `content/weeks-en/<id>.json`.

## Editing content

Edit the JSON in `content/weeks/`, then check it:

```bash
npm run validate:content
```

The validator checks `content/programmes.json` (every level points at real subjects, every subject is in a programme), then that every week has the right fields, at least 6 questions with 4 distinct options, valid answer indexes and ids, and that correct answers aren't bunched on one option. `npm run build` runs it first, so broken content never deploys.

**Levels.** In the subjects listed in `LEVELLED_SUBJECTS` (`scripts/validate-content.mjs`; today the 8 Data Science Foundation subjects) every week needs at least 5 `easy`, 5 `medium` and 5 `hard` questions. Hard means multi-step, exam-level (quiz and end-term style), not obscure. When you add a question, give it the next free id in its week (`math1-w3-q16`) and never renumber or reuse an id: students' progress and My Mistakes are stored by question id.

Every question also needs its English text in `content/weeks-en/<subject>.json` (`question`, `options`, `explanation`; answer, code and difficulty are shared). The validator fails if one is missing, has a different number of options, or has different `` ` `` / `**` marks, and lists any question or option whose numbers differ between the two languages so you can check the translation. Keep the options in the same order: the answer index is the same in both languages.

Formatting inside content strings: only `**bold**` and `` `code` ``. Multi-line code goes in a `code` field.

**Qualifier mocks** follow the same rules per question.
- Ids are `<mock>-<section>-q<n>`, for example `ds-1-math1-q3`.
- Each mock needs one section per course of its qualifier, in the order of `qualifiers.json`, with 5–25 questions each.
- Every mock in `qualifiers.json` needs both files, and every file needs an entry there.
- Each qualifier needs at least one free mock.
- To add a mock, add it to `qualifiers.json` and write both files. The pages, the sitemap and the Pro route pick it up from there.

Check them with `npm run validate:content` (or `node scripts/validate-content.mjs qualifier`).

All notes and questions are original. Don't paste official IITM lecture notes, assignments or previous-year papers into the content.

## Deploy

The site is a Next.js app, so Vercel needs it from Git (Vercel Drop only works for plain static files):

1. Push this folder to a GitHub repo.
2. In the Vercel project, click **Connect Git** and pick that repo. Framework preset: Next.js.
3. Pushes to `main` build **only when the commit message contains `[deploy]`** (`scripts/should-deploy.mjs`, run by `vercel.json`'s `ignoreCommand` and `netlify.toml`'s `ignore`). Other branches never build.

Why: every build renders ~1,500 pages, and every deploy writes them into a fresh cache. Building each of 87 commits in a month used up the Vercel Hobby limits (ISR writes) and paused the site. So batch work into ordinary commits, then release once:

```
git commit --allow-empty -m "release [deploy]"
git push
```

Keeping usage low, for anyone changing the code:
- Server code reads content through `lib/content.ts`, which parses each file once per server instance. Don't read content files directly in routes.
- Don't add polling without a stop condition (see `useWar` in `components/war.tsx`), and don't fetch on every page from the shell.
- Endpoints anyone can call without signing in go through `lib/server/rate-limit.ts`, and public GETs set `s-maxage` so the CDN answers them.
- New dynamic routes with `generateStaticParams` set `dynamicParams = false`.

Hosting note: Vercel's Hobby plan is for non-commercial use only, and taking payments counts as commercial. `netlify.toml` is ready for Netlify, whose free plan allows commercial sites (about 20 production deploys a month on its 300 credits).
