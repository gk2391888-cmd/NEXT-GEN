'use client';

import Link from 'next/link';
import { useProgramme } from '@/lib/programme-choice';

/** The Coding Lab runs Python only, which is a Data Science Foundation course; other programmes get a pointer to their own coding practice. */
export function LabProgrammeNote() {
  const programme = useProgramme();
  if (programme.id === 'ds') return null;
  return (
    <div className="alert mb-lg">
      The Coding Lab runs Python, which is a Data Science Foundation course and isn’t in the {programme.short} Foundation. For C,
      practise the “what does this print?” questions in <Link href="/practice">Practice Quiz</Link>; C can’t run in the browser yet.
    </div>
  );
}
