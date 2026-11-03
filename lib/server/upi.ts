import 'server-only';
import { proPriceInr } from './pro';

/** Pay-by-UPI is on when our UPI ID is set (UPI_ID, e.g. nextgen@okaxis). */
export function upiConfig() {
  const id = process.env.UPI_ID?.trim();
  return id ? { id, name: process.env.UPI_PAYEE_NAME?.trim() || 'NEXT GEN', amountInr: proPriceInr() } : null;
}
