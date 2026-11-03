'use client';

import Link from 'next/link';
import { useChoice } from '@/lib/programme-choice';
import type { WeekRef } from '@/lib/types';

/** True while none of the chosen level's subjects has notes yet (e.g. a Diploma still being written). */
export function useLevelComingSoon(catalog: Record<string, WeekRef[]>): boolean {
  return useChoice().level.subjects.every((id) => !(catalog[id] ?? []).length);
}

/**
 * Shown in place of a page's content while the chosen level has no notes, so nothing looks empty or broken.
 * `action` finishes "there's nothing to … yet": study, plan, search.
 */
export function LevelComingSoon({ action }: { action: string }) {
  const { programme, level } = useChoice();
  return (
    <div className="card empty">
      <div className="empty-icon">◇</div>
      <p>
        Notes for <strong>{programme.short} – {level.name}</strong> are coming soon, so there’s nothing to {action} yet.
      </p>
      <p>
        Meanwhile, pick another course from the “Preparing for” menu or in <Link className="link" href="/profile">My profile</Link>.
      </p>
    </div>
  );
}
