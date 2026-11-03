-- NEXT GEN: remove the old AI doubt counter. Since migration 0004 the server
-- counts every AI feature with consume_ai_quota(), so nothing calls
-- consume_doubt() (hard-coded 5/200 a day) any more; leaving it lets signed-in
-- students call it directly. Run once in Supabase → SQL Editor after 0007. Safe to re-run.

drop function if exists public.consume_doubt();
