
CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url text DEFAULT '',
  api_key text DEFAULT '',
  instance_name text DEFAULT '',
  group_id text DEFAULT '',
  notify_new_pool boolean DEFAULT true,
  notify_result boolean DEFAULT true,
  broadcast_open_pools boolean DEFAULT false,
  broadcast_interval_minutes integer DEFAULT 60,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp settings"
  ON public.whatsapp_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert whatsapp settings"
  ON public.whatsapp_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.whatsapp_settings (id) VALUES (gen_random_uuid());
