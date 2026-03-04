ALTER TABLE public.whatsapp_settings
  ADD COLUMN channel_id text DEFAULT '',
  ADD COLUMN send_to_channel boolean DEFAULT false;