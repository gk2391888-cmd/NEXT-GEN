# NEXT GEN: developer onboarding guide

A walkthrough of the whole project for a developer taking it over: what it is, how it's built, every user flow, the UI conventions, and what to watch out for. Read the [README](README.md) for setup steps; this guide explains how the pieces fit together.

## 1. What the product is

NEXT GEN ("by THE TECH HUB") is a study site for **IIT Madras online BS students**. It isn't affiliated with IITM. Each student picks a programme (Data Science, Electronic Systems, Aeronautics, Management & Data Science) and sees its subjects; every subject has 12 weeks, and every week has:

- **Hinglish notes** (concept, solved example, common mistakes, quick revision)
- **6 MCQs** per week (15 in the Data Science Foundation subjects, 1,440 in total, at least 5 each at Easy, Medium and Hard), in English and Hinglish

It also has a **Qualifier Prep** section for people preparing for the IITM BS qualifier exam, who aren't students yet.

Around that content it adds mock tests, a Python coding lab, an AI doubt solver, spaced-repetition revision, an exam planner, progress tracking, and a paid **Pro** plan (₹99 for 30 days, with a 7-day free trial once per person). Without an active trial or Pro, only the Overview, Qualifier Prep, week 1 of every subject and a few utility pages open; everything else shows a paywall.

It was built in 3 phases, one commit each:

1. Static content site
2. Accounts and cloud sync
3. Pro, AI, payments and admin

## 2. Tech stack

| Layer | What's used |
|---|---|
| Framework | **Next.js 16 App Router**, React 19, TypeScript. No other UI libraries. |
| Styling | Design tokens in [tokens/](tokens/README.md) (W3C DTCG JSON) → generated CSS variables → one stylesheet, [app/globals.css](app/globals.css). No Tailwind. |
| Content | JSON files in `content/`, read from disk **at build time** |
| Auth and database | **Supabase**: email magic link, OTP code or Google; Postgres with Row Level Security |
| AI | Vendor-neutral engine in `lib/server/ai/`. Features ask for a model **tier**; **Groq** (`openai/gpt-oss-120b`) serves it by default. Any OpenAI-compatible API can be swapped in by env var. See "AI features" in the README |
| Payments | **Razorpay** Checkout plus a webhook |
| Python in the browser | **Pyodide** inside a Web Worker |
| Hosting | **Vercel**. Every push to `main` deploys. |

There are only 4 runtime dependencies: `next`, `react`, `react-dom` and `@supabase/supabase-js`.

## 3. Folder structure

```
next-gen/
├── app/                      ← Routes (one folder = one URL)
│   ├── layout.tsx            ← Root: fonts + <AuthProvider> + <Shell>
│   ├── page.tsx              ← "/" Overview dashboard
│   ├── library/              ← /library, /library/[subject]/[week], /library/[subject]/formulas
│   ├── practice/             ← /practice, /practice/[subject]/[week]
│   ├── tests/                ← /tests, /tests/[subject]/[test]
│   ├── mistakes/  planner/  progress/  search/  doubts/
│   ├── lab/                  ← /lab, /lab/[id], /lab/oppe/[set]  (Coding Lab, timed OPPE exam)
│   ├── qualifier/            ← /qualifier, /qualifier/[id], /qualifier/[id]/plan, /qualifier/[id]/mock/[mock]
│   ├── login/  profile/  pricing/  admin/  privacy/  terms/
│   ├── api/                  ← Server-only endpoints
│   │   ├── ai/[feature]/route.ts      → every AI feature (POST /api/ai/doubt)
│   │   ├── pro/week/[subject]/[week]/route.ts → a week's notes + questions (week 1 open, others trial/Pro)
│   │   ├── pro/formulas/[subject]/route.ts, pro/search/route.ts, pro/questions/route.ts → formula sheet, search text, every question (trial/Pro)
│   │   ├── pro/coding/[id]/route.ts   → a Coding Lab problem; ?part=answers adds hidden tests + solution (trial/Pro)
│   │   ├── pro/tests/[subject]/[test]/route.ts → a mock test's question pool (trial/Pro)
│   │   ├── trial/start/route.ts       → claims the free trial once per person (claim_trial(), migration 0009)
│   │   ├── pro/qualifier/[mock]/route.ts → a Pro qualifier mock's questions (Pro only)
│   │   ├── content/qualifier/[mock]/route.ts → a free qualifier mock's questions (static, for the doubt solver)
│   │   └── payments/{config,order,verify,webhook,upi,upi/review}/route.ts
│   ├── manifest.ts           ← PWA "Add to home screen"
│   ├── tokens.css            ← Generated CSS variables (from tokens/, don't edit)
│   └── globals.css           ← All styles, built only from tokens
├── components/               ← UI (almost all 'use client')
│   ├── shell.tsx             ← Sidebar + topbar + footer
│   ├── ui.tsx                ← Small shared pieces: InlineText, PageHead, ProgressBar…
│   ├── auth/                 ← AuthProvider, LoginForm, AccountMenu, ImportPrompt, ProfileForm
│   ├── quiz/                 ← Practice session, mock test runner, question view, report button
│   ├── library/  coding/  admin/  qualifier/
│   └── dashboard.tsx, doubt-chat.tsx, exam-planner.tsx, mistakes-view.tsx, pricing-plans.tsx, pro-lock.tsx…
├── lib/                      ← Logic, no UI
│   ├── content.ts            ← Reads content/*.json (server-only)
│   ├── progress/             ← ★ Local progress store, types, insights, spaced repetition
│   ├── sync.ts               ← ★ Uploads and downloads progress to and from Supabase
│   ├── plans.ts  plan.ts     ← guest / free / trial / pro logic + PRICING (shared) · usePlan(), useStudyAccess() hooks
│   ├── access.ts             ← isOpenPath(): the pages open without a plan (shared)
│   ├── trial.ts  disposable-email.ts ← claiming the free trial (browser) · throwaway-inbox list (shared)
│   ├── ai/                   ← ★ AI features + Free/Pro limits (features.ts), askAi() (client.ts)
│   ├── levels.ts  practice-level.ts  ← Easy / Medium / Hard / Mixed (shared) · the practice level picked (browser)
│   ├── tests.ts  planner.ts  coding.ts  overrides.ts  question-bank.ts  python-runner.ts
│   ├── qualifier.ts          ← Qualifier config: exam date, pass rules, sources (shared); qualifier-content.ts reads the mocks (server), qualifier-plan.ts builds the study plan
│   ├── supabase/client.ts    ← Browser Supabase client + authedFetch()
│   ├── pro-content.ts        ← fetchProContent() / useProContent(): the browser side of /api/pro/*
│   └── server/               ← Server-only: ai/ (AI engine: providers, models, quota, handler, features/), razorpay.ts, upi.ts, pro.ts (adds 30 days), pro-access.ts (requirePro), supabase.ts (service role)
├── content/                  ← ★ All study material
│   ├── programmes.json       ← Programme → levels → subject ids, plus per-programme course codes
│   ├── subjects.json         ← Every subject once (id, code, name, icon, status); colours live in tokens
│   ├── weeks/<subject>.json  ← 12 weeks of notes + 6 questions per week; 15 (5+ per level) in Data Science Foundation (Hinglish)
│   ├── weeks-en/<subject>.json ← English text of every question, by id
│   ├── coding/problems.json  ← 42 problems (30 practice + 12 OPPE in 3 sets)
│   ├── qualifier/            ← qualifiers.json (qualifiers + their mocks), mocks/<mock>.json (Hinglish), mocks-en/<mock>.json (English)
│   ├── lab.json  faqs.json   ← "Predict the output" cards, quick concept answers
├── tokens/                   ← ★ Design tokens (DTCG JSON): primitive / semantic / component
├── supabase/migrations/      ← 0001 → 0009, run by hand in the Supabase SQL editor
├── scripts/
│   ├── validate-content.mjs  ← Runs before every build, so broken content never ships
│   ├── build-tokens.mjs      ← tokens/*.json → app/tokens.css + lib/tokens.ts
│   └── lint-tokens.mjs       ← Rejects raw colours/sizes; checks contrast
├── public/pyodide-worker.js  ← Python sandbox worker
├── design/                   ← HTML mockups for each phase (reference only)
└── legacy/                   ← The original single-file prototype (reference only)
```

