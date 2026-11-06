import { adminClient, getUserFromRequest } from '@/lib/server/supabase';
import { pushConfig } from '@/lib/server/push';
import { DEFAULT_PREFS, type ReminderPrefs } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

const isEndpoint = (v: unknown): v is string => typeof v === 'string' && v.startsWith('https://') && v.length <= 1000;
const isKey = (v: unknown, max: number): v is string => typeof v === 'string' && /^[\w-]+=*$/.test(v) && v.length <= max;

function prefsFrom(body: unknown): ReminderPrefs {
  const p = (body ?? {}) as Partial<ReminderPrefs>;
  return {
    daily: typeof p.daily === 'boolean' ? p.daily : DEFAULT_PREFS.daily,
    hour: Number.isInteger(p.hour) && p.hour! >= 0 && p.hour! <= 23 ? p.hour! : DEFAULT_PREFS.hour,
    exam: typeof p.exam === 'boolean' ? p.exam : DEFAULT_PREFS.exam,
    mistakes: typeof p.mistakes === 'boolean' ? p.mistakes : DEFAULT_PREFS.mistakes,
  };
}

/** Whether reminders are switched on for the site, and the public key browsers subscribe with. */
export async function GET() {
  const config = pushConfig();
  return reply({ publicKey: config?.publicKey ?? null });
}

/** Saves this device's subscription and choices: { subscription: PushSubscriptionJSON, prefs }. */
export async function POST(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return reply({ error: 'Log in first.' }, 401);
  const admin = adminClient();
  if (!admin || !pushConfig()) return reply({ error: 'Reminders are being set up. Please try again in a little while.' }, 503);

  const body = await req.json().catch(() => null);
  const sub = body?.subscription;
  if (!isEndpoint(sub?.endpoint) || !isKey(sub?.keys?.p256dh, 200) || !isKey(sub?.keys?.auth, 100)) return reply({ error: 'This browser sent an invalid subscription.' }, 400);

  const prefs = prefsFrom(body?.prefs);
  const { error } = await admin.from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    user_id: auth.user.id,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    ...prefs,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[reminders]', error);
    return reply({ error: 'Could not save your reminders. Please try again.' }, 502);
  }
  return reply({ ok: true, prefs });
}

/** Turns reminders off for this device: { endpoint }. */
export async function DELETE(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return reply({ error: 'Log in first.' }, 401);
  const admin = adminClient();
  if (!admin) return reply({ error: 'Reminders are being set up.' }, 503);
  const body = await req.json().catch(() => null);
  if (!isEndpoint(body?.endpoint)) return reply({ error: 'Missing endpoint.' }, 400);
  await admin.from('push_subscriptions').delete().eq('endpoint', body.endpoint).eq('user_id', auth.user.id);
  return reply({ ok: true });
}
