'use client';

import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { progress } from '@/lib/progress/store';
import { sync } from '@/lib/sync';
import { claimTrial, savedTrialResult } from '@/lib/trial';
import { ImportPrompt } from './import-prompt';

type AuthState = {
  user: User | null;
  /** False until the saved session (if any) has been checked. */
  ready: boolean;
  /** True once the first download after login has finished. */
  loaded: boolean;
  /** Can use the admin panel (checked by the database, see is_admin()). */
  isAdmin: boolean;
  /** A new account's free trial: being claimed, or the request failed (see lib/trial.ts). */
  trial: 'idle' | 'starting' | 'failed';
  retryTrial: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({ user: null, ready: false, loaded: false, isAdmin: false, trial: 'idle', retryTrial: () => {}, signOut: async () => {} });

export const useAuth = () => useContext(AuthContext);

/** Upload queued changes this long after the last one, so a quiz doesn't send a request per click. */
const PUSH_DELAY_MS = 1500;
/** Least time between two full downloads of a student's progress when they return to the tab. */
const PULL_EVERY_MS = 10 * 60_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trial, setTrial] = useState<AuthState['trial']>('idle');
  const userId = user?.id ?? null;

  /**
   * A new account has no plan dates until it claims its free trial (one per person, decided
   * by the server). Accounts that already had their turn still ask once per device, so the
   * device is recorded against them.
   */
  const startTrial = useCallback(async (uid: string) => {
    const plan = progress.getState().plan;
    const unclaimed = !plan?.trialEndsAt && !plan?.proUntil;
    if (!unclaimed && savedTrialResult(uid)) return;
    if (unclaimed) setTrial('starting');
    const result = await claimTrial(uid);
    if (unclaimed && result) await sync(uid);
    if (progress.getScope() === uid) setTrial(unclaimed && !result ? 'failed' : 'idle');
  }, []);

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
    setIsAdmin(false);
    setTrial('idle');
    if (!userId) return;
    let cancelled = false;
    // Loaded only once the plan and the admin flag are both known, so the paywall never flashes.
    const admin = getSupabase().rpc('is_admin').then(({ data }) => !cancelled && setIsAdmin(data === true));
    Promise.allSettled([sync(userId), admin]).then(() => {
      if (cancelled) return;
      setLoaded(true);
      startTrial(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, userId, startTrial]);

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
    // Coming back to the tab always uploads what's waiting, but downloads everything again at most every
    // 10 minutes: on phones every app switch fires this, and a full download is every answer and test.
    let lastPull = Date.now();
    const catchUp = () => {
      if (document.visibilityState !== 'visible') return;
      const pull = Date.now() - lastPull > PULL_EVERY_MS;
      if (pull) lastPull = Date.now();
      sync(userId, { pull });
    };
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

  const retryTrial = useCallback(() => {
    if (userId) startTrial(userId);
  }, [userId, startTrial]);

  return (
    <AuthContext.Provider value={{ user, ready, loaded, isAdmin, trial, retryTrial, signOut }}>
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
