import { adminClient, getUserFromRequest, json } from '@/lib/server/supabase';
import { razorpayConfig } from '@/lib/server/razorpay';

/** Creates a Razorpay order for one month of Pro. */
export async function POST(req: Request) {
  const config = razorpayConfig();
  const admin = adminClient();
  if (!config || !admin) return json({ error: 'Payments are not set up yet.' }, 503);

  const auth = await getUserFromRequest(req);
  if (!auth) return json({ error: 'Log in to upgrade.' }, 401);

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${config.keyId}:${config.keySecret}`)}` },
    body: JSON.stringify({ amount: config.amountPaise, currency: 'INR', receipt: `pro-${Date.now()}`, notes: { user_id: auth.user.id, plan: 'pro_monthly' } }),
  });
  if (!res.ok) return json({ error: 'Could not start the payment. Please try again.' }, 502);
  const order = (await res.json()) as { id: string; amount: number };

  const { error } = await admin
    .from('payments')
    .insert({ user_id: auth.user.id, razorpay_order_id: order.id, amount_paise: order.amount, status: 'created' });
  if (error) return json({ error: 'Could not start the payment. Please try again.' }, 500);

  return json({ orderId: order.id, amount: order.amount, keyId: config.keyId, email: auth.user.email });
}
