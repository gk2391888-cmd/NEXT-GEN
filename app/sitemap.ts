import type { MetadataRoute } from 'next';
import { getSubjects, getWeeks } from '@/lib/content';
import { PREVIEW_WEEK } from '@/lib/access';
import { QUALIFIER_MOCKS, QUALIFIERS } from '@/lib/qualifier';
import { SITE_URL } from '@/lib/site';

/** Pages anyone can open (lib/access.ts), for search engines: the main sections, the qualifier pages and free mocks, plus each subject's free preview week. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/qualifier', '/library', '/practice', '/grades', '/pricing', '/privacy', '/terms'];
  const subjects = getSubjects()
    .filter((s) => getWeeks(s.id).length > 0)
    .flatMap((s) => [`/library/${s.id}/${PREVIEW_WEEK}`, `/practice/${s.id}/${PREVIEW_WEEK}`]);
  const qualifier = [
    ...QUALIFIERS.flatMap((q) => [`/qualifier/${q.id}`, `/qualifier/${q.id}/plan`]),
    ...QUALIFIER_MOCKS.filter((m) => !m.pro).map((m) => `/qualifier/${m.qualifier}/mock/${m.id}`),
  ];
  return [...pages, ...qualifier, ...subjects].map((path) => ({ url: `${SITE_URL}${path}` }));
}
