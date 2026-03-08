
-- Lottery types table
CREATE TABLE public.lottery_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pools (bolões)
CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_type_id UUID REFERENCES public.lottery_types(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_per_quota DECIMAL(10,2) NOT NULL,
  total_quotas INTEGER NOT NULL,
  sold_quotas INTEGER DEFAULT 0,
  numbers JSONB,
  draw_date TIMESTAMPTZ,
  status TEXT DEFAULT 'open',
  result JSONB,
  prize_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pool purchases
CREATE TABLE public.pool_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) NOT NULL,
  user_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_paid DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Enable RLS on all tables
ALTER TABLE public.lottery_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Lottery types: public read, admin write
CREATE POLICY "Anyone can view lottery types" ON public.lottery_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert lottery types" ON public.lottery_types FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update lottery types" ON public.lottery_types FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete lottery types" ON public.lottery_types FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Pools: public read, admin write
CREATE POLICY "Anyone can view pools" ON public.pools FOR SELECT USING (true);
CREATE POLICY "Admins can insert pools" ON public.pools FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pools" ON public.pools FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pools" ON public.pools FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Purchases: users see own + admin sees all
CREATE POLICY "Users can view own purchases" ON public.pool_purchases FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create purchases" ON public.pool_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update purchases" ON public.pool_purchases FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete purchases" ON public.pool_purchases FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile and user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update sold_quotas on purchase
CREATE OR REPLACE FUNCTION public.update_sold_quotas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pools
  SET sold_quotas = sold_quotas + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.pool_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_purchase_created
  AFTER INSERT ON public.pool_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sold_quotas();

-- Seed lottery types
INSERT INTO public.lottery_types (name, description, color) VALUES
  ('Mega-Sena', 'Acerte 6 números de 1 a 60', '#209869'),
  ('Lotofácil', 'Acerte 15 números de 1 a 25', '#930089'),
  ('Quina', 'Acerte 5 números de 1 a 80', '#260085'),
  ('Lotomania', 'Acerte 20 números de 1 a 100', '#F78100'),
  ('Dupla Sena', 'Duas chances de ganhar', '#A61324'),
  ('Timemania', 'Acerte 7 números de 1 a 80', '#00FF48'),
  ('Dia de Sorte', 'Acerte 7 números de 1 a 31 + mês', '#CB8833'),
  ('Super Sete', 'Acerte 7 colunas de 0 a 9', '#A0CF1B'),
  ('+Milionária', 'Acerte 6 números + 2 trevos', '#002561'),
  ('Federal', 'Loteria Federal', '#00838F');
