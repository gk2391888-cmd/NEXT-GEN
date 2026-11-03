import { COURSE_LIMITS, PASS_RULES, QUALIFIER_FACTS_CHECKED, QUALIFIER_SOURCES } from '@/lib/qualifier';

const STEPS = [
  { title: 'Apply', text: 'Apply on the official site for the term and pay the qualifier fee.' },
  { title: '4 weeks of study', text: 'Lecture videos, live sessions and a graded assignment every week in each of the 4 courses.' },
  { title: 'Get a hall ticket', text: 'In each course, the average of your best 2 of the first 3 assignments must reach the minimum (below). Only then do you get a hall ticket.' },
  { title: 'Write the exam', text: 'One in-person exam of 4 hours at a test centre, covering all 4 courses.' },
];

/**
 * The qualifier process and rules, as published on the official admissions pages (they're the same for
 * every programme). Every number here is in lib/qualifier.ts, with the date it was checked.
 */
export function QualifierFacts() {
  return (
    <div className="stack">
      <div className="grid grid-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card">
            <span className="chip chip-blue">STEP {i + 1}</span>
            <h3 className="mt-md mb-sm">{s.title}</h3>
            <p className="muted m-0">{s.text}</p>
          </div>
        ))}
      </div>

      <section className="card" id="rules">
        <h3 className="card-title">Hall ticket and pass rules</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Category</th><th>Assignments, each course</th><th>Exam, each course</th><th>Exam, average</th></tr>
            </thead>
            <tbody>
              {PASS_RULES.map((r) => (
                <tr key={r.category}>
                  <td>{r.category}</td>
                  <td>{r.assignments}%</td>
                  <td>{r.eachCourse}%</td>
                  <td><strong>{r.average}%</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted mt-md">
          You need the minimum in <strong>every</strong> course and on average, so one weak course can stop you. The relaxed cut-offs apply only to the qualifier.
        </p>
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h3 className="card-title">After you pass</h3>
          <ul className="rich-list">
            <li>
              Your average exam score sets how many courses you can take in your first term:{' '}
              {COURSE_LIMITS.map((c) => `${c.range}: up to ${c.courses}`).join(' · ')}.
            </li>
            <li>For the Data Science programme, qualifier marks count as Quiz 1 for the foundation courses you register for in the same term.</li>
            <li>For the Data Science programme, the result is valid for 3 terms (1 year), or 6 terms (2 years) if you haven’t written your Class 12 exams yet.</li>
            <li>If you were eligible but didn’t pass, you can re-attempt the exam in the same term for a lower fee, without redoing the assignments.</li>
          </ul>
        </section>
        <section className="card">
          <h3 className="card-title">Not published: check your hall ticket</h3>
          <ul className="rich-list">
            <li>The exact date, session and centre of your exam.</li>
            <li>Question types (single answer, multiple answers, numerical), the number of questions per course and any negative marking.</li>
            <li>Fees and dates for the current term, and whether you can enter directly with JEE Advanced.</li>
          </ul>
          <p className="muted m-0">Sources, checked {QUALIFIER_FACTS_CHECKED}:</p>
          <ul className="rich-list">
            {QUALIFIER_SOURCES.map((s) => (
              <li key={s.href}><a className="link" href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
