import type { Metadata } from 'next';
import { PricingPlans } from '@/components/pricing-plans';

export const metadata: Metadata = { title: 'Pricing' };

export default function PricingPage() {
  return <PricingPlans />;
}
