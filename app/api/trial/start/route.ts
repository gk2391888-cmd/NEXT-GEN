import { createHmac, randomUUID } from 'node:crypto';
import { isDisposableEmail } from '@/lib/disposable-email';
import { adminClient, getUserFromRequest } from '@/lib/server/supabase';
import type { TrialResult } from '@/lib/trial';
import { normaliseCode } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

const COOKIE = 'ng_device';
const DEVICE_ID = /^[\w-]{8,64}$/;
// Browsers keep a cookie for at most 400 days.
const COOKIE_MAX_AGE = 400 * 86_400;

const reply = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', ...headers } });

function cookie(req: Request, name: string) {
  const match = (req.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  const value = match?.slice(name.length + 1);
  return value && DEVICE_ID.test(value) ? value : null;
}

/** The student's IP as Vercel reports it (the first x-forwarded-for entry). */
function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || null;
}

/**
 * Starts the 7-day free trial, once per person: called by the app after a student's first
 * login (and once per device afterwards, to record the device). The decision is made in the
 * database by claim_trial() (migration 0009): no trial when this email (Gmail dots and +tags
 * ignored), this device or, more than 3 times a day, this network already had one, or when
 * the email is a throwaway inbox. Without a trial the account still works and can buy Pro.
 * With an invite code (`ref`), a granted trial becomes 14 days and the inviter is recorded (0011).
 */
export async function POST(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return reply({ error: 'Log in first.' }, 401);
  const admin = adminClient();
  if (!admin) return reply({ error: 'Free trials are being set up. Please try again in a little while.' }, 503);

  const body = await req.json().catch(() => null);
  const fromBrowser = typeof body?.deviceId === 'string' && DEVICE_ID.test(body.deviceId) ? body.deviceId : null;
  const fromCookie = cookie(req, COOKIE);
  const devices = [...new Set([fromCookie, fromBrowser].filter((d): d is string => Boolean(d)))];
  // Only a keyed hash of the IP is stored, never the address itself.
  const ip = clientIp(req);
  const ipKey = ip ? createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').update(ip).digest('hex') : null;

  const { data, error } = await admin.rpc('claim_trial', {
    p_uid: auth.user.id,
    p_devices: devices,
    p_ip: ipKey,
    p_disposable: isDisposableEmail(auth.user.email ?? ''),
  });
  if (error) {
    console.error('[trial]', error);
    return reply({ error: 'Could not start your free trial. Please try again.' }, 502);
  }

  // Only a trial that was just granted can come from an invite, so it gets the same checks.
  let referred = false;
  const ref = normaliseCode(typeof body?.ref === 'string' ? body.ref : null);
  if (data === 'granted' && ref) {
    const attached = await admin.rpc('attach_referral', { p_friend: auth.user.id, p_code: ref });
    if (attached.error) console.error('[trial] referral', attached.error);
    referred = attached.data === 'attached';
  }

  // The id also lives in a cookie, so clearing local storage alone doesn't make this a new device.
  const deviceCookie = `${COOKIE}=${fromCookie ?? fromBrowser ?? randomUUID()}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
  return reply({ result: data as TrialResult, referred }, 200, { 'Set-Cookie': deviceCookie });
}
