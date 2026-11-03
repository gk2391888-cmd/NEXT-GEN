'use client';

import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { progress } from '@/lib/progress/store';
import { sync } from '@/lib/sync';
import { ImportPrompt } from './import-prompt';

type AuthState = {
  user: User | null;
  /** False until the saved session (if any) has been checked. */
  ready: boolean;
  /** True once the first download after login has finished. */
  loaded: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({ user: null, ready: false, loaded: false, signOut: async () => {} });

export const useAuth = () => useContext(AuthContext);

/** Upload queued changes this long after the last one, so a quiz doesn't send a request per click. */
const PUSH_DELAY_MS = 1500;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Point the progress store at the right copy and pull the account's data.
  useEffect(() => {
    if (!ready) return;
    progress.setScope(userId);
    setLoaded(false);
    if (!userId) return;
    let cancelled = false;
    sync(userId).finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  // Push changes shortly after they happen, and catch up when the network or tab comes back.
  useEffect(() => {
    if (!userId) return;
    let timer: number | undefined;
    let lastPending = progress.getState().pending.length;
    const unsubscribe = progress.subscribe(() => {
      const pending = progress.getState().pending.length;
      if (pending > lastPending) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => sync(userId, { pull: false }), PUSH_DELAY_MS);
      }
      lastPending = pending;
    });
    const catchUp = () => document.visibilityState === 'visible' && sync(userId);
    window.addEventListener('online', catchUp);
    document.addEventListener('visibilitychange', catchUp);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.removeEventListener('online', catchUp);
      document.removeEventListener('visibilitychange', catchUp);
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    if (userId) await sync(userId, { pull: false });
    await getSupabase().auth.signOut();
  }, [userId]);

  return (
    <AuthContext.Provider value={{ user, ready, loaded, signOut }}>
      {children}
      {userId && loaded && <ImportPrompt user={user!} />}
    </AuthContext.Provider>
  );
}

/** First letters of the student's name, or of their email. */
export function initials(user: User, fullName?: string) {
  const source = (fullName || user.user_metadata?.full_name || user.user_metadata?.name || user.email || '?').trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 && !source.includes('@') ? parts[1][0] : '')).toUpperCase();
}
