import type { Metadata, Viewport } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Shell } from '@/components/shell';
import { AuthProvider } from '@/components/auth/auth-provider';
import { RAW } from '@/lib/tokens';
import { SITE_URL } from '@/lib/site';
import { THEME_BOOT_SCRIPT } from '@/lib/theme-boot';
import './tokens.css';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-jakarta', display: 'swap' });

const DESCRIPTION =
  'NEXT GEN by THE TECH HUB: week-wise Hinglish notes, practice questions and mock tests for IITM BS students: Data Science and Electronic Systems.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'NEXT GEN | Student Learning Hub', template: '%s | NEXT GEN' },
  description: DESCRIPTION,
  // Link previews in WhatsApp, Telegram and Instagram, where students share pages.
  openGraph: { type: 'website', siteName: 'NEXT GEN', locale: 'en_IN', title: 'NEXT GEN | Student Learning Hub', description: DESCRIPTION, url: '/' },
  twitter: { card: 'summary', title: 'NEXT GEN | Student Learning Hub', description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: RAW['color-nav-bg'] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the boot script before React loads, hence suppressHydrationWarning.
    <html lang="en" className={`${dmSans.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body>
        {/* Sets data-theme before first paint, so dark-mode students don't see a white flash. */}
        <Script id="theme-boot" strategy="beforeInteractive">{THEME_BOOT_SCRIPT}</Script>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
        {/* Vercel Web Analytics and Speed Insights: cookieless; they only report on the deployed site. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
