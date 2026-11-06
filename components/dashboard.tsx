'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent, score, studyStreak, weakWeeks } from '@/lib/progress/insights';
import { orderSubjects } from '@/lib/subjects';
import { useChoice, useChoiceCatalog, useChoiceSubjects, useInChoice } from '@/lib/programme-choice';
import { QUALIFIER_PATH, termSubjects } from '@/lib/programmes';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar, ProgressRing, subjectColor, weekCount } from '@/components/ui';
import { AnnouncementBar } from '@/components/announcement-bar';
import { LevelComingSoon, useLevelComingSoon } from '@/components/coming-soon';
import { useAuth } from '@/components/auth/auth-provider';
import { computeMistakes, isDue } from '@/lib/progress/mistakes';

export function Dashboard({ subjects: allSubjects, catalog: allWeeks }: { subjects: Subject[]; catalog: Record<string, WeekRef[]> }) {
  const state = useProgress();
  const { user } = useAuth();
  const choice = useChoice();
  const catalog = useChoiceCatalog(allWeeks);
  const inChoice = useInChoice();
  // Every number on this page counts only the choice's subjects (and a qualifier's first weeks).
  const answers = state.answers.filter((a) => inChoice(a.subjectId, a.week));
  const comingSoon = useLevelComingSoon(catalog);
  const subjects = orderSubjects(useChoiceSubjects(allSubjects), termSubjects(state.profile?.subjects));
  const totals = score(answers);
  const programmeWeeks = subjects.map((s) => catalog[s.id] ?? []);
  const totalWeeks = programmeWeeks.reduce((n, w) => n + w.length, 0);
  const totalQuestions = programmeWeeks.reduce((n, weeks) => n + weeks.reduce((m, w) => m + w.questionCount, 0), 0);
  const doneIn = (s: Subject) => (catalog[s.id] ?? []).filter((w) => state.weeks[weekKey(s.id, w.week)]?.done).length;
  const weeksDone = subjects.reduce((n, s) => n + doneIn(s), 0);
  const streak = studyStreak(answers);
  const weak = weakWeeks(answers).slice(0, 3);
  const dueMistakes = computeMistakes(answers).filter((m) => isDue(m)).length;
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const titleOf = (subjectId: string, week: number) => catalog[subjectId]?.find((w) => w.week === week)?.title ?? '';

  // "Continue" only offers a week that's part of the choice.
  const last = state.lastVisited && inChoice(state.lastVisited.subjectId, state.lastVisited.week) ? state.lastVisited : undefined;
  const lastSubject = last && subjectById.get(last.subjectId);
  const lastWeeks = lastSubject ? (catalog[lastSubject.id] ?? []).length : 0;

  const firstName = (state.profile?.fullName || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim().split(/\s+/)[0];
  const mockHref = choice.qualifier ? `${QUALIFIER_PATH}/${choice.qualifier}` : '/tests';

  return (
    <>
      <AnnouncementBar />
      {choice.qualifier && (
        <div className="alert mb-lg flex-between">
          <span>You’re preparing for the {choice.programme.short} qualifier exam. It covers weeks 1–{choice.weeks} of the four courses below.</span>
          <Link className="btn btn-primary" href={`${QUALIFIER_PATH}/${choice.qualifier}`}>Qualifier prep →</Link>
        </div>
      )}

      <header className="greeting">
        <h1>{firstName ? `Welcome back, ${firstName} 👋` : 'Welcome to NEXT GEN 👋'}</h1>
        <p>
          {streak > 0
            ? `You’re on a ${streak}-day practice streak. Keep it going today.`
            : 'Study week-by-week notes, practise MCQs, take timed mock tests and strengthen every concept with clear explanations.'}
        </p>
      </header>

      {comingSoon && <div className="mt-lg"><LevelComingSoon action="study" /></div>}

      <div className="dash-top">
        {last && lastSubject ? (
          <Link className="continue-card" href={`/library/${last.subjectId}/${last.week}`}>
            <div className="continue-text">
              <span className="continue-kicker">Continue where you left off</span>
              <strong>{lastSubject.short} · Week {last.week}</strong>
              <span>{titleOf(last.subjectId, last.week)}</span>
              {lastWeeks > 0 && <ProgressBar value={percent(doneIn(lastSubject), lastWeeks)} />}
            </div>
            <span className="continue-btn">Continue →</span>
          </Link>
        ) : (
          <Link className="continue-card" href="/library">
            <div className="continue-text">
              <span className="continue-kicker">Start here</span>
              <strong>Smarter learning starts here.</strong>
              <span>Pick a subject in the Study Library and begin with week 1.</span>
            </div>
            <span className="continue-btn">Start learning →</span>
          </Link>
        )}

        <section className="card" aria-labelledby="today-title">
          <h3 id="today-title" className="card-title">Today</h3>
          <QuickAction
            href="/mistakes"
            icon="↻"
            tone="danger"
            title={dueMistakes ? `Revise ${dueMistakes} mistake${dueMistakes === 1 ? '' : 's'}` : 'My Mistakes'}
            text={dueMistakes ? 'Due today for revision' : 'Wrong answers come back here for revision'}
          />
          {choice.qualifier ? (
            <QuickAction href={`${QUALIFIER_PATH}/${choice.qualifier}/plan`} icon="▦" title="Your qualifier study plan" text="A day-by-day plan to the qualifier exam" />
          ) : (
            <QuickAction
              href="/planner"
              icon="▦"
              title={state.exam ? `${state.exam.name}: ${new Date(state.exam.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Plan for your exam'}
              text={state.exam ? 'See today’s study plan' : 'Get a day-by-day plan to your exam date'}
            />
          )}
          <QuickAction href={mockHref} icon="◷" title={choice.qualifier ? 'Take a qualifier mock' : 'Take a mock test'} text="Timed, with a full result and explanations" />
        </section>
      </div>

      <section className="grid grid-4 mt-lg" aria-label="Your progress">
        <Metric value={`${weeksDone}/${totalWeeks}`} label="Weeks completed" />
        <Metric value={String(totals.attempted)} label="Questions attempted" />
        <Metric value={`${totals.accuracy}%`} label="Overall accuracy" />
        <Metric value={`${streak} day${streak === 1 ? '' : 's'}`} label="Practice streak" />
      </section>

      <div className="dash-bottom">
        <section className="card" aria-labelledby="subjects-title">
          <div className="flex-between mb-sm">
            <h3 id="subjects-title" className="card-title mb-0">Your subjects</h3>
            <Link className="link" href="/library">Study library →</Link>
          </div>
          {subjects.map((s) => {
            const weeks = catalog[s.id] ?? [];
            const done = doneIn(s);
            return (
              <Link key={s.id} href={`/library/${s.id}`} className="subject-line">
                <ProgressRing value={weeks.length ? percent(done, weeks.length) : 0} color={subjectColor(s.id)} label={`${s.short} weeks done`} />
                <span className="min-w-0">
                  <strong>{s.name}</strong>
                  <small>{s.code} · {weeks.length ? `${done} of ${weekCount(s, weeks.length)}` : 'Coming soon'}</small>
                </span>
              </Link>
            );
          })}
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="revisit-title">
            <h3 id="revisit-title" className="card-title">Topics to revisit</h3>
            {weak.length === 0 ? (
              <p className="muted my-md">
                {totals.attempted ? 'No weak weeks found. Keep practising!' : 'Answer some practice questions and your weak weeks will appear here.'}
              </p>
            ) : (
              weak.map((w) => (
                <Link key={`${w.subjectId}:${w.week}`} href={`/library/${w.subjectId}/${w.week}`} className="weak-line">
                  <span className="min-w-0">
                    <strong>{subjectById.get(w.subjectId)?.short} · Week {w.week}</strong>
                    <small>{titleOf(w.subjectId, w.week)}</small>
                  </span>
                  <span className="weak-score">{w.accuracy}%</span>
                </Link>
              ))
            )}
          </section>

          <section className="card" aria-labelledby="quick-title">
            <h3 id="quick-title" className="card-title">Quick actions</h3>
            <QuickAction href="/doubts" icon="✦" title="Ask a doubt" text="Step-by-step answers from the AI doubt solver" />
            <QuickAction href="/practice" icon="▤" title="Practice a week" text={`${totalQuestions} original MCQs with Hinglish explanations`} />
          </section>
        </div>
      </div>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function QuickAction({ href, icon, title, text, tone }: { href: string; icon: string; title: string; text: string; tone?: 'danger' }) {
  return (
    <Link href={href} className="action-row">
      <span className={`action-icon${tone ? ` ${tone}` : ''}`} aria-hidden="true">{icon}</span>
      <span className="flex-1"><strong>{title}</strong><small>{text}</small></span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
