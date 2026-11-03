# NEXT GEN — Student Learning Hub

Powered by **THE TECH HUB** · Created by **GAURAV GUPTA**

An independent learning and exam-preparation site for IITM BS Foundation students (not affiliated with IIT Madras).

## What's in Phase 1

- **Study Library**: 8 Foundation subjects × 12 weeks of original Hinglish notes (concept, solved example, common mistakes, quick revision). "Save as PDF" prints a clean copy.
- **Practice Quiz**: 6 MCQs per week (576 total) with instant Hinglish explanations.
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
| AI Doubt Solver (Gemini) | 5 / day | 200 / day fair use |
| Time per question in test results, Save as PDF | | ✓ |

- **Admin panel** (`/admin`, accounts listed in `public.admins`): review student error reports, correct questions (stored in `content_overrides`, live immediately), post announcements.
- **Plans** live on `profiles.trial_ends_at` / `pro_until`, which students can't edit. The AI limit is enforced in the database (`consume_doubt()`).
- **Payments**: Razorpay Checkout → `/api/payments/verify` (signature check) and `/api/payments/webhook` (backup), both granting 30 days via the service-role key.

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Needed for |
| --- | --- |
| `GEMINI_API_KEY` | AI Doubt Solver (from aistudio.google.com) |
| `GEMINI_MODEL` | Optional, defaults to `gemini-2.5-flash` |
| `SUPABASE_SERVICE_ROLE_KEY` | Payments (granting Pro). Never expose it to the browser. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments |
| `RAZORPAY_WEBHOOK_SECRET` | Payment webhook (`<site>/api/payments/webhook`, event `payment.captured`) |
| `PRO_PRICE_INR` | Optional, defaults to 99 |

Without these the site still works: the AI shows "being set up" and the Pro button shows "launching soon".

Migrations: run `supabase/migrations/0001…0003` in order in the Supabase SQL Editor.

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
