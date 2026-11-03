-- Timed OPPE simulations from the Coding Lab (/lab/oppe/<set>), synced like
-- test_attempts: one row per submitted attempt, ids generated on the device so
-- retried uploads never duplicate. Safe to re-run.

create table if not exists public.coding_attempts (
  user_id      uuid not null references auth.users (id) on delete cascade,
  id           text not null check (char_length(id) <= 64),
  set_id       text not null check (char_length(set_id) <= 20),
  started_at   timestamptz not null,
  submitted_at timestamptz not null,
  duration_sec integer not null check (duration_sec >= 0),
  score        smallint not null check (score between 0 and 100),
  -- [{ problemId, publicPassed, publicTotal, hiddenPassed, hiddenTotal, timeSec, code }]
  problems     jsonb not null check (jsonb_typeof(problems) = 'array' and jsonb_array_length(problems) <= 20 and octet_length(problems::text) <= 100000),
  primary key (user_id, id)
);

revoke all on public.coding_attempts from anon, authenticated;
grant select, insert, update, delete on public.coding_attempts to authenticated;

alter table public.coding_attempts enable row level security;

drop policy if exists "own coding attempts" on public.coding_attempts;
create policy "own coding attempts" on public.coding_attempts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
