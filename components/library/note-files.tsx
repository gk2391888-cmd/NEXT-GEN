'use client';

import Link from 'next/link';
import { fileSize, useNoteFiles, useNoteLink, type NoteFile } from '@/lib/notes';
import { usePlan } from '@/lib/plan';
import type { Subject } from '@/lib/types';

const weekLabel = (f: NoteFile) => (f.week ? `Week ${f.week}` : 'All weeks');

/** "Open PDF" as a real link to a signed URL. A stale or missing link is renewed on click and opened in this tab. */
export function NoteLink({ file, label = 'Open PDF' }: { file: NoteFile; label?: string }) {
  const { url, failed, refresh } = useNoteLink(file.path, true);

  async function onClick(e: React.MouseEvent) {
    if (url) return;
    e.preventDefault();
    const next = await refresh();
    if (next) window.location.href = next;
  }

  return (
    <>
      <a className="btn btn-secondary nowrap" href={url ?? '#'} target="_blank" rel="noopener noreferrer" onClick={onClick}>{label}</a>
      {failed && <span className="field-error" role="alert">Could not open this file.</span>}
    </>
  );
}

function FileRow({ file, meta }: { file: NoteFile; meta: string }) {
  const plan = usePlan();
  const locked = file.pro_only && !plan.isPro;

  return (
    <div className="weak-row note-file">
      <div className="min-w-0">
        <strong>📄 {file.title}</strong> {file.pro_only && <span className="chip chip-teal chip-sm">PRO</span>}
        <div className="muted">{meta} · PDF · {fileSize(file.size_bytes)}</div>
      </div>
      {locked ? (
        <Link className="btn btn-secondary nowrap" href={plan.tier === 'guest' ? '/login?next=/pricing' : '/pricing'}>🔒 Unlock with Pro</Link>
      ) : (
        <NoteLink file={file} />
      )}
    </div>
  );
}

/** PDFs for one week of a subject, shown on that week's notes page. Renders nothing until there are some. */
export function WeekNoteFiles({ subjectId, week }: { subjectId: string; week: number }) {
  const { files } = useNoteFiles(subjectId);
  const list = (files ?? []).filter((f) => f.week === week || f.week === null);
  if (!list.length) return null;

  return (
    <section className="notes-section no-print">
      <h3><span className="num">↓</span>PDF notes and downloads</h3>
      {list.map((f) => <FileRow key={f.id} file={f} meta={weekLabel(f)} />)}
    </section>
  );
}

/** Every uploaded PDF, grouped by subject, for the Study Library page. */
export function AllNoteFiles({ subjects }: { subjects: Subject[] }) {
  const { files } = useNoteFiles();
  if (!files?.length) return null;

  const groups = subjects
    .map((s) => ({ subject: s, list: files.filter((f) => f.subject_id === s.id).sort((a, b) => (a.week ?? 0) - (b.week ?? 0)) }))
    .filter((g) => g.list.length);

  return (
    <>
      <div className="section-title">
        <h2>PDF notes and papers</h2>
        <span className="muted">{files.length} file{files.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-2">
        {groups.map(({ subject, list }) => (
          <div key={subject.id} className="card">
            <h3 className="card-title">{subject.name}</h3>
            {list.map((f) => <FileRow key={f.id} file={f} meta={weekLabel(f)} />)}
          </div>
        ))}
      </div>
    </>
  );
}
