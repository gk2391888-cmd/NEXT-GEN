import 'server-only';
import type { AiFeatureId } from '@/lib/ai/features';
import { doubt } from './doubt';
import type { FeatureHandler } from './types';

/** The server side of every feature in lib/ai/features.ts. TypeScript fails the build if one is missing. */
export const FEATURE_HANDLERS: Record<AiFeatureId, FeatureHandler<unknown>> = {
  doubt,
};
