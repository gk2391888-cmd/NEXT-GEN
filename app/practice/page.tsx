import type { Metadata } from 'next';
import { getCatalog, getSubjects } from '@/lib/content';
import { PageHead } from '@/components/ui';
import { PracticePicker } from '@/components/quiz/practice-picker';

export const metadata: Metadata = { title: 'Practice Quiz' };

export default function PracticePage() {
  return (
    <>
      <PageHead
        kicker="Build confidence"
        title="Practice Quiz"
        description="Pick a level (Easy, Medium, Hard or Mixed) and a week, then solve its MCQs. Each answer is followed by an explanation, and mistakes feed into your weak-topic report."
      />
      <PracticePicker subjects={getSubjects()} catalog={getCatalog()} />
    </>
  );
}
