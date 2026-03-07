-- Add broadcast tracking to ensure scheduled broadcasts run reliably

-- Create a table to track the last broadcast time
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_type text NOT NULL DEFAULT 'open_pools',
  last_run_at timestamp with time zone DEFAULT now(),
  next_run_at timestamp with time zone,
  success boolean DEFAULT true,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_log_type ON public.whatsapp_broadcast_log(broadcast_type);

-- Add RLS policy
ALTER TABLE public.whatsapp_broadcast_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcast logs"
  ON public.whatsapp_broadcast_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update the whatsapp_settings table to add last_broadcast_at
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS last_broadcast_at timestamp with time zone;

-- Initialize the broadcast log
INSERT INTO public.whatsapp_broadcast_log (broadcast_type, last_run_at, success, message)
VALUES ('open_pools', now(), true, 'Initialized')
ON CONFLICT DO NOTHING;
