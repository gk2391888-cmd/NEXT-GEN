import { adminClient, getUserFromRequest, json } from '@/lib/server/supabase';
import { upiConfig } from '@/lib/server/upi';
import { cleanUtr, isUtr } from '@/lib/upi';

/** At most this many payments waiting for an admin per student, so the queue can't be flooded. */
const MAX_PENDING = 3;

/** A student has paid our UPI QR: records the UTR for an admin to match against the bank statement. */
export async function POST(req: Request) {
  const upi = upiConfig();
  const admin = adminClient();
  if (!upi || !admin) return json({ error: 'UPI payments are not set up yet.' }, 503);
  const auth = await getUserFromRequest(req);
  if (!auth) return json({ error: 'Log in to upgrade.' }, 401);

  const body = (await req.json().catch(() => null)) as { utr?: string } | null;
  const utr = cleanUtr(String(body?.utr ?? ''));
  if (!isUtr(utr)) return json({ error: 'Enter the 12-digit UTR (UPI reference number) from your payment details.' }, 400);

  const { count } = await admin
    .from('upi_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('status', 'pending');
  if ((count ?? 0) >= MAX_PENDING) return json({ error: 'You already have payments waiting to be confirmed. Please wait for those first.' }, 429);

  const { data, error } = await admin
    .from('upi_requests')
    .insert({ user_id: auth.user.id, email: auth.user.email ?? '', utr, amount_inr: upi.amountInr })
    .select('id, utr, amount_inr, status, note, created_at')
    .single();
  if (error?.code === '23505') return json({ error: 'This UTR has already been submitted.' }, 409);
  if (error) return json({ error: 'Could not save your payment details. Please try again.' }, 500);
  return json({ request: data });
}
