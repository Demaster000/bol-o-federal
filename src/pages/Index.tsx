import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Star, Shield, Zap, ChevronLeft, ChevronRight, HelpCircle, History, Gift, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import PoolCard from '@/components/PoolCard';
import BuyQuotaDialog from '@/components/BuyQuotaDialog';
import WhatsAppPopup from '@/components/WhatsAppPopup';

import PoolFilters from '@/components/PoolFilters';

type PoolWithType = Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };

const usePerPage = () => {
  const [perPage, setPerPage] = useState(1);
  useEffect(() => {
    const update = () => setPerPage(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return perPage;
};

const WinningsCarousel = ({ winnings }: { winnings: PoolWithType[] }) => {
  const perPage = usePerPage();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);

  const totalPages = Math.ceil(winnings.length / perPage);

  const next = useCallback(() => {
    setDirection(1);
    setPage(prev => (prev + 1) % totalPages);
  }, [totalPages]);

  const prev = useCallback(() => {
    setDirection(-1);
    setPage(prev => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, totalPages]);

  useEffect(() => { setPage(0); }, [perPage]);

  const visibleItems = winnings.slice(page * perPage, page * perPage + perPage);
  if (visibleItems.length < perPage && winnings.length >= perPage) {
    const remaining = perPage - visibleItems.length;
    visibleItems.push(...winnings.slice(0, remaining));
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <section className="bg-muted/30 py-10 sm:py-16 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="mb-6 sm:mb-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Últimos <span className="text-gradient-gold">Ganhos</span>
          </h2>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Confira os prêmios distribuídos nos últimos bolões</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {totalPages > 1 && (
            <>
              <button onClick={prev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-6 z-10 h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={next} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-6 z-10 h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="overflow-hidden relative min-h-[220px] sm:min-h-[240px]">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={page}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className={`grid gap-4 sm:gap-6 ${perPage === 3 ? 'grid-cols-3' : perPage === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                {visibleItems.map((winning) => (
                  <div key={winning.id} className="rounded-2xl border border-primary/20 bg-card p-5 sm:p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
                    </div>
                    <div className="relative z-10">
                      <div className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">
                        {winning.lottery_types?.name}
                      </div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-foreground mb-1">{winning.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Sorteio em {winning.draw_date ? new Date(winning.draw_date).toLocaleDateString('pt-BR') : '—'}
                      </p>
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground block mb-1">Prêmio Total</span>
                        <p className="font-display text-xl sm:text-2xl font-bold text-gradient-gold">
                          R$ {Number(winning.prize_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > page ? 1 : -1); setPage(i); }}
                  className={`h-2 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [pools, setPools] = useState<PoolWithType[]>([]);
  const [recentWinnings, setRecentWinnings] = useState<PoolWithType[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolWithType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<{ lotteryTypeId?: string; priceRange?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get('pool');
    if (poolId) {
      if (!user && !authLoading) {
        window.location.href = `/login?pool=${poolId}`;
        return;
      }
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
    if (data) setPools(data as PoolWithType[]);

    const { data: winnings } = await supabase
      .from('pools')
      .select('*, lottery_types(*)')
      .in('status', ['drawn', 'paid'])
      .not('prize_amount', 'is', null)
      .gt('prize_amount', 0)
      .order('updated_at', { ascending: false })
      .limit(9);
    if (winnings) setRecentWinnings(winnings as PoolWithType[]);
  };

  useEffect(() => { fetchPools(); }, []);

  const filteredPools = useMemo(() => {
    let result = pools;
    if (filters.lotteryTypeId && filters.lotteryTypeId !== 'all') {
      result = result.filter(p => p.lottery_type_id === filters.lotteryTypeId);
    }
    if (filters.priceRange && filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.includes('+')
        ? [parseFloat(filters.priceRange), Infinity]
        : filters.priceRange.split('-').map(Number);
      result = result.filter(p => p.price_per_quota >= min && p.price_per_quota <= (max || Infinity));
    }
    return result;
  }, [pools, filters]);

  const handleBuy = (pool: Tables<'pools'>) => {
    if (!user) {
      window.location.href = `/login?pool=${pool.id}`;
      return;
    }
    setSelectedPool(pool as PoolWithType);
    setDialogOpen(true);
    window.history.replaceState({}, '', `/?pool=${pool.id}`);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
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
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
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

      {/* Social Proof - Recent Winnings Carousel */}
      {recentWinnings.length > 0 && <WinningsCarousel winnings={recentWinnings} />}

      {/* Indique e Ganhe CTA */}
      <section className="border-t border-border bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-4 py-10 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-6 sm:p-10"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 opacity-5">
              <Gift className="h-40 w-40 sm:h-56 sm:w-56 text-primary" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary/15 shrink-0">
                <Gift className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Indique e <span className="text-gradient-gold">Ganhe!</span>
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-1">
                  Convide seus amigos para o <strong className="text-foreground">Sorte Compartilhada</strong>.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Quando seu indicado <strong className="text-foreground">comprar cotas</strong>, você ganha{' '}
                  <strong className="text-primary">1 cota grátis</strong> do mesmo sorteio! 🎁
                </p>

                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center gap-3">
                  {user ? (
                    <Link to="/dashboard">
                      <Button size="lg" className="bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold px-8 gap-2">
                        <Share2 className="h-4 w-4" />
                        Indicar Amigos
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/login?mode=register">
                      <Button size="lg" className="bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold px-8 gap-2">
                        <Share2 className="h-4 w-4" />
                        Cadastre-se e Indique
                      </Button>
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">Sem limite de indicações!</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Available Pools */}
      <section className="container mx-auto px-4 py-10 sm:py-16">
        <div className="mb-6 sm:mb-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Bolões <span className="text-gradient-gold">Disponíveis</span>
          </h2>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Escolha seu bolão e garanta suas cotas</p>
        </div>

        <PoolFilters onFilter={setFilters} />

        {filteredPools.length > 0 ? (
          <div className="grid gap-6 w-full">
            {filteredPools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} onBuy={handleBuy} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg text-muted-foreground">
              {pools.length > 0 ? 'Nenhum bolão encontrado com esses filtros.' : 'Nenhum bolão disponível no momento.'}
            </p>
            <p className="text-sm text-muted-foreground/60">Volte em breve para novas oportunidades!</p>
          </div>
        )}
      </section>

      <BuyQuotaDialog pool={selectedPool} open={dialogOpen} onClose={handleDialogClose} onSuccess={fetchPools} />
      <WhatsAppPopup />

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-display font-semibold text-gradient-gold">Sorte Compartilhada</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/faq" className="hover:text-foreground transition-colors flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> FAQ
              </Link>
              <Link to="/resultados" className="hover:text-foreground transition-colors flex items-center gap-1">
                <History className="h-3 w-3" /> Resultados
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">© 2026 Sorte Compartilhada. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