## 4. Architecture: the 5 ideas that explain everything

**A. Content is static and built at deploy time.**

- Pages like `/library/math1/3` are pre-rendered with `generateStaticParams`, using data read by [lib/content.ts](lib/content.ts).
- Changing content means editing JSON and redeploying.
- The one exception is **admin corrections** (see Admin below).

**B. Progress is local-first.** This is the heart of the app: [lib/progress/store.ts](lib/progress/store.ts).

- Every action (answer a question, finish a week, submit a test) changes a state object in **localStorage** straight away. That keeps the UI instant and lets it work offline.
- Each change is a `SyncOp` (see [lib/progress/types.ts](lib/progress/types.ts)) applied by the pure reducer `applyOp()`.
- Guests use the key `nextgen-progress-v2`. Logged-in users get a separate copy per user, `nextgen-progress-v2:<userId>`.
- Components read the store with `useProgress()`, which is built on `useSyncExternalStore`.

**C. Sync runs quietly in the background** ([lib/sync.ts](lib/sync.ts) and [components/auth/auth-provider.tsx](components/auth/auth-provider.tsx)).

- For logged-in users, each op is also added to a `pending` queue.
- 1.5 s after the last change, `sync()` **flushes** the queue to the Supabase tables.
- On login, when the tab regains focus, or when the network comes back, it **pulls** everything from the server. `replaceFromServer()` then replays any ops not yet uploaded on top.
- Answer IDs are generated on the device, so retrying an upload never creates duplicates.
- The topbar chip shows the state: "Saving… / ✓ Synced / Offline".

**D. The database enforces security, not the app.**

- Every table has Row Level Security, so a student can only ever see their own rows.
- Students **can't edit their plan dates**: column-level grants in migration 0002 block it. The free trial is granted only by `claim_trial()` (migration 0009), called with the service role by `/api/trial/start`, once per person.
- AI limits are counted atomically by the SQL function `consume_ai_quota()`. Only the server can call it, using the limits in `lib/ai/features.ts`.
- Only server routes that hold `SUPABASE_SERVICE_ROLE_KEY` can grant Pro.
- Paid **content** (notes and questions after week 1, mock tests, Coding Lab problems, the question bank) is only sent by `/api/pro/*`, after `requirePro()` ([lib/server/pro-access.ts](lib/server/pro-access.ts)) has checked the access token and asked `public.is_pro()` as that student (admins pass too). The plan in localStorage only decides what the UI shows.

**E. The student's choice filters what they see, not which pages exist.**

- `content/programmes.json` maps programme → levels → subject ids. Subjects are shared by id (English I/II are in Data Science and Electronic Systems), so progress never depends on the programme.
- Each student chooses a level (`ds/foundation`, `es/foundation`, `ds/diploma-programming`, …) or a qualifier (`qualifier/ds`, `qualifier/es`), asked once by [programme-prompt.tsx](components/programme-prompt.tsx) after sign-up. A qualifier choice's "level" is its four courses from `content/qualifier/qualifiers.json` (each section's `subjectId`), and only weeks 1–4 (`choice.weeks`).
- Pages are still pre-rendered for every subject. Components that list subjects call `useChoiceSubjects(subjects)` ([lib/programme-choice.ts](lib/programme-choice.ts)) to show only the chosen level's, with its programme's course codes; components that list weeks use `useChoiceCatalog(catalog)`; anything that counts answers, mistakes or tests filters with `useInChoice()`.
- Sidebar tools that only some choices have (Qualifier Prep, Mock Tests, Coding Lab, Exam Planner, Grade Calculator) follow `choiceHas(choice, tool)` in [lib/programmes.ts](lib/programmes.ts). A page outside the choice still opens, under a notice from [choice-notice.tsx](components/choice-notice.tsx) that offers to switch. The full table of what each choice shows, and the reason for each rule, is in the README's Programmes section.
- The choice is a `programme:<choice>` entry in the profile's `subjects` for logged-in students (anything reading `subjects` as subject ids goes through `termSubjects()`), and localStorage `nextgen-programme` for guests. Default: Data Science Foundation.

