-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

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
  
  -- We use net.http_post to call the edge function
  -- This requires the pgnet extension
  PERFORM
    net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_project_id') || '.supabase.co/functions/v1/whatsapp-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'scheduled_broadcast'
      )
    );
END;
$$;

-- Schedule the job to run every minute
-- The edge function itself handles the interval check based on whatsapp_settings
SELECT cron.schedule(
  'whatsapp-periodic-broadcast',
  '* * * * *', -- Every minute
  $$ SELECT public.trigger_whatsapp_broadcast(); $$
);
