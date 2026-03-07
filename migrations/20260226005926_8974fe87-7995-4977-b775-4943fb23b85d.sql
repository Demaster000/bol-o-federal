
ALTER TABLE public.prize_claims 
ADD COLUMN full_name text NOT NULL DEFAULT '',
ADD COLUMN signed_contract jsonb;