```
Browser ──(publishable key + RLS)──► Supabase  (profiles, answers, test_attempts, coding_attempts, week_status,
   │                                            reports, content_overrides, announcements, ai_usage, payments, admins)
   └──► /api/ai/<feature> ──► Groq   (sign-in → plan → limits → quota → model, with fallbacks)
   └──► /api/payments/* ──► Razorpay (service role grants +30 days pro_until)
```

### Database tables

| Table | Holds | Who writes it |
|---|---|---|
| `profiles` | Name, subjects, last visited, exam target, `trial_ends_at`, `pro_until` | Student (limited columns); trigger on sign-up; server for `trial_ends_at` (`claim_trial()`) and `pro_until` |
| `trial_claims` | One row per free-trial claim: SHA-256 of the normalised email, device IDs, keyed hash of the IP, granted or why not. Kept when the account is deleted (migration 0009) | Server (service role) only |
| `answers` | One row per answered question (practice or test) | Student |
| `test_attempts` | Submitted mock tests, responses, time per question | Student |
| `coding_attempts` | Submitted timed OPPE simulations: set, score out of 100, per-problem public/hidden tests passed, time and code (migration 0007) | Student |
| `week_status` | Done / saved flags per week | Student |
| `reports` | "Report a problem" submissions | Student inserts; admin updates status |
| `content_overrides` | Admin corrections to questions (`q:<id>` → patch) | Admin; everyone reads |
| `announcements` | Banners on the Overview page | Admin; everyone reads active ones |
| `ai_usage` | AI requests per student, per feature, per day (India time), plus tokens used | Server only, via `consume_ai_quota()` / `finish_ai_request()` |
| `payments` | Razorpay orders and their status | Server (service role) only |
| `note_files` | PDF notes uploaded by admins: subject, week (null = whole subject), title, Storage path, Pro only | Everyone reads the list; admins write. The files themselves are in the private `notes` bucket. |
| `upi_requests` | UPI QR payments: UTR, amount, pending / approved / rejected | Server (service role) only; students read their own, admins read all |
| `admins` | Who can open `/admin` | Added by hand in SQL |

## 5. Who the users are

| Tier | How they get it | What they can do |
|---|---|---|
| **Guest** | Not logged in | The open pages only: Overview, Qualifier Prep (with its free mocks), week 1 of every subject (notes and practice), the subject and week lists, grade calculator, pricing, legal pages. Progress stays on this device. |
| **Free** (shown as "trial ended") | Logged in, trial or Pro over, or no trial given | The same open pages, plus their profile. Every other page shows the paywall. Their progress stays in the account. |
| **Trial** | 7 days, claimed once per person after the first login (`trial_ends_at`) | Everything, same as Pro |
| **Pro** | Paid (`pro_until` is in the future) | Everything: all notes and practice, mock tests, Coding Lab and the timed OPPE simulation, 200 doubts a day, time per question, Save as PDF |
| **Admin** | A row in `public.admins`, added by hand in SQL | Everything, whatever their own plan, plus the `/admin` panel |

The tier is calculated in [lib/plan.ts](lib/plan.ts) (`planFrom`), and `useStudyAccess()` turns it into `checking / guest / starting / locked / open`.

**Which pages need a plan.** `isOpenPath()` in [lib/access.ts](lib/access.ts) lists the open pages. [components/shell.tsx](components/shell.tsx) wraps every page in `<AccessGate>` ([access-gate.tsx](components/access-gate.tsx)), which shows [`<Paywall>`](components/paywall.tsx) on any other page unless access is `open`:
- guests get the sign-up screen (trial, then ₹99 for 30 days, and a link to the free week 1);
- `starting` (a new account claiming its trial) shows "Setting up your free trial…";
- `locked` says why (trial ended, Pro ended, or no trial on this account and the reason), that their progress is saved, and has the Razorpay / UPI buttons from `useProCheckout()` ([pro-checkout.tsx](components/pro-checkout.tsx), shared with `/pricing`).
Inside open pages, single Pro items (a Pro qualifier mock) still use `<ProLock>`.

**The free trial, once per person.** New accounts start with `trial_ends_at` null (migration 0009). Once the account has loaded, [auth-provider.tsx](components/auth/auth-provider.tsx) calls `claimTrial()` ([lib/trial.ts](lib/trial.ts)) → `POST /api/trial/start` → `claim_trial()` in the database, which grants 7 days unless the email is a throwaway inbox ([lib/disposable-email.ts](lib/disposable-email.ts), also refused by the login form), the same email already had one (lower-cased, `+tag` dropped, Gmail dots dropped), this browser already had one (device ID in localStorage `nextgen-device-id` and the httpOnly cookie `ng_device`), or 3 trials already started from this IP in 24 hours. No trial still sets `trial_ends_at` to now, so the check runs once. Accounts that already had their turn call it once per device too, which records the device. The reason is kept in localStorage (`nextgen-trial-result:<uid>`) for the paywall's wording.

`<AccessGate>` and `<ProLock>` only decide what the UI shows, from the plan in localStorage, which a student can edit. So anything worth paying for is also checked on the server:

| Paid content | Where it's enforced |
|---|---|
| Notes and practice questions, weeks 2–12 | Server: `/api/pro/week/<subject>/<week>`. The page has only the title and summary; week 1 is in the page as the free preview. |
| Formula sheets, search, the question bank (My Mistakes, search, AI, admin) | Server: `/api/pro/formulas/<subject>`, `/api/pro/search`, `/api/pro/questions` |
| Quiz 1, Quiz 2 and End term mock tests | Server: `/api/pro/tests/<subject>/<test>`. The page has no questions. |
| Coding Lab practice problems | Server: `/api/pro/coding/<id>`, the same as OPPE problems below. |
| OPPE coding sets | Server: `/api/pro/coding/<id>`. The page only has the title; statement and visible tests come from the route, hidden tests and solution only on Submit or "Show model solution" (`?part=answers`). |
| Timed OPPE sets | Server: `/api/pro/oppe/<set>`. The page only has the set's id, title and time limit; problems come from the route with hidden tests blanked, and `?part=answers` (every problem's tests and solution) is fetched on Submit and for the score report. |
| Qualifier mock 2 (DS, ES) | Server: `/api/pro/qualifier/<mock>`. The page has only the question count. |
| AI Doubt Solver (trial, Pro and admins only; 200 a day) | Server: `lib/server/ai/handler.ts` |
| Pro-only PDF notes | Storage policies (migration 0006) |
| Time per question, Save as PDF | UI only, on purpose: one shows the student's own timings, the other is the browser's print dialog. Nothing to protect. |
| "Predict the output" cards (`/lab`), doubt-solver FAQs, the subject and week lists | UI only, on purpose: small, or titles only. |

