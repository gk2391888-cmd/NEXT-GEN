import { getQualifierMock } from '@/lib/qualifier';
import { getQualifierPool } from '@/lib/qualifier-content';
import { proJson, requirePro } from '@/lib/server/pro-access';

export const dynamic = 'force-dynamic';

/** The questions of a Pro qualifier mock, for trial and Pro students only. */
export async function GET(req: Request, { params }: { params: Promise<{ mock: string }> }) {
  const { mock: mockId } = await params;
  const pool = getQualifierMock(mockId)?.pro ? getQualifierPool(mockId) : [];
  if (pool.length === 0) return proJson({ ok: false, code: 'not_found', message: 'Mock not found.' }, 404);

  const denied = await requirePro(req);
  if (denied) return denied;
  return proJson({ ok: true, pool });
}
