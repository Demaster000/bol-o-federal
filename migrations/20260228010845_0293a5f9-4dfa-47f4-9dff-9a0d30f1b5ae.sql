
-- Add purchase_id column to prize_claims
ALTER TABLE public.prize_claims ADD COLUMN purchase_id uuid REFERENCES public.pool_purchases(id);

-- Drop existing unique constraint if any (pool_id + user_id)
-- Add new unique constraint on purchase_id to ensure one claim per purchase
CREATE UNIQUE INDEX idx_prize_claims_purchase_id ON public.prize_claims(purchase_id) WHERE purchase_id IS NOT NULL;
