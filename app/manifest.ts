import type { MetadataRoute } from 'next';

/** Lets students "Add to Home screen" and open NEXT GEN like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXT GEN · Student Learning Hub',
    short_name: 'NEXT GEN',
    description: 'Week-wise notes, practice, mock tests and AI doubt help for IITM BS Foundation students.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f7fb',
    theme_color: '#0c1831',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
