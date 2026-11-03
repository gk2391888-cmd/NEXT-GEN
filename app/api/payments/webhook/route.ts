import { json } from '@/lib/server/supabase';
import { grantProForOrder, verifyWebhookSignature } from '@/lib/server/razorpay';

/**
 * Razorpay → us, for payments whose browser callback never arrived (closed tab,
 * lost network). Configure in Razorpay Dashboard → Webhooks with event `payment.captured`.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'Webhook not configured.' }, 503);

  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature') ?? '', secret)) return json({ error: 'Bad signature.' }, 400);

  const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  const payment = event.payload?.payment?.entity;
  if (event.event === 'payment.captured' && payment?.id && payment.order_id) {
    await grantProForOrder(payment.order_id, payment.id);
  }
  return json({ ok: true });
}
