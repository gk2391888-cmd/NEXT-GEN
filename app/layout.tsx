import type { Metadata, Viewport } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import { Shell } from '@/components/shell';
import { AuthProvider } from '@/components/auth/auth-provider';
import { RAW } from '@/lib/tokens';
import './tokens.css';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'NEXT GEN | Student Learning Hub', template: '%s | NEXT GEN' },
  description:
    'NEXT GEN by THE TECH HUB: week-wise Hinglish notes, practice questions and mock tests for IITM BS Foundation students.',
};

export const viewport: Viewport = { themeColor: RAW['color-nav-bg'] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jakarta.variable}`}>
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
