'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/supabase/client';
import { DEMO, demoFetch } from '@/lib/supabase/demo';
import {
  clearReferral,
  inviteLink,
  inviteMessage,
  normaliseCode,
  pendingReferral,
  REFERRAL,
  saveReferral,
  whatsappUrl,
  type ReferralFriend,
  type ReferralSummary,
} from '@/lib/referrals';
import { useAuth } from '@/components/auth/auth-provider';
import { ProgressBar } from '@/components/ui';

/* ---------------- The friend's side: sign-in page ---------------- */

/**
 * Remembers the invite code from /login?ref=… (or one opened earlier) and returns the inviter's
 * first name for the banner, or null. An unknown code is forgotten.
 */
export function useInviter(refParam: string | null) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const fromLink = normaliseCode(refParam);
    if (fromLink) saveReferral(fromLink);
    const code = fromLink ?? pendingReferral();
    if (!code) return;
    let cancelled = false;
    // A plain request (no sign-in header), so the CDN can answer it from its cache.
    (DEMO ? demoFetch : fetch)(`/api/referrals/owner?code=${code}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { name: string | null } | null) => {
        if (cancelled || !body) return;
        if (body.name) setName(body.name);
        else clearReferral();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refParam]);
  return name;
}

export function InvitedBanner({ name }: { name: string }) {
  return (
    <div className="invited-banner mb-lg" role="status">
      <span aria-hidden="true">🎁</span>
      <span><strong>{name} invited you to NEXT GEN.</strong> Sign up and get a <strong>{REFERRAL.friendTrialDays}-day free Pro trial</strong>.</span>
    </div>
  );
}

/* ---------------- The inviter's side ---------------- */

type Loaded = { data: ReferralSummary | null; error: string };

// One request per account per page load, shared by the Overview card and the invite page.
const cache = new Map<string, Promise<Loaded>>();

function loadReferrals(userId: string, fresh = false): Promise<Loaded> {
  if (fresh || !cache.has(userId)) {
    cache.set(
      userId,
      authedFetch('/api/referrals')
        .then(async (res) => {
          const body = await res.json().catch(() => null);
          return res.ok ? { data: body as ReferralSummary, error: '' } : { data: null, error: body?.error ?? 'Could not load your invites.' };
        })
        .catch(() => ({ data: null, error: 'Check your internet connection and try again.' })),
    );
  }
  return cache.get(userId)!;
}

/** The student's invite code and friends; null while loading or when logged out. */
export function useReferrals(): Loaded & { loading: boolean } {
  const { user } = useAuth();
  const [state, setState] = useState<Loaded & { loading: boolean }>({ data: null, error: '', loading: true });
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Fresh on each visit, so a friend's progress shows without a reload.
    loadReferrals(user.id, true).then((r) => !cancelled && setState({ ...r, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [user]);
  return state;
}

/** WhatsApp, copy and (on phones) the system share sheet for an invite link. */
export function InviteShare({ code, compact }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const link = inviteLink(code);
  const message = inviteMessage(link);
  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your invite link', link);
    }
  }

  return (
    <div className={compact ? 'btn-group' : 'stack'}>
      {!compact && (
        <div className="linkbox">
          <code>{link.replace(/^https?:\/\//, '')}</code>
          <button type="button" className="btn btn-secondary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
        </div>
      )}
      <div className="btn-group">
        <a className="btn btn-whatsapp" href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        {compact && <button type="button" className="btn btn-secondary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>}
        {!compact && canShare && (
          <button type="button" className="btn btn-secondary" onClick={() => navigator.share({ title: 'NEXT GEN', text: message }).catch(() => {})}>
            More options…
          </button>
        )}
      </div>
    </div>
  );
}

const HIDE_CARD_KEY = 'nextgen-invite-card-hidden';

/** The Overview's "Invite friends, get Pro free" card, for logged-in students until they close it. */
export function InviteCard() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(true);
  const { data } = useReferrals();
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(HIDE_CARD_KEY) === '1');
    } catch {
      setHidden(false);
    }
  }, []);
  if (!user || hidden || !data) return null;

  function hide() {
    setHidden(true);
    try {
      window.localStorage.setItem(HIDE_CARD_KEY, '1');
    } catch {
      // Hidden for this visit only.
    }
  }

  return (
    <section className="invite-card mt-lg" aria-labelledby="invite-card-title">
      <span className="invite-gift" aria-hidden="true">🎁</span>
      <div className="invite-copy">
        <h3 id="invite-card-title">Invite friends, get Pro free</h3>
        <p>
          You get <strong>{REFERRAL.rewardDays} days of Pro</strong> for every friend who joins and practises. Your friend gets a{' '}
          <strong>{REFERRAL.friendTrialDays}-day</strong> free trial. <Link className="link" href="/invite">How it works</Link>
        </p>
      </div>
      <InviteShare code={data.code} compact />
      <button type="button" className="invite-close" aria-label="Hide this card" onClick={hide}>✕</button>
    </section>
  );
}

/* ---------------- /invite ---------------- */

export function InvitePage() {
  const { user, ready } = useAuth();
  const { data, error, loading } = useReferrals();

  if (ready && !user) {
    return (
      <div className="card card-loose text-center">
        <h2 className="mb-sm">Invite friends, get Pro free</h2>
        <p className="muted mb-lg">Log in to get your invite link. You get {REFERRAL.rewardDays} days of Pro for every friend who joins and practises.</p>
        <Link className="btn btn-primary" href="/login?next=/invite">Log in or sign up</Link>
      </div>
    );
  }

  return (
    <div className="row">
      <section className="card card-loose row-main" aria-labelledby="invite-title">
        <span className="chip chip-blue">REFER A FRIEND</span>
        <h2 id="invite-title" className="mt-md mb-xs">Study together, and earn free Pro</h2>
        <p className="muted">Share your link with classmates in your IITM BS WhatsApp groups.</p>
        <ol className="invite-steps">
          <li><strong>Share your link</strong><span>On WhatsApp, Telegram or anywhere.</span></li>
          <li><strong>Friend signs up</strong><span>They get a {REFERRAL.friendTrialDays}-day free trial.</span></li>
          <li><strong>They answer {REFERRAL.questions} questions</strong><span>You get {REFERRAL.rewardDays} days of Pro.</span></li>
        </ol>
        {data ? <InviteShare code={data.code} /> : <p className="muted">{loading ? 'Loading your link…' : error}</p>}
        <p className="text-small muted mt-md">
          Up to {REFERRAL.monthlyLimit} friends in any 30 days count ({REFERRAL.monthlyLimit * REFERRAL.rewardDays} days of Pro). Each friend must be new to NEXT GEN, on their own device and email.
        </p>
      </section>

      <section className="card row-aside" aria-labelledby="friends-title">
        <div className="invite-stats">
          <div className="stat"><strong>{data?.friends.length ?? 0}</strong><span className="muted">Friends joined</span></div>
          <div className="stat"><strong>{data?.friends.filter((f) => f.status !== 'joined').length ?? 0}</strong><span className="muted">Practising</span></div>
          <div className="stat"><strong>{data?.earnedDays ?? 0}</strong><span className="muted">Pro days earned</span></div>
        </div>
        <h3 id="friends-title" className="card-title">Your friends</h3>
        {data && data.friends.length === 0 && <p className="muted my-md">No one has joined with your link yet. Friends show up here as soon as they sign up.</p>}
        {data?.friends.map((f, i) => <FriendRow key={i} friend={f} />)}
      </section>
    </div>
  );
}

function FriendRow({ friend: f }: { friend: ReferralFriend }) {
  const initials = f.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const joined = new Date(f.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <div className="friend-row">
      <span className="friend-avatar" aria-hidden="true">{initials}</span>
      <span className="flex-1 min-w-0">
        <strong>{f.name}</strong>
        {f.status === 'joined' ? (
          <>
            <small>{f.answered} of {REFERRAL.questions} questions</small>
            <ProgressBar value={(f.answered / REFERRAL.questions) * 100} />
          </>
        ) : (
          <small>Joined {joined}</small>
        )}
      </span>
      {f.status === 'rewarded' && <span className="chip chip-teal">+{REFERRAL.rewardDays} days</span>}
      {f.status === 'joined' && <span className="chip chip-gray">Pending</span>}
      {f.status === 'capped' && <span className="chip chip-yellow" title={`Only ${REFERRAL.monthlyLimit} friends count in any 30 days`}>Monthly limit</span>}
    </div>
  );
}
