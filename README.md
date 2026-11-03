# NEXT GEN — Student Learning Hub

Powered by **THE TECH HUB** · Created by **GAURAV GUPTA**

An independent learning and exam-preparation site for IIT Madras online BS students (not affiliated with IIT Madras).

## What's in Phase 1

- **Programmes**: right after sign-up (and once for existing students) NEXT GEN asks "What are you preparing for?": a programme level (Data Science Foundation or a Diploma, Electronic Systems, Aeronautics or Management & Data Science Foundation) or the qualifier exam. From then on every page lists only that level's subjects. See [Programmes](#programmes) below.
- **Study Library**: 12 weeks of original Hinglish notes per subject (concept, solved example, common mistakes, quick revision) for the Foundation level of all four programmes: Data Science (8), Electronic Systems (9 theory courses), Aeronautics (8) and Management & Data Science (8). Shared courses are written once, so that's 22 subjects and 1,584 questions. The Data Science Diplomas are listed as "coming soon". "Save as PDF" prints a clean copy.
- **Practice Quiz**: 6 MCQs per week with instant explanations, in English or Hinglish: each student picks with the English / Hinglish switch on practice, mock tests, My Mistakes and search (English by default, remembered in the browser).
- **Mock Tests**: Quiz 1 (weeks 1–4), Quiz 2 (weeks 5–8) and End term (all weeks) per subject, with timer, question palette, mark-for-review, auto-submit, resume after refresh, and a result page with week-wise performance and answer review.
- **My Progress**: accuracy by subject, weak weeks, mock test history, weeks saved for revision.

## Phase 2: student accounts

- **Login** with an emailed link (no passwords), an emailed code once the template includes it, or Google once it's switched on in Supabase. The first login creates the account.
- **Cloud progress**: answers, mock tests, completed/saved weeks and the profile sync to Supabase. The browser keeps a copy, so the app stays instant and works offline; changes queue in `pending` and upload when the network is back.
- **First login on a device** offers to move that device's logged-out progress into the account.
- **My profile**: name, current-term subjects (shown first on Overview and Mock Tests), and delete account.
- Logged-out students can still use everything; their progress stays on the device.

Each student can only read and write their own rows. This is enforced by Row Level Security in the database, not just by the app.

### One-time Supabase setup

1. **SQL Editor** → paste `supabase/migrations/0001_student_accounts.sql` → **Run**.
2. **Authentication → URL Configuration**: Site URL = the live site URL; Redirect URLs = `<live site>/**` and `http://localhost:3200/**`. (Done for the current project.)
3. **Emails**: Supabase's built-in mailer sends only a handful of emails per hour and its templates can't be edited. Before launch, set up custom SMTP (e.g. Resend) under **Authentication → Emails → SMTP Settings**; then you can also add `{{ .Token }}` to the **Magic link or OTP** and **Confirm sign up** templates so students get a code as well as the link.
4. *(Optional, Google login)* Create an OAuth client in Google Cloud, then **Authentication → Sign In / Providers → Google**: paste the client ID and secret. The login page shows the Google button automatically once it's enabled.

The Supabase URL and publishable key default to the production project (`lib/supabase/client.ts`); set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to point at another project. Never put the `service_role`/secret key in this app.

## Phase 3: Pro, AI and practice tools

| Feature | Free | Pro (₹99 / 30 days, 7-day trial on sign-up) |
| --- | --- | --- |
| Notes, formula sheets, search, practice | ✓ | ✓ |
| Quiz 1 / Quiz 2 mock tests | ✓ | ✓ |
| End term mock tests | | ✓ |
| My Mistakes (spaced revision), Exam Planner | ✓ | ✓ |
| Coding Lab practice problems (Python in the browser via Pyodide) | ✓ | ✓ |
| OPPE-style coding sets with hidden tests | | ✓ |
| Timed OPPE simulation (`/lab/oppe/<set>`): countdown, Submit all, score report | | ✓ |
| AI Doubt Solver (limits set in `lib/ai/features.ts`), with “Why was my answer wrong?” from any explanation | 5 / day | 200 / day, longer answers |
| Grade Calculator (`/grades`): total, grade and end-term score needed per grade | ✓ | ✓ |
| Time per question in test results, Save as PDF | | ✓ |

- **Admin panel** (`/admin`, accounts listed in `public.admins`): review student error reports, correct questions (stored in `content_overrides`, live immediately), upload PDF notes, post announcements, confirm UPI payments.
- **PDF notes**: admins upload PDFs per subject and week (or for the whole subject) into the private Storage bucket `notes`, listed in `note_files`. Students open them from the Study Library and the week's notes through a one-hour signed link. Files marked Pro only open for trial and Pro students; Storage enforces that, not the browser.
- **Plans** live on `profiles.trial_ends_at` / `pro_until`, which students can't edit. `lib/plans.ts` turns them into a tier, the same way on the server and in the browser.
- **Pro content is checked on the server.** OPPE problems (with their hidden tests and solutions) and End-term question pools aren't in the pages; they come from `/api/pro/coding/<id>`, `/api/pro/oppe/<set>` and `/api/pro/tests/<subject>/<test>`, which check the student's session and `public.is_pro()` first (`lib/server/pro-access.ts`). Hidden tests and solutions are only fetched on Submit. The `<ProLock>` in the browser only decides what's shown.
- **Payments**, two ways, each adding 30 days via the service-role key. Either can be on alone, or both.
  - Razorpay Checkout → `/api/payments/verify` (signature check) and `/api/payments/webhook` (backup).
  - Pay by UPI QR: the student pays our UPI ID and submits the 12-digit UTR (`/api/payments/upi`, table `upi_requests`). An admin matches it in the bank statement and approves it in **Admin → UPI payments** (`/api/payments/upi/review`).

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Needed for |
| --- | --- |
| `GROQ_API_KEY` | AI features via Groq (console.groq.com → API Keys) |
| `AI_MODEL_SMART`, `AI_MODEL_FAST` | Optional: which models serve each tier. See **AI features** below. |
| `SUPABASE_SERVICE_ROLE_KEY` | AI features (counting daily limits) and payments (granting Pro). Never expose it to the browser. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments |
| `RAZORPAY_WEBHOOK_SECRET` | Payment webhook (`<site>/api/payments/webhook`, event `payment.captured`) |
| `UPI_ID` | Pay by UPI QR, e.g. `yourname@okaxis`. A business/merchant UPI ID is safer than a personal one for many payments. |
| `UPI_PAYEE_NAME` | Optional: the name shown in the UPI app, defaults to `NEXT GEN` |
| `PRO_PRICE_INR` | Optional, defaults to 99 |
| `NEXT_PUBLIC_SITE_URL` | Optional: the public address for link previews and the sitemap, e.g. `https://nextgen.in` once a custom domain is added. Defaults to the Vercel production domain. |

