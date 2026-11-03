-- NEXT GEN: pay for Pro by scanning our UPI QR. The student submits the UTR
-- (UPI reference number), an admin matches it against the bank statement and
-- approves it, and the server adds 30 days of Pro. Run once in Supabase → SQL
-- Editor after 0004. Safe to re-run.

-- ---------------------------------------------------------------- UPI requests
-- Written only by the server (service role): /api/payments/upi and /api/payments/upi/review.
create table if not exists public.upi_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  email       text not null default '' check (char_length(email) <= 320),
  utr         text not null unique check (utr ~ '^[0-9]{12}$'),
  amount_inr  integer not null check (amount_inr > 0),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note        text not null default '' check (char_length(note) <= 300),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists upi_requests_status_idx on public.upi_requests (status, created_at);
create index if not exists upi_requests_user_idx on public.upi_requests (user_id, created_at);
alter table public.upi_requests enable row level security;
revoke all on public.upi_requests from anon, authenticated;
grant select on public.upi_requests to authenticated;
drop policy if exists "read own or admin" on public.upi_requests;
create policy "read own or admin" on public.upi_requests for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
