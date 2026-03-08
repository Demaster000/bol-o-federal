import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import CountdownTimer from '@/components/CountdownTimer';
import ShareButtons from '@/components/ShareButtons';

interface PoolCardProps {
  pool: Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };
  onBuy: (pool: Tables<'pools'>) => void;
  onEdit?: (pool: Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null }) => void;
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

const PoolCard = ({ pool, onBuy, onEdit }: PoolCardProps) => {
  const [showDescription, setShowDescription] = useState(false);
  const lotteryName = pool.lottery_types?.name ?? '';
  const gradient = LOTTERY_COLORS[lotteryName] || 'from-primary to-primary/80';
  const soldQuotas = pool.sold_quotas ?? 0;
  const totalQuotas = pool.total_quotas ?? 0;
  const isUnlimited = pool.unlimited_quotas ?? false;
  const isSoldOut = !isUnlimited && soldQuotas >= totalQuotas;
  
  const prizeAmount = pool.prize_amount ? Number(pool.prize_amount) : 0;
  const netPrize = prizeAmount * 0.9;
  const estimatedPerQuota = soldQuotas > 0 && netPrize > 0 ? netPrize / soldQuotas : 0;

  // Check if participation window has closed (5 hours before draw)
  const isParticipationClosed = pool.draw_date
    ? new Date().getTime() >= new Date(pool.draw_date).getTime() - 5 * 60 * 60 * 1000
    : false;
  const isClosed = pool.status !== 'open' || isSoldOut || isParticipationClosed;

  // Format draw date in BRT (UTC-3)
  const formatDrawDateBRT = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', 
      timeZone: 'America/Sao_Paulo' 
    });
  };

  const formatDrawTimeBRT = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', minute: '2-digit', 
      timeZone: 'America/Sao_Paulo' 
    });
  };

  // Participation deadline: 5 hours before draw in BRT
  const getParticipationDeadline = (dateStr: string) => {
    const drawDate = new Date(dateStr);
    const deadline = new Date(drawDate.getTime() - 5 * 60 * 60 * 1000);
    return deadline.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-glow w-full"
    >
      {/* Header com nome da loteria */}
      <div className={`bg-gradient-to-r ${gradient} px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground/90">
            {lotteryName}
          </span>
          {isUnlimited && (
            <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full text-white font-bold animate-pulse">
              ILIMITADO
            </span>
          )}
        </div>
        <ShareButtons poolId={pool.id} title={pool.title} price={pool.price_per_quota} prize={pool.prize_amount} compact />
      </div>

      {/* Conteúdo */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Título e badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base sm:text-lg font-bold text-foreground truncate">{pool.title}</h3>
            {isUnlimited && (
              <span className="inline-block mt-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20">
                MAIS CHANCES DE GANHARMOS
              </span>
            )}
          </div>
        </div>

        {/* Descrição colapsável */}
        {pool.description && (
          <div>
            <button
              onClick={() => setShowDescription(!showDescription)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {showDescription ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDescription ? 'Ocultar detalhes' : 'Ver como participar'}
            </button>
            {showDescription && (
              <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 border border-border">
                {pool.description}
              </p>
            )}
          </div>
        )}

        {/* Info grid responsivo */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {prizeAmount > 0 && (
            <div className="rounded-lg bg-muted/50 p-2 sm:p-3 min-w-0">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Trophy className="h-3 w-3 shrink-0" />
                <span className="truncate">Prêmio</span>
              </div>
              <p className="font-display font-bold text-foreground text-xs sm:text-sm truncate">
                R$ {prizeAmount >= 1000000
                  ? `${(prizeAmount / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`
                  : prizeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-muted/50 p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3 shrink-0" />
              <span className="truncate">Est./cota</span>
            </div>
            <p className="font-display font-bold text-primary text-xs sm:text-sm truncate">
              {estimatedPerQuota > 0
                ? `R$ ${estimatedPerQuota >= 1000000
                    ? `${(estimatedPerQuota / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`
                    : estimatedPerQuota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">Sorteio</span>
            </div>
            <p className="font-display font-bold text-foreground text-xs sm:text-sm">
              {pool.draw_date
                ? formatDrawDateBRT(pool.draw_date)
                : 'A definir'}
            </p>
            {pool.draw_date && (
              <p className="text-[10px] text-muted-foreground">
                às {formatDrawTimeBRT(pool.draw_date)}
              </p>
            )}
          </div>
        </div>

        {/* Countdown Timer */}
        {pool.draw_date && pool.status === 'open' && (
          <CountdownTimer drawDate={pool.draw_date} compact />
        )}

        {/* Footer: preço + botão */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <span className="text-[10px] text-muted-foreground">Valor por cota</span>
            <p className="font-display font-bold text-lg text-gradient-gold">
              R$ {pool.price_per_quota.toFixed(2)}
            </p>
          </div>
          <Button
            onClick={() => onBuy(pool)}
            disabled={isClosed}
            className={`text-xs sm:text-sm ${isClosed ? '' : `bg-gradient-to-r ${gradient} hover:opacity-90 text-primary-foreground`}`}
          >
            {isSoldOut ? 'ESGOTADO' : (isClosed ? (pool.status === 'drawn' ? 'Encerrado' : 'Fechado') : 'Comprar Cota')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PoolCard;
