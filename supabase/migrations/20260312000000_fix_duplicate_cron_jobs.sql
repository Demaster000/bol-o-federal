-- Migration to fix duplicate WhatsApp broadcast cron jobs
-- This script unschedules all potential duplicate jobs and reschedules only the correct one

-- Unschedule all known job names to start fresh
SELECT cron.unschedule('whatsapp-periodic-broadcast') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-periodic-broadcast'
);

SELECT cron.unschedule('whatsapp-periodic-broadcast-v2') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-periodic-broadcast-v2'
);

-- Schedule only ONE job to run every minute
-- The Edge Function now has a strict check (totalMinutes % interval === 0)
-- to ensure it only sends messages at the exact minute of the interval.
SELECT cron.schedule(
  'whatsapp-periodic-broadcast',
  '* * * * *', -- Every minute
  $$ SELECT public.trigger_whatsapp_broadcast(); $$
);

-- Ensure the trigger function is the latest version
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_broadcast()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_id text;
  service_role_key text;
BEGIN
  project_id := current_setting('app.settings.supabase_project_id', true);
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  IF project_id IS NOT NULL AND service_role_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := 'https://' || project_id || '.supabase.co/functions/v1/whatsapp-send',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'scheduled_broadcast'
        ),
        timeout_milliseconds := 30000
      );
  END IF;
END;
$$;
