import type { MetadataRoute } from 'next';
import { getSubjects, getWeeks } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

/** Public pages for search engines: the main sections plus every week's notes, formula sheet and practice. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/library', '/practice', '/tests', '/lab', '/doubts', '/planner', '/grades', '/pricing', '/search', '/privacy', '/terms'];
  const subjects = getSubjects().flatMap((s) => [
    `/library/${s.id}/formulas`,
    ...getWeeks(s.id).flatMap((w) => [`/library/${s.id}/${w.week}`, `/practice/${s.id}/${w.week}`]),
  ]);
  return [...pages, ...subjects].map((path) => ({ url: `${SITE_URL}${path}` }));
}
