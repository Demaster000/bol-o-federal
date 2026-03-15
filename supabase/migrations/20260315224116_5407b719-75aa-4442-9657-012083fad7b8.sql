CREATE TABLE public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - this table is only accessed via service_role in edge functions

-- Index for lookups
CREATE INDEX idx_password_reset_codes_phone_code ON public.password_reset_codes (phone, code);

-- Auto-cleanup old codes (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_codes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.password_reset_codes WHERE expires_at < now() - interval '1 hour';
$$;