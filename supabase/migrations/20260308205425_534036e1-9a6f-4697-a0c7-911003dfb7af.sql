
-- Fix: allow deleting pools by cascading to referral_rewards
ALTER TABLE public.referral_rewards DROP CONSTRAINT referral_rewards_pool_id_fkey;
ALTER TABLE public.referral_rewards ADD CONSTRAINT referral_rewards_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE;

-- Also cascade for other tables referencing pools
ALTER TABLE public.pix_payments DROP CONSTRAINT pix_payments_pool_id_fkey;
ALTER TABLE public.pix_payments ADD CONSTRAINT pix_payments_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT notifications_pool_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE;

ALTER TABLE public.prize_claims DROP CONSTRAINT prize_claims_pool_id_fkey;
ALTER TABLE public.prize_claims ADD CONSTRAINT prize_claims_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE;
