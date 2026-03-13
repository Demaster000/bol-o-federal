import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import Header from '@/components/Header';
import { Trophy, Calendar, Users, DollarSign } from 'lucide-react';

type PoolWithType = Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };

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

const Results = () => {
  const [pools, setPools] = useState<PoolWithType[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('pools')
        .select('*, lottery_types(*)')
        .in('status', ['drawn', 'paid'])
        .order('updated_at', { ascending: false });
      if (data) setPools(data as PoolWithType[]);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-2">
            Resultados <span className="text-gradient-gold">Anteriores</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Histórico de todos os bolões finalizados</p>
        </div>

        {pools.length > 0 ? (
          <div className="space-y-4">
            {pools.map((pool, i) => {
              const lotteryName = pool.lottery_types?.name ?? '';
              const gradient = LOTTERY_COLORS[lotteryName] || 'from-primary to-primary/80';
              const prize = pool.prize_amount ? Number(pool.prize_amount) : 0;
              const netPrize = prize * 0.9;
              const soldQuotas = pool.sold_quotas ?? 0;
              const totalCollected = soldQuotas * pool.price_per_quota;

              return (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className={`bg-gradient-to-r ${gradient} px-4 sm:px-6 py-3 flex items-center justify-between`}>
                    <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground/90">
                      {lotteryName}
                    </span>
                    <span className="text-[10px] sm:text-xs bg-background/20 px-2 py-0.5 rounded-full text-primary-foreground/80">
                      {pool.status === 'paid' ? 'Pago' : 'Sorteado'}
                    </span>
                  </div>
                  <div className="p-4 sm:p-6 space-y-3">
                    <h3 className="font-display font-bold text-foreground">{pool.title}</h3>

                    {pool.result && (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Números sorteados</p>
                        <p className="font-display font-bold text-foreground">{(pool.result as any).numbers}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {pool.draw_date ? new Date(pool.draw_date).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                      {prize > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5 text-primary" />
                          <span className="font-bold text-gradient-gold">
                            Prêmio: R$ {prize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg text-muted-foreground">Nenhum resultado disponível ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
