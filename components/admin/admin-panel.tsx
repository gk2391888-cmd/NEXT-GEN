'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useQuestionBank, type BankQuestion } from '@/lib/question-bank';
import type { Subject, WeekRef } from '@/lib/types';
import { PageHead } from '@/components/ui';
import { useAuth } from '@/components/auth/auth-provider';
import { QuestionEditor } from './question-editor';
import { Announcements } from './announcements';
import { UpiRequests } from './upi-requests';
import { NoteUploads } from './note-uploads';
import { Stats } from './stats';

type Report = { id: number; question_id: string; kind: string; message: string; created_at: string };
type Tab = 'stats' | 'reports' | 'edit' | 'notes' | 'announcements' | 'payments';

const KIND_LABEL: Record<string, string> = { wrong_answer: 'Wrong answer', unclear: 'Unclear', typo: 'Typo', other: 'Other' };

export function AdminPanel({ subjects, catalog }: { subjects: Subject[]; catalog: Record<string, WeekRef[]> }) {
  const { user, ready, isAdmin } = useAuth();
  const bank = useQuestionBank();
  const [tab, setTab] = useState<Tab>('stats');
  const [editing, setEditing] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState('');
  const [pendingPayments, setPendingPayments] = useState<number | null>(null);

  const subjectName = useMemo(() => new Map(subjects.map((s) => [s.id, s.short])), [subjects]);
  const byId = useMemo(() => new Map((bank ?? []).map((q) => [q.id, q])), [bank]);
  const describe = (q?: BankQuestion) => (q ? `${subjectName.get(q.subjectId)} · Week ${q.week}` : 'Unknown question');

  const loadReports = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from('reports')
      .select('id, question_id, kind, message, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setError('Could not load reports.');
    setReports(data ?? []);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadReports();
    getSupabase().from('upi_requests').select('id').eq('status', 'pending').limit(200).then(({ data }) => setPendingPayments(data?.length ?? 0));
  }, [isAdmin, loadReports]);

  const grouped = useMemo(() => {
    const map = new Map<string, Report[]>();
    for (const r of reports ?? []) map.set(r.question_id, [...(map.get(r.question_id) ?? []), r]);
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [reports]);

  async function closeReports(questionId: string, status: 'fixed' | 'dismissed') {
    const { error } = await getSupabase().from('reports').update({ status }).eq('question_id', questionId).eq('status', 'open');
    if (error) setError('Could not update the reports.');
    await loadReports();
  }

  if (!ready) return null;
  if (!user || !isAdmin) {
    return (
      <div className="card empty max-form">
        <div className="empty-icon">⚙</div>
        This page is only for NEXT GEN admins.
      </div>
    );
  }

  return (
    <>
      <PageHead kicker="Admin" title="Admin panel" description="See how many students joined and paid, review reported questions, correct content, upload PDF notes, post announcements and confirm UPI payments. Changes go live immediately." />
      <div className="filters mb-lg">
        <button className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>Stats</button>
        <button className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}>Reports ({grouped.length})</button>
        <button className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>Edit questions</button>
        <button className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>PDF notes</button>
        <button className={tab === 'announcements' ? 'on' : ''} onClick={() => setTab('announcements')}>Announcements</button>
        <button className={tab === 'payments' ? 'on' : ''} onClick={() => setTab('payments')}>UPI payments{pendingPayments ? ` (${pendingPayments})` : ''}</button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      {tab === 'stats' && <Stats onOpenPayments={() => setTab('payments')} />}

      {tab === 'reports' && (
        <div className="card">
          {reports === null ? (
            <p className="muted">Loading reports…</p>
          ) : grouped.length === 0 ? (
            <div className="empty"><div className="empty-icon">✓</div>No open reports.</div>
          ) : (
            <div className="table-scroll">
              <table className="table table-stack">
                <thead><tr><th>Question</th><th>Issues</th><th>Latest note</th><th /></tr></thead>
                <tbody>
                  {grouped.map(([qid, list]) => {
                    const q = byId.get(qid);
                    const kinds = [...new Set(list.map((r) => KIND_LABEL[r.kind] ?? r.kind))].join(', ');
                    const note = list.find((r) => r.message)?.message;
                    return (
                      <tr key={qid}>
                        <td className="max-form">
                          <strong>{describe(q)}</strong>
                          <div className="muted">{q ? q.question.slice(0, 110) : qid}</div>
                        </td>
                        <td><span className="chip chip-red">{list.length}×</span> <span className="muted">{kinds}</span></td>
                        <td className="muted">{note ? `“${note.slice(0, 140)}”` : '—'}</td>
                        <td className="text-right nowrap">
                          <button className="btn btn-secondary" onClick={() => { setEditing(qid); setTab('edit'); }}>Fix</button>{' '}
                          <button className="btn btn-secondary" onClick={() => closeReports(qid, 'dismissed')}>Dismiss</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'edit' && (
        <QuestionEditor
          bank={bank}
          initialId={editing}
          describe={describe}
          userId={user.id}
          onSaved={(qid) => closeReports(qid, 'fixed')}
        />
      )}

      {tab === 'notes' && <NoteUploads subjects={subjects} catalog={catalog} userId={user.id} />}

      {tab === 'announcements' && <Announcements />}

      {tab === 'payments' && <UpiRequests onCount={setPendingPayments} />}
    </>
  );
}
