import { getCatalog, getSubjects } from '@/lib/content';
import { Dashboard } from '@/components/dashboard';

export default function OverviewPage() {
  return <Dashboard subjects={getSubjects()} catalog={getCatalog()} />;
}
