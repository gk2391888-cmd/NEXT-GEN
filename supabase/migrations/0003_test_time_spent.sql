-- Seconds spent on each mock test question (Pro analytics). Safe to re-run.
alter table public.test_attempts add column if not exists time_spent smallint[];
