'use client';

import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { useProgress } from '@/lib/progress/store';
import { setChoice, useChoice, useSubjectCode } from '@/lib/programme-choice';
import { CHOICES, PROGRAMMES, QUALIFIER, QUALIFIER_PATH } from '@/lib/programmes';
import type { Subject } from '@/lib/types';

/** Picks the programme level (or the qualifier) whose subjects every page lists. Compact in the sidebar; a form field on the profile. */
export function ProgrammeSwitch({ variant = 'sidebar' }: { variant?: 'sidebar' | 'field' }) {
  const id = useId();
  const router = useRouter();
  const choice = useChoice();
  const state = useProgress();

  function change(value: string) {
    setChoice(value, state.profile);
    if (value === QUALIFIER) router.push(QUALIFIER_PATH);
  }

  return (
    <div className={variant === 'sidebar' ? 'side-programme' : undefined}>
      <label className={variant === 'sidebar' ? 'side-eyebrow' : 'field-label'} htmlFor={id}>
        {variant === 'sidebar' ? 'PREPARING FOR' : 'What are you preparing for?'}
      </label>
      <select id={id} className={variant === 'sidebar' ? 'programme-select' : 'select w-full'} value={choice.id} onChange={(e) => change(e.target.value)}>
        {PROGRAMMES.map((p) => (
          <optgroup key={p.id} label={variant === 'sidebar' ? p.short : p.name}>
            {CHOICES.filter((c) => c.programme === p).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}{c.comingSoon ? ' (notes coming soon)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={QUALIFIER}>{variant === 'sidebar' ? 'Qualifier exam' : CHOICES.find((c) => c.id === QUALIFIER)?.label}</option>
      </select>
    </div>
  );
}

/** A subject's course code as the student's programme writes it, for pages rendered on the server. */
export function SubjectCode({ subject }: { subject: Subject }) {
  return <>{useSubjectCode(subject)}</>;
}
