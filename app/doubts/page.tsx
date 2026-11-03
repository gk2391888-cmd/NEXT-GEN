import type { Metadata } from 'next';
import { Suspense } from 'react';
import faqs from '@/content/faqs.json';
import { PageHead } from '@/components/ui';
import { DoubtChat } from '@/components/doubt-chat';
import { DoubtSearch } from '@/components/doubt-search';

export const metadata: Metadata = { title: 'AI Doubt Solver' };

export default function DoubtsPage() {
  return (
    <>
      <PageHead
        kicker="Ask anything"
        title="AI Doubt Solver"
        description="Type your doubt in Hinglish or English and get a step-by-step explanation. Free students get 5 doubts a day; Pro is unlimited."
      />
      <Suspense>
        <DoubtChat />
      </Suspense>
      <h2 style={{ margin: '30px 0 12px' }}>Quick concept answers</h2>
      <DoubtSearch faqs={faqs} />
    </>
  );
}
