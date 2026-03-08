
-- 1) Fix prize_claims INSERT policy to validate purchase ownership
DROP POLICY IF EXISTS "Users can insert own claims" ON public.prize_claims;
CREATE POLICY "Users can insert own claims" ON public.prize_claims
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND purchase_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.pool_purchases pp
    WHERE pp.id = purchase_id
      AND pp.user_id = auth.uid()
      AND pp.pool_id = prize_claims.pool_id
  )
);

-- 2) Fix referrals INSERT policy - block client-side inserts entirely
-- Referrals should only be created by the referred user during signup (validated in code)
DROP POLICY IF EXISTS "Service role inserts referrals" ON public.referrals;
CREATE POLICY "Referred user can insert own referral" ON public.referrals
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = referred_id
  AND referrer_id != referred_id
  AND NOT EXISTS (
    SELECT 1 FROM public.referrals r WHERE r.referred_id = auth.uid()
  )
);
