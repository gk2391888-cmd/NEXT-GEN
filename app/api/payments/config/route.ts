import { adminClient, json } from '@/lib/server/supabase';
import { razorpayConfig } from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';

/** Lets the pricing page know whether online payment is switched on yet. */
export function GET() {
  return json({ enabled: Boolean(razorpayConfig() && adminClient()) });
}
