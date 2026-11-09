-- NEXT GEN: the hourly reminders call (migration 0012) now carries a secret, and the site's
-- address lives in a setting, so moving hosts doesn't mean editing the cron job.
-- Run once in Supabase → SQL Editor after 0013. Safe to re-run (keeps an existing secret and URL).
--
-- After running it:
--   1. select value from private.app_settings where name = 'reminders_secret';
--   2. Put that value in the host's environment as REMINDERS_SECRET and redeploy.
--      Until it's set, /api/reminders/send still accepts calls without the secret.
--   3. Moving the site? update private.app_settings set value = 'https://<new address>' where name = 'site_url';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_settings (
  name  text primary key,
  value text not null
);
revoke all on private.app_settings from public, anon, authenticated;

insert into private.app_settings (name, value)
values
  ('reminders_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
  ('site_url', 'https://nextgenvercelready.vercel.app')
on conflict (name) do nothing;

select cron.unschedule(jobid) from cron.job where jobname = 'nextgen-reminders';
select cron.schedule(
  'nextgen-reminders',
  '5 * * * *',
  $$ select net.http_post(
       url := (select value from private.app_settings where name = 'site_url') || '/api/reminders/send',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-cron-secret', (select value from private.app_settings where name = 'reminders_secret')
       ),
       body := '{}'::jsonb,
       timeout_milliseconds := 30000
     ) $$
);
