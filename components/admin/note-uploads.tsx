'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { fileSize, MAX_NOTE_BYTES, NOTES_BUCKET, useNoteFiles, type NoteFile } from '@/lib/notes';
import { PROGRAMMES } from '@/lib/programmes';
import type { Subject, WeekRef } from '@/lib/types';
import { useConfirm } from '@/components/confirm-dialog';
import { NoteLink } from '@/components/library/note-files';

/** IITM terms run 12 weeks; used for subjects whose written notes aren't in yet. */
const DEFAULT_WEEKS = 12;

const titleFromName = (name: string) => name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120);
/** Every subject once, grouped by programme and level, so admins can upload for any programme. */
function subjectGroups(subjects: Subject[]) {
  const seen = new Set<string>();
  return PROGRAMMES.flatMap((p) =>
    p.levels.map((l) => ({
      label: `${p.short} · ${l.name}`,
      subjects: l.subjects.flatMap((id) => (seen.has(id) ? [] : (seen.add(id), subjects.filter((s) => s.id === id)))),
    })),
  ).filter((g) => g.subjects.length);
}

const slug = (name: string) => titleFromName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'notes';

/** Upload PDF notes, papers and formula sheets; students see them on the Study Library and week pages. */
export function NoteUploads({ subjects, catalog, userId }: { subjects: Subject[]; catalog: Record<string, WeekRef[]>; userId: string }) {
  const { files, reload } = useNoteFiles();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [week, setWeek] = useState('');
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<File[]>([]);
  const [proOnly, setProOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [formKey, setFormKey] = useState(0);
  const { confirm, dialog } = useConfirm();

  const refs = catalog[subjectId] ?? [];
  const weekOptions = refs.length ? refs : Array.from({ length: DEFAULT_WEEKS }, (_, i) => ({ week: i + 1, title: '', questionCount: 0 }));
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.short ?? id;

  function pick(list: FileList | null) {
    const chosen = [...(list ?? [])];
    const bad = chosen.find((f) => f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name));
    const big = chosen.find((f) => f.size > MAX_NOTE_BYTES);
    if (bad) setStatus(`“${bad.name}” isn't a PDF.`);
    else if (big) setStatus(`“${big.name}” is ${fileSize(big.size)}; the limit is ${fileSize(MAX_NOTE_BYTES)}.`);
    else setStatus('');
    setPicked(bad || big ? [] : chosen);
    if (chosen.length === 1 && !bad && !big) setTitle(titleFromName(chosen[0].name));
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!picked.length) return setStatus('Choose one or more PDF files.');
    if (picked.length === 1 && !title.trim()) return setStatus('Add a title.');
    setBusy(true);
    setStatus('');
    const supabase = getSupabase();
    let done = 0;
    for (const file of picked) {
      setStatus(`Uploading ${done + 1} of ${picked.length}: ${file.name}…`);
      const path = `${subjectId}/${week || 'all'}/${Date.now()}-${slug(file.name)}.pdf`;
      const { error: uploadError } = await supabase.storage.from(NOTES_BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (uploadError) {
        setBusy(false);
        return setStatus(`Could not upload “${file.name}”: ${uploadError.message}. Has migration 0006 been run?`);
      }
      const { error } = await supabase.from('note_files').insert({
        subject_id: subjectId,
        week: week ? Number(week) : null,
        title: picked.length === 1 ? title.trim() : titleFromName(file.name),
        path,
        size_bytes: file.size,
        pro_only: proOnly,
        uploaded_by: userId,
      });
      if (error) {
        await supabase.storage.from(NOTES_BUCKET).remove([path]);
        setBusy(false);
        return setStatus(`Could not save “${file.name}”. Try again.`);
      }
      done += 1;
    }
    setBusy(false);
    setPicked([]);
    setTitle('');
    setFormKey((k) => k + 1);
    setStatus(`Uploaded ${done} file${done === 1 ? '' : 's'}. Students see ${done === 1 ? 'it' : 'them'} in the Study Library now.`);
    reload();
  }

  async function togglePro(f: NoteFile) {
    const { error } = await getSupabase().from('note_files').update({ pro_only: !f.pro_only }).eq('id', f.id);
    if (error) setStatus('Could not update the file.');
    reload();
  }

  async function remove(f: NoteFile) {
    if (!(await confirm({ title: 'Delete this PDF?', message: `“${f.title}” is removed for every student.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    const supabase = getSupabase();
    const { error: storageError } = await supabase.storage.from(NOTES_BUCKET).remove([f.path]);
    if (storageError) return setStatus('Could not delete the file. Try again.');
    await supabase.from('note_files').delete().eq('id', f.id);
    reload();
  }

  return (
    <div className="row">
      <form key={formKey} className="card row-aside" onSubmit={upload}>
        <h3 className="mb-md">Upload PDF</h3>
        <div className="field">
          <label className="field-label" htmlFor="nf-subject">Subject</label>
          <select id="nf-subject" className="input" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setWeek(''); }}>
            {subjectGroups(subjects).map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="nf-week">Week</label>
          <select id="nf-week" className="input" value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="">All weeks (papers, formula sheets)</option>
            {weekOptions.map((w) => <option key={w.week} value={w.week}>Week {w.week}{w.title ? ` · ${w.title}` : ''}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="nf-file">PDF files (up to {fileSize(MAX_NOTE_BYTES)} each)</label>
          <input id="nf-file" className="input" type="file" accept="application/pdf,.pdf" multiple onChange={(e) => pick(e.target.files)} />
        </div>
        {picked.length <= 1 ? (
          <div className="field">
            <label className="field-label" htmlFor="nf-title">Title</label>
            <input id="nf-title" className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 3 handwritten notes" />
          </div>
        ) : (
          <p className="muted mb-md">{picked.length} files chosen. Each is titled from its file name.</p>
        )}
        <label className="check mb-md">
          <input type="checkbox" checked={proOnly} onChange={(e) => setProOnly(e.target.checked)} /> Pro students only
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
        {status && <p className="muted mt-sm" role="status">{status}</p>}
      </form>

      <div className="card row-main">
        <h3 className="card-title">Uploaded PDFs{files?.length ? ` (${files.length})` : ''}</h3>
        {files === null && <p className="muted">Loading…</p>}
        {files?.length === 0 && <p className="muted">None yet. Uploads show up on the Study Library page and the matching week’s notes.</p>}
        {files?.map((f) => (
          <div key={f.id} className="weak-row">
            <div className="min-w-0">
              <strong>{f.title}</strong> {f.pro_only && <span className="chip chip-teal chip-sm">PRO</span>}
              <div className="muted">{subjectName(f.subject_id)} · {f.week ? `Week ${f.week}` : 'All weeks'} · {fileSize(f.size_bytes)}</div>
            </div>
            <div className="btn-group">
              <NoteLink file={f} label="Open" />
              <button className="btn btn-secondary" onClick={() => togglePro(f)}>{f.pro_only ? 'Make free' : 'Make Pro'}</button>
              <button className="btn btn-danger" onClick={() => remove(f)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {dialog}
    </div>
  );
}
