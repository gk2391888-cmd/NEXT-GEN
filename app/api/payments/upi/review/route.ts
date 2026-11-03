import { adminClient, clientForToken, getUserFromRequest, json } from '@/lib/server/supabase';
import { extendPro } from '@/lib/server/pro';

/** An admin approves a UPI payment (adds 30 days of Pro) or rejects it, after checking the UTR in the bank statement. */
export async function POST(req: Request) {
  const admin = adminClient();
  if (!admin) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' }, 503);
  const auth = await getUserFromRequest(req);
  if (!auth) return json({ error: 'Log in again.' }, 401);
  const { data: isAdmin } = await clientForToken(auth.token).rpc('is_admin');
  if (!isAdmin) return json({ error: 'Only admins can review payments.' }, 403);

  const body = (await req.json().catch(() => null)) as { id?: number; approve?: boolean; note?: string } | null;
  if (!Number.isInteger(body?.id) || typeof body?.approve !== 'boolean') return json({ error: 'Missing request id or decision.' }, 400);
  const note = String(body.note ?? '').trim().slice(0, 300);

  // Claim the request once, so two admins (or two clicks) can't grant Pro twice.
  const { data: claimed, error } = await admin
    .from('upi_requests')
    .update({ status: body.approve ? 'approved' : 'rejected', note, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('status', 'pending')
    .select('user_id')
    .maybeSingle();
  if (error) return json({ error: 'Could not update the payment.' }, 500);
  if (!claimed) return json({ error: 'This payment was already reviewed.' }, 409);

  if (body.approve) {
    try {
      await extendPro(admin, claimed.user_id);
    } catch {
      await admin.from('upi_requests').update({ status: 'pending', note: '', reviewed_by: null, reviewed_at: null }).eq('id', body.id);
      return json({ error: 'Could not grant Pro. The payment is still pending; try again.' }, 500);
    }
  }
  return json({ ok: true });
}
