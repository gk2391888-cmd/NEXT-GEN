import { getQualifierPool } from '@/lib/qualifier-content';
import { QUALIFIER_MOCKS } from '@/lib/qualifier';

export const dynamic = 'force-static';
export const dynamicParams = false;

/** Only the free qualifier mocks; Pro ones come from /api/pro/qualifier/<mock>. */
export function generateStaticParams() {
  return QUALIFIER_MOCKS.filter((m) => !m.pro).map((m) => ({ mock: m.id }));
}

/** A free qualifier mock's questions, built at deploy time (for the doubt solver's "Asking about"). */
export async function GET(_req: Request, { params }: { params: Promise<{ mock: string }> }) {
  const { mock } = await params;
  return Response.json({ ok: true, pool: getQualifierPool(mock) });
}
