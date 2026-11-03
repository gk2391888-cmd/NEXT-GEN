'use client';

import Link from 'next/link';
import { useState } from 'react';

type Faq = { title: string; answer: string; tags: string };

export function DoubtSearch({ faqs }: { faqs: Faq[] }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? faqs.filter((f) => `${f.title} ${f.tags} ${f.answer}`.toLowerCase().includes(q)) : faqs;

  return (
    <div className="card">
      <h3 className="mb-xs">Search the concept help library</h3>
      <p className="muted">Try: determinant, range, independent events, grammar, Python loop.</p>
      <input className="input mt-md" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search concepts…" aria-label="Search doubt help topics" />
      {matches.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⌕</div>
          No matches found. Try another keyword, or check that week’s notes in the <Link href="/library">Study Library</Link>.
        </div>
      ) : (
        matches.map((f) => (
          <div key={f.title} className="weak-row stacked">
            <h3 className="text-title mb-xs">{f.title}</h3>
            <p>{f.answer}</p>
          </div>
        ))
      )}
    </div>
  );
}
