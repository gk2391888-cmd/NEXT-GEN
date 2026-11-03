import type { MetadataRoute } from 'next';
import { RAW } from '@/lib/tokens';

/** Lets students "Add to Home screen" and open NEXT GEN like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXT GEN · Student Learning Hub',
    short_name: 'NEXT GEN',
    description: 'Week-wise notes, practice, mock tests and AI doubt help for IITM BS students.',
    start_url: '/',
    display: 'standalone',
    background_color: RAW['color-bg-canvas'],
    theme_color: RAW['color-nav-bg'],
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
