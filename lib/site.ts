/**
 * The site's public address, for metadata, the sitemap and link previews.
 * NEXT_PUBLIC_SITE_URL wins (set it when a custom domain is added); otherwise each host
 * names itself (the site runs on both Vercel and Netlify, see gateway/), and locally localhost.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  // Netlify's production address.
  process.env.URL ??
  'http://localhost:3000';
