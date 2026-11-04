import { InlineText } from '@/components/ui';
import type { Week } from '@/lib/types';

/** The four sections of a week's notes. Rendered on the server for the free preview week, in the browser for the rest. */
export function WeekNotes({ week }: { week: Omit<Week, 'questions'> }) {
  return (
    <>
      <section className="notes-section">
        <h3><span className="num">1</span>Concept</h3>
        <ul>{week.concepts.map((c, i) => <li key={i}><InlineText text={c} /></li>)}</ul>
      </section>

      <section className="notes-section">
        <h3><span className="num">2</span>Solved example</h3>
        <div className="example">
          <div className="example-problem"><InlineText text={week.example.problem} /></div>
          {week.example.code && <pre className="code-block">{week.example.code}</pre>}
          <ol>{week.example.steps.map((s, i) => <li key={i}><InlineText text={s} /></li>)}</ol>
        </div>
      </section>

      <section className="notes-section">
        <h3><span className="num">3</span>Common mistakes</h3>
        {week.mistakes.map((m, i) => <div key={i} className="mistake"><InlineText text={m} /></div>)}
      </section>

      <section className="notes-section">
        <h3><span className="num">4</span>Quick revision</h3>
        <ul className="revision">{week.revision.map((r, i) => <li key={i}><InlineText text={r} /></li>)}</ul>
      </section>
    </>
  );
}
