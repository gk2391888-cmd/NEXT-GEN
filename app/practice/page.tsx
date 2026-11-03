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
        description="Week choose karo aur MCQs solve karo. Har answer ke turant baad Hinglish explanation milega, aur galat answers weak topics mein track honge."
      />
      <PracticePicker subjects={getSubjects()} catalog={getCatalog()} />
    </>
  );
}
