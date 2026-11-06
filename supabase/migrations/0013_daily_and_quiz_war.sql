-- NEXT GEN: Question of the Day and Quiz War. Run once in Supabase → SQL Editor after 0012. Safe to re-run.
-- Only the server (service role) reads or writes these tables; the browser goes through /api/daily and /api/war.

-- ---------------------------------------------------------------- Question of the Day
-- One answer per student per day, for "68% of students got it right".
create table if not exists public.daily_answers (
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  question_id text not null check (char_length(question_id) <= 40),
  correct     boolean not null,
  answered_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists daily_answers_question_idx on public.daily_answers (day, question_id);
alter table public.daily_answers enable row level security;
revoke all on public.daily_answers from anon, authenticated;

-- ---------------------------------------------------------------- Quiz War
-- A war: its 10 questions and, in a live war, where everyone is (current_q, started at q_started_at).
create table if not exists public.wars (
  code         text primary key check (code ~ '^[0-9]{6}$'),
  host_id      uuid not null references auth.users (id) on delete cascade,
  -- live: friends together; challenge: each plays alone, scores compared; random: a live 1v1 with a stranger.
  mode         text not null check (mode in ('live', 'challenge', 'random')),
  subject_id   text not null check (char_length(subject_id) <= 20),
  from_week    smallint not null check (from_week between 1 and 20),
  to_week      smallint not null check (to_week between 1 and 20),
  question_ids text[] not null check (cardinality(question_ids) between 1 and 20),
  status       text not null default 'lobby' check (status in ('lobby', 'live', 'done')),
  current_q    smallint not null default 0,
  q_started_at timestamptz,
  -- A random war nobody joined in time becomes an open challenge the next searcher can take on.
  open         boolean not null default false,
  -- The code of the next war, when someone taps Rematch, so the others can follow.
  rematch      text,
  created_at   timestamptz not null default now()
);
alter table public.wars add column if not exists rematch text;
create index if not exists wars_matchmaking_idx on public.wars (mode, status, subject_id, created_at) where status = 'lobby' or open;
create index if not exists wars_host_idx on public.wars (host_id, created_at);

create table if not exists public.war_players (
  code         text not null references public.wars (code) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) <= 40),
  joined_at    timestamptz not null default now(),
  -- In a challenge each player runs through the questions on their own clock.
  current_q    smallint not null default 0,
  q_started_at timestamptz,
  finished_at  timestamptz,
  score        integer not null default 0,
  correct      smallint not null default 0,
  primary key (code, user_id)
);
create index if not exists war_players_user_idx on public.war_players (user_id, joined_at);

create table if not exists public.war_answers (
  code        text not null,
  user_id     uuid not null,
  q           smallint not null check (q between 0 and 19),
  choice      smallint check (choice between 0 and 3),
  correct     boolean not null,
  ms          integer not null check (ms >= 0),
  points      integer not null check (points >= 0),
  answered_at timestamptz not null default now(),
  primary key (code, user_id, q),
  foreign key (code, user_id) references public.war_players (code, user_id) on delete cascade
);

alter table public.wars enable row level security;
alter table public.war_players enable row level security;
alter table public.war_answers enable row level security;
revoke all on public.wars, public.war_players, public.war_answers from anon, authenticated;