Without these the site still works: the AI shows "being set up" and the Pro button shows "launching soon".

Migrations: run `supabase/migrations/0001…0008` in order in the Supabase SQL Editor. `0007_coding_attempts.sql` adds the table that syncs timed OPPE attempts; until it's run, those attempts stay on the student's device and everything else keeps syncing.

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
| `content/lab.json`, `content/faqs.json` | Python & CT lab exercises, Doubt Help answers |
| `app/` | Pages (Next.js App Router, statically generated) |
| `components/` | UI; `components/quiz/` has practice and mock test logic |
| `lib/content.ts` | Reads content at build time |
| `lib/progress/` | Progress store, types and weak-topic insights |
| `lib/tests.ts` | Mock test definitions and question picking |
| `legacy/` | The original single-file prototype, kept for reference |

## Programmes

`content/programmes.json` lists each programme's levels (Foundation, Diplomas) and their subject ids. A subject used by two programmes (English I/II, the Electronic Systems courses Aeronautics shares) is one subject with one set of notes and one set of progress; `codes` gives the code each programme uses for it (English I is BSHS1001 in Data Science, HS1101 in Electronic Systems).

- **Choosing**: a choice is `<programme>/<level>` (e.g. `es/foundation`) or `qualifier`.
  - `components/programme-prompt.tsx` asks once: after sign-up (after the guest-progress import), to existing students with no choice (Data Science Foundation pre-selected, so confirming changes nothing), and to guests on the Overview. A guest's choice is copied to the account on sign-up instead of asking again. "Qualifier exam" goes to `/qualifier` (built on another branch).
  - It can be changed any time with the sidebar's "Preparing for" menu or in My profile.
  - Storage: a logged-in student's choice is a `programme:<choice>` entry in their profile's `subjects` (an existing text[] column, so **no migration** and it syncs like the rest of the profile); anything reading `subjects` as subject ids uses `termSubjects()`. A guest's is localStorage `nextgen-programme`. With no choice, Data Science Foundation is shown.
  - Code: `lib/programmes.ts` (choices, parsing, shared helpers) and `lib/programme-choice.ts` (`useChoice()`, `useChoiceSubjects()`).
- **What's listed**: Overview, Study Library, Practice, Mock Tests, Exam Planner, Search, My Progress and the profile show only the chosen level's subjects (subjects without notes say "Notes coming soon"; when none of the level's subjects has notes, Overview, Planner and Search show a "coming soon" notice from `components/coming-soon.tsx`); the qualifier shows Data Science Foundation's, plus a link to `/qualifier`. Week, practice and test pages exist for every subject, whatever the choice. The admin editor and PDF uploads list every subject, grouped by programme and level.
- **Status**: in `content/subjects.json`, a subject without `status` has all 12 weeks; `"partial"` has weeks 1..n; `"planned"` has none yet.
- **Coverage** and the research behind it (programmes, levels, official course codes, with sources): [docs/iitm-programmes.md](docs/iitm-programmes.md).

To add a subject: add it to `content/subjects.json` (id: lowercase letters and digits), to a level in `content/programmes.json`, and a colour in `tokens/semantic/subject.json` (`npm run tokens`), then write `content/weeks/<id>.json` and `content/weeks-en/<id>.json`.

## Editing content

Edit the JSON in `content/weeks/`, then check it:

```bash
npm run validate:content
```

The validator checks `content/programmes.json` (every level points at real subjects, every subject is in a programme), then that every week has the right fields, 6 questions with 4 distinct options, valid answer indexes and ids, and that correct answers aren't bunched on one option. `npm run build` runs it first, so broken content never deploys.

Every question also needs its English text in `content/weeks-en/<subject>.json` (`question`, `options`, `explanation`; answer, code and difficulty are shared). The validator fails if one is missing, has a different number of options, or has different `` ` `` / `**` marks, and lists any question or option whose numbers differ between the two languages so you can check the translation. Keep the options in the same order: the answer index is the same in both languages.

Formatting inside content strings: only `**bold**` and `` `code` ``. Multi-line code goes in a `code` field.

All notes and questions are original. Don't paste official IITM lecture notes, assignments or previous-year papers into the content.

## Deploy

The site is a Next.js app, so Vercel needs it from Git (Vercel Drop only works for plain static files):

1. Push this folder to a GitHub repo.
2. In the Vercel project, click **Connect Git** and pick that repo. Framework preset: Next.js.
3. Every push to `main` then deploys automatically.
