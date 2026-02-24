import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Tables } from '@/integrations/supabase/types';
import { Ticket, Calendar, Trophy } from 'lucide-react';

type PurchaseWithPool = Tables<'pool_purchases'> & {
  pools: (Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null }) | null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithPool[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('pool_purchases')
        .select('*, pools(*, lottery_types(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setPurchases(data as PurchaseWithPool[]);
    };
    fetch();
  }, [user]);

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

  const statusLabel: Record<string, string> = {
    open: 'Aberto',
    closed: 'Fechado',
    drawn: 'Sorteado',
    paid: 'Pago',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          Meus <span className="text-gradient-gold">Bolões</span>
        </h1>

        {purchases.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((p, i) => {
              const lotteryName = p.pools?.lottery_types?.name ?? '';
              const gradient = LOTTERY_COLORS[lotteryName] || 'from-primary to-primary/80';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className={`bg-gradient-to-r ${gradient} px-4 py-2 flex items-center justify-between`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/90">
                      {lotteryName}
                    </span>
                    <span className="text-xs bg-background/20 px-2 py-0.5 rounded-full text-primary-foreground/80">
                      {statusLabel[p.pools?.status ?? 'open']}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <h3 className="font-display font-bold text-foreground">{p.pools?.title}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5" />
                        {p.quantity} cota(s)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {p.pools?.draw_date
                          ? new Date(p.pools.draw_date).toLocaleDateString('pt-BR')
                          : 'A definir'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Total pago</span>
                      <p className="font-display font-bold text-gradient-gold">R$ {p.total_paid.toFixed(2)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg text-muted-foreground">Você ainda não participou de nenhum bolão.</p>
            <p className="text-sm text-muted-foreground/60">Explore os bolões disponíveis na página inicial!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