To add Pro content: put it behind a route under `app/api/pro/` that starts with `const denied = await requirePro(req); if (denied) return denied;`, fetch it with `useProContent()` inside a `<ProLock>`, and never pass it as a prop from a server page (props end up in the page's HTML).

## 6. Every user flow, page by page

**Layout everywhere** ([components/shell.tsx](components/shell.tsx)):

- **Left sidebar** with the "Preparing for" switch and up to 11 nav items, plus Admin for admins. Which items show depends on the choice (`choiceHas()`): Qualifier Prep only for qualifier students; Mock Tests, Exam Planner and Grade Calculator only for admitted students; Coding Lab only for the Data Science programme (Foundation and Diplomas). Before a visitor chooses, all of them show.
- **Notice above the page** ([choice-notice.tsx](components/choice-notice.tsx)) when the page isn't part of the choice, with "Switch to …" and a way back.
- **Bottom of the sidebar:** a "Start your 7-day free trial" card (guests) or a "Get Pro for ₹99" card (logged in without a plan).
- **The page itself** goes through `<AccessGate>`: pages outside `isOpenPath()` show the paywall without an active trial or Pro (see §5).
- **Topbar:** breadcrumb, and an account menu showing the sync chip, plan chip, avatar, Profile, Progress, Billing and Logout.
- On mobile the sidebar becomes a ☰ drawer.
- `/login` is the only full-screen page, without this layout.

### First visit → Overview (`/`)

[components/dashboard.tsx](components/dashboard.tsx) shows, from top to bottom:

- Announcements posted by admins
- A hero with **"Continue {subject} week N"**, using `lastVisited` when that week is part of the choice; qualifier students get "Take a qualifier mock" instead of "Take a mock test"
- 4 metrics: weeks done, questions attempted, accuracy, streak, counting only the choice's subjects (and a qualifier's weeks 1–4)
- Subject cards, with your profile's subjects sorted first
- "Topics to revisit": weeks with at least 3 attempts and under 60% accuracy
- Quick actions: mistakes due, exam plan, ask a doubt, practice

### Login (`/login?next=...`)

[components/auth/login-form.tsx](components/auth/login-form.tsx):

1. You enter an email. Supabase sends a **magic link**, and a 6-digit code too once the email template includes `{{ .Token }}`.
2. Step 2 tells you to click the link **or** type the code. A resend button unlocks after 60 s.
3. A Google button appears automatically if Google is switched on in Supabase.
4. There's no separate sign-up. The first login creates the account, and a database trigger creates the `profiles` row. The 7-day trial is then claimed by the app (`/api/trial/start`, once per person; see §5). Throwaway email addresses are refused here (`isDisposableEmail()`).
5. After login you're sent back to `next`. Only same-site paths are allowed, which blocks open redirects.
6. **Guest import:** if this device has progress from before logging in, a modal offers "Save to my account" or "Start fresh" ([import-prompt.tsx](components/auth/import-prompt.tsx)).

### Study: Library → Week notes

1. `/library` shows a card per subject with progress, a **"Next: Week N"** button and a formula-sheet link.
2. `/library/[subject]` just redirects to week 1.
3. The **week page** has a week list on the left (✓ for finished weeks) and 4 numbered sections of notes.
   - At the top: **Save as PDF** (Pro) and **☆ Revise later** (adds the week to the saved list).
   - At the bottom: **Mark as done**, **Practice week N →**, and previous/next week links.
   - Opening the page records `lastVisited`.
4. `/library/[subject]/formulas` puts every week's revision points on one printable page.
5. `/search` is a client-side keyword search across the chosen programme's weeks, plus matching practice questions (loaded from `/api/content/questions` once you type). The `?q=` parameter in the URL stays in sync.

### Practice (`/practice` → `/practice/[subject]/[week]`)

1. The picker shows a subject dropdown, the **level** switch and a table of weeks with your accuracy for each.
   - Levels ([level-switch.tsx](components/quiz/level-switch.tsx), helpers in [lib/levels.ts](lib/levels.ts)): **Easy**, **Medium**, **Hard** or **Mixed** (every question of the week, easy first). Each button shows how many questions that level has (the subject's total on the picker, the week's in a session), and only levels with questions are offered; a level the week has none of falls back to Mixed.
   - The choice is kept in localStorage (`nextgen-practice-level`, [lib/practice-level.ts](lib/practice-level.ts)), Mixed by default, per device like the question language.
   - `getWeekRefs()` sends each week's count per level (`WeekRef.levels`), so the picker doesn't need the questions.
2. Each session goes through the chosen level's questions one at a time (15 for Mixed, 5 or more for one level). Changing the level, in the session or on its result screen, starts again at that level:
   - pick an option → **Check answer** → green/red feedback and the explanation → Next
   - an **English / Hinglish** switch at the top changes the question, options and explanation (see "Question language" below)
   - each answer is recorded as `mode: 'practice'`
3. Every explanation has **"✦ Explain more with AI"** (opens `/doubts?question=<id>` with the question attached) and **"⚑ Report a problem"** (writes to the `reports` table and needs login).
4. The result screen shows your score and a review of every question.

### Question language (English / Hinglish)

- Questions are written in Hinglish in `content/weeks/<subject>.json`; their English text lives in `content/weeks-en/<subject>.json`, keyed by question id. `getWeeks()` in [lib/content.ts](lib/content.ts) merges it in as `question.en`, so every page and API route that sends questions sends both languages.
- The switch ([language-switch.tsx](components/quiz/language-switch.tsx)) is on practice, mock tests (intro, running test, answer review), My Mistakes, search and the admin editor. The choice is kept in localStorage (`nextgen-question-lang`, [lib/question-lang.ts](lib/question-lang.ts)), English by default. It's per device, not saved to the profile, so it isn't synced between devices.
- `useCorrectedQuestions()` applies admin corrections and then the chosen language ([lib/question-text.ts](lib/question-text.ts): `applyPatch`, `localize`). A correction in `content_overrides` keeps the Hinglish at the top level and the English under `en`; older corrections without `en` still work and leave the English as built.
- The AI doubt solver gets `lang` with the question id. The server reads the question in that language (with any correction) and, for English, asks the model to answer in English.
- Notes (concepts, example, mistakes, revision) are still Hinglish only.

