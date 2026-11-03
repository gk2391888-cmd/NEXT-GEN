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
        description="Code ka output pehle khud dry run karke predict karo, phir solution dekho. Har Python week ke practice questions mein aur bhi output-based problems hain."
      />
      <div className="alert alert-warn" style={{ marginBottom: 16 }}>
        Browser mein code run karne wala Coding Lab Phase 3 mein aayega. Tab tak in examples ko apne computer ke Python mein chala ke check karo.
      </div>
      <div className="grid grid-2">
        {labs.map((lab, i) => <LabCard key={lab.id} lab={lab} number={i + 1} />)}
      </div>
    </>
  );
}
