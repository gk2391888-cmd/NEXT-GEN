'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { progress, useProgress } from '@/lib/progress/store';
import { weekKey } from '@/lib/progress/types';
import { buildPlan, daysUntil, EXAMS, examWeeks, type PlanItem } from '@/lib/planner';
import { orderSubjects } from '@/lib/subjects';
import type { Subject, WeekRef } from '@/lib/types';

type Props = { subjects: Subject[]; catalog: Record<string, WeekRef[]> };

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function ExamPlanner({ subjects, catalog }: Props) {
  const state = useProgress();
  const [today, setToday] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => setToday(todayLocal()), []);
  useEffect(() => {
    setName(state.exam?.name ?? 'Quiz 2');
    setDate(state.exam?.date ?? '');
  }, [state.exam]);

  const chosen = state.profile?.subjects?.length ? state.profile.subjects : subjects.map((s) => s.id);
  const subjectName = new Map(subjects.map((s) => [s.id, s.short]));

  const plan = useMemo(() => {
    if (!state.exam || !today) return [];
    return buildPlan({
      today,
      examDate: state.exam.date,
      subjectIds: orderSubjects(subjects, chosen).filter((s) => chosen.includes(s.id)).map((s) => s.id),
      catalog,
      isDone: (s, w) => Boolean(state.weeks[weekKey(s, w)]?.done),
      fromWeek: examWeeks(state.exam.name).fromWeek,
      toWeek: examWeeks(state.exam.name).toWeek,
    });
  }, [state.exam, state.weeks, today, subjects, chosen, catalog]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setError('Choose your exam date.');
    if (today && daysUntil(date, today) <= 0) return setError('Pick a date after today.');
    setError('');
    progress.setExam({ name: name.trim().slice(0, 60) || 'Exam', date });
    setEditing(false);
  }

  if (!today) return null;

  if (!state.exam || editing) {
    return (
      <form className="card max-form" onSubmit={save} noValidate>
        <h3 className="mb-md">When is your exam?</h3>
        <div className="grid grid-2">
          <div>
            <label className="field-label" htmlFor="exam-name">Exam</label>
            <select id="exam-name" className="select w-full" value={examWeeks(name).name} onChange={(e) => setName(e.target.value)}>
              {EXAMS.map((x) => (
                <option key={x.name} value={x.name}>{x.name} (weeks {x.fromWeek}–{x.toWeek})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="exam-date">Date</label>
            <input id="exam-date" className="input" type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setError(''); }} />
          </div>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <p className="muted my-md">
          Check the official date on the IIT Madras BS student portal. The plan covers {state.profile?.subjects?.length ? 'your profile’s subjects' : 'all subjects'}; change them in <Link href="/profile">My profile</Link>.
        </p>
        <div className="btn-group">
          <button className="btn btn-primary">Build my plan</button>
          {state.exam && <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      </form>
    );
  }

  const left = daysUntil(state.exam.date, today);
  const remainingWeeks = plan.reduce((n, d) => n + d.items.filter((i) => i.kind === 'week').length, 0);
  const busiestDay = Math.max(0, ...plan.map((d) => d.items.filter((i) => i.kind === 'week').length));

  return (
    <div className="row">
      <section className="card row-main">
        <div className="quiz-top">
          <h3>Your plan</h3>
          <span className="chip chip-blue">{state.exam.name} in {left} day{left === 1 ? '' : 's'}</span>
        </div>
        {left <= 0 ? (
          <p className="muted">This exam date has passed. Set your next exam to build a new plan.</p>
        ) : (
          plan.map((day, i) => (
            <div key={day.date} className="plan-day">
              <div className={`plan-date${i === 0 ? ' today' : ''}`}>
                {new Date(day.date).getDate()}
                <small>{i === 0 ? 'TODAY' : new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</small>
              </div>
              <div className="flex-1">
                {day.items.length === 0 ? (
                  <span className="muted">Rest day, or catch up on anything you missed.</span>
                ) : (
                  day.items.map((item, j) => <PlanLine key={j} item={item} subjectName={subjectName} />)
                )}
              </div>
            </div>
          ))
        )}
      </section>
      <aside className="card test-side stack">
        <div>
          <div className="muted">Weeks left to study</div>
          <strong className="stat-value">{remainingWeeks}</strong>
        </div>
        {busiestDay > 4 && (
          <div className="alert alert-warn">
            That’s up to {busiestDay} weeks a day. To make it manageable, choose only this term’s subjects in <Link href="/profile">My profile</Link>.
          </div>
        )}
        <p className="muted">Marking a week as done on its notes page removes it from the plan, and the plan rebalances.</p>
        <button className="btn btn-secondary" onClick={() => setEditing(true)}>Change exam date</button>
        <button className="text-btn" onClick={() => progress.setExam(null)}>Clear plan</button>
      </aside>
    </div>
  );
}

function PlanLine({ item, subjectName }: { item: PlanItem; subjectName: Map<string, string> }) {
  if (item.kind === 'week') {
    return (
      <div className="plan-line">
        <Link href={`/library/${item.subjectId}/${item.week}`}><strong>{subjectName.get(item.subjectId)} · Week {item.week}</strong></Link>
        <span className="muted"> {item.title} · notes + <Link href={`/practice/${item.subjectId}/${item.week}`}>practice</Link></span>
      </div>
    );
  }
  if (item.kind === 'mistakes') {
    return <div className="plan-line"><Link href="/mistakes"><strong>Revise My Mistakes</strong></Link><span className="muted"> · 15 min</span></div>;
  }
  return <div className="plan-line"><Link href="/tests"><strong>{subjectName.get(item.subjectId)} mock test</strong></Link><span className="muted"> · 25–60 min</span></div>;
}