### My Mistakes (`/mistakes`)

- Spaced repetition calculated from your answer history ([lib/progress/mistakes.ts](lib/progress/mistakes.ts)).
- A wrong answer is due **straight away**. After one correct answer it comes back in **3 days**, after two in **7 days**, and three correct in a row clears it.
- The page lists due mistakes grouped by subject and week, with "Revise" or "Revise all". On the right is a "Coming up" list with due dates.
- Only mistakes from the choice's subjects (and a qualifier's weeks 1–4) are listed. The others aren't lost: they come back when the student switches back.
- Questions are loaded from `/api/content/questions`.

### Mock tests (`/tests` → `/tests/[subject]/[test]`)

- There are 3 tests per subject ([lib/tests.ts](lib/tests.ts)):
  - **Quiz 1**: weeks 1–4, 15 questions, 25 min
  - **Quiz 2**: weeks 5–8, 15 questions, 25 min
  - **End term**: all weeks, 30 questions, 60 min, **Pro**. Its question pool comes from `/api/pro/tests/<subject>/end-term` ([pro-test-runner.tsx](components/quiz/pro-test-runner.tsx)), not from the page.
- Questions are picked spread evenly across the weeks (`pickQuestions()` in [lib/tests.ts](lib/tests.ts)).
  - By default a test is a balanced mix, `testMix()`: about 30% easy, 40% medium, 30% hard (Quiz: 4 / 7 / 4, End term: 9 / 12 / 9). Each week in turn gives the level the test still needs most of, so weeks and levels both come out even.
  - On the intro screen a student can pick **Easy**, **Medium** or **Hard** only instead. A level is offered only when the pool has a whole test's worth of it. The choice isn't remembered: every test starts as Mixed. Sectioned (qualifier) mocks have no level choice.
  - The level isn't stored with the attempt (no migration). The previous-attempts table works it out from the questions and shows a chip when they're all one level.
  - End-term pools still come from `/api/pro/tests/...` with every level; the level is applied in the browser.
- [test-runner.tsx](components/quiz/test-runner.tsx) has 3 screens:
  1. **Intro:** the rules and your previous attempts.
  2. **Running:**
     - a timer that turns red under 5 minutes
     - a question palette (answered / marked / unanswered)
     - Previous, Clear, Mark for review, Save & next, Submit
     - The test is saved to the `active` state on every click, so a **refresh resumes the test**.
     - It submits automatically when time runs out.
  3. **Result:**
     - Score, accuracy, time taken and the weakest week.
     - Week-by-week bars, with a "Revise week N" button.
     - Time per question (Pro).
     - Answer review with All / Wrong / Skipped filters.

### Qualifier Prep (`/qualifier`)

This section is for people preparing for the IITM BS qualifier exam, so it works logged out. It's also a way into sign-up.

**What's covered.** Everything is set in `content/qualifier/qualifiers.json` and typed in [lib/qualifier.ts](lib/qualifier.ts). There are two qualifiers:
- **Data Science**: Maths I, Stats I, CT and English I. The Management and Data Science programme uses the same four courses.
- **Electronic Systems**: English I, Math for Electronics I, Electronic Systems Thinking and Circuits, and Intro to C. Aeronautics and Space Technology uses the same four.

Each section is one course. A section with a `subjectId` links to that subject's week 1–4 notes and practice; every DS and ES section has one (ES: eng1, mfe1, estc, cprog), and it decides which subjects a qualifier choice shows.

**Pages:**
- `/qualifier` is the landing page. It has the countdown hero ([countdown.tsx](components/qualifier/countdown.tsx)), one card per qualifier, and the process and rules ([facts.tsx](components/qualifier/facts.tsx)).
- `/qualifier/[id]` shows the countdown, the 4 courses with week links, the mocks ([mock-list.tsx](components/qualifier/mock-list.tsx)) and the rules. Its `#rules` anchor is linked from the mock result.
- `/qualifier/[id]/plan` is [study-plan.tsx](components/qualifier/study-plan.tsx) using `buildQualifierPlan()` ([lib/qualifier-plan.ts](lib/qualifier-plan.ts)). It's computed in the browser, since the page is static.
  - Weeks 1–4 of every course are interleaved, week 1 of every course first, and spread evenly over the days left.
  - The mocks go 4 and 2 days before the exam, each followed by a review of wrong answers.
  - The last day is light revision.
  - A DS week marked done on its notes page drops out of the plan.
- `/qualifier/[id]/mock/[mock]` is [mock-runner.tsx](components/qualifier/mock-runner.tsx), which reuses `TestRunner`.
  - It passes `sections`, so each question's `week` is its section number. The palette, labels and result are then per course.
  - It passes `rules` for the intro screen.
  - It passes `resultExtra`, which checks the score against the published General pass rule: 40% in each course and 50% on average.
  - Free mocks get their questions as props; Pro mocks fetch them from `/api/pro/qualifier/<mock>` inside `<ProLock>`.

**Where attempts go.** Attempts are normal `TestAttempt`s with `subjectId: 'qualifier'` and `testId` = the mock id. They sync to `test_attempts` with no migration (both ids fit its 20-character limits), and My Progress links them back to the mock. A sectioned test records no `answers`, so qualifier questions stay out of My Mistakes and weak weeks.

**Exam date.** `QUALIFIER_EXAM_DATE` (currently 2026-11-15) is the single value behind the countdown and the plan, and every page tells students to confirm their own date.
- This date was not on the official pages when they were checked on 4 Nov 2026. Those list the January 2027 term instead: apply by 29 Jan 2027, exam 14 Mar 2027 on the ES/AE/MG pages.
- Recheck the date each term, along with `PASS_RULES`, `COURSE_LIMITS`, `QUALIFIER_FACTS_CHECKED` and `QUALIFIER_SOURCES`.
- Question types, negative marking and per-course question counts aren't published, so the pages don't state them.

