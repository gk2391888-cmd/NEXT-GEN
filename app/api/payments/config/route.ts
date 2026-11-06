import { adminClient, getUserFromRequest, json } from '@/lib/server/supabase';
import { razorpayConfig } from '@/lib/server/razorpay';
import { upiConfig } from '@/lib/server/upi';
import { priceFor } from '@/lib/server/pro';

export const dynamic = 'force-dynamic';

/**
 * Which ways to pay are switched on (Razorpay Checkout and/or our UPI QR), and
 * what this student pays: the offer price applies once per account while it runs.
 */
export async function GET(req: Request) {
  const admin = adminClient();
  const auth = await getUserFromRequest(req);
  const price = await priceFor(admin, auth?.user.id ?? null).catch(() => null);
  const upi = admin ? upiConfig() : null;
  return json({
    enabled: Boolean(razorpayConfig() && admin),
    upi: upi && price ? { ...upi, amountInr: price.amountInr } : upi,
    price: price && { amountInr: price.amountInr, fullPriceInr: price.fullPriceInr, offer: price.offer, offerUsed: price.offerUsed },
  });
}
