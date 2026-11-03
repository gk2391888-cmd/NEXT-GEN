'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

export type SearchEntry = { subjectId: string; subject: string; week: number; title: string; summary: string; text: string };

/** Ranks weeks by how many of the search words they contain, with title matches counting extra. */
function search(entries: SearchEntry[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  return entries
    .map((e) => {
      const text = e.text.toLowerCase();
      const title = e.title.toLowerCase();
      const score = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0) + (title.includes(w) ? 2 : 0), 0);
      const all = words.every((w) => text.includes(w));
      return { e, score: all ? score + 5 : score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map((r) => r.e);
}

function snippet(text: string, query: string) {
  const word = query.toLowerCase().split(/\s+/).find((w) => w.length > 1 && text.toLowerCase().includes(w));
  if (!word) return '';
  const i = text.toLowerCase().indexOf(word);
  const start = Math.max(0, i - 60);
  return `${start > 0 ? '…' : ''}${text.slice(start, i + 120)}…`;
}

export function NotesSearch({ entries }: { entries: SearchEntry[] }) {
  const router = useRouter();
  const initial = useSearchParams().get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const results = useMemo(() => search(entries, query), [entries, query]);

  return (
    <div className="card">
      <input
        className="input"
        style={{ marginTop: 0 }}
        type="search"
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          router.replace(`/search?q=${encodeURIComponent(e.target.value)}`, { scroll: false });
        }}
        placeholder="Try: median, determinant, for loop, passive voice"
        aria-label="Search notes"
      />
      {query.trim().length > 1 && results.length === 0 && <div className="empty">No notes match “{query}”. Try a different word.</div>}
      {results.map((r) => (
        <Link key={`${r.subjectId}-${r.week}`} href={`/library/${r.subjectId}/${r.week}`} className="search-hit">
          <span className="muted">{r.subject} · Week {r.week}</span>
          <strong>{r.title}</strong>
          <span className="muted">{snippet(r.text, query) || r.summary}</span>
        </Link>
      ))}
    </div>
  );
}
