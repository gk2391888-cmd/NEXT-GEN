'use client';

import { setQuestionLang, useQuestionLang } from '@/lib/question-lang';
import type { QuestionLang } from '@/lib/types';

const LANGS: { id: QuestionLang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hinglish' },
];

/** English / Hinglish for questions, options and explanations. The choice is remembered on this device. */
export function LanguageSwitch() {
  const lang = useQuestionLang();
  return (
    <div className="filters no-print" role="radiogroup" aria-label="Question language">
      {LANGS.map((l) => (
        <button key={l.id} type="button" role="radio" aria-checked={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => setQuestionLang(l.id)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
