import { adminClient, getUserFromRequest } from '@/lib/server/supabase';
import { pushClient } from '@/lib/server/push';
import type { Reminder } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** Sends one notification right away to this device (its own subscription only), so a student can see reminders work. */
export async function POST(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return reply({ error: 'Log in first.' }, 401);
  const admin = adminClient();
  const push = pushClient();
  if (!admin || !push) return reply({ error: 'Reminders are being set up.' }, 503);

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  const { data: device } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('endpoint', endpoint)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!device) return reply({ error: 'Turn on reminders on this device first.' }, 404);

  const reminder: Reminder = {
    title: 'Reminders are working ✓',
    body: 'This is a test. You’ll get at most one study reminder a day, at the time you picked.',
    url: '/profile',
    tag: 'test',
  };
  try {
    await push.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(reminder), { TTL: 600 });
    return reply({ ok: true });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await admin.from('push_subscriptions').delete().eq('endpoint', device.endpoint);
      return reply({ error: 'This device stopped accepting notifications. Turn reminders off and on again.' }, 410);
    }
    console.error('[reminders] test push failed', status);
    return reply({ error: 'Could not send the test. Please try again.' }, 502);
  }
}
