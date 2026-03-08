
-- 1) Create a secure function for referral code lookup (returns only user_id for a given code)
CREATE OR REPLACE FUNCTION public.lookup_referral_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE referral_code = upper(_code) LIMIT 1
$$;

-- 2) Drop the overly permissive "Anyone can lookup referral codes" policy
DROP POLICY IF EXISTS "Anyone can lookup referral codes" ON public.profiles;
