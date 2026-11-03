import type { Metadata } from 'next';
import { getSubjects } from '@/lib/content';
import { AdminPanel } from '@/components/admin/admin-panel';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };

export default function AdminPage() {
  return <AdminPanel subjects={getSubjects()} />;
}
