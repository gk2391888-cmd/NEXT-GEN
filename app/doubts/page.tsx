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
        description="Search quick explanations of common concepts. A step-by-step AI doubt solver is coming soon."
      />
      <DoubtSearch faqs={faqs} />
    </>
  );
}
