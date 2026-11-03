/**
 * Pay-by-UPI helpers, shared by the browser and the server. The student pays our
 * UPI ID, then submits the UTR (the 12-digit UPI reference number every UPI app
 * shows in the payment details) for an admin to confirm.
 */

/** Strips the spaces some apps put inside the UTR when it's copied. */
export const cleanUtr = (value: string) => value.replace(/\s+/g, '');

export const isUtr = (value: string) => /^\d{12}$/.test(value);

/** A `upi://pay` link: opens any UPI app with the payee, amount and note filled in. Also the QR's content. */
export function upiLink(upi: { id: string; name: string }, amountInr: number, note: string) {
  const params = new URLSearchParams({ pa: upi.id, pn: upi.name, am: amountInr.toFixed(2), cu: 'INR', tn: note });
  // Some UPI apps don't decode %40, so the @ in the UPI ID stays as it is.
  return `upi://pay?${params.toString().replace(/\+/g, '%20').replace(/%40/g, '@')}`;
}
