CREATE OR REPLACE FUNCTION public.trigger_whatsapp_broadcast()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
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
$function$;