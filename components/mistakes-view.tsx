'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { computeMistakes, isDue, type Mistake } from '@/lib/progress/mistakes';
import { useQuestionBank, type BankQuestion } from '@/lib/question-bank';
import { useCorrectedQuestions } from '@/lib/overrides';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar } from '@/components/ui';
import { Explanation, QuestionView } from '@/components/quiz/question-view';

type Props = { subjects: Subject[]; catalog: Record<string, WeekRef[]> };

export function MistakesView({ subjects, catalog }: Props) {
  const state = useProgress();
  const bank = useQuestionBank();
  const [session, setSession] = useState<BankQuestion[] | null>(null);
  const mistakes = useMemo(() => computeMistakes(state.answers), [state.answers]);
  const due = mistakes.filter((m) => isDue(m));
  const upcoming = mistakes.filter((m) => !isDue(m));
  const subjectName = new Map(subjects.map((s) => [s.id, s.short]));
  const titleOf = (m: Mistake) => catalog[m.subjectId]?.find((w) => w.week === m.week)?.title ?? '';

  const groups = useMemo(() => {
    const map = new Map<string, Mistake[]>();
    for (const m of due) {
      const key = `${m.subjectId}:${m.week}`;
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.values()].sort((a, b) => b.length - a.length);
  }, [due]);

  function start(list: Mistake[]) {
    if (!bank) return;
    const ids = new Set(list.map((m) => m.questionId));
    setSession(bank.filter((q) => ids.has(q.id)));
  }

  if (session) return <RevisionSession questions={session} onDone={() => setSession(null)} />;

  if (mistakes.length === 0) {
    return (
      <div className="card empty">
        <div className="empty-icon">↻</div>
        <p style={{ marginBottom: 14 }}>{state.answers.length ? 'No mistakes to revise. Great work!' : 'Practise some questions; the ones you get wrong will appear here for revision.'}</p>
        <Link className="btn btn-primary" href="/practice">Go to practice</Link>
      </div>
    );
  }

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <section className="card" style={{ flex: 1, minWidth: 0 }}>
        <div className="quiz-top">
          <h3>Due for revision</h3>
          <span className={`chip ${due.length ? 'chip-red' : 'chip-teal'}`}>{due.length} due today</span>
        </div>
        {due.length === 0 ? (
          <p className="muted" style={{ padding: '12px 0' }}>Nothing due right now. Come back when the next ones are ready.</p>
        ) : (
          <>
            <table className="table">
              <thead><tr><th>Subject</th><th>Week</th><th>Questions</th><th /></tr></thead>
              <tbody>
                {groups.map((list) => (
                  <tr key={`${list[0].subjectId}:${list[0].week}`}>
                    <td><strong>{subjectName.get(list[0].subjectId)}</strong></td>
                    <td>Week {list[0].week} <span className="muted">· {titleOf(list[0])}</span></td>
                    <td>{list.length}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-secondary" onClick={() => start(list)} disabled={!bank}>Revise</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => start(due)} disabled={!bank}>
              {bank ? `Revise all ${due.length} →` : 'Loading questions…'}
            </button>
          </>
        )}
      </section>

      <aside className="card test-side">
        <h3 style={{ marginBottom: 8 }}>Coming up</h3>
        {upcoming.length === 0 ? (
          <p className="muted">Nothing scheduled.</p>
        ) : (
          upcoming.slice(0, 8).map((m) => (
            <div key={m.questionId} className="weak-row">
              <span>{subjectName.get(m.subjectId)} · W{m.week}</span>
              <span className="muted">{new Date(m.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))
        )}
        <p className="muted" style={{ marginTop: 10 }}>{mistakes.length} question{mistakes.length === 1 ? '' : 's'} in your revision list.</p>
      </aside>
    </div>
  );
}

function RevisionSession({ questions: original, onDone }: { questions: BankQuestion[]; onDone: () => void }) {
  const questions = useCorrectedQuestions(original);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [right, setRight] = useState(0);
  const q = questions[index];

  if (!q) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 28, maxWidth: 780 }}>
        <div className="kicker">Revision complete</div>
        <h2>{right} of {questions.length} correct</h2>
        <p style={{ margin: '6px 0 18px' }}>Correct ones move further out; wrong ones stay due until you get them right.</p>
        <button className="btn btn-primary" onClick={onDone}>Back to My Mistakes</button>
      </div>
    );
  }

  function check() {
    if (selected === null) return;
    setChecked(true);
    const correct = selected === q.answer;
    if (correct) setRight((r) => r + 1);
    progress.recordAnswers([{ questionId: q.id, subjectId: q.subjectId, week: q.week, correct, mode: 'practice', at: new Date().toISOString() }]);
  }

  return (
    <div className="quiz-wrap">
      <div className="quiz-top">
        <span className="chip chip-red">REVISION · {q.weekTitle.toUpperCase()}</span>
        <span className="muted">Question {index + 1} of {questions.length}</span>
      </div>
      <ProgressBar value={(index / questions.length) * 100} color="var(--primary)" />
      <div className="card" style={{ marginTop: 14, padding: '22px 24px' }}>
        <QuestionView question={q} selected={selected} onSelect={checked ? undefined : setSelected} reveal={checked} />
        {checked && <Explanation question={q} selected={selected} />}
        <div className="quiz-actions">
          <button className="btn btn-secondary" onClick={onDone}>Stop</button>
          {checked ? (
            <button className="btn btn-primary" onClick={() => { setIndex((i) => i + 1); setSelected(null); setChecked(false); }}>Next →</button>
          ) : (
            <button className="btn btn-primary" onClick={check} disabled={selected === null}>Check answer ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}