**Doubt solver.** "Ask AI" works on qualifier questions:
- `doubt-chat.tsx` falls back to `findQualifierQuestion()` ([lib/qualifier-questions.ts](lib/qualifier-questions.ts)), which reads free mocks from `/api/content/qualifier/<mock>` and Pro ones from the Pro route.
- On the server, `doubt.ts` uses `getQualifierQuestion(id, isPro)`. Feature handlers now get `isPro` in their context, so a Free student can't get a Pro mock's question by guessing its id.

### Coding Lab (`/lab` → `/lab/[id]`)

1. The list shows 30 practice problems (free) and 3 OPPE sets of 4 problems each (Pro). Each set has **Take timed exam** (below) and an untimed practice link. Below it are "Predict the output" cards with a reveal button.
2. The workspace ([components/coding/workspace.tsx](components/coding/workspace.tsx)) has a textarea editor: Tab inserts 4 spaces, Ctrl+Enter runs the code, and drafts are saved in localStorage.
   - **Run** checks your code against the visible tests.
   - **Submit** checks against all tests, including the hidden ones.
   - There's also a hint, the model solution, and previous/next links.
   - OPPE problems go through [pro-workspace.tsx](components/coding/pro-workspace.tsx): the statement, starter code, hint and visible tests come from `/api/pro/coding/<id>` (hidden tests arrive blanked out, so they can be counted). The first Submit or "Show model solution" fetches `?part=answers` with the real hidden tests and the solution.
   - Grading still runs in the browser (Pyodide), so a Pro student can see the hidden tests in the network tab once they've submitted. Grading on the server would keep them secret even then, but it needs a sandboxed Python runner on the server (Pyodide in a Vercel function: ~10 MB, a few seconds of cold start, plus a time limit per run). Not worth it while the tests are practice, not an exam.
3. Python runs in [public/pyodide-worker.js](public/pyodide-worker.js) and is killed after 8 s if it doesn't finish ([lib/python-runner.ts](lib/python-runner.ts)). Each test compares `repr(eval(call))` with the expected value.

### Timed OPPE simulation (`/lab/oppe/[set]`, Pro)

[pro-oppe-exam.tsx](components/coding/pro-oppe-exam.tsx) loads the set from `/api/pro/oppe/<set>`, then [oppe-exam.tsx](components/coding/oppe-exam.tsx) follows the mock test runner's pattern, with 3 screens. Scoring helpers live in [lib/coding-score.ts](lib/coding-score.ts), since `lib/coding.ts` is server-only.

1. **Start:** the rules and previous attempts. Python starts downloading here, so the clock doesn't run on a loading screen.
2. **Running:**
   - a countdown from the set's `minutes` (`OPPE_SETS` in [lib/coding.ts](lib/coding.ts), 60 by default) that turns red under 5 minutes
   - a problem palette (started / not started), Previous / Next, and **Run public tests**. No hints or solutions.
   - The exam (`activeExams` in the progress store: problems, current one, end time, time per problem) is device-only, like an active mock test, so a **refresh resumes it**. The code is kept in separate localStorage keys (`nextgen-oppe-code:<set>:<problem>`) so typing doesn't rewrite the whole store, and it's separate from the practice drafts.
   - **Submit all**, or the timer reaching zero, grades every problem against all its tests (public and hidden) in Pyodide. If Python can't load (offline), nothing is submitted: the exam stays open with a "try grading again" button.
3. **Score report:** score out of 100 (each problem carries equal marks, split by the share of its tests passed: `examScore()`), problems fully solved, public and hidden tests passed and time spent per problem, then each problem's code next to the model solution, with **Retry this set**.

Attempts are a `coding` `SyncOp` and sync to `coding_attempts` (migration 0007) the same way mock tests sync to `test_attempts`. If that table doesn't exist yet, `sync.ts` skips the upload and keeps the device's copy instead of blocking the queue. Fully solved problems are also marked solved in the Coding Lab list.

### AI Doubt Solver (`/doubts`)

1. You must be logged in. A chip shows "X of 5 doubts left today" (200 on Pro). All the numbers come from [lib/ai/features.ts](lib/ai/features.ts).
2. The chat ([components/doubt-chat.tsx](components/doubt-chat.tsx)) calls `askAi('doubt', { messages, questionId })`. It sends the question's id only; the server looks up the question text itself, so the browser can't inject a prompt.
3. [lib/server/ai/handler.ts](lib/server/ai/handler.ts) runs the request:
   - checks sign-in and the plan, and applies that plan's limits (history length, input size, answer length)
   - takes one request from the daily quota, or returns 429 for the daily limit or the cooldown
   - asks the `smart` tier's model, with fallbacks
   - records the tokens used, and gives the request back if the AI failed

   The tutor prompt (Hinglish, step by step, no exam cheating) is in [lib/server/ai/features/doubt.ts](lib/server/ai/features/doubt.ts).
4. The answer is drawn with [rich-text.tsx](components/rich-text.tsx), a small safe markdown renderer that never inserts HTML.
5. Below the chat is a static FAQ search ([doubt-search.tsx](components/doubt-search.tsx)). Each entry in `content/faqs.json` has a `subject`, and only the choice's subjects are shown; with none, the section is hidden.

### Exam Planner (`/planner`)

- You pick an exam (Quiz 1, Quiz 2 or End term) and a date.
- [lib/planner.ts](lib/planner.ts) spreads the weeks you haven't finished over the days left:
  - subjects are interleaved
  - every 3rd day includes a "Revise mistakes" slot
  - the last 2 days are for mock tests
- Marking a week done rebalances the plan.

### My Progress (`/progress`)

- Totals, a performance table per subject, weak weeks, mock test history and weeks saved for revision, all for the choice only. A qualifier student's history shows their own qualifier's mocks.
- **Reset my progress** wipes it, from the server too if you're logged in.

### Profile (`/profile`)

- Name, programme (same as the sidebar switch), your subjects this term from that programme (these sort first everywhere), and **Delete account**: you type DELETE, it calls the `delete_my_account()` RPC, and rows cascade away.

