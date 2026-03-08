
-- Add CPF column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;

-- Update handle_new_user to store CPF
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, cpf, referral_code)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf',
    UPPER(SUBSTR(MD5(NEW.id::text || now()::text), 1, 8))
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;
