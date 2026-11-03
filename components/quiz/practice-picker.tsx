'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useProgress } from '@/lib/progress/store';
import { scoresByWeek } from '@/lib/progress/insights';
import type { Subject, WeekRef } from '@/lib/types';
import { accuracyTone, SubjectIcon } from '@/components/ui';

export function PracticePicker({ subjects, catalog }: { subjects: Subject[]; catalog: Record<string, WeekRef[]> }) {
  const state = useProgress();
  const [subjectId, setSubjectId] = useState(state.lastVisited?.subjectId ?? subjects[0].id);
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const weeks = catalog[subject.id] ?? [];
  const scores = new Map(scoresByWeek(state.answers.filter((a) => a.subjectId === subject.id)).map((s) => [s.week, s]));

  return (
    <div className="card">
      <div className="subject-row wrap">
        <SubjectIcon subject={subject} />
        <select className="select" value={subject.id} onChange={(e) => setSubjectId(e.target.value)} aria-label="Choose subject">
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {weeks.length === 0 ? (
        <div className="empty"><div className="empty-icon">◇</div>Questions for this subject are coming soon.</div>
      ) : (
        <div className="table-scroll mt-lg">
          <table className="table table-stack">
            <thead>
              <tr><th>Week</th><th>Questions</th><th>Your accuracy</th><th /></tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const s = scores.get(w.week);
                return (
                  <tr key={w.week}>
                    <td><strong>Week {w.week}</strong> · {w.title}</td>
                    <td data-label="Questions:">{w.questionCount}</td>
                    <td>
                      {s ? <span className={`text-bold ${accuracyTone(s.accuracy)}`}>{s.accuracy}%</span> : <span className="muted">Not tried</span>}
                      {s && <span className="muted"> · {s.attempted} answered</span>}
                    </td>
                    <td className="text-right">
                      <Link className="btn btn-secondary" href={`/practice/${subject.id}/${w.week}`}>{s ? 'Practice again' : 'Start'} →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
