'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from './supabase/client';

/** PDF notes, papers and formula sheets uploaded by admins (table note_files, Storage bucket "notes"). */
export type NoteFile = {
  id: number;
  subject_id: string;
  /** null: covers the whole subject (previous papers, formula sheets). */
  week: number | null;
  title: string;
  path: string;
  size_bytes: number;
  pro_only: boolean;
  created_at: string;
};

export const NOTES_BUCKET = 'notes';
export const MAX_NOTE_BYTES = 25 * 1024 * 1024;

export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** All uploaded files, or one subject's, newest first. `null` while loading. */
export function useNoteFiles(subjectId?: string) {
  const [files, setFiles] = useState<NoteFile[] | null>(null);

  const load = useCallback(async () => {
    let query = getSupabase()
      .from('note_files')
      .select('id, subject_id, week, title, path, size_bytes, pro_only, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (subjectId) query = query.eq('subject_id', subjectId);
    const { data } = await query;
    setFiles((data as NoteFile[] | null) ?? []);
  }, [subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { files, reload: load };
}

/** A one-hour signed link to the file, or null when Storage refuses (Pro file, not signed in, not found). */
export async function signedNoteUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from(NOTES_BUCKET).createSignedUrl(path, 3600);
  return error ? null : data?.signedUrl ?? null;
}

/**
 * A ready-made signed link for a plain <a target="_blank">, so opening the PDF
 * isn't a script popup (which in-app browsers like Instagram's block). Renewed
 * before it expires; null while loading or when the file can't be opened.
 */
export function useNoteLink(path: string, enabled: boolean) {
  const [link, setLink] = useState<{ url: string; at: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    const url = await signedNoteUrl(path);
    setFailed(!url);
    setLink(url ? { url, at: Date.now() } : null);
    return url;
  }, [path]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  /** Links older than 50 minutes are about to expire. */
  const fresh = link && Date.now() - link.at < 50 * 60_000 ? link.url : null;
  return { url: fresh, failed, refresh };
}
