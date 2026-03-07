-- Enable pg_cron and pgnet extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgnet;

-- Create a function to trigger the WhatsApp broadcast
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_broadcast()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get Supabase URL and Service Role Key from environment variables or settings
  -- Note: In a real Supabase environment, these are usually available via vault or decrypted secrets
  -- For this implementation, we assume the function will be called by pg_cron
  
  supabase_url := 'https://' || current_setting('app.settings.supabase_project_id', true) || '.supabase.co/functions/v1/whatsapp-send';
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := supabase_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'scheduled_broadcast'
        )
      );
  END IF;
END;
$$;

-- Schedule the job to run every minute
-- The edge function itself handles the interval check based on whatsapp_settings
SELECT cron.schedule(
  'whatsapp-periodic-broadcast',
  '* * * * *', -- Every minute
  $$ SELECT public.trigger_whatsapp_broadcast(); $$
);
