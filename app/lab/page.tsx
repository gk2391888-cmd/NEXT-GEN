import type { Metadata } from 'next';
import labs from '@/content/lab.json';
import { PageHead } from '@/components/ui';
import { LabCard } from '@/components/lab-card';

export const metadata: Metadata = { title: 'Python & CT Lab' };

export default function LabPage() {
  return (
    <>
      <PageHead
        kicker="Learn by doing"
        title="Python & CT Practice Lab"
        description="Dry-run each snippet and predict its output before revealing the solution. Each Python week in Practice has more output-based questions."
      />
      <div className="alert alert-warn" style={{ marginBottom: 16 }}>
        An in-browser coding lab is coming soon. Until then, run these examples in Python on your own computer to check your answers.
      </div>
      <div className="grid grid-2">
        {labs.map((lab, i) => <LabCard key={lab.id} lab={lab} number={i + 1} />)}
      </div>
    </>
  );
}
