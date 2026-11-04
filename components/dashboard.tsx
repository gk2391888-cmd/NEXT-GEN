'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent, score, studyStreak, weakWeeks } from '@/lib/progress/insights';
import { orderSubjects } from '@/lib/subjects';
import { useChoice, useChoiceCatalog, useChoiceSubjects, useInChoice } from '@/lib/programme-choice';
import { QUALIFIER_PATH, termSubjects } from '@/lib/programmes';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar, SubjectIcon, subjectColor, weekCount } from '@/components/ui';
import { AnnouncementBar } from '@/components/announcement-bar';
import { LevelComingSoon, useLevelComingSoon } from '@/components/coming-soon';
import { computeMistakes, isDue } from '@/lib/progress/mistakes';

export function Dashboard({ subjects: allSubjects, catalog: allWeeks }: { subjects: Subject[]; catalog: Record<string, WeekRef[]> }) {
  const state = useProgress();
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
  const weeksDone = subjects.reduce((n, s) => n + (catalog[s.id] ?? []).filter((w) => state.weeks[weekKey(s.id, w.week)]?.done).length, 0);
  const streak = studyStreak(answers);
  const weak = weakWeeks(answers).slice(0, 3);
  const dueMistakes = computeMistakes(answers).filter((m) => isDue(m)).length;
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const titleOf = (subjectId: string, week: number) => catalog[subjectId]?.find((w) => w.week === week)?.title ?? '';

  // "Continue" only offers a week that's part of the choice.
  const last = state.lastVisited && inChoice(state.lastVisited.subjectId, state.lastVisited.week) ? state.lastVisited : undefined;
  const lastSubject = last && subjectById.get(last.subjectId);

  return (
    <>
      <AnnouncementBar />
      {choice.qualifier && (
        <div className="alert mb-lg flex-between">
          <span>You’re preparing for the {choice.programme.short} qualifier exam. It covers weeks 1–{choice.weeks} of the four courses below.</span>
          <Link className="btn btn-primary" href={`${QUALIFIER_PATH}/${choice.qualifier}`}>Qualifier prep →</Link>
        </div>
      )}
      <div className="kicker">Your learning dashboard</div>
      <section className="hero">
        <div>
          <span className="hero-label">✦ WELCOME TO NEXT GEN</span>
          <h1>Smarter learning starts here.</h1>
          <p>Study week-by-week notes, practise MCQs, take timed mock tests and strengthen every concept with clear explanations.</p>
          <div className="hero-actions">
            {last && lastSubject ? (
              <Link className="btn btn-primary" href={`/library/${last.subjectId}/${last.week}`}>Continue {lastSubject.short} week {last.week} →</Link>
            ) : (
              <Link className="btn btn-primary" href="/library">Start learning →</Link>
            )}
            {choice.qualifier ? (
              <Link className="btn btn-secondary" href={`${QUALIFIER_PATH}/${choice.qualifier}`}>Take a qualifier mock</Link>
            ) : (
              <Link className="btn btn-secondary" href="/tests">Take a mock test</Link>
            )}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true"><span className="logo">N</span></div>
      </section>

      {comingSoon && <div className="mt-lg"><LevelComingSoon action="study" /></div>}

      <section className="grid grid-4 mt-lg" aria-label="Your progress">
        <Metric icon="▣" tone={1} value={`${weeksDone}/${totalWeeks}`} label="Weeks completed" />
        <Metric icon="▤" tone={2} value={String(totals.attempted)} label="Questions attempted" />
        <Metric icon="◉" tone={3} value={`${totals.accuracy}%`} label="Overall accuracy" />
        <Metric icon="✦" tone={4} value={`${streak} day${streak === 1 ? '' : 's'}`} label="Practice streak" />
      </section>

      <div className="section-title">
        <h2>Explore your subjects</h2>
        <Link className="link" href="/library">Browse study library →</Link>
      </div>
      <div className="grid grid-4">
        {subjects.map((s) => {
          const weeks = catalog[s.id] ?? [];
          const done = weeks.filter((w) => state.weeks[weekKey(s.id, w.week)]?.done).length;
          return (
            <Link key={s.id} href={`/library/${s.id}`} className="subject-card">
              <SubjectIcon subject={s} />
              <div>
                <strong>{s.name}</strong>
                <div className="muted">{s.code} · {weeks.length ? weekCount(s, weeks.length) : 'Coming soon'}</div>
              </div>
              {weeks.length > 0 && <ProgressBar value={percent(done, weeks.length)} color={subjectColor(s.id)} />}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-2 mt-xl">
        <section className="card">
          <h3 className="card-title">Topics to revisit</h3>
          {weak.length === 0 ? (
            <p className="muted my-md">
              {totals.attempted ? 'No weak weeks found. Keep practising!' : 'Answer some practice questions and your weak weeks will appear here.'}
            </p>
          ) : (
            weak.map((w) => (
              <div key={`${w.subjectId}:${w.week}`} className="weak-row">
                <div>
                  <strong>{subjectById.get(w.subjectId)?.short} · Week {w.week}</strong>
                  <div className="muted">{titleOf(w.subjectId, w.week)} · {w.accuracy}% accuracy</div>
                </div>
                <Link className="btn btn-secondary" href={`/library/${w.subjectId}/${w.week}`}>Revise</Link>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <h3 className="card-title">Quick actions</h3>
          <QuickAction
            href="/mistakes"
            icon="↻"
            title={dueMistakes ? `Revise ${dueMistakes} mistake${dueMistakes === 1 ? '' : 's'}` : 'My Mistakes'}
            text={dueMistakes ? 'Due today for revision' : 'Wrong answers come back here for revision'}
          />
          <QuickAction
            href="/planner"
            icon="▦"
            title={state.exam ? `${state.exam.name}: ${new Date(state.exam.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Plan for your exam'}
            text={state.exam ? 'See today’s study plan' : 'Get a day-by-day plan to your exam date'}
          />
          <QuickAction href="/doubts" icon="✦" title="Ask a doubt" text="Step-by-step answers from the AI doubt solver" />
          <QuickAction href="/practice" icon="▤" title="Practice a week" text={`${totalQuestions} original MCQs with Hinglish explanations`} />
        </section>
      </div>
    </>
  );
}

function Metric({ icon, tone, value, label }: { icon: string; tone: 1 | 2 | 3 | 4; value: string; label: string }) {
  return (
    <div className="metric">
      <div className={`metric-icon tone-${tone}`} aria-hidden="true">{icon}</div>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function QuickAction({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link href={href} className="action-row">
      <span className="action-icon" aria-hidden="true">{icon}</span>
      <span className="flex-1"><strong>{title}</strong><small>{text}</small></span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
