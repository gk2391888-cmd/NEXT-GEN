'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { searchQuestions, type QuestionHit } from '@/lib/question-bank';
import { useChoice } from '@/lib/programme-choice';
import { useQuestionLang } from '@/lib/question-lang';
import { LanguageSwitch } from '@/components/quiz/language-switch';
import { useInChoice } from '@/lib/programme-choice';
import { LevelComingSoon } from '@/components/coming-soon';
import { ProContentStatus } from '@/components/pro-lock';
import { useProContent } from '@/lib/pro-content';

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

export function NotesSearch() {
  // Only the programme's subjects are downloaded.
  const choice = useChoice();
  const { data, error, retry } = useProContent<{ entries: SearchEntry[] }>(`/api/pro/search?subjects=${choice.level.subjects.join(',')}`);
  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return <SearchView allEntries={data.entries} />;
}

function SearchView({ allEntries }: { allEntries: SearchEntry[] }) {
  const router = useRouter();
  const initial = useSearchParams().get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const inChoice = useInChoice();
  const entries = useMemo(() => allEntries.filter((e) => inChoice(e.subjectId, e.week)), [allEntries, inChoice]);
  const results = useMemo(() => search(entries, query), [entries, query]);
  const subjectNames = useMemo(() => new Map(entries.map((e) => [e.subjectId, e.subject])), [entries]);

  if (entries.length === 0) return <LevelComingSoon action="search" />;

  return (
    <div className="card">
      <input
        className="input"
        type="search"
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          router.replace(`/search?q=${encodeURIComponent(e.target.value)}`, { scroll: false });
        }}
        placeholder="Try: median, determinant, for loop, passive voice"
        aria-label="Search notes and questions"
      />
      {query.trim().length > 1 && results.length === 0 && <div className="empty">No notes match “{query}”. Try a different word.</div>}
      {results.map((r) => (
        <Link key={`${r.subjectId}-${r.week}`} href={`/library/${r.subjectId}/${r.week}`} className="search-hit">
          <span className="muted">{r.subject} · Week {r.week}</span>
          <strong>{r.title}</strong>
          <span className="muted">{snippet(r.text, query) || r.summary}</span>
        </Link>
      ))}
      {query.trim().length > 1 && <QuestionHits query={query} subjects={subjectNames} inChoice={inChoice} />}
    </div>
  );
}

/** Matching practice questions, shown in the student's chosen language, searched on the server a moment after typing stops. */
function QuestionHits({ query, subjects }: { query: string; subjects: Map<string, string>; inChoice: (subjectId: string, week?: number) => boolean }) {
  const lang = useQuestionLang();
  const choice = useChoice();
  const [hits, setHits] = useState<QuestionHit[]>([]);
  const ids = [...subjects.keys()].join(',');
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      searchQuestions(query, ids.split(','), choice.weeks)
        .then((h) => alive && setHits(h))
        .catch(() => alive && setHits([]));
    }, 400);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, ids, choice.weeks]);
  if (hits.length === 0) return null;
  return (
    <>
      <div className="flex-between mt-lg">
        <h3>Practice questions</h3>
        <LanguageSwitch />
      </div>
      {hits.map((q) => (
        <Link key={q.id} href={`/practice/${q.subjectId}/${q.week}`} className="search-hit">
          <span className="muted">{subjects.get(q.subjectId)} · Week {q.week} · {q.weekTitle}</span>
          <strong>{(lang === 'en' && q.en ? q.en.question : q.question).replace(/[*`]/g, '')}</strong>
        </Link>
      ))}
    </>
  );
}
