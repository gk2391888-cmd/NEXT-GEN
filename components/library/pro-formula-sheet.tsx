'use client';

import Link from 'next/link';
import { useProContent } from '@/lib/pro-content';
import { ChoiceWeek } from '@/components/programme-switch';
import { ProContentStatus } from '@/components/pro-lock';
import { InlineText } from '@/components/ui';

type SheetWeek = { week: number; title: string; revision: string[] };

/** Every week's revision points, from /api/pro/formulas/<subject> (trial and Pro only). */
export function ProFormulaSheet({ subjectId }: { subjectId: string }) {
  const { data, error, retry } = useProContent<{ weeks: SheetWeek[] }>(`/api/pro/formulas/${subjectId}`);
  if (!data) return <ProContentStatus error={error} onRetry={retry} />;
  return (
    <div className="formula-grid">
      {data.weeks.map((w) => (
        <ChoiceWeek key={w.week} subjectId={subjectId} week={w.week}>
          <section className="formula-week">
            <h3><Link href={`/library/${subjectId}/${w.week}`}>Week {w.week} · {w.title}</Link></h3>
            <ul className="revision">{w.revision.map((r, i) => <li key={i}><InlineText text={r} /></li>)}</ul>
          </section>
        </ChoiceWeek>
      ))}
    </div>
  );
}
