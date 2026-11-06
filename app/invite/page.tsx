import type { Metadata } from 'next';
import { PageHead } from '@/components/ui';
import { InvitePage } from '@/components/referral';
import { REFERRAL } from '@/lib/referrals';

export const metadata: Metadata = { title: 'Invite Friends' };

export default function Invite() {
  return (
    <>
      <PageHead
        kicker="Refer a friend"
        title="Invite Friends"
        description={`You get ${REFERRAL.rewardDays} days of Pro for every friend who joins and practises, and they get a ${REFERRAL.friendTrialDays}-day free trial.`}
      />
      <InvitePage />
    </>
  );
}
