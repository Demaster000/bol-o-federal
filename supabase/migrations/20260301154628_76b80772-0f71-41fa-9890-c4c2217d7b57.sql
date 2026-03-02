
-- Table to track PIX payment attempts
CREATE TABLE public.pix_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pool_id uuid NOT NULL REFERENCES public.pools(id),
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL,
  txid text,
  loc_id text,
  qr_code text,
  qr_code_image text,
  status text NOT NULL DEFAULT 'pending',
  efi_charge_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 minutes')
);

-- RLS
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pix payments" ON public.pix_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pix payments" ON public.pix_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all pix payments" ON public.pix_payments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can update pix payments" ON public.pix_payments
  FOR UPDATE USING (true);

-- Enable realtime for pix_payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_payments;
