import type { Metadata } from 'next';
import { getSubjects } from '@/lib/content';
import { ProfileForm } from '@/components/auth/profile-form';

export const metadata: Metadata = { title: 'My profile' };

export default function ProfilePage() {
  return <ProfileForm subjects={getSubjects()} />;
}
