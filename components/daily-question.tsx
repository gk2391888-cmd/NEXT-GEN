'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/supabase/client';
import { useChoice } from '@/lib/programme-choice';
import { useQuestionLang } from '@/lib/question-lang';
import { localize } from '@/lib/question-text';
import { progress, useProgress } from '@/lib/progress/store';
import { streakInfo } from '@/lib/progress/insights';
import { dailyAsQuestion, type DailyQuestion as Daily, type DailyResult } from '@/lib/daily';
import { Explanation, QuestionView } from '@/components/quiz/question-view';

const MEMORY_KEY = 'nextgen-daily';
type Memory = { day: string; id: string; result: DailyResult };

function remembered(day: string, id: string): DailyResult | null {
  try {
    const m = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? 'null') as Memory | null;
    return m && m.day === day && m.id === id ? m.result : null;
  } catch {
    return null;
  }
}

function remember(memory: Memory) {
  try {
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // The result still shows until the page is left.
  }
}

/**
 * The Overview's Question of the Day: the same question for everyone with this programme choice
 * today. Answering counts as practice (so it keeps the streak going) and shows the explanation.
 */
export function DailyQuestion() {
  const choice = useChoice();
  const lang = useQuestionLang();
  const state = useProgress();
  const [daily, setDaily] = useState<Daily | null>(null);
  const [result, setResult] = useState<DailyResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setDaily(null);
    setResult(null);
    setSelected(null);
    authedFetch(`/api/daily?choice=${encodeURIComponent(choice.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { question: Daily; answered: DailyResult | null } | null) => {
        if (cancelled || !body) return;
        setDaily(body.question);
        // This device's own pick wins; the server only knows right or wrong.
        setResult(remembered(body.question.day, body.question.id) ?? body.answered);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [choice.id]);

  if (!daily) return null;

  async function check() {
    if (!daily || selected === null) return;
    setBusy(true);
    setError('');
    try {
      const res = await authedFetch('/api/daily', { method: 'POST', body: JSON.stringify({ choice: choice.id, pick: selected }) });
      if (!res.ok) throw new Error();
      const r = (await res.json()) as DailyResult;
      setResult(r);
      remember({ day: daily.day, id: daily.id, result: r });
      progress.recordAnswers([{ questionId: daily.id, subjectId: daily.subjectId, week: daily.week, correct: r.correct, mode: 'practice', at: new Date().toISOString() }]);
    } catch {
      setError('Could not check your answer. Check your connection and try again.');
    }
    setBusy(false);
  }

  const question = localize(dailyAsQuestion(daily, result ?? undefined), lang);
  const streak = streakInfo(state.answers);
  const pick = result ? (result.pick >= 0 ? result.pick : null) : selected;

  return (
    <section className="card daily-card mt-lg" aria-labelledby="daily-title">
      <div className="flex-between">
        <span id="daily-title" className="chip chip-yellow">🔥 QUESTION OF THE DAY</span>
        {result ? (
          <span className={`chip ${result.correct ? 'chip-teal' : 'chip-red'}`}>{result.correct ? 'Correct ✓' : result.pick < 0 ? 'Answered' : 'Not quite'}</span>
        ) : (
          <span className="chip chip-blue">{daily.subjectName} · Week {daily.week}</span>
        )}
      </div>
      <div className="mt-md">
        <QuestionView question={question} selected={pick} onSelect={result || busy ? undefined : setSelected} reveal={Boolean(result)} />
      </div>
      {result ? (
        <>
          {result.pick >= 0 ? <Explanation question={question} selected={result.pick} /> : <div className="explain">{question.explanation}</div>}
          <div className="daily-meta">
            {streak.streak > 0 && <span className="chip chip-yellow">🔥 {streak.streak}-day streak</span>}
            {streak.freezes > 0 && <span className="chip chip-blue" title="A missed day uses a freeze instead of breaking your streak">❄️ {streak.freezes} streak freeze{streak.freezes > 1 ? 's' : ''}</span>}
            {result.percentRight !== null && <span className="muted text-small">{result.percentRight}% of students got it right</span>}
          </div>
          <div className="btn-group mt-md">
            <Link className="btn btn-secondary" href={`/practice/${daily.subjectId}/${daily.week}`}>Practise week {daily.week} →</Link>
            <Link className="btn btn-secondary" href={`/war?subject=${daily.subjectId}&from=${daily.week}&to=${daily.week}`}>⚔️ Challenge a friend on this week</Link>
          </div>
        </>
      ) : (
        <div className="flex-between mt-md">
          <span className="muted text-small">Same question for everyone in your programme today. Takes about a minute.</span>
          <button type="button" className="btn btn-primary" onClick={check} disabled={selected === null || busy}>{busy ? 'Checking…' : 'Check answer ✓'}</button>
        </div>
      )}
      {error && <p className="field-error mt-sm" role="alert">{error}</p>}
    </section>
  );
}
