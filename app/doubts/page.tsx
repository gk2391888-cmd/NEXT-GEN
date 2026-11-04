import type { Metadata } from 'next';
import { Suspense } from 'react';
import faqs from '@/content/faqs.json';
import { PageHead } from '@/components/ui';
import { DoubtChat } from '@/components/doubt-chat';
import { DoubtSearch } from '@/components/doubt-search';
import { limitsFor } from '@/lib/ai/features';

export const metadata: Metadata = { title: 'AI Doubt Solver' };

export default function DoubtsPage() {
  return (
    <>
      <PageHead
        kicker="Ask anything"
        title="AI Doubt Solver"
        description={`Type your doubt in Hinglish or English and get a step-by-step explanation, up to ${limitsFor('doubt', 'pro')?.perDay} doubts a day.`}
      />
      <Suspense>
        <DoubtChat />
      </Suspense>
      <DoubtSearch faqs={faqs} />
    </>
  );
}
