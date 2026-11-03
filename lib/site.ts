/**
 * The site's public address, for metadata, the sitemap and link previews.
 * NEXT_PUBLIC_SITE_URL wins (set it when a custom domain is added); on Vercel the
 * production domain is used, and locally localhost.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
