import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { extendPro, proPriceInr } from './pro';
import { adminClient } from './supabase';

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret, amountPaise: Math.round(proPriceInr() * 100) } : null;
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

  await extendPro(admin, claimed.user_id);
  return 'granted';
}
