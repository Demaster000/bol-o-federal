import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Trophy } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

interface PoolCardProps {
  pool: Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };
  onBuy: (pool: Tables<'pools'>) => void;
}

const LOTTERY_COLORS: Record<string, string> = {
  'Mega-Sena': 'from-[#209869] to-[#1a7a54]',
  'Lotofácil': 'from-[#930089] to-[#6d0066]',
  'Quina': 'from-[#260085] to-[#1a005c]',
  'Lotomania': 'from-[#F78100] to-[#c56800]',
  'Dupla Sena': 'from-[#A61324] to-[#7d0e1b]',
  'Timemania': 'from-[#00c437] to-[#009a2b]',
  'Dia de Sorte': 'from-[#CB8833] to-[#a16c28]',
  'Super Sete': 'from-[#A0CF1B] to-[#7fa316]',
  '+Milionária': 'from-[#002561] to-[#001a45]',
  'Federal': 'from-[#00838F] to-[#006570]',
};

const PoolCard = ({ pool, onBuy }: PoolCardProps) => {
  const lotteryName = pool.lottery_types?.name ?? '';
  const gradient = LOTTERY_COLORS[lotteryName] || 'from-primary to-primary/80';
  const soldQuotas = pool.sold_quotas ?? 0;
  const prizeAmount = pool.prize_amount ? Number(pool.prize_amount) : 0;
  const netPrize = prizeAmount * 0.9;
  const estimatedPerQuota = soldQuotas > 0 && netPrize > 0 ? netPrize / soldQuotas : 0;
  const isClosed = pool.status !== 'open';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-glow w-full"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Header com gradient */}
        <div className={`bg-gradient-to-r ${gradient} px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 w-full sm:w-48 flex items-center`}>
          <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground/90">
            {lotteryName}
          </span>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          {/* Informações do bolão */}
          <div className="flex-1 space-y-2 sm:space-y-3">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground">{pool.title}</h3>
              {pool.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{pool.description}</p>
              )}
            </div>

            {/* Prêmio e informações */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              {prizeAmount > 0 && (
                <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Prêmio</span>
                  </div>
                  <p className="font-display font-bold text-foreground text-xs sm:text-sm">
                    R$ {prizeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {estimatedPerQuota > 0 && (
                    <p className="text-xs text-primary font-semibold">
                      ≈ R$ {estimatedPerQuota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/cota
                    </p>
                  )}
                </div>
              )}
              <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Vendidas</span>
                </div>
                <p className="font-display font-bold text-foreground">{soldQuotas}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Sorteio</span>
                </div>
                <p className="font-display font-bold text-foreground text-xs sm:text-sm">
                  {pool.draw_date
                    ? new Date(pool.draw_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : 'A definir'}
                </p>
              </div>
            </div>
          </div>

          {/* Preço e botão */}
          <div className="flex items-end justify-between sm:flex-col gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border sm:pl-6 flex-shrink-0">
            <div>
              <span className="text-xs text-muted-foreground">Valor por cota</span>
              <p className="font-display font-bold text-lg sm:text-xl text-gradient-gold">
                R$ {pool.price_per_quota.toFixed(2)}
              </p>
            </div>
            <Button
              onClick={() => onBuy(pool)}
              disabled={isClosed}
              className={`w-full sm:w-auto text-xs sm:text-sm ${isClosed ? '' : `bg-gradient-to-r ${gradient} hover:opacity-90 text-primary-foreground`}`}
            >
              {isClosed ? (pool.status === 'drawn' ? 'Encerrado' : 'Fechado') : 'Comprar Cota'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PoolCard;
