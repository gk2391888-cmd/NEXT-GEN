import { choiceInProfile, choiceLabel, parseChoice } from './programmes';

/**
 * The numbers on the admin Stats tab, built from raw rows so the server route (/api/admin/stats)
 * and demo mode count exactly the same way. Days are India days (IST).
 */
export type AdminStats = {
  generatedAt: string;
  users: { total: number; today: number; last7Days: number; signedIn24h: number; active7Days: number };
  plans: { onTrial: number; pro: number; trialEnded: number; noTrial: number };
  /** Accounts refused a trial, by reason: email, device, network or disposable. */
  noTrialReasons: Record<string, number>;
  revenue: { upiApproved: number; upiInr: number; upiPending: number; razorpayPaid: number; razorpayInr: number };
  activity: { answers: number; tests: number };
  /** Sign-ups per India day, oldest first, for the last 14 days. */
  signupsByDay: { day: string; count: number }[];
  /** What students said they're preparing for, most first. */
  choices: { label: string; count: number }[];
};

export type StatsRows = {
  users: { created_at: string; last_sign_in_at?: string | null }[];
  profiles: { trial_ends_at: string | null; pro_until: string | null; subjects: string[] | null }[];
  trialClaims: { granted: boolean; reason: string | null }[];
  upi: { status: string; amount_inr: number }[];
  razorpay: { status: string; amount_paise: number }[];
  /** user_id of every answer in the last 7 days. */
  recentAnswerUsers: string[];
  answers: number;
  tests: number;
};

const DAY = 86_400_000;
const IST = 5.5 * 3_600_000;
/** The India date (YYYY-MM-DD) of a moment. */
export const istDay = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10);
const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);

export function buildStats(rows: StatsRows, now = Date.now()): AdminStats {
  const today = istDay(now);
  const days = Array.from({ length: 14 }, (_, i) => istDay(now - (13 - i) * DAY));
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const u of rows.users) {
    const d = istDay(time(u.created_at));
    if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1);
  }

  let onTrial = 0;
  let pro = 0;
  let trialEnded = 0;
  const choices = new Map<string, number>();
  for (const p of rows.profiles) {
    if (time(p.pro_until) > now) pro++;
    else if (time(p.trial_ends_at) > now) onTrial++;
    else if (p.trial_ends_at) trialEnded++;
    const choice = parseChoice(choiceInProfile(p.subjects ?? []));
    const label = choice ? choiceLabel(choice) : 'Not chosen yet';
    choices.set(label, (choices.get(label) ?? 0) + 1);
  }

  const noTrialReasons: Record<string, number> = {};
  for (const c of rows.trialClaims) if (!c.granted && c.reason) noTrialReasons[c.reason] = (noTrialReasons[c.reason] ?? 0) + 1;

  const upiApproved = rows.upi.filter((r) => r.status === 'approved');
  const razorpayPaid = rows.razorpay.filter((r) => r.status === 'paid');

  return {
    generatedAt: new Date(now).toISOString(),
    users: {
      total: rows.users.length,
      today: perDay.get(today) ?? 0,
      last7Days: rows.users.filter((u) => time(u.created_at) > now - 7 * DAY).length,
      signedIn24h: rows.users.filter((u) => time(u.last_sign_in_at) > now - DAY).length,
      active7Days: new Set(rows.recentAnswerUsers).size,
    },
    plans: { onTrial, pro, trialEnded, noTrial: Object.values(noTrialReasons).reduce((a, b) => a + b, 0) },
    noTrialReasons,
    revenue: {
      upiApproved: upiApproved.length,
      upiInr: upiApproved.reduce((a, r) => a + (r.amount_inr ?? 0), 0),
      upiPending: rows.upi.filter((r) => r.status === 'pending').length,
      razorpayPaid: razorpayPaid.length,
      razorpayInr: Math.round(razorpayPaid.reduce((a, r) => a + (r.amount_paise ?? 0), 0) / 100),
    },
    activity: { answers: rows.answers, tests: rows.tests },
    signupsByDay: days.map((day) => ({ day, count: perDay.get(day) ?? 0 })),
    choices: [...choices.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };
}
