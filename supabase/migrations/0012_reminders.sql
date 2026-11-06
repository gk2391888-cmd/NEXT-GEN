-- NEXT GEN: daily study reminders (web push). Run once in Supabase → SQL Editor after 0011. Safe to re-run.
--
-- Each browser that turns reminders on stores its push subscription here, with the
-- student's choices. Every hour pg_cron asks the site to send the reminders due at
-- that hour (India time), at most one a day per device: see app/api/reminders/send.

create table if not exists public.push_subscriptions (
  endpoint     text primary key check (char_length(endpoint) <= 1000),
  user_id      uuid not null references auth.users (id) on delete cascade,
  p256dh       text not null check (char_length(p256dh) <= 200),
  auth         text not null check (char_length(auth) <= 100),
  daily        boolean not null default true,
  -- The hour (0–23, India time) the student picked for reminders.
  hour         smallint not null default 20 check (hour between 0 and 23),
  exam         boolean not null default true,
  mistakes     boolean not null default false,
  last_sent_on date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists push_subscriptions_hour_idx on public.push_subscriptions (hour, last_sent_on);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Only the server (service role) reads or writes subscriptions.
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- The send route may be called by anyone (it has no secret), so it does its work at most
-- once every 20 minutes: this hands out that turn.
create table if not exists public.reminder_runs (
  id          smallint primary key check (id = 1),
  last_run_at timestamptz not null default '-infinity'
);
insert into public.reminder_runs (id) values (1) on conflict do nothing;
alter table public.reminder_runs enable row level security;
revoke all on public.reminder_runs from anon, authenticated;

create or replace function public.claim_reminder_run()
returns boolean
language sql
security definer
set search_path = ''
as $$
  with turn as (
    update public.reminder_runs set last_run_at = now()
     where id = 1 and last_run_at < now() - interval '20 minutes'
    returning 1
  )
  select exists (select 1 from turn);
$$;
revoke all on function public.claim_reminder_run() from public, anon, authenticated;
grant execute on function public.claim_reminder_run() to service_role;

-- ---------------------------------------------------------------- hourly trigger
-- pg_cron runs in UTC; at 5 past every hour it calls the site, which works out the India hour.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'nextgen-reminders';
select cron.schedule(
  'nextgen-reminders',
  '5 * * * *',
  $$ select net.http_post(url := 'https://nextgenvercelready.vercel.app/api/reminders/send', body := '{}'::jsonb, timeout_milliseconds := 30000) $$
);
