ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS channel_id text DEFAULT '';
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS send_to_channel boolean DEFAULT false;
