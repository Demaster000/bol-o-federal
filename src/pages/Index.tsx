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

type PoolWithType = Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };

const Index = () => {
  const { user } = useAuth();
  const [pools, setPools] = useState<PoolWithType[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolWithType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPools = async () => {
    const { data } = await supabase
      .from('pools')
      .select('*, lottery_types(*)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (data) setPools(data as PoolWithType[]);
  };

  useEffect(() => { fetchPools(); }, []);

  const handleBuy = (pool: Tables<'pools'>) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setSelectedPool(pool as PoolWithType);
    setDialogOpen(true);
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

        <div className="container relative mx-auto px-4 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-secondary" />
              A melhor plataforma de bolões do Brasil
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
              Sua sorte começa
              <br />
              <span className="text-gradient-gold">no BolãoVIP</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Participe de bolões da Loteria Federal com cotas acessíveis. 
              Mais pessoas, mais chances de ganhar!
            </p>
            <div className="mt-8 flex justify-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold px-8">
                    Meus Bolões
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold px-8">
                      Começar Agora
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="font-display font-semibold px-8 border-border text-foreground hover:bg-muted">
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
        <div className="container mx-auto grid gap-8 px-4 py-16 md:grid-cols-3">
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
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <f.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-display font-bold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Available Pools */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">
            Bolões <span className="text-gradient-gold">Disponíveis</span>
          </h2>
          <p className="mt-2 text-muted-foreground">Escolha seu bolão e garanta suas cotas</p>
        </div>

        {pools.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        onClose={() => setDialogOpen(false)}
        onSuccess={fetchPools}
      />

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-gradient-gold">BolãoVIP</span>
          </div>
          <p className="mt-2">© 2026 BolãoVIP. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
