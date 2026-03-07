-- Improve the WhatsApp broadcast scheduling logic
-- This migration replaces the cron job with a more reliable approach

-- Drop the old cron job if it exists
SELECT cron.unschedule('whatsapp-periodic-broadcast') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-periodic-broadcast'
);

-- Create an improved function that handles the broadcast more reliably
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_broadcast_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  project_id text;
BEGIN
  -- Get Supabase project ID and service role key
  -- These should be set in the database configuration
  project_id := current_setting('app.settings.supabase_project_id', true);
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  IF project_id IS NOT NULL AND service_role_key IS NOT NULL THEN
    supabase_url := 'https://' || project_id || '.supabase.co/functions/v1/whatsapp-send';
    
    BEGIN
      PERFORM
        net.http_post(
          url := supabase_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key,
            'X-Cron-Trigger', 'true'
          ),
          body := jsonb_build_object(
            'type', 'scheduled_broadcast'
          ),
          timeout_milliseconds := 30000
        );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the cron job
      RAISE WARNING 'WhatsApp broadcast trigger failed: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING 'WhatsApp broadcast configuration incomplete: project_id=%, has_key=%', 
      project_id IS NOT NULL, service_role_key IS NOT NULL;
  END IF;
END;
$$;

-- Schedule the improved function to run every 5 minutes
-- This ensures the broadcast is triggered more frequently
SELECT cron.schedule(
  'whatsapp-periodic-broadcast-v2',
  '*/5 * * * *', -- Every 5 minutes
  $$ SELECT public.trigger_whatsapp_broadcast_v2(); $$
);
