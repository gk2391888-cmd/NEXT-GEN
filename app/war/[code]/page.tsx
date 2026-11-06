import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WarRoom } from '@/components/war';
import { formatCode, parseCode } from '@/lib/war';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const code = parseCode((await params).code);
  return { title: code ? `Quiz War ${formatCode(code)}` : 'Quiz War', description: 'Join this Quiz War on NEXT GEN: same questions, same timer, fastest right answer wins.' };
}

export default async function WarRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = parseCode((await params).code);
  if (!code) notFound();
  return <WarRoom code={code} />;
}
