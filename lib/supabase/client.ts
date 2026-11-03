'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDemoClient, DEMO, demoFetch } from './demo';

// The publishable key is meant to ship to the browser; Row Level Security in
// supabase/migrations is what keeps each student's data private.
// Env vars override these defaults, e.g. for a staging project.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://vpeugyyhasnawycbmjou.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_M8kI-wjBK1EAyRLQYQrCyg_pAoQ7M_D';

let client: SupabaseClient | null = null;

/** Browser-only Supabase client (sessions live in localStorage). */
export function getSupabase(): SupabaseClient {
  if (!client && DEMO) client = createDemoClient() as unknown as SupabaseClient;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      // Implicit flow so an emailed login link works even when the student opens it
      // in a different browser (e.g. the Gmail app) from the one that asked for it.
      auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** fetch() to our own API routes as the signed-in student. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (DEMO) return demoFetch(path, init);
  const { data } = await getSupabase().auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(path, { ...init, headers });
}

/** Which login providers are switched on in the Supabase dashboard (Google needs setup first). */
export async function getAuthProviders(): Promise<{ google: boolean; email: boolean }> {
  if (DEMO) return { google: true, email: true };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const data = await res.json();
    return { google: Boolean(data?.external?.google), email: Boolean(data?.external?.email) };
  } catch {
    return { google: false, email: true };
  }
}
