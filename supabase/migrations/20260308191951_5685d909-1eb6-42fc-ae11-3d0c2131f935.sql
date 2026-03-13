
-- Allow anyone authenticated to look up referral codes (needed for signup referral validation)
CREATE POLICY "Anyone can lookup referral codes" ON public.profiles FOR SELECT USING (true);
