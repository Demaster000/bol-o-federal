
-- Make total_quotas optional with a very high default (no real limit)
ALTER TABLE public.pools ALTER COLUMN total_quotas SET DEFAULT 999999999;
