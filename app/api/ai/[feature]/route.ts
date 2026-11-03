import { handleAiRequest } from '@/lib/server/ai/handler';

export const maxDuration = 60;

/** Every AI feature (see lib/ai/features.ts) is served here, e.g. POST /api/ai/doubt. */
export async function POST(req: Request, { params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  return handleAiRequest(req, feature);
}
