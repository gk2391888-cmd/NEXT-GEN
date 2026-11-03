'use client';

import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from './supabase/client';

/** Error codes from /api/pro/* (see lib/server/pro-access.ts). */
export type ProContentErrorCode = 'login_required' | 'not_in_plan' | 'not_found' | 'failed';

export class ProContentError extends Error {
  constructor(readonly code: ProContentErrorCode, message: string) {
    super(message);
  }
}

/**
 * Fetches Pro content from /api/pro/*, which checks the plan on the server.
 * The body's other fields come back as T; an error throws ProContentError.
 */
export async function fetchProContent<T>(path: string): Promise<T> {
  const res = await authedFetch(path).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  if (!res || !body) throw new ProContentError('failed', 'Couldn’t load this. Check your connection and try again.');
  if (!res.ok || !body.ok) throw new ProContentError(body.code ?? 'failed', body.message ?? 'Couldn’t load this. Please try again.');
  return body as T;
}

/** fetchProContent as a hook: data is null while loading or after an error. */
export function useProContent<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ProContentError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    fetchProContent<T>(path)
      .then((d) => alive && setData(d))
      .catch((e: ProContentError) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data, error, retry };
}
