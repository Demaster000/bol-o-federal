import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Star, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import PoolCard from '@/components/PoolCard';
import BuyQuotaDialog from '@/components/BuyQuotaDialog';
import WhatsAppPopup from '@/components/WhatsAppPopup';

type PoolWithType = Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [pools, setPools] = useState<PoolWithType[]>([]);
  const [recentWinnings, setRecentWinnings] = useState<PoolWithType[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolWithType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check for pool parameter in URL and handle auto-open
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get('pool');
    
    if (poolId) {
      // If not logged in, redirect to login with the current pool as redirect param
      if (!user && !authLoading) {
        window.location.href = `/login?pool=${poolId}`;
        return;
      }
      
      // If logged in and we have pools, open the dialog
      if (user && pools.length > 0) {
        const pool = pools.find(p => p.id === poolId);
        if (pool) {
          setSelectedPool(pool as PoolWithType);
          setDialogOpen(true);
        }
      }
    }
  }, [pools, user, authLoading]);

  const fetchPools = async () => {
    const { data } = await supabase
      .from('pools')
      .select('*, lottery_types(*)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (data) {
      setPools(data as PoolWithType[]);
    }

    const { data: winnings } = await supabase
      .from('pools')
      .select('*, lottery_types(*)')
      .in('status', ['drawn', 'paid'])
      .not('prize_amount', 'is', null)
      .gt('prize_amount', 0)
      .order('updated_at', { ascending: false })
      .limit(3);
    if (winnings) setRecentWinnings(winnings as PoolWithType[]);
  };

  useEffect(() => { fetchPools(); }, []);

  const handleBuy = (pool: Tables<'pools'>) => {
    if (!user) {
      // Redirecionar para login com URL de retorno
      window.location.href = `/login?pool=${pool.id}`;
      return;
    }
    setSelectedPool(pool as PoolWithType);
    setDialogOpen(true);
    // Update URL to reflect selected pool
    window.history.replaceState({}, '', `/?pool=${pool.id}`);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    // Remove pool parameter from URL when dialog closes
    window.history.replaceState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-secondary/15 blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container relative mx-auto px-4 py-12 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm text-muted-foreground">
              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-secondary" />
              A melhor plataforma de bolões do Brasil
            </div>
            <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold leading-tight">
              Sua sorte começa
              <br />
              <span className="text-gradient-gold">no Sorte Compartilhada</span>
            </h1>
            <p className="mx-auto mt-4 sm:mt-6 max-w-xl text-sm sm:text-lg text-muted-foreground px-2">
              Participe de bolões da Loteria Federal com cotas acessíveis. 
              Mais pessoas, mais chances de ganhar!
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold px-8">
                    Meus Bolões
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login?mode=register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold px-8">
                      Começar Agora
                    </Button>
                  </Link>
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full font-display font-semibold px-8 border-border text-foreground hover:bg-muted">
                      Já tenho conta
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50">
        <div className="container mx-auto grid gap-6 sm:gap-8 px-4 py-10 sm:py-16 grid-cols-1 sm:grid-cols-3">
          {[
            { icon: Shield, title: 'Seguro e Confiável', desc: 'Suas apostas protegidas com a melhor tecnologia.' },
            { icon: Zap, title: 'Rápido e Fácil', desc: 'Compre cotas em segundos e acompanhe seus bolões.' },
            { icon: Trophy, title: 'Resultados em Tempo Real', desc: 'Confira os resultados assim que saírem.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex flex-row sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-3"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-accent shrink-0">
                <f.icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-sm sm:text-base">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof - Recent Winnings */}
      {recentWinnings.length > 0 && (
        <section className="bg-muted/30 py-10 sm:py-16 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="mb-6 sm:mb-10 text-center">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Últimos <span className="text-gradient-gold">Ganhos</span>
              </h2>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Confira os prêmios distribuídos nos últimos bolões</p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
              {recentWinnings.map((winning, i) => (
                <motion.div
                  key={winning.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-primary/20 bg-card p-4 sm:p-6 shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="mb-3 sm:mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">
                      {winning.lottery_types?.name}
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-foreground mb-1">{winning.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                      Sorteio em {winning.draw_date ? new Date(winning.draw_date).toLocaleDateString('pt-BR') : '—'}
                    </p>
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                      <span className="text-xs text-muted-foreground block mb-1">Prêmio Total</span>
                      <p className="font-display text-xl sm:text-2xl font-bold text-gradient-gold">
                        R$ {Number(winning.prize_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Available Pools */}
      <section className="container mx-auto px-4 py-10 sm:py-16">
        <div className="mb-6 sm:mb-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Bolões <span className="text-gradient-gold">Disponíveis</span>
          </h2>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Escolha seu bolão e garanta suas cotas</p>
        </div>

        {pools.length > 0 ? (
          <div className="grid gap-6 w-full">
            {pools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} onBuy={handleBuy} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg text-muted-foreground">
              Nenhum bolão disponível no momento.
            </p>
            <p className="text-sm text-muted-foreground/60">Volte em breve para novas oportunidades!</p>
          </div>
        )}
      </section>

      <BuyQuotaDialog
        pool={selectedPool}
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={fetchPools}
      />

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-gradient-gold">Sorte Compartilhada</span>
          </div>
          <p className="mt-2">© 2026 Sorte Compartilhada. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
