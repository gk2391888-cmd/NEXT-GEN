'use client';

import Link from 'next/link';
import { useState } from 'react';
import { progress } from '@/lib/progress/store';
import { useCorrectedQuestions } from '@/lib/overrides';
import { percent } from '@/lib/progress/insights';
import type { Question } from '@/lib/types';
import { InlineText, ProgressBar } from '@/components/ui';
import { Explanation, QuestionView } from './question-view';

type Props = { subjectId: string; subjectName: string; week: number; weekTitle: string; questions: Question[] };

export function PracticeSession({ subjectId, subjectName, week, weekTitle, questions: original }: Props) {
  const questions = useCorrectedQuestions(original);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);

  const finished = index >= questions.length;
  const question = questions[index];

  function check() {
    if (selected === null) return;
    setChecked(true);
    setPicks((p) => [...p, selected]);
    progress.recordAnswers([
      { questionId: question.id, subjectId, week, correct: selected === question.answer, mode: 'practice', at: new Date().toISOString() },
    ]);
  }

  function next() {
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setPicks([]);
  }

  if (finished) {
    const correct = picks.filter((p, i) => p === questions[i].answer).length;
    const accuracy = percent(correct, questions.length);
    return (
      <div className="quiz-wrap stack">
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div className="kicker">Week {week} result</div>
          <div style={{ font: '800 44px var(--font-head)', color: accuracy >= 75 ? 'var(--green)' : accuracy >= 50 ? 'var(--yellow-dark)' : 'var(--red)' }}>{accuracy}%</div>
          <h2>{correct} of {questions.length} correct</h2>
          <p style={{ marginTop: 6 }}>
            {accuracy === 100 ? 'Perfect score. You have a strong grasp of this week.' : accuracy >= 70 ? 'Good work. Review the explanations for the questions you missed.' : 'Revise this week’s notes, then try the practice again.'}
          </p>
          <div className="btn-group" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={restart}>Practice again</button>
            <Link className="btn btn-secondary" href={`/library/${subjectId}/${week}`}>Revise week {week} notes</Link>
            <Link className="btn btn-secondary" href="/practice">Choose another week</Link>
          </div>
        </div>
        {questions.map((q, i) => (
          <div key={q.id} className="review">
            <div className="review-head">
              <strong style={{ fontSize: 13.5 }}>Q{i + 1}. <InlineText text={q.question} /></strong>
              <span className={`chip ${picks[i] === q.answer ? 'chip-teal' : 'chip-red'}`}>{picks[i] === q.answer ? 'CORRECT' : 'WRONG'}</span>
            </div>
            <Explanation question={q} selected={picks[i]} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="quiz-wrap">
      <div className="quiz-top">
        <span className="chip chip-blue">{subjectName.toUpperCase()} · WEEK {week}</span>
        <span className="muted">Question {index + 1} of {questions.length}</span>
      </div>
      <ProgressBar value={percent(index, questions.length)} color="var(--primary)" />
      <div className="card" style={{ marginTop: 14, padding: '22px 24px' }}>
        <div className="quiz-top">
          <span className="muted">{weekTitle}</span>
          <span className={`chip ${question.difficulty === 'hard' ? 'chip-red' : question.difficulty === 'medium' ? 'chip-yellow' : 'chip-teal'}`}>{question.difficulty.toUpperCase()}</span>
        </div>
        <QuestionView question={question} selected={selected} onSelect={checked ? undefined : setSelected} reveal={checked} />
        {checked && <Explanation question={question} selected={selected} />}
        <div className="quiz-actions">
          <span />
          {checked ? (
            <button className="btn btn-primary" onClick={next}>{index === questions.length - 1 ? 'See result →' : 'Next question →'}</button>
          ) : (
            <button className="btn btn-primary" onClick={check} disabled={selected === null}>Check answer ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}
