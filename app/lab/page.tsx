import type { Metadata } from 'next';
import labs from '@/content/lab.json';
import { OPPE_SETS, PROBLEMS } from '@/lib/coding';
import { PageHead } from '@/components/ui';
import { LabCard } from '@/components/lab-card';
import { ProblemList } from '@/components/coding/problem-list';

export const metadata: Metadata = { title: 'Coding Lab' };

export default function LabPage() {
  const summary = PROBLEMS.map(({ id, tier, set, week, title, difficulty }) => ({ id, tier, set, week, title, difficulty }));
  return (
    <>
      <PageHead
        kicker="Learn by doing"
        title="Python Coding Lab"
        description="Write Python right in your browser and check it against test cases instantly. Practice problems are free; OPPE-style sets with hidden tests are part of Pro."
      />
      <ProblemList problems={summary} sets={OPPE_SETS} />

      <h2 style={{ margin: '30px 0 6px' }}>Predict the output</h2>
      <p className="muted" style={{ marginBottom: 14 }}>Dry-run each snippet in your head before revealing the answer.</p>
      <div className="grid grid-2">
        {labs.map((lab, i) => <LabCard key={lab.id} lab={lab} number={i + 1} />)}
      </div>
    </>
  );
}