### Grade Calculator (`/grades`)

- [components/grade-calculator.tsx](components/grade-calculator.tsx) with the maths in [lib/grades.ts](lib/grades.ts): the standard Foundation theory formula `T = 0.1·GAA + max(0.6·F + 0.2·max(Qz1, Qz2), 0.4·F + 0.2·Qz1 + 0.3·Qz2)`, and the lowest end-term score for each grade (S 90, A 80, B 70, C 60, D 50, E 40). Scores stay in localStorage. The page says that Python/OPPE courses use other formulas.

### Pro ending reminder

- [components/renew-banner.tsx](components/renew-banner.tsx), shown on every page except `/pricing`: paid Pro in its last 5 days, or a trial in its last 2. It says the study tools lock when it ends and the progress stays. "Later" hides it for the day.

### Pricing and payment (`/pricing`)

1. Free trial vs Pro cards ([components/pricing-plans.tsx](components/pricing-plans.tsx)), and what stays open without a plan. The Pro button comes from `useProCheckout()` ([pro-checkout.tsx](components/pro-checkout.tsx)), shared with the paywall, and changes with your state: Start trial / Get Pro / Keep Pro / Pro active / "launching soon" when neither Razorpay nor `UPI_ID` is set.
2. Payment flow:
   - `POST /api/payments/order` creates a Razorpay order plus a `payments` row with status `created`.
   - The Razorpay modal opens.
   - On success, `POST /api/payments/verify` checks the HMAC signature and calls `grantProForOrder()` ([lib/server/razorpay.ts](lib/server/razorpay.ts)). That claims the order once and adds 30 days to `pro_until`.
   - `/api/payments/webhook` does the same work as a backup if the tab closed. It's safe to run twice.
3. Pay by UPI QR ([components/upi-payment.tsx](components/upi-payment.tsx)), on when `UPI_ID` is set. With Razorpay off it's the only way to pay; with Razorpay on it's a "Pay by scanning a UPI QR instead" button.
   - The QR is a `upi://pay` link with the amount and a note `NEXTGEN <first 8 chars of the user id>`, so the admin can match the bank statement.
   - The student submits the 12-digit UTR. `POST /api/payments/upi` stores it in `upi_requests` as `pending` (UTR unique, at most 3 pending per student).
   - An admin approves or rejects it in **Admin → UPI payments**. `POST /api/payments/upi/review` checks `is_admin()`, claims the request once and calls `extendPro()` ([lib/server/pro.ts](lib/server/pro.ts)), the same 30 days Razorpay gives. A rejection's reason is shown to the student, who can submit again.
4. No auto-renewal: each payment adds 30 days.

### Admin (`/admin`)

Five tabs ([components/admin/](components/admin/admin-panel.tsx)):

- **Reports:** open reports grouped by question, with **Fix** and **Dismiss**.
- **Edit questions:** search by ID (for example `stat1-w3-q4`) or text in either language. Edit the text, options, answer and explanation, with a live preview. The English / Hinglish switch picks which language's text you're editing; both are saved together, and code and the correct option are shared.
  - Saves go to `content_overrides`, and students see them **without a redeploy** via `useCorrectedQuestions()` in [lib/overrides.ts](lib/overrides.ts).
  - **Revert to original** removes the correction.
- **PDF notes:** upload PDFs (up to 25 MB, several at once) for a subject and a week or "All weeks", optionally Pro only; open, switch free/Pro or delete them ([components/admin/note-uploads.tsx](components/admin/note-uploads.tsx)).
  - The browser uploads straight to the private Storage bucket `notes` (no API route, so Vercel's request size limit doesn't apply), then adds a `note_files` row. Storage policies in migration 0006 allow uploads and deletes for admins only.
  - Students see them on the Study Library page and on the matching week's notes ([components/library/note-files.tsx](components/library/note-files.tsx)). "Open PDF" is a plain link to a one-hour signed URL, so it works in in-app browsers that block popups. Free files open for everyone; Pro files only for trial, Pro and admin accounts.
- **Announcements:** create, hide or delete. They show on the Overview page.
- **UPI payments:** UPI QR payments waiting for a check, oldest first. Approve only after the UTR and amount show up in the bank or UPI app.

### Site-wide pages

- [app/not-found.tsx](app/not-found.tsx) and [app/error.tsx](app/error.tsx): friendly 404 and crash screens with links back to the Study Library.
- [app/sitemap.ts](app/sitemap.ts) lists the public pages, the qualifier pages and free mocks, and every week's notes and practice; [app/robots.ts](app/robots.ts) keeps `/admin`, `/profile`, `/login` and `/api/` out of search. Both, and the WhatsApp/Telegram link previews (Open Graph in [app/layout.tsx](app/layout.tsx)), use `SITE_URL` from [lib/site.ts](lib/site.ts).
- Sync skips a change the server rejects outright (bad data, a missing column) instead of retrying it forever, and downloads page by a unique order, so long histories don't repeat or drop rows ([lib/sync.ts](lib/sync.ts)).

## 7. UI/UX conventions

- **Design tokens:** every colour, space, size, radius, font size, shadow and breakpoint comes from [tokens/](tokens/README.md), written in the W3C DTCG format.
  - There are three tiers: **primitive → semantic → component**.
  - `npm run tokens` generates [app/tokens.css](app/tokens.css) (CSS variables) and [lib/tokens.ts](lib/tokens.ts) (types plus raw values).
  - `npm run lint:tokens`, which also runs inside `npm run build`, rejects raw colours, raw sizes, primitive tokens and hard-coded inline styles. It also checks WCAG AA contrast.
  - Read [tokens/README.md](tokens/README.md) before changing any styles.
- **Brand:** teal is the primary action colour, indigo the accent (selection, links, info). The sidebar is navy. Fonts are DM Sans for body text and Plus Jakarta Sans for headings.
- **Layout in JSX:** use the helper classes in `globals.css` (`mt-lg`, `flex-between`, `row-main`, `row-aside`, `card-loose`, …) instead of `style={{…}}`.
- **Breakpoints** are tokens: laptop 1100px, tablet 900px, phone 600px. There's a `@media print` block, and `.no-print` hides controls in PDFs. Tables with row actions use `.table-stack`, so they become stacked rows on phones.
- **Repeated patterns:**
  - `PageHead` (small kicker + title + description) on every page
  - `.card`, `.chip`, `.btn-primary/secondary/danger`
  - an empty state with an icon and a call to action
  - accuracy colours: green at 75% and above, amber at 50%+, red below
