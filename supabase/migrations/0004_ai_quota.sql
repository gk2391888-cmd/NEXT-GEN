-- NEXT GEN: per-feature AI quotas. Run once in Supabase → SQL Editor after 0003. Safe to re-run.
--
-- The limits themselves (how many requests per day, cooldown) live in code,
-- in lib/ai/features.ts, so there's one place to change them. The database
-- only does the counting, atomically, so two requests at once can't both
-- squeeze past a limit. These functions take the limits as arguments, so only
-- the server (service role) may call them; students can't.

-- ---------------------------------------------------------------- usage per feature
alter table public.ai_usage add column if not exists feature text not null default 'doubt' check (char_length(feature) <= 40);
alter table public.ai_usage add column if not exists last_at timestamptz;
alter table public.ai_usage add column if not exists tokens  integer not null default 0;

alter table public.ai_usage drop constraint if exists ai_usage_pkey;
alter table public.ai_usage add constraint ai_usage_pkey primary key (user_id, day, feature);

-- ---------------------------------------------------------------- take one request
-- Returns allowed=false with reason 'limit' (daily limit reached) or
-- 'cooldown' (asked again too soon; retry_after = seconds to wait).
create or replace function public.consume_ai_quota(p_user uuid, p_feature text, p_daily_limit integer, p_cooldown_sec integer)
returns table (allowed boolean, reason text, used integer, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  cur_count integer;
  cur_last  timestamptz;
  wait_sec  integer;
begin
  insert into public.ai_usage (user_id, day, feature, count) values (p_user, today, p_feature, 0)
    on conflict (user_id, day, feature) do nothing;

  -- Lock the row so concurrent requests are counted one at a time.
  select u.count, u.last_at into cur_count, cur_last
    from public.ai_usage u
    where u.user_id = p_user and u.day = today and u.feature = p_feature
    for update;

  if cur_count >= p_daily_limit then
    return query select false, 'limit'::text, cur_count, 0;
    return;
  end if;

  wait_sec := case when cur_last is null then 0
               else greatest(0, p_cooldown_sec - floor(extract(epoch from now() - cur_last))::integer) end;
  if wait_sec > 0 then
    return query select false, 'cooldown'::text, cur_count, wait_sec;
    return;
  end if;

  update public.ai_usage u set count = u.count + 1, last_at = now()
    where u.user_id = p_user and u.day = today and u.feature = p_feature;
  return query select true, null::text, cur_count + 1, 0;
end;
$$;

-- ---------------------------------------------------------------- finish a request
-- Records the tokens used, and gives the request back if the AI failed, so a
-- student never loses a doubt to an outage.
create or replace function public.finish_ai_request(p_user uuid, p_feature text, p_success boolean, p_tokens integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  update public.ai_usage u
    set tokens = u.tokens + greatest(coalesce(p_tokens, 0), 0),
        count  = case when p_success then u.count else greatest(u.count - 1, 0) end,
        last_at = case when p_success then u.last_at else null end
    where u.user_id = p_user and u.day = today and u.feature = p_feature;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.finish_ai_request(uuid, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer, integer) to service_role;
grant execute on function public.finish_ai_request(uuid, text, boolean, integer) to service_role;

-- ---------------------------------------------------------------- old doubt-only function
-- Kept working (on feature 'doubt') only until the new code is deployed;
-- drop it in a later migration with: drop function public.consume_doubt();
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

  insert into public.ai_usage (user_id, day, feature, count) values (uid, today, 'doubt', 0)
    on conflict (user_id, day, feature) do nothing;
  update public.ai_usage set count = count + 1
    where user_id = uid and day = today and feature = 'doubt' and count < lim
    returning count into cur;

  if cur is null then
    select u.count into cur from public.ai_usage u where u.user_id = uid and u.day = today and u.feature = 'doubt';
    return query select false, cur, lim, is_p;
  else
    return query select true, cur, lim, is_p;
  end if;
end;
$$;
