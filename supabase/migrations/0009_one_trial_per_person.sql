-- NEXT GEN: one free trial per person, and admins always have full access.
-- Run once in Supabase → SQL Editor after 0008. Safe to re-run.
--
-- Until now every new account got 7 days of Pro from the column default, so a
-- student could sign up again with a new email for another trial. From here on:
--   1. New accounts start with no trial (trial_ends_at is null).
--   2. After the first login the app calls POST /api/trial/start, which calls
--      claim_trial() with the service role. It grants 7 days only when the
--      email (normalised: Gmail dots and +tags removed), this device and this
--      network haven't already had one. Otherwise the account is created
--      without a trial and can still buy Pro.
--   3. Every claim is kept in trial_claims, even after the account is deleted,
--      as one-way fingerprints (SHA-256), never the email or IP itself.
-- Existing accounts keep their trial_ends_at and pro_until exactly as they are.

-- ---------------------------------------------------------------- new accounts start without a trial
alter table public.profiles alter column trial_ends_at drop default;

-- ---------------------------------------------------------------- admins always have access
create or replace function public.is_pro(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.pro_until > now() or p.trial_ends_at > now() from public.profiles p where p.id = uid), false)
      or exists (select 1 from public.admins a where a.user_id = uid);
$$;

-- ---------------------------------------------------------------- email fingerprint
-- Lower-cases, drops a +tag (rahul+2@x.com → rahul@x.com) and, for Gmail, the
-- dots Gmail ignores (r.a.h.u.l@gmail.com → rahul@gmail.com), then hashes it.
create or replace function public.email_key(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  with parts as (
    select split_part(split_part(lower(trim(email)), '@', 1), '+', 1) as local_part,
           split_part(lower(trim(email)), '@', 2) as domain
  )
  select encode(sha256(convert_to(
    case when domain in ('gmail.com', 'googlemail.com') then replace(local_part, '.', '') || '@gmail.com'
         else local_part || '@' || domain end, 'UTF8')), 'hex')
  from parts;
$$;

-- ---------------------------------------------------------------- trial claims
create table if not exists public.trial_claims (
  id          bigint generated always as identity primary key,
  -- Kept (set to null) when the account is deleted, so deleting and signing up again doesn't give a new trial.
  user_id     uuid references auth.users (id) on delete set null,
  email_key   text not null,
  device_keys text[] not null default '{}',
  ip_key      text,
  granted     boolean not null,
  -- Why no trial was given: email, device, network or disposable. Null when granted.
  reason      text check (reason in ('email', 'device', 'network', 'disposable')),
  created_at  timestamptz not null default now()
);
create index if not exists trial_claims_email_idx on public.trial_claims (email_key) where granted;
create index if not exists trial_claims_device_idx on public.trial_claims using gin (device_keys) where granted;
create index if not exists trial_claims_ip_idx on public.trial_claims (ip_key, created_at) where granted;

alter table public.trial_claims enable row level security;
revoke all on public.trial_claims from anon, authenticated;
-- No policies: only the service role (which bypasses RLS) reads or writes it.

-- Every existing account already had its trial: record those emails, so a dotted
-- or +tagged copy of an old address doesn't get a second one.
insert into public.trial_claims (user_id, email_key, granted, created_at)
select u.id, public.email_key(u.email), true, p.created_at
from auth.users u
join public.profiles p on p.id = u.id
where u.email is not null
  and p.trial_ends_at is not null
  and not exists (select 1 from public.trial_claims c where c.user_id = u.id);

-- ---------------------------------------------------------------- claim_trial
-- Called only by POST /api/trial/start (service role), once per account.
-- p_devices: this browser's device ids (cookie and local storage).
-- p_ip: a keyed hash of the student's IP address, computed by the server.
-- p_disposable: the email's domain is a throwaway-inbox service.
-- Returns 'granted', 'already' (the account had its turn; its devices are recorded)
-- or the reason for no trial.
create or replace function public.claim_trial(p_uid uuid, p_devices text[], p_ip text, p_disposable boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ends   timestamptz;
  addr   text;
  key    text;
  reason text;
begin
  -- One claim at a time, so two tabs or two new accounts can't both slip through.
  perform pg_advisory_xact_lock(hashtext('public.claim_trial'));

  select p.trial_ends_at into ends from public.profiles p where p.id = p_uid for update;
  if not found then
    return 'already';
  end if;
  if ends is not null or exists (select 1 from public.trial_claims c where c.user_id = p_uid) then
    -- Remember the devices of accounts that already had a trial (including accounts
    -- from before this migration), so a second account on the same device gets none.
    update public.trial_claims c
       set device_keys = array(select distinct d from unnest(c.device_keys || coalesce(p_devices, '{}')) as d)
     where c.user_id = p_uid and c.granted and not (c.device_keys @> coalesce(p_devices, '{}'));
    return 'already';
  end if;

  select u.email into addr from auth.users u where u.id = p_uid;
  key := public.email_key(coalesce(addr, p_uid::text));

  if p_disposable then
    reason := 'disposable';
  elsif exists (select 1 from public.trial_claims c where c.granted and c.email_key = key) then
    reason := 'email';
  elsif cardinality(p_devices) > 0 and exists (select 1 from public.trial_claims c where c.granted and c.device_keys && p_devices) then
    reason := 'device';
  -- Lenient, since a hostel or mobile network can put many students behind one IP.
  elsif p_ip is not null and (
    select count(*) from public.trial_claims c where c.granted and c.ip_key = p_ip and c.created_at > now() - interval '1 day'
  ) >= 3 then
    reason := 'network';
  end if;

  insert into public.trial_claims (user_id, email_key, device_keys, ip_key, granted, reason)
  values (p_uid, key, coalesce(p_devices, '{}'), p_ip, reason is null, reason);

  -- No trial still sets a date (now), so the app knows the check has been done.
  update public.profiles
     set trial_ends_at = case when reason is null then now() + interval '7 days' else now() end
   where id = p_uid;

  return coalesce(reason, 'granted');
end;
$$;

revoke all on function public.claim_trial(uuid, text[], text, boolean) from public, anon, authenticated;
grant execute on function public.claim_trial(uuid, text[], text, boolean) to service_role;
revoke all on function public.email_key(text) from public, anon, authenticated;
grant execute on function public.email_key(text) to service_role;
