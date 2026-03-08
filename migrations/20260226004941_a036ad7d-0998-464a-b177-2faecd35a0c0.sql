
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pool_id UUID REFERENCES public.pools(id),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Prize claims table
CREATE TABLE public.prize_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pool_id UUID NOT NULL REFERENCES public.pools(id),
  cpf TEXT NOT NULL,
  pix_key TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  accepted_terms BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prize_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.prize_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims" ON public.prize_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims" ON public.prize_claims
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update claims" ON public.prize_claims
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
