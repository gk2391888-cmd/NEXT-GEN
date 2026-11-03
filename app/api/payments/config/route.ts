import { adminClient, json } from '@/lib/server/supabase';
import { razorpayConfig } from '@/lib/server/razorpay';
import { upiConfig } from '@/lib/server/upi';

export const dynamic = 'force-dynamic';

/** Lets the pricing page know which ways to pay are switched on: Razorpay Checkout and/or our UPI QR. */
export function GET() {
  const canGrant = Boolean(adminClient());
  return json({ enabled: Boolean(razorpayConfig() && canGrant), upi: canGrant ? upiConfig() : null });
}
