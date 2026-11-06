import type { AnswerRecord } from './progress/types';
import { studyStreak } from './progress/insights';
import { computeMistakes, isDue } from './progress/mistakes';

/** What a student chose for reminders on one device (a row of push_subscriptions, migration 0012). */
export type ReminderPrefs = {
  daily: boolean;
  /** Hour of the day, 0–23, India time. */
  hour: number;
  exam: boolean;
  mistakes: boolean;
};

export const DEFAULT_PREFS: ReminderPrefs = { daily: true, hour: 20, exam: true, mistakes: false };

/** Mistakes due before the "revise them" reminder is sent. */
export const MISTAKES_THRESHOLD = 5;

/** "8:00 PM" for 20. */
export const hourLabel = (hour: number) => `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;

/** The day (YYYY-MM-DD) and hour in India, which is where every reminder's clock runs. */
export function indiaClock(now = Date.now()) {
  const ist = new Date(now + 5.5 * 3_600_000);
  return { day: ist.toISOString().slice(0, 10), hour: ist.getUTCHours() };
}

export type Reminder = { title: string; body: string; url: string; tag: string };

const daysBetween = (fromDay: string, toDay: string) => Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86_400_000);

/**
 * The one reminder worth sending today, or null: an exam 3 days or 1 day away first, then
 * mistakes due for revision, then a nudge on a day without practice. Never more than one.
 */
export function pickReminder(
  prefs: ReminderPrefs,
  data: { answers: AnswerRecord[]; exam?: { name: string; date: string } },
  now = Date.now(),
): Reminder | null {
  const today = indiaClock(now).day;

  if (prefs.exam && data.exam) {
    const left = daysBetween(today, data.exam.date);
    if (left === 3 || left === 1) {
      return {
        title: `${data.exam.name} is ${left === 1 ? 'tomorrow' : 'in 3 days'}`,
        body: left === 1 ? 'Revise your weak weeks and take one timed mock today.' : 'See today’s study plan and keep to it.',
        url: '/planner',
        tag: 'exam',
      };
    }
  }

  if (prefs.mistakes) {
    const due = computeMistakes(data.answers).filter((m) => isDue(m, now)).length;
    if (due >= MISTAKES_THRESHOLD) {
      return { title: `${due} mistakes are due for revision`, body: 'Revise them now so they stick before your next quiz.', url: '/mistakes', tag: 'mistakes' };
    }
  }

  if (prefs.daily) {
    const practisedToday = data.answers.some((a) => indiaClock(Date.parse(a.at)).day === today);
    if (practisedToday) return null;
    // The Question of the Day is on the Overview; answering it counts as practice.
    const streak = studyStreak(data.answers, new Date(now));
    return {
      title: 'Today’s question is waiting 🔥',
      body: streak > 0 ? `One minute keeps your ${streak}-day streak going.` : 'One question, about a minute. Start a streak today.',
      url: '/',
      tag: 'daily',
    };
  }
  return null;
}
