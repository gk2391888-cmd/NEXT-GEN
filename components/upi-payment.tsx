'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { authedFetch, getSupabase } from '@/lib/supabase/client';
import { cleanUtr, isUtr, upiLink } from '@/lib/upi';
import { sync } from '@/lib/sync';
import { refreshPaymentConfig } from '@/lib/pro-price';

export type UpiConfig = { id: string; name: string; amountInr: number };
type UpiRequest = { id: number; utr: string; amount_inr: number; status: 'pending' | 'approved' | 'rejected'; note: string; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Pay by scanning our UPI QR, then submit the UTR. An admin confirms it from the admin panel. */
export function UpiPayment({ upi, userId }: { upi: UpiConfig; userId: string }) {
  // Goes into the payment note, so the admin can match the bank statement to this student.
  const ref = `NEXTGEN ${userId.slice(0, 8)}`;
  const link = upiLink(upi, upi.amountInr, ref);
  const [qr, setQr] = useState('');
  const [latest, setLatest] = useState<UpiRequest | null>(null);
  const latestRef = useRef<UpiRequest | null>(null);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 480 }).then(setQr).catch(() => setQr(''));
  }, [link]);

  const load = useCallback(async () => {
    const { data } = await getSupabase()
      .from('upi_requests')
      .select('id, utr, amount_inr, status, note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    const next = (data?.[0] as UpiRequest | undefined) ?? null;
    const prev = latestRef.current;
    // Just approved while this page was open: fetch the new Pro dates.
    if (prev?.status === 'pending' && next?.id === prev.id && next.status === 'approved') {
      sync(userId);
      setMessage('Payment confirmed. Pro is active. Thank you!');
    }
    latestRef.current = next;
    setLatest(next);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // While a payment waits for an admin, check again every minute and when the student comes back to the tab.
  const pending = latest?.status === 'pending';
  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(load, 60_000);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', load);
    };
  }, [pending, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = cleanUtr(utr);
    if (!isUtr(value)) return setMessage('The UTR is the 12-digit number in your UPI app’s payment details.');
    setBusy(true);
    setMessage('');
    const res = await authedFetch('/api/payments/upi', { method: 'POST', body: JSON.stringify({ utr: value }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage(body.error ?? 'Could not submit. Please try again.');
    setUtr('');
    latestRef.current = body.request;
    setLatest(body.request);
    // A payment at the offer price uses up the offer, so the next price may be different.
    refreshPaymentConfig();
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(upi.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the ID is still on screen to copy by hand.
    }
  }

  if (latest?.status === 'pending') {
    return (
      <div className="card plan-card upi-card" role="status">
        <h3>Payment submitted</h3>
        <p className="mt-sm">
          We got your UTR <code>{latest.utr}</code> for ₹{latest.amount_inr} on {when(latest.created_at)}. Pro activates as soon as we confirm it, usually within a few hours.
        </p>
        <p className="muted mt-sm">Paid by mistake or wrong UTR? Write to us from the email on your account.</p>
      </div>
    );
  }

  return (
    <div className="card plan-card upi-card">
      <h3>Pay by UPI</h3>
      {latest?.status === 'rejected' && (
        <p className="alert alert-warn mt-sm" role="status">
          We couldn’t confirm the payment for UTR {latest.utr}.{latest.note && ` ${latest.note.replace(/[.\s]+$/, '')}.`} Check the number and submit again.
        </p>
      )}
      <div className="upi-body">
        <div className="upi-qr">
          {qr ? <img src={qr} alt={`UPI QR code to pay ₹${upi.amountInr} to ${upi.name}`} /> : <div className="upi-qr-empty muted">Loading QR…</div>}
        </div>
        <ol className="upi-steps">
          <li>
            Scan with any UPI app (GPay, PhonePe, Paytm…) and pay <strong>₹{upi.amountInr}</strong> to {upi.name}.{' '}
            <a className="upi-open" href={link}>Open UPI app</a>
          </li>
          <li>
            Or pay to UPI ID <code>{upi.id}</code>{' '}
            <button type="button" className="btn btn-secondary" onClick={copyId}>{copied ? 'Copied' : 'Copy'}</button>
          </li>
          <li>Open the payment in your UPI app and copy the 12-digit <strong>UTR / UPI reference number</strong>.</li>
          <li>
            <form className="upi-form" onSubmit={submit}>
              <label className="field-label" htmlFor="upi-utr">UTR number</label>
              <div className="btn-group">
                <input
                  id="upi-utr"
                  className="input"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={16}
                  placeholder="e.g. 412345678901"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                />
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </li>
        </ol>
      </div>
      {message && <p className={`${latest?.status === 'approved' ? 'alert' : 'field-error'} mt-sm`} role="alert">{message}</p>}
      <p className="muted mt-sm">We check every payment by hand, so Pro starts within a few hours, not instantly. Each payment adds 30 days.</p>
    </div>
  );
}
