-- Garantir que a política de SELECT permita que administradores leiam as configurações.
-- A política existente 'Admins can manage whatsapp settings' já usa FOR ALL, 
-- mas vamos adicionar uma específica para SELECT para garantir clareza e evitar problemas.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'whatsapp_settings' 
        AND policyname = 'Admins can select whatsapp settings'
    ) THEN
        CREATE POLICY "Admins can select whatsapp settings"
          ON public.whatsapp_settings FOR SELECT
          TO authenticated
          USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
