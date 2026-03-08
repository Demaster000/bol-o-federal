-- Fix 1: Remove dangerous UPDATE policy on pix_payments (only service_role/webhook should update)
DROP POLICY IF EXISTS "Users can view own pix payments for updates" ON public.pix_payments;

-- Fix 2: Remove direct INSERT on pool_purchases for users (only edge functions with service_role create purchases)
DROP POLICY IF EXISTS "Users can create purchases" ON public.pool_purchases;