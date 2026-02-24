import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Ticket } from 'lucide-react';
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
  const remaining = pool.total_quotas - (pool.sold_quotas ?? 0);
  const progress = ((pool.sold_quotas ?? 0) / pool.total_quotas) * 100;
  const isClosed = pool.status !== 'open' || remaining <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-glow"
    >
      <div className={`bg-gradient-to-r ${gradient} px-5 py-3`}>
        <span className="font-display text-sm font-bold uppercase tracking-wider text-primary-foreground/90">
          {lotteryName}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <h3 className="font-display text-lg font-bold text-foreground">{pool.title}</h3>
        {pool.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{pool.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Cotas vendidas
            </span>
            <span className="font-medium text-foreground">
              {pool.sold_quotas ?? 0} / {pool.total_quotas}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {pool.draw_date
              ? new Date(pool.draw_date).toLocaleDateString('pt-BR')
              : 'A definir'}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
            {remaining} restantes
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <span className="text-xs text-muted-foreground">Valor por cota</span>
            <p className="text-xl font-display font-bold text-gradient-gold">
              R$ {pool.price_per_quota.toFixed(2)}
            </p>
          </div>
          <Button
            onClick={() => onBuy(pool)}
            disabled={isClosed}
            className={isClosed ? '' : `bg-gradient-to-r ${gradient} hover:opacity-90 text-primary-foreground`}
          >
            {isClosed ? (pool.status === 'drawn' ? 'Encerrado' : 'Esgotado') : 'Comprar Cota'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PoolCard;
