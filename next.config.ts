import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // lib/content.ts reads content/ at request time in these routes (the doubt solver looks up questions), so ship it with them.
  outputFileTracingIncludes: {
    '/api/pro/**': ['./content/subjects.json', './content/weeks/*.json', './content/weeks-en/*.json', './content/qualifier/**/*.json'],
    '/api/ai/**': ['./content/weeks/*.json', './content/weeks-en/*.json', './content/qualifier/**/*.json'],
  },
};

export default nextConfig;
