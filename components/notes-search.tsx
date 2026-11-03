'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuestionBank, type BankQuestion } from '@/lib/question-bank';
import { useQuestionLang } from '@/lib/question-lang';
import { localize } from '@/lib/question-text';
import { LanguageSwitch } from '@/components/quiz/language-switch';
import { useChoice } from '@/lib/programme-choice';

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

/** Practice questions whose text (in either language) contains every search word. */
function searchQuestions(bank: BankQuestion[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const textOf = (q: BankQuestion) => [q.question, ...q.options, q.en?.question ?? '', ...(q.en?.options ?? [])].join(' ').toLowerCase();
  return bank.filter((q) => words.every((w) => textOf(q).includes(w))).slice(0, 10);
}

function snippet(text: string, query: string) {
  const word = query.toLowerCase().split(/\s+/).find((w) => w.length > 1 && text.toLowerCase().includes(w));
  if (!word) return '';
  const i = text.toLowerCase().indexOf(word);
  const start = Math.max(0, i - 60);
  return `${start > 0 ? '…' : ''}${text.slice(start, i + 120)}…`;
}

export function NotesSearch({ entries: allEntries }: { entries: SearchEntry[] }) {
  const router = useRouter();
  const initial = useSearchParams().get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const level = useChoice().level;
  const entries = useMemo(() => {
    const ids = new Set(level.subjects);
    return allEntries.filter((e) => ids.has(e.subjectId));
  }, [allEntries, level]);
  const results = useMemo(() => search(entries, query), [entries, query]);
  const subjectNames = useMemo(() => new Map(entries.map((e) => [e.subjectId, e.subject])), [entries]);

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
      {query.trim().length > 1 && <QuestionHits query={query} subjects={subjectNames} />}
    </div>
  );
}

/** Matching practice questions, shown in the student's chosen language. The question bank loads once a search starts. */
function QuestionHits({ query, subjects }: { query: string; subjects: Map<string, string> }) {
  const bank = useQuestionBank();
  const lang = useQuestionLang();
  const hits = useMemo(() => (bank ? searchQuestions(bank.filter((q) => subjects.has(q.subjectId)), query) : []), [bank, query, subjects]);
  if (!bank || hits.length === 0) return null;
  return (
    <>
      <div className="flex-between mt-lg">
        <h3>Practice questions</h3>
        <LanguageSwitch />
      </div>
      {hits.map((q) => (
        <Link key={q.id} href={`/practice/${q.subjectId}/${q.week}`} className="search-hit">
          <span className="muted">{subjects.get(q.subjectId)} · Week {q.week} · {q.weekTitle}</span>
          <strong>{localize(q, lang).question.replace(/[*`]/g, '')}</strong>
        </Link>
      ))}
    </>
  );
}
