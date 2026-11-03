import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // lib/content.ts reads content/ at request time in these routes, so ship it with them.
  outputFileTracingIncludes: {
    '/api/pro/**': ['./content/subjects.json', './content/weeks/*.json'],
  },
};

export default nextConfig;
