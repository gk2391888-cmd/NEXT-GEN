'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { percent, score, studyStreak, weakWeeks } from '@/lib/progress/insights';
import { orderSubjects } from '@/lib/subjects';
import type { Subject, WeekRef } from '@/lib/types';
import { ProgressBar, SubjectIcon } from '@/components/ui';
import { AnnouncementBar } from '@/components/announcement-bar';
import { computeMistakes, isDue } from '@/lib/progress/mistakes';

export function Dashboard({ subjects: allSubjects, catalog }: { subjects: Subject[]; catalog: Record<string, WeekRef[]> }) {
  const state = useProgress();
  const subjects = orderSubjects(allSubjects, state.profile?.subjects);
  const totals = score(state.answers);
  const totalWeeks = Object.values(catalog).reduce((n, w) => n + w.length, 0);
  const totalQuestions = Object.values(catalog).reduce((n, weeks) => n + weeks.reduce((m, w) => m + w.questionCount, 0), 0);
  const weeksDone = Object.values(state.weeks).filter((w) => w.done).length;
  const streak = studyStreak(state.answers);
  const weak = weakWeeks(state.answers).slice(0, 3);
  const dueMistakes = computeMistakes(state.answers).filter((m) => isDue(m)).length;
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const titleOf = (subjectId: string, week: number) => catalog[subjectId]?.find((w) => w.week === week)?.title ?? '';

  const last = state.lastVisited;
  const lastSubject = last && subjectById.get(last.subjectId);

  return (
    <>
      <AnnouncementBar />
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
            <Link className="btn btn-secondary" href="/tests">Take a mock test</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true"><span className="logo">N</span></div>
      </section>

      <section className="grid grid-4" style={{ marginTop: 16 }} aria-label="Your progress">
        <Metric icon="▣" bg="#edf2ff" color="#6270d5" value={`${weeksDone}/${totalWeeks}`} label="Weeks completed" />
        <Metric icon="▤" bg="#e7f8f2" color="#199e7b" value={String(totals.attempted)} label="Questions attempted" />
        <Metric icon="◉" bg="#fff4e4" color="#ce9842" value={`${totals.accuracy}%`} label="Overall accuracy" />
        <Metric icon="✦" bg="#f2eefe" color="#8e69cf" value={`${streak} day${streak === 1 ? '' : 's'}`} label="Practice streak" />
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
                <div className="muted">{s.code} · {weeks.length ? `${weeks.length} weeks` : 'Coming soon'}</div>
              </div>
              {weeks.length > 0 && <ProgressBar value={percent(done, weeks.length)} color={s.color} />}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-2" style={{ marginTop: 22 }}>
        <section className="card">
          <h3 style={{ marginBottom: 6 }}>Topics to revisit</h3>
          {weak.length === 0 ? (
            <p className="muted" style={{ padding: '10px 0' }}>
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
          <h3 style={{ marginBottom: 6 }}>Quick actions</h3>
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

function Metric({ icon, bg, color, value, label }: { icon: string; bg: string; color: string; value: string; label: string }) {
  return (
    <div className="metric">
      <div className="metric-icon" style={{ background: bg, color }} aria-hidden="true">{icon}</div>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function QuickAction({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link href={href} className="action-row">
      <span className="action-icon" aria-hidden="true">{icon}</span>
      <span style={{ flex: 1 }}><strong>{title}</strong><small>{text}</small></span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