- **Copy:** the tone is friendly. Notes are Hinglish; questions are in English or Hinglish (the student's choice), and AI answers follow that choice. The UI chrome is English. Errors are rewritten into friendly messages (see `friendlyError` in the login form).
- **Accessibility:** radio roles on options, `aria-current` on nav links, `aria-live` in the chat, and Escape closes menus.

## 8. Run, configure, deploy

```bash
npm install
npm run dev               # http://localhost:3000
npm run validate:content  # check content JSON
npm run typecheck         # TypeScript check
npm run tokens            # rebuild CSS variables after editing tokens/*.json
npm run lint:tokens       # check styles only use design tokens
npm run dev:demo          # dev server on :3001 with dummy logged-in data (see below)
```

- **Demo mode (no real login needed):** `npm run dev:demo` starts a dev server on port 3001 where [lib/supabase/demo.ts](lib/supabase/demo.ts) replaces Supabase with dummy data kept in the browser. No requests go to the real database, and the AI and payment routes return canned replies.
  - Add `?demo=<persona>` to any URL to switch who you are:
    - `guest`: logged out: open pages only, the paywall elsewhere
    - `new`: just signed up, with progress on the device to import; claims its trial on first load (demo answer to `/api/trial/start`)
    - `free`: trial over: open pages only, the "trial ended" paywall elsewhere
    - `trial`: Pro trial, 4 days left
    - `pro`: paid Pro
    - `admin`: Pro plus the admin panel
  - On the login page, any email and any 6-digit code logs you in as a trial student.
  - `/api/pro/*` really runs in demo mode: `demoFetch` checks the demo profile's plan and, for trial/Pro personas, calls the route with an `x-demo-pro: 1` header that the route honours only when demo mode is on (never in production builds).
  - Demo mode only switches on when `NODE_ENV` isn't production and `NEXT_PUBLIC_DEMO_MODE=1`, so it's stripped from production builds.
- **Without any env vars the site still works.** It falls back to the production Supabase project (the publishable key is hard-coded in [lib/supabase/client.ts](lib/supabase/client.ts)). The AI shows "being set up" and payments show "launching soon".
- **Server env vars:** `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (needed for AI limits and payments), `RAZORPAY_KEY_ID/SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `UPI_ID` (pay by UPI QR), and optionally `UPI_PAYEE_NAME`, `AI_MODEL_SMART` / `AI_MODEL_FAST` and `PRO_PRICE_INR`. They're listed in the README, along with "AI features".
- **Database changes:** add a new `supabase/migrations/000N_*.sql` and run it by hand in the Supabase SQL editor. There's no migration CLI.
- **Making yourself an admin:** `insert into public.admins (user_id) values ('<your auth uid>');`
- **Deploy:** push to `main`; Vercel builds and deploys. The build runs the content validator first.

## 9. Things worth knowing

1. **Paid content comes from the server, and `<AccessGate>` / `<ProLock>` are only UI.**
   - Notes and questions after week 1, mock tests, Coding Lab problems and the question bank are served by `/api/pro/*` after a server-side plan check (see §5). Don't pass them as props from a server page: props are in the page's HTML. To add a page that needs a plan, leave it out of `isOpenPath()` and load its content from a route that calls `requirePro()`.
   - Week 1 of every subject is in the page on purpose (free preview, and what search engines index; the sitemap lists only open pages).
   - Hidden tests reach a Pro student's browser on Submit, since Pyodide grades in the browser (see Coding Lab above).
2. **Coding Lab "solved" status is device-only.** `markSolved` uses `commit`, not `dispatch`, so it never syncs to the account. Timed OPPE attempts do sync (`coding_attempts`).
3. **There are no automated tests and no ESLint setup.** The only safety nets are `validate:content` (which runs before every build) and `typecheck`.
4. **Email is a launch blocker.** Supabase's built-in mailer only sends a few emails an hour, so custom SMTP (for example Resend) needs to be set up before real traffic. The README covers it.
5. **Pricing has one source per number.** AI limits per plan live in `lib/ai/features.ts`, and the server enforces exactly those. The price shown in the UI is `PRICING` in `lib/plans.ts`, but the amount actually charged is `PRO_PRICE_INR` on the server, so change those two together. The old `consume_doubt()` (hard-coded 5/200) from 0002 is unused since 0004; migration 0008 drops it.
6. **Content rules** (enforced by the validator):
   - exactly 12 weeks per subject
   - at least 6 questions per week; in `LEVELLED_SUBJECTS` (the 8 Data Science Foundation subjects) at least 5 easy, 5 medium and 5 hard
   - new questions take the next free id in their week; existing ids never change (progress is stored by id)
   - 4 distinct options per question
   - an English version of every question in `content/weeks-en/<subject>.json`, with its options in the same order
   - question IDs like `math1-w3-q2` (qualifier mocks: `ds-1-math1-q3`, one section per course in the order of `qualifiers.json`, 5–25 questions each, at least one free mock per qualifier)
   - correct answers spread across A–D
   - only `**bold**` and `` `code` `` formatting
   - original material only, never official IITM notes or papers

## 10. Suggested reading order (about half a day)

1. [README.md](README.md)
2. [lib/progress/types.ts](lib/progress/types.ts) → [store.ts](lib/progress/store.ts) → [lib/sync.ts](lib/sync.ts) → [auth-provider.tsx](components/auth/auth-provider.tsx). This is the core data flow.
3. [supabase/migrations/](supabase/migrations/0001_student_accounts.sql), in order
4. [components/shell.tsx](components/shell.tsx) and [dashboard.tsx](components/dashboard.tsx)
5. Follow one feature end to end: the week page → practice session → test runner
6. [lib/ai/features.ts](lib/ai/features.ts) → [lib/server/ai/handler.ts](lib/server/ai/handler.ts) (the AI engine), then [lib/server/razorpay.ts](lib/server/razorpay.ts)

Then run `npm run dev` and click through each flow above, both as a guest and logged in.
