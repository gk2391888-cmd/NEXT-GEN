import type { MetadataRoute } from 'next';
import { getSubjects, getWeeks } from '@/lib/content';
import { QUALIFIER_MOCKS, QUALIFIERS } from '@/lib/qualifier';
import { SITE_URL } from '@/lib/site';

/** Public pages for search engines: the main sections, the qualifier pages and free mocks, plus every week's notes, formula sheet and practice. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/qualifier', '/library', '/practice', '/tests', '/lab', '/doubts', '/planner', '/grades', '/pricing', '/search', '/privacy', '/terms'];
  const subjects = getSubjects().flatMap((s) => [
    `/library/${s.id}/formulas`,
    ...getWeeks(s.id).flatMap((w) => [`/library/${s.id}/${w.week}`, `/practice/${s.id}/${w.week}`]),
  ]);
  const qualifier = [
    ...QUALIFIERS.flatMap((q) => [`/qualifier/${q.id}`, `/qualifier/${q.id}/plan`]),
    ...QUALIFIER_MOCKS.filter((m) => !m.pro).map((m) => `/qualifier/${m.qualifier}/mock/${m.id}`),
  ];
  return [...pages, ...qualifier, ...subjects].map((path) => ({ url: `${SITE_URL}${path}` }));
}
