import { ImageResponse } from 'next/og';
import { AppIcon } from '@/components/app-icon';

/** PNG app icons (phones need PNG, not the SVG favicon): /pwa-icon/96, /192 and /512. */
const SIZES = [96, 192, 512];

export const dynamic = 'force-static';
export const generateStaticParams = () => SIZES.map((size) => ({ size: String(size) }));

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = SIZES.includes(Number((await params).size)) ? Number((await params).size) : 192;
  return new ImageResponse(<AppIcon size={size} />, { width: size, height: size });
}
