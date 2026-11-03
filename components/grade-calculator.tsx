'use client';

import { useEffect, useState } from 'react';
import { endTermNeeded, GRADES, gradeFor, total, type Scores } from '@/lib/grades';

const STORE_KEY = 'nextgen-grade-calc';
type Form = { gaa: string; qz1: string; qz2: string; endTerm: string };
const EMPTY: Form = { gaa: '', qz1: '', qz2: '', endTerm: '' };

const num = (v: string) => (v.trim() === '' ? 0 : Number(v));
const valid = (v: string) => v.trim() === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Total and grade from GAA, quizzes and end term, plus the end-term score each grade needs. */
export function GradeCalculator() {
  const [form, setForm] = useState<Form>(EMPTY);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null') as Form | null;
      if (saved) setForm({ ...EMPTY, ...saved });
    } catch {
      // Private mode or bad data: start empty.
    }
  }, []);

  function set(key: keyof Form, value: string) {
    const next = { ...form, [key]: value };
    setForm(next);
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // Not saved; the calculator still works.
    }
  }

  const allValid = (Object.keys(form) as (keyof Form)[]).every((k) => valid(form[k]));
  const scores: Scores = { gaa: num(form.gaa), qz1: num(form.qz1), qz2: num(form.qz2) };
  const hasEndTerm = form.endTerm.trim() !== '';
  const t = total(scores, num(form.endTerm));

  const field = (key: keyof Form, label: string, hint: string) => (
    <div className="field">
      <label className="field-label" htmlFor={`gc-${key}`}>{label}</label>
      <input
        id={`gc-${key}`}
        className="input"
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step="any"
        placeholder="0–100"
        value={form[key]}
        aria-invalid={!valid(form[key])}
        onChange={(e) => set(key, e.target.value)}
      />
      <p className="muted text-meta mt-xs">{hint}</p>
    </div>
  );

  return (
    <div className="row">
      <div className="card row-aside">
        <h3 className="mb-md">Your scores (out of 100)</h3>
        {field('gaa', 'Graded assignments average (GAA)', 'Average of your weekly graded assignments.')}
        {field('qz1', 'Quiz 1', 'Leave empty if you missed it.')}
        {field('qz2', 'Quiz 2', 'Leave empty if you missed it or it hasn’t happened.')}
        {field('endTerm', 'End term (optional)', 'Fill in to see your final total and grade.')}
        {!allValid && <p className="field-error" role="alert">Scores must be between 0 and 100.</p>}
        <button className="btn btn-secondary" type="button" onClick={() => { setForm(EMPTY); try { window.localStorage.removeItem(STORE_KEY); } catch {} }}>Clear</button>
      </div>

      <div className="row-main stack">
        {hasEndTerm && allValid && (
          <div className="card text-center">
            <span className="muted">Your total</span>
            <div className="score-display">{fmt(Math.round(t * 10) / 10)}</div>
            <span className={`chip ${gradeFor(t) === 'U' ? 'chip-red' : 'chip-teal'}`}>GRADE {gradeFor(t)}</span>
          </div>
        )}

        <div className="card">
          <h3 className="card-title">End-term score you need</h3>
          {allValid ? (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Grade</th><th>Total needed</th><th className="num">End term needed</th></tr></thead>
                <tbody>
                  {GRADES.map((g) => {
                    const need = endTermNeeded(scores, g.min);
                    return (
                      <tr key={g.letter}>
                        <td><strong>{g.letter}</strong></td>
                        <td className="muted">{g.min}+</td>
                        <td className="num">
                          {need === null ? <span className="muted">Not reachable</span> : need === 0 ? <span className="tone-good">Already there</span> : <strong>{fmt(need)}</strong>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Fix the scores on the left to see this.</p>
          )}
        </div>

        <p className="muted text-small">
          Formula used (standard for Maths, Statistics, Computational Thinking and English): T = 0.1·GAA + max(0.6·F + 0.2·max(Qz1, Qz2), 0.4·F + 0.2·Qz1 + 0.3·Qz2).
          Python and courses with OPPE or extra components use different formulas, and IITM can change them each term, so always check your course’s grading document. Eligibility rules (such as the minimum assignment average to sit the end term) aren’t checked here.
        </p>
      </div>
    </div>
  );
}
