import type { Metadata } from 'next';
import { PageHead } from '@/components/ui';
import { GradeCalculator } from '@/components/grade-calculator';

export const metadata: Metadata = {
  title: 'Grade Calculator',
  description: 'IITM BS Foundation grade calculator: work out your total and the end-term score you need for each grade from your assignments and quiz marks.',
};

export default function GradesPage() {
  return (
    <>
      <PageHead
        kicker="Know where you stand"
        title="Grade Calculator"
        description="Enter your assignment average and quiz scores to see the end-term score you need for each grade. Your numbers stay on this device."
      />
      <GradeCalculator />
    </>
  );
}
