
-- Table for n8n/Facebook posting settings
CREATE TABLE public.facebook_post_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  n8n_webhook_url text DEFAULT '',
  enabled boolean DEFAULT false,
  groups jsonb DEFAULT '[]'::jsonb,
  interval_minutes integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.facebook_post_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage facebook settings"
  ON public.facebook_post_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Table for scheduled/queued Facebook posts
CREATE TABLE public.facebook_post_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  image_url text DEFAULT NULL,
  groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  interval_minutes integer DEFAULT 5,
  current_index integer DEFAULT 0,
  total_groups integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  next_run_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone DEFAULT NULL
);

ALTER TABLE public.facebook_post_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage facebook jobs"
  ON public.facebook_post_jobs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings row
INSERT INTO public.facebook_post_settings (id) VALUES (gen_random_uuid());
