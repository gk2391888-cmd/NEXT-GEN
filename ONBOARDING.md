# NEXT GEN: developer onboarding guide

A walkthrough of the whole project for a developer taking it over: what it is, how it's built, every user flow, the UI conventions, and what to watch out for. Read the [README](README.md) for setup steps; this guide explains how the pieces fit together.

## 1. What the product is

NEXT GEN ("by THE TECH HUB") is a study site for **IIT Madras BS Foundation students**. It isn't affiliated with IITM. It covers 8 subjects × 12 weeks, and every week has:

- **Hinglish notes** (concept, solved example, common mistakes, quick revision)
- **6 MCQs** (576 in total)

Around that content it adds mock tests, a Python coding lab, an AI doubt solver, spaced-repetition revision, an exam planner, progress tracking, and a paid **Pro** plan (₹99 for 30 days, with a 7-day free trial when you sign up).

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
| AI | Google **Gemini** (`gemini-2.5-flash`), called from a server route |
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
│   ├── lab/                  ← /lab, /lab/[id]  (Coding Lab)
│   ├── login/  profile/  pricing/  admin/  privacy/  terms/
│   ├── api/                  ← Server-only endpoints
│   │   ├── doubt/route.ts             → AI answer (Gemini)
│   │   ├── content/questions/route.ts → every question as JSON (static)
│   │   └── payments/{config,order,verify,webhook}/route.ts
│   ├── manifest.ts           ← PWA "Add to home screen"
│   ├── tokens.css            ← Generated CSS variables (from tokens/, don't edit)
│   └── globals.css           ← All styles, built only from tokens
├── components/               ← UI (almost all 'use client')
│   ├── shell.tsx             ← Sidebar + topbar + footer
│   ├── ui.tsx                ← Small shared pieces: InlineText, PageHead, ProgressBar…
│   ├── auth/                 ← AuthProvider, LoginForm, AccountMenu, ImportPrompt, ProfileForm
│   ├── quiz/                 ← Practice session, mock test runner, question view, report button
│   ├── library/  coding/  admin/
│   └── dashboard.tsx, doubt-chat.tsx, exam-planner.tsx, mistakes-view.tsx, pricing-plans.tsx, pro-lock.tsx…
├── lib/                      ← Logic, no UI
│   ├── content.ts            ← Reads content/*.json (server-only)
│   ├── progress/             ← ★ Local progress store, types, insights, spaced repetition
│   ├── sync.ts               ← ★ Uploads and downloads progress to and from Supabase
│   ├── plan.ts               ← guest / free / trial / pro logic + PRICING constants
│   ├── tests.ts  planner.ts  coding.ts  overrides.ts  question-bank.ts  python-runner.ts
│   ├── supabase/client.ts    ← Browser Supabase client + authedFetch()
│   └── server/               ← Server-only: gemini.ts, razorpay.ts, supabase.ts (service role)
├── content/                  ← ★ All study material
│   ├── subjects.json         ← The 8 subjects (id, code, name, icon); colours live in tokens
│   ├── weeks/<subject>.json  ← 12 weeks of notes + 6 questions per week
│   ├── coding/problems.json  ← 42 problems (30 practice + 12 OPPE in 3 sets)
│   ├── lab.json  faqs.json   ← "Predict the output" cards, quick concept answers
├── tokens/                   ← ★ Design tokens (DTCG JSON): primitive / semantic / component
├── supabase/migrations/      ← 0001 → 0003, run by hand in the Supabase SQL editor
├── scripts/
│   ├── validate-content.mjs  ← Runs before every build, so broken content never ships
│   ├── build-tokens.mjs      ← tokens/*.json → app/tokens.css + lib/tokens.ts
│   └── lint-tokens.mjs       ← Rejects raw colours/sizes; checks contrast
├── public/pyodide-worker.js  ← Python sandbox worker
├── design/                   ← HTML mockups for each phase (reference only)
└── legacy/                   ← The original single-file prototype (reference only)
```

## 4. Architecture: the 4 ideas that explain everything

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
- Students **can't edit their plan dates**: column-level grants in migration 0002 block it.
- The AI daily limit is enforced by the SQL function `consume_doubt()`.
- Only server routes that hold `SUPABASE_SERVICE_ROLE_KEY` can grant Pro.

```
Browser ──(publishable key + RLS)──► Supabase  (profiles, answers, test_attempts, week_status,
   │                                            reports, content_overrides, announcements, ai_usage, payments, admins)
   └──► /api/doubt ──► Gemini        (checks the token, calls consume_doubt() first)
   └──► /api/payments/* ──► Razorpay (service role grants +30 days pro_until)
```

### Database tables

| Table | Holds | Who writes it |
|---|---|---|
| `profiles` | Name, subjects, last visited, exam target, `trial_ends_at`, `pro_until` | Student (limited columns); trigger on sign-up; server for `pro_until` |
| `answers` | One row per answered question (practice or test) | Student |
| `test_attempts` | Submitted mock tests, responses, time per question | Student |
| `week_status` | Done / saved flags per week | Student |
| `reports` | "Report a problem" submissions | Student inserts; admin updates status |
| `content_overrides` | Admin corrections to questions (`q:<id>` → patch) | Admin; everyone reads |
| `announcements` | Banners on the Overview page | Admin; everyone reads active ones |
| `ai_usage` | Doubts used per student per day (India time) | `consume_doubt()` only |
| `payments` | Razorpay orders and their status | Server (service role) only |
| `admins` | Who can open `/admin` | Added by hand in SQL |

## 5. Who the users are

| Tier | How they get it | What they can do |
|---|---|---|
| **Guest** | Not logged in | Everything free. Progress stays on this device only. No AI. |
| **Free** | Logged in, trial over | Free features + 5 AI doubts a day |
| **Trial** | First 7 days after sign-up (`trial_ends_at`) | Same as Pro |
| **Pro** | Paid (`pro_until` is in the future) | End-term mock tests, OPPE coding sets, 200 doubts a day, time per question, Save as PDF |
| **Admin** | A row in `public.admins`, added by hand in SQL | `/admin` panel |

The tier is calculated in [lib/plan.ts](lib/plan.ts) (`planFrom`). Pro features are wrapped in `<ProLock>` or show a `<ProTag>` ([components/pro-lock.tsx](components/pro-lock.tsx)).

## 6. Every user flow, page by page

**Layout everywhere** ([components/shell.tsx](components/shell.tsx)):

- **Left sidebar** with 9 nav items, plus Admin for admins.
- **Bottom of the sidebar:** a "Log in to save progress" card (guests) or a "Go Pro" card (free users).
- **Topbar:** breadcrumb, and an account menu showing the sync chip, plan chip, avatar, Profile, Progress, Billing and Logout.
- On mobile the sidebar becomes a ☰ drawer.
- `/login` is the only full-screen page, without this layout.

### First visit → Overview (`/`)

[components/dashboard.tsx](components/dashboard.tsx) shows, from top to bottom:

- Announcements posted by admins
- A hero with **"Continue {subject} week N"**, using `lastVisited`
- 4 metrics: weeks done, questions attempted, accuracy, streak
- Subject cards, with your profile's subjects sorted first
- "Topics to revisit": weeks with at least 3 attempts and under 60% accuracy
- Quick actions: mistakes due, exam plan, ask a doubt, practice

### Login (`/login?next=...`)

[components/auth/login-form.tsx](components/auth/login-form.tsx):

1. You enter an email. Supabase sends a **magic link**, and a 6-digit code too once the email template includes `{{ .Token }}`.
2. Step 2 tells you to click the link **or** type the code. A resend button unlocks after 60 s.
3. A Google button appears automatically if Google is switched on in Supabase.
4. There's no separate sign-up. The first login creates the account, and a database trigger creates the `profiles` row along with the 7-day trial.
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
5. `/search` is a client-side keyword search across all 96 weeks. The `?q=` parameter in the URL stays in sync.

### Practice (`/practice` → `/practice/[subject]/[week]`)

1. The picker shows a subject dropdown and a table of weeks with your accuracy for each.
2. Each session goes through the 6 questions one at a time:
   - pick an option → **Check answer** → green/red feedback and the explanation → Next
   - each answer is recorded as `mode: 'practice'`
3. Every explanation has **"✦ Explain more with AI"** (opens `/doubts?question=<id>` with the question attached) and **"⚑ Report a problem"** (writes to the `reports` table and needs login).
4. The result screen shows your score and a review of every question.

### My Mistakes (`/mistakes`)

- Spaced repetition calculated from your answer history ([lib/progress/mistakes.ts](lib/progress/mistakes.ts)).
- A wrong answer is due **straight away**. After one correct answer it comes back in **3 days**, after two in **7 days**, and three correct in a row clears it.
- The page lists due mistakes grouped by subject and week, with "Revise" or "Revise all". On the right is a "Coming up" list with due dates.
- Questions are loaded from `/api/content/questions`.

### Mock tests (`/tests` → `/tests/[subject]/[test]`)

- There are 3 tests per subject ([lib/tests.ts](lib/tests.ts)):
  - **Quiz 1**: weeks 1–4, 15 questions, 25 min
  - **Quiz 2**: weeks 5–8, 15 questions, 25 min
  - **End term**: all weeks, 30 questions, 60 min, **Pro**
- Questions are picked spread evenly across the weeks.
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

### Coding Lab (`/lab` → `/lab/[id]`)

1. The list shows 30 practice problems (free) and 3 OPPE sets of 4 problems each (Pro). Below it are "Predict the output" cards with a reveal button.
2. The workspace ([components/coding/workspace.tsx](components/coding/workspace.tsx)) has a textarea editor: Tab inserts 4 spaces, Ctrl+Enter runs the code, and drafts are saved in localStorage.
   - **Run** checks your code against the visible tests.
   - **Submit** checks against all tests, including the hidden ones.
   - There's also a hint, the model solution, and previous/next links.
3. Python runs in [public/pyodide-worker.js](public/pyodide-worker.js) and is killed after 8 s if it doesn't finish ([lib/python-runner.ts](lib/python-runner.ts)). Each test compares `repr(eval(call))` with the expected value.

### AI Doubt Solver (`/doubts`)

1. You must be logged in. A chip shows "X of 5 free doubts left today".
2. The chat ([components/doubt-chat.tsx](components/doubt-chat.tsx)) posts to `/api/doubt`, sending the last 8 turns and the question context if you came from "Explain more".
3. The server ([app/api/doubt/route.ts](app/api/doubt/route.ts)) checks your token, calls `consume_doubt()` (which returns 429 when you're over the limit), then calls Gemini with a tutor system prompt (Hinglish, step by step, no exam cheating) from [lib/server/gemini.ts](lib/server/gemini.ts).
4. The answer is drawn with [rich-text.tsx](components/rich-text.tsx), a small safe markdown renderer that never inserts HTML.
5. Below the chat is a static FAQ search.

### Exam Planner (`/planner`)

- You pick an exam (Quiz 1, Quiz 2 or End term) and a date.
- [lib/planner.ts](lib/planner.ts) spreads the weeks you haven't finished over the days left:
  - subjects are interleaved
  - every 3rd day includes a "Revise mistakes" slot
  - the last 2 days are for mock tests
- Marking a week done rebalances the plan.

### My Progress (`/progress`)

- Totals, a performance table per subject, weak weeks, mock test history and weeks saved for revision.
- **Reset my progress** wipes it, from the server too if you're logged in.

### Profile (`/profile`)

- Name, your subjects this term (these sort first everywhere), and **Delete account**: you type DELETE, it calls the `delete_my_account()` RPC, and rows cascade away.

### Pricing and payment (`/pricing`)

1. Free vs Pro cards ([components/pricing-plans.tsx](components/pricing-plans.tsx)). The button changes with your state: Start trial / Upgrade / Keep Pro / Pro active / "launching soon" when Razorpay env vars are missing.
2. Payment flow:
   - `POST /api/payments/order` creates a Razorpay order plus a `payments` row with status `created`.
   - The Razorpay modal opens.
   - On success, `POST /api/payments/verify` checks the HMAC signature and calls `grantProForOrder()` ([lib/server/razorpay.ts](lib/server/razorpay.ts)). That claims the order once and adds 30 days to `pro_until`.
   - `/api/payments/webhook` does the same work as a backup if the tab closed. It's safe to run twice.
3. No auto-renewal: each payment adds 30 days.

### Admin (`/admin`)

Three tabs ([components/admin/](components/admin/admin-panel.tsx)):

- **Reports:** open reports grouped by question, with **Fix** and **Dismiss**.
- **Edit questions:** search by ID (for example `stat1-w3-q4`) or text. Edit the text, options, answer and explanation, with a live preview.
  - Saves go to `content_overrides`, and students see them **without a redeploy** via `useCorrectedQuestions()` in [lib/overrides.ts](lib/overrides.ts).
  - **Revert to original** removes the correction.
- **Announcements:** create, hide or delete. They show on the Overview page.

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
- **Copy:** the tone is friendly. Content and AI answers are Hinglish, while the UI chrome is English. Errors are rewritten into friendly messages (see `friendlyError` in the login form).
- **Accessibility:** radio roles on options, `aria-current` on nav links, `aria-live` in the chat, and Escape closes menus.

## 8. Run, configure, deploy

```bash
npm install
npm run dev               # http://localhost:3000
npm run validate:content  # check content JSON
npm run typecheck         # TypeScript check
npm run tokens            # rebuild CSS variables after editing tokens/*.json
npm run lint:tokens       # check styles only use design tokens
```

- **Without any env vars the site still works.** It falls back to the production Supabase project (the publishable key is hard-coded in [lib/supabase/client.ts](lib/supabase/client.ts)). The AI shows "being set up" and payments show "launching soon".
- **Server env vars:** `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID/SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and optionally `GEMINI_MODEL` and `PRO_PRICE_INR`. They're listed in the README.
- **Database changes:** add a new `supabase/migrations/000N_*.sql` and run it by hand in the Supabase SQL editor. There's no migration CLI.
- **Making yourself an admin:** `insert into public.admins (user_id) values ('<your auth uid>');`
- **Deploy:** push to `main`; Vercel builds and deploys. The build runs the content validator first.

## 9. Things worth knowing

1. **Pro content isn't really secret.**
   - `<ProLock>` only hides the UI in the browser. The data still gets sent.
   - OPPE problems, **including their solutions and hidden tests**, are sent in the page data, so anyone reading the page source can see them.
   - End-term questions are the same questions used in free practice anyway.
   - If this matters, OPPE content needs to move behind a server route.
2. **Coding Lab "solved" status is device-only.** `markSolved` uses `commit`, not `dispatch`, so it never syncs to the account.
3. **There are no automated tests and no ESLint setup.** The only safety nets are `validate:content` (which runs before every build) and `typecheck`.
4. **Email is a launch blocker.** Supabase's built-in mailer only sends a few emails an hour, so custom SMTP (for example Resend) needs to be set up before real traffic. The README covers it.
5. **Pricing lives in two places.** `PRICING` in `lib/plan.ts` drives the UI text, while the real numbers are in SQL (`consume_doubt`: 5/200) and env (`PRO_PRICE_INR`). Change them together.
6. **Content rules** (enforced by the validator):
   - exactly 12 weeks per subject
   - 6 questions per week
   - 4 distinct options per question
   - question IDs like `math1-w3-q2`
   - correct answers spread across A–D
   - only `**bold**` and `` `code` `` formatting
   - original material only, never official IITM notes or papers

## 10. Suggested reading order (about half a day)

1. [README.md](README.md)
2. [lib/progress/types.ts](lib/progress/types.ts) → [store.ts](lib/progress/store.ts) → [lib/sync.ts](lib/sync.ts) → [auth-provider.tsx](components/auth/auth-provider.tsx). This is the core data flow.
3. [supabase/migrations/](supabase/migrations/0001_student_accounts.sql), in order
4. [components/shell.tsx](components/shell.tsx) and [dashboard.tsx](components/dashboard.tsx)
5. Follow one feature end to end: the week page → practice session → test runner
6. [app/api/](app/api/doubt/route.ts) and [lib/server/](lib/server/razorpay.ts)

Then run `npm run dev` and click through each flow above, both as a guest and logged in.
