-- NEXT GEN Phase 3: plans (free / trial / Pro), error reports, admin content
-- edits, announcements and the AI doubt quota. Run once in Supabase → SQL
-- Editor after 0001. Safe to re-run.

-- ---------------------------------------------------------------- plans
alter table public.profiles add column if not exists trial_ends_at timestamptz;
alter table public.profiles add column if not exists pro_until     timestamptz;
alter table public.profiles add column if not exists exam_name     text check (char_length(exam_name) <= 60);
alter table public.profiles add column if not exists exam_date     date;

-- Every account gets 7 days of Pro from sign-up, existing ones included.
update public.profiles set trial_ends_at = created_at + interval '7 days' where trial_ends_at is null;
alter table public.profiles alter column trial_ends_at set default now() + interval '7 days';

-- Students may edit their own profile, but never their plan dates.
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, subjects, last_visited, exam_name, exam_date, updated_at) on public.profiles to authenticated;

create or replace function public.is_pro(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.pro_until > now() or p.trial_ends_at > now() from public.profiles p where p.id = uid), false);
$$;

-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists "see own admin row" on public.admins;
create policy "see own admin row" on public.admins for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- error reports
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 40),
  kind        text not null check (kind in ('wrong_answer', 'unclear', 'typo', 'other')),
  message     text not null default '' check (char_length(message) <= 1000),
  status      text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  created_at  timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, question_id);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select, insert on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

drop policy if exists "file a report" on public.reports;
create policy "file a report" on public.reports for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'open');
drop policy if exists "read own or admin" on public.reports;
create policy "read own or admin" on public.reports for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
drop policy if exists "admin triage" on public.reports;
create policy "admin triage" on public.reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- content edits
-- Admin corrections layered over the built-in content, so fixes go live without a redeploy.
-- key: 'q:<question id>' for a question.
create table if not exists public.content_overrides (
  key        text primary key check (char_length(key) <= 60),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.content_overrides enable row level security;
revoke all on public.content_overrides from anon, authenticated;
grant select on public.content_overrides to anon, authenticated;
grant insert, update, delete on public.content_overrides to authenticated;

drop policy if exists "anyone reads" on public.content_overrides;
create policy "anyone reads" on public.content_overrides for select to anon, authenticated using (true);
drop policy if exists "admin writes" on public.content_overrides;
create policy "admin writes" on public.content_overrides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- announcements
create table if not exists public.announcements (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) <= 120),
  body       text not null default '' check (char_length(body) <= 1000),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

drop policy if exists "anyone reads active" on public.announcements;
create policy "anyone reads active" on public.announcements for select to anon, authenticated
  using (active or (select public.is_admin()));
drop policy if exists "admin manages" on public.announcements;
create policy "admin manages" on public.announcements for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- AI doubt quota
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   integer not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
drop policy if exists "see own usage" on public.ai_usage;
create policy "see own usage" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);

-- Takes one doubt from today's allowance (India time). Free: 5/day, Pro: 200/day fair use.
create or replace function public.consume_doubt()
returns table (allowed boolean, used integer, daily_limit integer, pro boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  today date := (now() at time zone 'Asia/Kolkata')::date;
  is_p  boolean;
  lim   integer;
  cur   integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  is_p := public.is_pro(uid);
  lim := case when is_p then 200 else 5 end;

  insert into public.ai_usage (user_id, day, count) values (uid, today, 0) on conflict (user_id, day) do nothing;
  update public.ai_usage set count = count + 1
    where user_id = uid and day = today and count < lim
    returning count into cur;

  if cur is null then
    select u.count into cur from public.ai_usage u where u.user_id = uid and u.day = today;
    return query select false, cur, lim, is_p;
  else
    return query select true, cur, lim, is_p;
  end if;
end;
$$;

revoke all on function public.consume_doubt() from public, anon;
grant execute on function public.consume_doubt() to authenticated;
revoke all on function public.is_pro(uuid) from public, anon;
grant execute on function public.is_pro(uuid) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------- payments
-- Written only by the server (service role) after verifying Razorpay's signature.
create table if not exists public.payments (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  amount_paise        integer not null,
  status              text not null check (status in ('created', 'paid', 'failed')),
  created_at          timestamptz not null default now()
);
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
drop policy if exists "see own payments" on public.payments;
create policy "see own payments" on public.payments for select to authenticated using ((select auth.uid()) = user_id);
