'use client';

import Link from 'next/link';
import type { Question } from '@/lib/types';
import { ReportButton } from './report-button';
import { InlineText } from '@/components/ui';

const LETTERS = ['A', 'B', 'C', 'D'];
export const letter = (i: number) => LETTERS[i] ?? '?';

type Props = {
  question: Question;
  selected: number | null;
  onSelect?: (index: number) => void;
  /** After checking: colour the right answer green and a wrong pick red. */
  reveal?: boolean;
};

export function QuestionView({ question, selected, onSelect, reveal = false }: Props) {
  return (
    <div>
      <div className="question-text"><InlineText text={question.question} /></div>
      {question.code && <pre className="code-block">{question.code}</pre>}
      <div role="radiogroup" aria-label="Options">
        {question.options.map((option, i) => {
          const state = reveal
            ? i === question.answer ? ' right' : i === selected ? ' wrong' : ''
            : i === selected ? ' selected' : '';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected === i}
              className={`option${state}`}
              disabled={reveal || !onSelect}
              onClick={() => onSelect?.(i)}
            >
              <span className="key">{letter(i)}</span>
              <span><InlineText text={option} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Explanation({ question, selected }: { question: Question; selected: number | null }) {
  const right = selected === question.answer;
  return (
    <div className={`explain${right ? '' : ' bad'}`}>
      <strong>
        {selected === null ? 'Skipped. ' : right ? '✓ Correct. ' : '✗ Incorrect. '}
        {!right && `Correct answer: ${letter(question.answer)}. `}
      </strong>
      <InlineText text={question.explanation} />
      <div className="explain-actions">
        <Link className="text-btn" href={`/doubts?question=${encodeURIComponent(question.id)}`}>✦ Explain more with AI</Link>
        <ReportButton questionId={question.id} label={question.question.slice(0, 90)} />
      </div>
    </div>
  );
}
