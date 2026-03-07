
-- Replace overly permissive update policy with a more specific one
DROP POLICY "Service role can update pix payments" ON public.pix_payments;

-- Only allow updates to own payments (webhook will use service_role key which bypasses RLS)
CREATE POLICY "Users can view own pix payments for updates" ON public.pix_payments
  FOR UPDATE USING (auth.uid() = user_id);
