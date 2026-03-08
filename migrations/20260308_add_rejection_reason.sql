-- Add rejection_reason column to prize_claims if it doesn't exist
ALTER TABLE public.prize_claims 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
