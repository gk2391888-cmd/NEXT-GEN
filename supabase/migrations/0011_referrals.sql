-- NEXT GEN: refer a friend. Run once in Supabase → SQL Editor after 0010. Safe to re-run.
--
-- A student shares their link (/i/<code>). A friend who opens it and signs up gets a
-- 14-day free trial instead of 7, but only if claim_trial() (0009) grants them a trial at
-- all, so the same email, device, network and throwaway-inbox checks apply. Once that
-- friend has answered 10 questions, the student who invited them gets 7 days of Pro,
-- for at most 5 friends in any 30 days. The numbers are mirrored in lib/referrals.ts.

-- ---------------------------------------------------------------- tables
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z2-9]{6,10}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id          bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  -- Unique: a student can be invited (and counted) only once.
  friend_id   uuid not null unique references auth.users (id) on delete cascade,
  -- joined: signed up, not yet 10 answers; rewarded: the inviter got 7 days; capped: monthly limit was reached.
  status      text not null default 'joined' check (status in ('joined', 'rewarded', 'capped')),
  created_at  timestamptz not null default now(),
  rewarded_at timestamptz
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, status, rewarded_at);

-- Only the server (service role) reads or writes these, through the functions below.
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on public.referral_codes, public.referrals from anon, authenticated;

-- ---------------------------------------------------------------- functions
-- (Dropped first so a re-run can change a function's result columns.)
drop function if exists public.referral_friends(uuid);

-- The student's code, made on first use: 7 characters without look-alikes (no 0/O, 1/I/L).
create or replace function public.referral_code_for(p_uid uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  found_code text;
  candidate  text;
begin
  select c.code into found_code from public.referral_codes c where c.user_id = p_uid;
  if found_code is not null then
    return found_code;
  end if;
  loop
    candidate := (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, 7));
    insert into public.referral_codes (user_id, code) values (p_uid, candidate)
      on conflict do nothing;
    select c.code into found_code from public.referral_codes c where c.user_id = p_uid;
    if found_code is not null then
      return found_code;
    end if;
  end loop;
end;
$$;

-- The inviter's first name for "Arjun invited you", or null for an unknown code.
create or replace function public.referral_owner(p_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(initcap(split_part(trim(p.full_name), ' ', 1)), ''), 'A friend')
  from public.referral_codes c
  left join public.profiles p on p.id = c.user_id
  where c.code = upper(trim(p_code));
$$;

-- Called by POST /api/trial/start right after claim_trial() granted the friend a trial.
-- Returns attached, unknown (no such code), self (own code) or already (invited before).
create or replace function public.attach_referral(p_friend uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  inviter uuid;
  added   bigint;
begin
  select c.user_id into inviter from public.referral_codes c where c.code = upper(trim(p_code));
  if inviter is null then
    return 'unknown';
  end if;
  if inviter = p_friend then
    return 'self';
  end if;
  insert into public.referrals (referrer_id, friend_id) values (inviter, p_friend)
    on conflict (friend_id) do nothing
    returning id into added;
  if added is null then
    return 'already';
  end if;
  -- 14 days instead of 7, from now (the trial was granted a moment ago).
  update public.profiles set trial_ends_at = now() + interval '14 days'
   where id = p_friend and trial_ends_at > now();
  return 'attached';
end;
$$;

-- The invite page's list: masked names ("Rahul S."), status and answers so far (up to 10).
create or replace function public.referral_friends(p_uid uuid)
returns table (name text, status text, joined_at timestamptz, rewarded_at timestamptz, answered int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(
      nullif(initcap(split_part(trim(p.full_name), ' ', 1)), '')
        || coalesce(' ' || nullif(upper(left(split_part(trim(p.full_name), ' ', 2), 1)), '') || '.', ''),
      'A friend'),
    r.status,
    r.created_at,
    r.rewarded_at,
    (select count(*) from (select 1 from public.answers a where a.user_id = r.friend_id limit 10) s)::int
  from public.referrals r
  left join public.profiles p on p.id = r.friend_id
  where r.referrer_id = p_uid
  order by r.created_at desc
  limit 50;
$$;

-- On every answer a friend saves: at the 10th, reward the inviter with 7 days of Pro, counted
-- from whichever ends last (now, their paid period or their trial), so no days are lost.
create or replace function public.reward_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref     public.referrals%rowtype;
  answers int;
  recent  int;
begin
  select * into ref from public.referrals r where r.friend_id = new.user_id and r.status = 'joined' for update;
  if not found then
    return null;
  end if;
  select count(*) into answers from (select 1 from public.answers a where a.user_id = new.user_id limit 10) s;
  if answers < 10 then
    return null;
  end if;
  select count(*) into recent from public.referrals r
   where r.referrer_id = ref.referrer_id and r.status = 'rewarded' and r.rewarded_at > now() - interval '30 days';
  if recent >= 5 then
    update public.referrals set status = 'capped' where id = ref.id;
    return null;
  end if;
  update public.profiles
     set pro_until = greatest(now(), coalesce(pro_until, now()), coalesce(trial_ends_at, now())) + interval '7 days'
   where id = ref.referrer_id;
  update public.referrals set status = 'rewarded', rewarded_at = now() where id = ref.id;
  return null;
end;
$$;

drop trigger if exists reward_referral on public.answers;
create trigger reward_referral after insert on public.answers
  for each row execute function public.reward_referral();

revoke all on function public.referral_code_for(uuid) from public, anon, authenticated;
revoke all on function public.referral_owner(text) from public, anon, authenticated;
revoke all on function public.attach_referral(uuid, text) from public, anon, authenticated;
revoke all on function public.referral_friends(uuid) from public, anon, authenticated;
revoke all on function public.reward_referral() from public, anon, authenticated;
grant execute on function public.referral_code_for(uuid) to service_role;
grant execute on function public.referral_owner(text) to service_role;
grant execute on function public.attach_referral(uuid, text) to service_role;
grant execute on function public.referral_friends(uuid) to service_role;
