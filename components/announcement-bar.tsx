'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

type Announcement = { id: number; title: string; body: string };

/** Active announcements posted from the admin panel, newest first. */
export function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    getSupabase()
      .from('announcements')
      .select('id, title, body')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <>
      {items.map((a) => (
        <div key={a.id} className="announcement" role="note">
          <strong>📣 {a.title}</strong>
          {a.body}
        </div>
      ))}
    </>
  );
}
