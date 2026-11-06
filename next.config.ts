import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Invite links (/i/<code>, lib/referrals.ts): the sign-in page remembers the code and shows who invited you.
  async redirects() {
    return [{ source: '/i/:code([A-Za-z0-9]{6,10})', destination: '/login?ref=:code', permanent: false }];
  },
  // lib/content.ts reads content/ at request time in these routes (the doubt solver looks up questions), so ship it with them.
  outputFileTracingIncludes: {
    '/api/pro/**': ['./content/subjects.json', './content/weeks/*.json', './content/weeks-en/*.json', './content/qualifier/**/*.json'],
    '/api/ai/**': ['./content/weeks/*.json', './content/weeks-en/*.json', './content/qualifier/**/*.json'],
    // Question of the Day and Quiz War pick their questions on the server.
    '/api/daily': ['./content/subjects.json', './content/weeks/*.json', './content/weeks-en/*.json'],
    '/api/war/**': ['./content/subjects.json', './content/weeks/*.json', './content/weeks-en/*.json'],
  },
};

export default nextConfig;
