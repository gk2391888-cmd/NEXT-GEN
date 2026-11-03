import { getUserFromRequest, json } from '@/lib/server/supabase';
import { grantProForOrder, razorpayConfig, verifyCheckoutSignature } from '@/lib/server/razorpay';

/** Called by the browser after Razorpay Checkout succeeds. */
export async function POST(req: Request) {
  const config = razorpayConfig();
  if (!config) return json({ error: 'Payments are not set up yet.' }, 503);
  const auth = await getUserFromRequest(req);
  if (!auth) return json({ error: 'Log in again to finish the upgrade.' }, 401);

  const body = (await req.json().catch(() => null)) as { orderId?: string; paymentId?: string; signature?: string } | null;
  if (!body?.orderId || !body.paymentId || !body.signature) return json({ error: 'Missing payment details.' }, 400);
  if (!verifyCheckoutSignature(body.orderId, body.paymentId, body.signature, config.keySecret)) {
    return json({ error: 'Payment could not be verified.' }, 400);
  }

  const result = await grantProForOrder(body.orderId, body.paymentId);
  return result === 'unknown' ? json({ error: 'Payment not found.' }, 404) : json({ ok: true });
}
