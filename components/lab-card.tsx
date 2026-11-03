'use client';

import { useState } from 'react';

type Lab = { id: string; subject: string; level: string; title: string; question: string; code: string; answer: string; explanation: string };

export function LabCard({ lab, number }: { lab: Lab; number: number }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span className="chip chip-blue">{lab.subject}</span>
        <span className="chip chip-yellow">{lab.level}</span>
      </div>
      <h3 style={{ margin: '14px 0 4px' }}>{number}. {lab.title}</h3>
      <p>{lab.question}</p>
      <pre className="code-block">{lab.code}</pre>
      {open && (
        <div className="explain">
          <strong>Expected output</strong>
          <pre className="code-block" style={{ background: '#fff' }}>{lab.answer}</pre>
          {lab.explanation}
        </div>
      )}
      <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Hide solution' : 'Show solution →'}
      </button>
    </article>
  );
}
