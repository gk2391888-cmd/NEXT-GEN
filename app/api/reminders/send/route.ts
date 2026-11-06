import { adminClient } from '@/lib/server/supabase';
import { pushClient } from '@/lib/server/push';
import { indiaClock, pickReminder, type ReminderPrefs } from '@/lib/reminders';
import type { AnswerRecord } from '@/lib/progress/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

type Subscription = ReminderPrefs & { endpoint: string; user_id: string; p256dh: string; auth: string };

/** Answers older than this don't change today's reminder (streak, due mistakes). */
const HISTORY_DAYS = 120;
/** Pushes sent at once. */
const PARALLEL = 20;

/**
 * Sends the reminders due this hour (India time): called every hour by pg_cron (migration 0012).
 * It has no secret, so the database hands out at most one run every 20 minutes, and every
 * device gets at most one reminder a day (last_sent_on).
 */
export async function POST() {
  const admin = adminClient();
  const push = pushClient();
  if (!admin || !push) return reply({ error: 'Reminders are not set up.' }, 503);

  const { data: turn, error: turnError } = await admin.rpc('claim_reminder_run');
  if (turnError) return reply({ error: 'Could not start the run.' }, 502);
  if (!turn) return reply({ skipped: 'A run happened in the last 20 minutes.' });

  const { day, hour } = indiaClock();
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, user_id, p256dh, auth, daily, hour, exam, mistakes')
    .eq('hour', hour)
    .or(`last_sent_on.is.null,last_sent_on.lt.${day}`)
    .limit(5000);
  if (error) return reply({ error: 'Could not load subscriptions.' }, 502);

  const byUser = new Map<string, Subscription[]>();
  for (const s of (subs ?? []) as Subscription[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();
  let sent = 0;
  let removed = 0;
  const users = [...byUser.entries()];
  for (let i = 0; i < users.length; i += PARALLEL) {
    await Promise.all(
      users.slice(i, i + PARALLEL).map(async ([userId, devices]) => {
        const [profile, answers] = await Promise.all([
          admin.from('profiles').select('exam_name, exam_date').eq('id', userId).maybeSingle(),
          admin.from('answers').select('id, question_id, subject_id, week, correct, mode, answered_at').eq('user_id', userId).gte('answered_at', since).limit(5000),
        ]);
        const records: AnswerRecord[] = (answers.data ?? []).map((a) => ({
          id: a.id,
          questionId: a.question_id,
          subjectId: a.subject_id,
          week: a.week,
          correct: a.correct,
          mode: a.mode,
          at: a.answered_at,
        }));
        const exam = profile.data?.exam_date ? { name: profile.data.exam_name || 'Your exam', date: profile.data.exam_date } : undefined;

        for (const device of devices) {
          const reminder = pickReminder(device, { answers: records, exam });
          if (!reminder) continue;
          try {
            await push.sendNotification(
              { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
              JSON.stringify(reminder),
              { TTL: 4 * 3600, urgency: 'normal' },
            );
            sent++;
            await admin.from('push_subscriptions').update({ last_sent_on: day }).eq('endpoint', device.endpoint);
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            // 404/410: the student turned notifications off or the browser dropped the subscription.
            if (status === 404 || status === 410) {
              removed++;
              await admin.from('push_subscriptions').delete().eq('endpoint', device.endpoint);
            } else {
              console.error('[reminders] push failed', status);
            }
          }
        }
      }),
    );
  }
  return reply({ hour, devices: subs?.length ?? 0, sent, removed });
}

export const GET = POST;
