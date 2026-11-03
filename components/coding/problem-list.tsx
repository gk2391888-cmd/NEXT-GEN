'use client';

import Link from 'next/link';
import { useProgress } from '@/lib/progress/store';
import { usePlan } from '@/lib/plan';
import { ProTag } from '@/components/pro-lock';
import type { CodingProblem } from '@/lib/coding';

type Summary = Pick<CodingProblem, 'id' | 'tier' | 'set' | 'week' | 'title' | 'difficulty'>;

const DIFFICULTY_CHIP = { easy: 'chip-teal', medium: 'chip-yellow', hard: 'chip-red' } as const;

export function ProblemList({ problems, sets }: { problems: Summary[]; sets: { id: string; title: string; minutes: number }[] }) {
  const { coding = {}, codingAttempts = [] } = useProgress();
  const { isPro } = usePlan();
  const practice = problems.filter((p) => p.tier === 'practice');
  const solvedCount = practice.filter((p) => coding[p.id]).length;

  return (
    <div className="row">
      <section className="card row-main">
        <div className="quiz-top">
          <h3>Practice problems</h3>
          <span className="muted">{solvedCount} of {practice.length} solved</span>
        </div>
        <div className="table-scroll">
          <table className="table table-stack">
            <thead><tr><th>#</th><th>Problem</th><th>Week</th><th>Level</th><th /></tr></thead>
            <tbody>
              {practice.map((p, i) => (
                <tr key={p.id}>
                  <td className="muted">{i + 1}</td>
                  <td><Link href={`/lab/${p.id}`}><strong>{p.title}</strong></Link></td>
                  <td className="muted">{p.week}</td>
                  <td><span className={`chip ${DIFFICULTY_CHIP[p.difficulty]}`}>{p.difficulty.toUpperCase()}</span></td>
                  <td className="text-right">{coding[p.id] ? <span className="chip chip-teal">✓ SOLVED</span> : <Link className="link" href={`/lab/${p.id}`}>Solve →</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="test-side stack">
        {sets.map((set) => {
          const list = problems.filter((p) => p.set === set.id);
          const done = list.filter((p) => coding[p.id]).length;
          const best = codingAttempts.filter((a) => a.setId === set.id).reduce<number | null>((b, a) => Math.max(b ?? 0, a.score), null);
          return (
            <div key={set.id} className="card test-card">
              <div className="flex-between">
                <strong>{set.title}</strong>
                <ProTag />
              </div>
              <div className="test-meta"><span>{list.length} problems</span><span>{set.minutes} min timer</span><span>Hidden tests</span></div>
              {isPro && <div className="muted">{done} of {list.length} solved{best !== null && ` · Best exam score ${best}/100`}</div>}
              <Link className="btn btn-primary" href={`/lab/oppe/${set.id}`}>{isPro ? 'Take timed exam' : 'See what’s inside'} →</Link>
              {isPro && <Link className="link" href={`/lab/${list[0]?.id}`}>{done ? 'Continue practising' : 'Practise untimed'} →</Link>}
            </div>
          );
        })}
      </aside>
    </div>
  );
}
