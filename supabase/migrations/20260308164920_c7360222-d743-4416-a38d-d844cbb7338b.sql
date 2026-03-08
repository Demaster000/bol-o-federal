CREATE POLICY "Users can delete own rejected claims"
ON public.prize_claims
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'rejected');