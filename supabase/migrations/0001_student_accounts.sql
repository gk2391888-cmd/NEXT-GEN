-- NEXT GEN Phase 2: student accounts and cloud progress.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Every table is protected by Row Level Security: a student can only read and
-- write their own rows, enforced by the database itself.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null default '' check (char_length(full_name) <= 80),
  subjects     text[] not null default '{}',
  last_visited jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- answers
-- One row per answered question (practice or mock test). `id` is generated on
-- the device so retries after a network failure never create duplicates.
create table if not exists public.answers (
  user_id     uuid not null references auth.users (id) on delete cascade,
  id          text not null check (char_length(id) <= 64),
  question_id text not null check (char_length(question_id) <= 40),
  subject_id  text not null check (char_length(subject_id) <= 20),
  week        smallint not null check (week between 0 and 20),
  correct     boolean not null,
  mode        text not null check (mode in ('practice', 'test')),
  answered_at timestamptz not null,
  primary key (user_id, id)
);
create index if not exists answers_user_subject_idx on public.answers (user_id, subject_id, week);

-- ---------------------------------------------------------------- test_attempts
create table if not exists public.test_attempts (
  user_id      uuid not null references auth.users (id) on delete cascade,
  id           text not null check (char_length(id) <= 64),
  subject_id   text not null check (char_length(subject_id) <= 20),
  test_id      text not null check (char_length(test_id) <= 20),
  started_at   timestamptz not null,
  submitted_at timestamptz not null,
  duration_sec integer not null check (duration_sec >= 0),
  question_ids text[] not null,
  responses    smallint[] not null,
  correct      smallint not null check (correct >= 0),
  total        smallint not null check (total > 0 and total <= 100),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------- week_status
create table if not exists public.week_status (
  user_id    uuid not null references auth.users (id) on delete cascade,
  subject_id text not null check (char_length(subject_id) <= 20),
  week       smallint not null check (week between 1 and 20),
  done       boolean not null default false,
  saved      boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_id, week)
);

-- ---------------------------------------------------------------- row level security
-- Only signed-in students reach these tables through the API; logged-out
-- visitors (anon) get nothing.
revoke all on public.profiles, public.answers, public.test_attempts, public.week_status from anon;
grant select, insert, update, delete on public.profiles, public.answers, public.test_attempts, public.week_status to authenticated;

alter table public.profiles      enable row level security;
alter table public.answers       enable row level security;
alter table public.test_attempts enable row level security;
alter table public.week_status   enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "own answers" on public.answers;
create policy "own answers" on public.answers
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own test attempts" on public.test_attempts;
create policy "own test attempts" on public.test_attempts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own week status" on public.week_status;
create policy "own week status" on public.week_status
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- new user → profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- delete my account
-- Lets a signed-in student permanently delete themselves; all their rows go
-- with it through `on delete cascade`.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
