'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { getOverride, loadOverrides, type QuestionPatch } from '@/lib/overrides';
import type { BankQuestion } from '@/lib/question-bank';
import { Explanation, QuestionView } from '@/components/quiz/question-view';

type Props = {
  bank: BankQuestion[] | null;
  initialId: string | null;
  describe: (q?: BankQuestion) => string;
  userId: string;
  onSaved: (questionId: string) => void;
};

type Draft = { question: string; code: string; options: string[]; answer: number; explanation: string };

const toDraft = (q: BankQuestion, patch?: QuestionPatch): Draft => {
  const merged = { ...q, ...patch };
  return { question: merged.question, code: merged.code ?? '', options: [...merged.options], answer: merged.answer, explanation: merged.explanation };
};

export function QuestionEditor({ bank, initialId, describe, userId, onSaved }: Props) {
  const [query, setQuery] = useState(initialId ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState('');

  const selected = useMemo(() => bank?.find((q) => q.id === selectedId), [bank, selectedId]);

  useEffect(() => {
    if (!selected) return;
    loadOverrides(true).then(() => setDraft(toDraft(selected, getOverride(selected.id))));
    setStatus('');
  }, [selected]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!bank || q.length < 2) return [];
    return bank.filter((x) => x.id.toLowerCase().includes(q) || x.question.toLowerCase().includes(q)).slice(0, 12);
  }, [bank, query]);

  async function save() {
    if (!selected || !draft) return;
    const options = draft.options.map((o) => o.trim());
    if (!draft.question.trim() || options.some((o) => !o) || new Set(options.map((o) => o.toLowerCase())).size !== 4) {
      setStatus('Fill in the question and four different options.');
      return;
    }
    const data: QuestionPatch = { question: draft.question.trim(), options, answer: draft.answer, explanation: draft.explanation.trim() };
    if (draft.code.trim()) data.code = draft.code;
    setStatus('Saving…');
    const { error } = await getSupabase()
      .from('content_overrides')
      .upsert({ key: `q:${selected.id}`, data, updated_by: userId, updated_at: new Date().toISOString() });
    if (error) return setStatus('Could not save. Check your connection and try again.');
    await loadOverrides(true);
    onSaved(selected.id);
    setStatus('Saved. Students see the corrected question now.');
  }

  async function revert() {
    if (!selected) return;
    const { error } = await getSupabase().from('content_overrides').delete().eq('key', `q:${selected.id}`);
    if (error) return setStatus('Could not revert.');
    await loadOverrides(true);
    setDraft(toDraft(selected));
    setStatus('Reverted to the original question.');
  }

  const preview = selected && draft ? { ...selected, ...draft, code: draft.code || undefined } : null;

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ width: 320, flex: 'none' }}>
        <label className="field-label" htmlFor="q-search">Find a question</label>
        <input id="q-search" className="input" style={{ margin: '0 0 8px' }} placeholder="ID (stat1-w3-q4) or text" value={query} onChange={(e) => setQuery(e.target.value)} />
        {!bank && <p className="muted">Loading questions…</p>}
        {matches.map((q) => (
          <button key={q.id} className={`menu-item${q.id === selectedId ? ' active-item' : ''}`} onClick={() => setSelectedId(q.id)}>
            <strong style={{ display: 'block', fontSize: 12 }}>{q.id} · {describe(q)}</strong>
            <span className="muted">{q.question.slice(0, 80)}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        {!selected || !draft ? (
          <div className="empty">Search for a question, or choose “Fix” on a report.</div>
        ) : (
          <>
            <div className="quiz-top">
              <strong>{selected.id} · {describe(selected)}</strong>
              {getOverride(selected.id) && <span className="chip chip-blue">EDITED</span>}
            </div>
            <label className="field-label" htmlFor="ed-q">Question</label>
            <textarea id="ed-q" className="input" style={{ margin: '0 0 10px', minHeight: 70 }} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
            <label className="field-label" htmlFor="ed-code">Code (optional)</label>
            <textarea id="ed-code" className="input" style={{ margin: '0 0 10px', fontFamily: 'var(--font-mono)', minHeight: 50 }} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            <span className="field-label">Options (select the correct one)</span>
            {draft.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <input type="radio" name="answer" aria-label={`Option ${'ABCD'[i]} is correct`} checked={draft.answer === i} onChange={() => setDraft({ ...draft, answer: i })} />
                <input className="input" style={{ margin: 0 }} value={opt} onChange={(e) => setDraft({ ...draft, options: draft.options.map((o, j) => (j === i ? e.target.value : o)) })} />
              </div>
            ))}
            <label className="field-label" htmlFor="ed-ex" style={{ marginTop: 8 }}>Explanation</label>
            <textarea id="ed-ex" className="input" style={{ margin: '0 0 10px', minHeight: 80 }} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
            <div className="notes-foot" style={{ marginTop: 6 }}>
              <span className="muted" role="status">{status}</span>
              <div className="btn-group">
                {getOverride(selected.id) && <button className="btn btn-secondary" onClick={revert}>Revert to original</button>}
                <button className="btn btn-primary" onClick={save}>Save correction</button>
              </div>
            </div>
            {preview && (
              <div style={{ marginTop: 18 }}>
                <span className="field-label">Preview</span>
                <QuestionView question={preview} selected={preview.answer} reveal />
                <Explanation question={preview} selected={preview.answer} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
