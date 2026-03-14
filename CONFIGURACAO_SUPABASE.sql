-- ==========================================
-- CONFIGURAÇÃO PARA O WHATSAPP (SQL EDITOR)
-- ==========================================

-- 1. Criar a tabela de logs de transmissão se ela não existir
-- Esta tabela é necessária para que a Edge Function registre os envios periódicos
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_type text NOT NULL,
    last_run_at timestamp with time zone DEFAULT now(),
    success boolean DEFAULT false,
    message text,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS para a tabela de logs
ALTER TABLE public.whatsapp_broadcast_log ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem os logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'whatsapp_broadcast_log' AND policyname = 'Admins can manage logs'
    ) THEN
        CREATE POLICY "Admins can manage logs"
          ON public.whatsapp_broadcast_log FOR ALL
          TO authenticated
          USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 2. Garantir que a tabela whatsapp_settings tenha a coluna site_url
-- Algumas versões do projeto podem não ter essa coluna
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_settings' AND column_name = 'site_url'
    ) THEN
        ALTER TABLE public.whatsapp_settings ADD COLUMN site_url text DEFAULT '';
    END IF;
END $$;

-- 3. Garantir que a tabela whatsapp_settings tenha as colunas de canal (newsletter)
-- A Edge Function faz referência a channel_id e send_to_channel
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_settings' AND column_name = 'channel_id'
    ) THEN
        ALTER TABLE public.whatsapp_settings ADD COLUMN channel_id text DEFAULT '';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_settings' AND column_name = 'send_to_channel'
    ) THEN
        ALTER TABLE public.whatsapp_settings ADD COLUMN send_to_channel boolean DEFAULT false;
    END IF;
END $$;

-- 4. Garantir que exista pelo menos uma linha de configuração
INSERT INTO public.whatsapp_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_settings);

-- 5. (Opcional) Criar a função has_role se ela não existir
-- Esta função é usada nas políticas de segurança (RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
