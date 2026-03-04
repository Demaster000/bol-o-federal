-- Adicionar campo unlimited_quotas à tabela pools
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS unlimited_quotas BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN public.pools.unlimited_quotas IS 'Indica se o bolão possui cotas ilimitadas ou um limite fixo.';
