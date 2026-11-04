'use client';

import Link from 'next/link';
import { useState } from 'react';
import { progress } from '@/lib/progress/store';
import { useCorrectedQuestions } from '@/lib/overrides';
import { percent } from '@/lib/progress/insights';
import { countByLevel, DIFFICULTY_CHIP, levelLabel, questionsAtLevel, type Level } from '@/lib/levels';
import { setPracticeLevel, usePracticeLevel } from '@/lib/practice-level';
import type { Question } from '@/lib/types';
import { accuracyTone, InlineText, ProgressBar } from '@/components/ui';
import { Explanation, QuestionView } from './question-view';
import { LanguageSwitch } from './language-switch';
import { availableLevel, LevelSwitch } from './level-switch';

type Props = { subjectId: string; subjectName: string; week: number; weekTitle: string; questions: Question[] };

/** A week's practice at the level the student picked (remembered on this device); changing the level starts again. */
export function PracticeSession({ questions: original, ...rest }: Props) {
  const all = useCorrectedQuestions(original);
  const counts = countByLevel(all);
  // A level this week has no questions at falls back to Mixed, without changing the saved choice.
  const level = availableLevel(usePracticeLevel(), counts);
  const levelSwitch = <LevelSwitch value={level} onChange={setPracticeLevel} counts={counts} />;
  return <Session key={level} {...rest} level={level} questions={questionsAtLevel(all, level)} levelSwitch={levelSwitch} />;
}

type SessionProps = Props & { level: Level; levelSwitch: React.ReactNode };

function Session({ subjectId, subjectName, week, weekTitle, questions, level, levelSwitch }: SessionProps) {
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
        <div className="card card-center">
          <div className="kicker">Week {week} result{level !== 'mixed' && ` · ${levelLabel(level)}`}</div>
          <div className={`score-display ${accuracyTone(accuracy)}`}>{accuracy}%</div>
          <h2>{correct} of {questions.length} correct</h2>
          <p className="mt-sm">
            {accuracy === 100 ? 'Perfect score. You have a strong grasp of this week.' : accuracy >= 70 ? 'Good work. Review the explanations for the questions you missed.' : 'Revise this week’s notes, then try the practice again.'}
          </p>
          <div className="level-row justify-center mt-lg">
            <span className="muted">Level</span>
            {levelSwitch}
          </div>
          <div className="btn-group justify-center mt-lg">
            <button className="btn btn-primary" onClick={restart}>Practice again</button>
            <Link className="btn btn-secondary" href={`/library/${subjectId}/${week}`}>Revise week {week} notes</Link>
            <Link className="btn btn-secondary" href="/practice">Choose another week</Link>
          </div>
        </div>
        <div className="flex-between">
          <h3>Answer review</h3>
          <LanguageSwitch />
        </div>
        {questions.map((q, i) => (
          <div key={q.id} className="review">
            <div className="review-head">
              <strong>Q{i + 1}. <InlineText text={q.question} /></strong>
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
        <span className="btn-group items-center">
          <span className="muted">Question {index + 1} of {questions.length}</span>
          <LanguageSwitch />
        </span>
      </div>
      <div className="level-row">
        <span className="muted">Level</span>
        {levelSwitch}
      </div>
      <ProgressBar value={percent(index, questions.length)} color="var(--color-accent-solid)" />
      <div className="card quiz-card">
        <div className="quiz-top">
          <span className="muted">{weekTitle}</span>
          <span className={`chip ${DIFFICULTY_CHIP[question.difficulty]}`}>{question.difficulty.toUpperCase()}</span>
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
