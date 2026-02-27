import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Tables } from '@/integrations/supabase/types';
import { Ticket, Calendar, Trophy, Gift, Bell, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClaimPrizeDialog from '@/components/ClaimPrizeDialog';

type PurchaseWithPool = Tables<'pool_purchases'> & {
  pools: (Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null }) | null;
};

type ClaimInfo = {
  pool_id: string;
  status: string;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithPool[]>([]);
  const [claimedPools, setClaimedPools] = useState<Map<string, string>>(new Map());
  const [notifications, setNotifications] = useState<Tables<'notifications'>[]>([]);
  const [claimDialog, setClaimDialog] = useState<{
    open: boolean;
    poolId: string;
    poolTitle: string;
    lotteryName: string;
    concurso: string;
    amount: number;
  }>({ open: false, poolId: '', poolTitle: '', lotteryName: '', concurso: '', amount: 0 });

  const fetchData = async () => {
    if (!user) return;
    const [purchasesRes, claimsRes, notifRes] = await Promise.all([
      supabase
        .from('pool_purchases')
        .select('*, pools(*, lottery_types(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('prize_claims')
        .select('pool_id, status')
        .eq('user_id', user.id),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (purchasesRes.data) setPurchases(purchasesRes.data as PurchaseWithPool[]);
    if (claimsRes.data) setClaimedPools(new Map(claimsRes.data.map((c: any) => [c.pool_id, c.status])));
    if (notifRes.data) setNotifications(notifRes.data as Tables<'notifications'>[]);

    if (notifRes.data && notifRes.data.some((n: any) => !n.read)) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    }
  };

  const updateClaimStatus = async (poolId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('prize_claims')
      .select('pool_id, status')
      .eq('user_id', user.id)
      .eq('pool_id', poolId)
      .single();

    if (data) {
      setClaimedPools(prev => new Map(prev).set(poolId, data.status));
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Realtime: pool updates (sold_quotas changes) + notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => { fetchData(); })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pools',
      }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const calcPrizePerQuota = (pool: PurchaseWithPool['pools'], quantity: number) => {
    if (!pool || !pool.prize_amount || !pool.sold_quotas || pool.sold_quotas === 0) return 0;
    const netPrize = Number(pool.prize_amount) * 0.9;
    return (netPrize / pool.sold_quotas) * quantity;
  };

  const calcEstimatePerQuota = (pool: PurchaseWithPool['pools']) => {
    if (!pool || !pool.prize_amount || !pool.sold_quotas || pool.sold_quotas === 0) return 0;
    return (Number(pool.prize_amount) * 0.9) / pool.sold_quotas;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10">
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.filter(n => !n.read).map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3"
              >
                <Bell className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-foreground">{n.message}</p>
              </motion.div>
            ))}
          </div>
        )}

        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          Meus <span className="text-gradient-gold">Bolões</span>
        </h1>

        {purchases.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((p, i) => {
              const lotteryName = p.pools?.lottery_types?.name ?? '';
              const gradient = LOTTERY_COLORS[lotteryName] || 'from-primary to-primary/80';
              const isDrawn = p.pools?.status === 'drawn' || p.pools?.status === 'paid';
              const isOpen = p.pools?.status === 'open';
              const prizeForUser = calcPrizePerQuota(p.pools, p.quantity);
              const estimatePerQuota = calcEstimatePerQuota(p.pools);
              const alreadyClaimed = claimedPools.has(p.pool_id);
              const claimStatus = claimedPools.get(p.pool_id);

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

                    {/* Estimated prize for open pools */}
                    {isOpen && estimatePerQuota > 0 && (
                      <div className="rounded-lg bg-muted/50 border border-border p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Estimativa atual por cota</span>
                        </div>
                        <p className="font-display font-bold text-sm text-primary">
                          R$ {estimatePerQuota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="font-display font-bold text-foreground">
                          Suas {p.quantity} cota(s): <span className="text-gradient-gold">R$ {(estimatePerQuota * p.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                    )}

                    {/* Result info */}
                    {isDrawn && p.pools?.result && (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 space-y-1">
                        <p className="text-xs text-muted-foreground">Números sorteados</p>
                        <p className="text-sm font-semibold text-foreground">
                          {(p.pools.result as any).numbers}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Total pago</span>
                      <p className="font-display font-bold text-foreground">R$ {p.total_paid.toFixed(2)}</p>
                    </div>

                    {/* Prize per user */}
                    {isDrawn && prizeForUser > 0 && (
                      <div className="rounded-lg bg-accent/20 border border-accent/30 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Gift className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Seu prêmio estimado</span>
                        </div>
                        <p className="font-display font-bold text-lg text-gradient-gold">
                          R$ {prizeForUser.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {alreadyClaimed ? (
                          <div className="space-y-1 mt-1">
                            <p className="text-xs text-primary">✓ Solicitação de recebimento enviada</p>
                            <p className="text-xs text-muted-foreground">
                              Status: <span className={`font-semibold ${
                                claimStatus === 'paid' ? 'text-green-400' :
                                claimStatus === 'in_progress' ? 'text-blue-400' :
                                claimStatus === 'rejected' ? 'text-red-400' :
                                'text-yellow-400'
                              }`}>
                                {claimStatus === 'pending' ? 'Pendente' :
                                 claimStatus === 'in_progress' ? 'Em Progresso' :
                                 claimStatus === 'paid' ? 'Pago' :
                                 claimStatus === 'rejected' ? 'Rejeitado' : claimStatus}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="mt-2 bg-gradient-green hover:opacity-90 text-primary-foreground w-full"
                            onClick={() =>
                              setClaimDialog({
                                open: true,
                                poolId: p.pool_id,
                                poolTitle: p.pools?.title ?? '',
                                lotteryName,
                                concurso: p.pools?.title ?? '',
                                amount: prizeForUser,
                              })
                            }
                          >
                            <Gift className="mr-1.5 h-3.5 w-3.5" /> Receber Prêmio
                          </Button>
                        )}
                      </div>
                    )}
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

      <ClaimPrizeDialog
        open={claimDialog.open}
        onClose={() => setClaimDialog(prev => ({ ...prev, open: false }))}
        onSuccess={() => updateClaimStatus(claimDialog.poolId)}
        poolId={claimDialog.poolId}
        poolTitle={claimDialog.poolTitle}
        lotteryName={claimDialog.lotteryName}
        concurso={claimDialog.concurso}
        amount={claimDialog.amount}
      />
    </div>
  );
};

export default Dashboard;
