'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

type Announcement = { id: number; title: string; body: string; active: boolean; created_at: string };

export function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    const { data } = await getSupabase().from('announcements').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setStatus('Add a title.');
    const { error } = await getSupabase().from('announcements').insert({ title: title.trim(), body: body.trim() });
    if (error) return setStatus('Could not post. Try again.');
    setTitle('');
    setBody('');
    setStatus('Posted. Students see it on their Overview.');
    load();
  }

  async function toggle(a: Announcement) {
    await getSupabase().from('announcements').update({ active: !a.active }).eq('id', a.id);
    load();
  }

  async function remove(a: Announcement) {
    if (!window.confirm(`Delete “${a.title}”?`)) return;
    await getSupabase().from('announcements').delete().eq('id', a.id);
    load();
  }

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <form className="card" style={{ width: 360, flex: 'none' }} onSubmit={create}>
        <h3 style={{ marginBottom: 10 }}>New announcement</h3>
        <label className="field-label" htmlFor="an-title">Title</label>
        <input id="an-title" className="input" style={{ margin: '0 0 10px' }} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz 2 practice tests are live" />
        <label className="field-label" htmlFor="an-body">Message (optional)</label>
        <textarea id="an-body" className="input" style={{ margin: '0 0 10px', minHeight: 80 }} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn btn-primary">Post</button>
        {status && <p className="muted" role="status" style={{ marginTop: 8 }}>{status}</p>}
      </form>
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ marginBottom: 6 }}>All announcements</h3>
        {items.length === 0 && <p className="muted">None yet.</p>}
        {items.map((a) => (
          <div key={a.id} className="weak-row">
            <div style={{ minWidth: 0 }}>
              <strong>{a.title}</strong> {!a.active && <span className="chip chip-gray">HIDDEN</span>}
              {a.body && <div className="muted">{a.body}</div>}
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => toggle(a)}>{a.active ? 'Hide' : 'Show'}</button>
              <button className="btn btn-danger" onClick={() => remove(a)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
