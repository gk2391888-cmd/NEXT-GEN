import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { adminClient } from './supabase';

const PRO_DAYS = 30;

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const amountInr = Number(process.env.PRO_PRICE_INR ?? 99);
  return keyId && keySecret ? { keyId, keySecret, amountPaise: Math.round(amountInr * 100) } : null;
}

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Razorpay Checkout's signature: HMAC-SHA256(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

/**
 * Marks an order paid and adds 30 days of Pro, once. Safe to call from both the
 * browser callback and the webhook: the second call finds the order already paid.
 */
export async function grantProForOrder(orderId: string, paymentId: string): Promise<'granted' | 'already' | 'unknown'> {
  const admin = adminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  const { data: claimed, error } = await admin
    .from('payments')
    .update({ status: 'paid', razorpay_payment_id: paymentId })
    .eq('razorpay_order_id', orderId)
    .eq('status', 'created')
    .select('user_id')
    .maybeSingle();
  if (error) throw error;
  if (!claimed) {
    const { data: existing } = await admin.from('payments').select('status').eq('razorpay_order_id', orderId).maybeSingle();
    return existing ? 'already' : 'unknown';
  }

  const { data: profile } = await admin.from('profiles').select('pro_until').eq('id', claimed.user_id).single();
  const from = Math.max(Date.now(), profile?.pro_until ? Date.parse(profile.pro_until) : 0);
  const proUntil = new Date(from + PRO_DAYS * 86_400_000).toISOString();
  const { error: grantError } = await admin.from('profiles').update({ pro_until: proUntil }).eq('id', claimed.user_id);
  if (grantError) throw grantError;
  return 'granted';
}
