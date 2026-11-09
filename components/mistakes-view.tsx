'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { computeMistakes, isDue, type Mistake } from '@/lib/progress/mistakes';
import { loadQuestions, type BankQuestion } from '@/lib/question-bank';
import { useCorrectedQuestions } from '@/lib/overrides';
import { useInChoice } from '@/lib/programme-choice';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar } from '@/components/ui';
import { Explanation, QuestionView } from '@/components/quiz/question-view';
import { LanguageSwitch } from '@/components/quiz/language-switch';

type Props = { subjects: Subject[]; catalog: Record<string, WeekRef[]> };

export function MistakesView({ subjects, catalog }: Props) {
  const state = useProgress();
  const [session, setSession] = useState<BankQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const inChoice = useInChoice();
  // Only the choice's subjects (and a qualifier's first weeks); the rest come back when the student switches back.
  const mistakes = useMemo(() => computeMistakes(state.answers).filter((m) => inChoice(m.subjectId, m.week)), [state.answers, inChoice]);
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

  // Only the questions being revised are fetched, never the whole bank.
  async function start(list: Mistake[]) {
    setLoading(true);
    setLoadError('');
    try {
      setSession(await loadQuestions(list.map((m) => m.questionId)));
    } catch {
      setLoadError('Could not load these questions. Check your connection and try again.');
    }
    setLoading(false);
  }

  if (session) return <RevisionSession questions={session} onDone={() => setSession(null)} />;

  if (mistakes.length === 0) {
    return (
      <div className="card empty">
        <div className="empty-icon">↻</div>
        <p>{state.answers.length ? 'No mistakes to revise. Great work!' : 'Practise some questions; the ones you get wrong will appear here for revision.'}</p>
        <Link className="btn btn-primary" href="/practice">Go to practice</Link>
      </div>
    );
  }

  return (
    <div className="row">
      <section className="card row-main">
        <div className="quiz-top">
          <h3>Due for revision</h3>
          <span className={`chip ${due.length ? 'chip-red' : 'chip-teal'}`}>{due.length} due today</span>
        </div>
        {due.length === 0 ? (
          <p className="muted my-md">Nothing due right now. Come back when the next ones are ready.</p>
        ) : (
          <>
            <table className="table table-stack">
              <thead><tr><th>Subject</th><th>Week</th><th>Questions</th><th /></tr></thead>
              <tbody>
                {groups.map((list) => (
                  <tr key={`${list[0].subjectId}:${list[0].week}`}>
                    <td><strong>{subjectName.get(list[0].subjectId)}</strong></td>
                    <td>Week {list[0].week} <span className="muted">· {titleOf(list[0])}</span></td>
                    <td data-label="Questions:">{list.length}</td>
                    <td className="text-right"><button className="btn btn-secondary" onClick={() => start(list)} disabled={loading}>Revise</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-primary mt-lg" onClick={() => start(due)} disabled={loading}>
              {loading ? 'Loading questions…' : `Revise all ${due.length} →`}
            </button>
            {loadError && <p className="field-error mt-sm" role="alert">{loadError}</p>}
          </>
        )}
      </section>

      <aside className="card test-side">
        <h3 className="card-title">Coming up</h3>
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
        <p className="muted mt-md">{mistakes.length} question{mistakes.length === 1 ? '' : 's'} in your revision list.</p>
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
      <div className="card card-center max-reading">
        <div className="kicker">Revision complete</div>
        <h2>{right} of {questions.length} correct</h2>
        <p className="mt-sm mb-lg">Correct ones move further out; wrong ones stay due until you get them right.</p>
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
        <span className="btn-group items-center">
          <span className="muted">Question {index + 1} of {questions.length}</span>
          <LanguageSwitch />
        </span>
      </div>
      <ProgressBar value={(index / questions.length) * 100} color="var(--color-accent-solid)" />
      <div className="card quiz-card">
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
