import type { Metadata } from 'next';
import faqs from '@/content/faqs.json';
import { PageHead } from '@/components/ui';
import { DoubtSearch } from '@/components/doubt-search';

export const metadata: Metadata = { title: 'Doubt Help' };

export default function DoubtsPage() {
  return (
    <>
      <PageHead
        kicker="Guided support"
        title="Doubt Help"
        description="Common concepts ki quick explanations search karo. Step-by-step Hinglish AI Doubt Solver Phase 3 mein aayega."
      />
      <DoubtSearch faqs={faqs} />
    </>
  );
}
