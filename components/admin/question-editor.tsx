'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { applyPatch, getOverride, loadOverrides, type QuestionPatch } from '@/lib/overrides';
import { useQuestionLang } from '@/lib/question-lang';
import { localize } from '@/lib/question-text';
import type { BankQuestion } from '@/lib/question-bank';
import type { QuestionText } from '@/lib/types';
import { Explanation, QuestionView } from '@/components/quiz/question-view';
import { LanguageSwitch } from '@/components/quiz/language-switch';

type Props = {
  bank: BankQuestion[] | null;
  initialId: string | null;
  describe: (q?: BankQuestion) => string;
  userId: string;
  onSaved: (questionId: string) => void;
};

/** Both languages' text (Hinglish at the top level, English in `en`); code and answer are shared. */
type Draft = { question: string; code: string; options: string[]; answer: number; explanation: string; en: QuestionText };

const toDraft = (q: BankQuestion, patch?: QuestionPatch): Draft => {
  const merged = applyPatch(q, patch);
  const en = merged.en ?? merged;
  return {
    question: merged.question,
    code: merged.code ?? '',
    options: [...merged.options],
    answer: merged.answer,
    explanation: merged.explanation,
    en: { question: en.question, options: [...en.options], explanation: en.explanation },
  };
};

const cleanText = (t: QuestionText): QuestionText => ({ question: t.question.trim(), options: t.options.map((o) => o.trim()), explanation: t.explanation.trim() });
const isComplete = (t: QuestionText) => Boolean(t.question) && t.options.every(Boolean) && new Set(t.options.map((o) => o.toLowerCase())).size === 4;

export function QuestionEditor({ bank, initialId, describe, userId, onSaved }: Props) {
  const [query, setQuery] = useState(initialId ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState('');
  // The admin edits one language at a time, picked with the same switch students use.
  const lang = useQuestionLang();

  const selected = useMemo(() => bank?.find((q) => q.id === selectedId), [bank, selectedId]);

  useEffect(() => {
    if (!selected) return;
    loadOverrides(true).then(() => setDraft(toDraft(selected, getOverride(selected.id))));
    setStatus('');
  }, [selected]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!bank || q.length < 2) return [];
    return bank
      .filter((x) => x.id.toLowerCase().includes(q) || x.question.toLowerCase().includes(q) || x.en?.question.toLowerCase().includes(q))
      .slice(0, 12);
  }, [bank, query]);

  async function save() {
    if (!selected || !draft) return;
    const hi = cleanText(draft);
    const en = cleanText(draft.en);
    if (!isComplete(hi) || !isComplete(en)) {
      setStatus(`Fill in the question and four different options in ${!isComplete(en) ? 'English' : 'Hinglish'}.`);
      return;
    }
    // Both languages are saved together, so the answer always points at the same option in each.
    // The code is an empty string (not a missing key) when cleared, so the original code block goes too.
    const data: QuestionPatch = { ...hi, answer: draft.answer, en, code: draft.code.trim() ? draft.code : '' };
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

  const preview = selected && draft ? localize({ ...selected, ...draft, code: draft.code || undefined }, lang) : null;
  // The text fields below edit the chosen language; code and the correct option are shared.
  const text: QuestionText | null = draft ? (lang === 'en' ? draft.en : draft) : null;
  const setText = (patch: Partial<QuestionText>) =>
    draft && setDraft(lang === 'en' ? { ...draft, en: { ...draft.en, ...patch } } : { ...draft, ...patch });

  return (
    <div className="row">
      <div className="card row-aside">
        <label className="field-label" htmlFor="q-search">Find a question</label>
        <input id="q-search" className="input mb-sm" placeholder="ID (stat1-w3-q4) or text" value={query} onChange={(e) => setQuery(e.target.value)} />
        {!bank && <p className="muted">Loading questions…</p>}
        {matches.map((q) => (
          <button key={q.id} className={`menu-item${q.id === selectedId ? ' active-item' : ''}`} onClick={() => setSelectedId(q.id)}>
            <strong className="block text-meta">{q.id} · {describe(q)}</strong>
            <span className="muted">{localize(q, lang).question.slice(0, 80)}</span>
          </button>
        ))}
      </div>

      <div className="card row-main">
        {!selected || !draft || !text ? (
          <div className="empty">Search for a question, or choose “Fix” on a report.</div>
        ) : (
          <>
            <div className="quiz-top">
              <strong>{selected.id} · {describe(selected)}</strong>
              <span className="btn-group">
                {getOverride(selected.id) && <span className="chip chip-blue">EDITED</span>}
                <LanguageSwitch />
              </span>
            </div>
            <p className="muted mb-md">Editing the {lang === 'en' ? 'English' : 'Hinglish'} text. Switch language to edit the other; both are saved together. Code and the correct option are shared.</p>
            <label className="field-label" htmlFor="ed-q">Question ({lang === 'en' ? 'English' : 'Hinglish'})</label>
            <textarea id="ed-q" className="input mb-md" value={text.question} onChange={(e) => setText({ question: e.target.value })} />
            <label className="field-label" htmlFor="ed-code">Code (optional)</label>
            <textarea id="ed-code" className="input code-input mb-md" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            <span className="field-label">Options (select the correct one)</span>
            {text.options.map((opt, i) => (
              <div key={i} className="option-edit">
                <input type="radio" name="answer" aria-label={`Option ${'ABCD'[i]} is correct`} checked={draft.answer === i} onChange={() => setDraft({ ...draft, answer: i })} />
                <input className="input" aria-label={`Option ${'ABCD'[i]}`} value={opt} onChange={(e) => setText({ options: text.options.map((o, j) => (j === i ? e.target.value : o)) })} />
              </div>
            ))}
            <label className="field-label mt-sm" htmlFor="ed-ex">Explanation ({lang === 'en' ? 'English' : 'Hinglish'})</label>
            <textarea id="ed-ex" className="input mb-md" value={text.explanation} onChange={(e) => setText({ explanation: e.target.value })} />
            <div className="notes-foot">
              <span className="muted" role="status">{status}</span>
              <div className="btn-group">
                {getOverride(selected.id) && <button className="btn btn-secondary" onClick={revert}>Revert to original</button>}
                <button className="btn btn-primary" onClick={save}>Save correction</button>
              </div>
            </div>
            {preview && (
              <div className="mt-lg">
                <span className="field-label">Preview ({lang === 'en' ? 'English' : 'Hinglish'})</span>
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
