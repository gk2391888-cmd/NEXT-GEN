'use client';

import { useCallback, useEffect, useState } from 'react';
import { authedFetch, getSupabase } from '@/lib/supabase/client';
import { useConfirm } from '@/components/confirm-dialog';

type UpiRequest = {
  id: number;
  user_id: string;
  email: string;
  utr: string;
  amount_inr: number;
  status: 'pending' | 'approved' | 'rejected';
  note: string;
  created_at: string;
  reviewed_at: string | null;
};

const STATUS_CHIP = { pending: 'chip-yellow', approved: 'chip-teal', rejected: 'chip-red' } as const;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** UPI QR payments waiting for an admin: match the UTR and amount in the bank statement, then approve or reject. */
export function UpiRequests({ onCount }: { onCount?: (pending: number) => void }) {
  const [view, setView] = useState<'pending' | 'all'>('pending');
  const [items, setItems] = useState<UpiRequest[] | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    let query = getSupabase()
      .from('upi_requests')
      .select('id, user_id, email, utr, amount_inr, status, note, created_at, reviewed_at')
      .order('created_at', { ascending: view === 'pending' })
      .limit(200);
    if (view === 'pending') query = query.eq('status', 'pending');
    const { data, error } = await query;
    if (error) setStatus('Could not load payments. Has migration 0005 been run?');
    setItems(data ?? []);
    if (view === 'pending') onCount?.(data?.length ?? 0);
  }, [view, onCount]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(r: UpiRequest, approve: boolean) {
    if (approve && !(await confirm({ title: `Approve ₹${r.amount_inr} from ${r.email || 'this student'}?`, message: `Only approve if UTR ${r.utr} shows a ₹${r.amount_inr} credit in your bank or UPI app. This adds 30 days of Pro.`, confirmLabel: 'Approve' }))) return;
    setBusy(r.id);
    setStatus('');
    const res = await authedFetch('/api/payments/upi/review', { method: 'POST', body: JSON.stringify({ id: r.id, approve, note: approve ? '' : note }) });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setStatus(body.error ?? 'Could not update the payment.');
    else setStatus(approve ? `Approved. ${r.email || 'The student'} has 30 more days of Pro.` : 'Rejected. The student sees your reason and can submit again.');
    setRejecting(null);
    setNote('');
    load();
  }

  return (
    <div className="card">
      <div className="flex-between mb-md">
        <div className="filters">
          <button className={view === 'pending' ? 'on' : ''} onClick={() => setView('pending')}>Waiting</button>
          <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>All recent</button>
        </div>
        <button className="btn btn-secondary" onClick={load}>Refresh</button>
      </div>
      <p className="muted mb-md">Match the UTR and amount in your bank or UPI app before approving. The payment note reads “NEXTGEN” plus the Ref shown here.</p>
      {status && <p className="alert mb-md" role="status">{status}</p>}

      {items === null ? (
        <p className="muted">Loading payments…</p>
      ) : items.length === 0 ? (
        <div className="empty"><div className="empty-icon">✓</div>{view === 'pending' ? 'No payments waiting.' : 'No UPI payments yet.'}</div>
      ) : (
        <div className="table-scroll">
          <table className="table table-stack">
            <thead><tr><th>Student</th><th>UTR</th><th>Amount</th><th>Submitted</th><th>Status</th><th /></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.email || 'Unknown email'}</strong>
                    <div className="muted">Ref {r.user_id.slice(0, 8)}</div>
                  </td>
                  <td><code>{r.utr}</code></td>
                  <td>₹{r.amount_inr}</td>
                  <td className="muted nowrap">{when(r.created_at)}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[r.status]}`}>{r.status.toUpperCase()}</span>
                    {r.note && <div className="muted">{r.note}</div>}
                  </td>
                  <td className="text-right">
                    {r.status === 'pending' && rejecting !== r.id && (
                      <div className="btn-group">
                        <button className="btn btn-primary" disabled={busy === r.id} onClick={() => review(r, true)}>Approve</button>
                        <button className="btn btn-danger" disabled={busy === r.id} onClick={() => { setRejecting(r.id); setNote(''); }}>Reject</button>
                      </div>
                    )}
                    {rejecting === r.id && (
                      <form className="btn-group" onSubmit={(e) => { e.preventDefault(); review(r, false); }}>
                        <input className="input" aria-label="Reason shown to the student" maxLength={300} placeholder="Reason (shown to student)" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
                        <button className="btn btn-danger-solid" disabled={busy === r.id}>Reject</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setRejecting(null)}>Cancel</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
    </div>
  );
}
