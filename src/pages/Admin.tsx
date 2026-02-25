import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trophy, Users, Ticket, Eye } from 'lucide-react';
import { Navigate } from 'react-router-dom';

type PoolWithType = Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };
type PurchaseWithProfile = Tables<'pool_purchases'> & { profile_name?: string };

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [lotteryTypes, setLotteryTypes] = useState<Tables<'lottery_types'>[]>([]);
  const [pools, setPools] = useState<PoolWithType[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolWithType | null>(null);
  const [poolPurchases, setPoolPurchases] = useState<PurchaseWithProfile[]>([]);

  // Form state
  const [form, setForm] = useState({
    lottery_type_id: '',
    title: '',
    description: '',
    price_per_quota: '',
    prize_amount: '',
    draw_date: '',
  });
  const [resultText, setResultText] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    const [typesRes, poolsRes] = await Promise.all([
      supabase.from('lottery_types').select('*').order('name'),
      supabase.from('pools').select('*, lottery_types(*)').order('created_at', { ascending: false }),
    ]);
    if (typesRes.data) setLotteryTypes(typesRes.data);
    if (poolsRes.data) setPools(poolsRes.data as PoolWithType[]);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  if (authLoading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const handleCreatePool = async () => {
    if (!form.lottery_type_id || !form.title || !form.price_per_quota || !form.prize_amount) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    setFormLoading(true);
    const { error } = await supabase.from('pools').insert({
      lottery_type_id: form.lottery_type_id,
      title: form.title,
      description: form.description || null,
      price_per_quota: parseFloat(form.price_per_quota),
      prize_amount: parseFloat(form.prize_amount),
      draw_date: form.draw_date || null,
    });
    setFormLoading(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar o bolão.', variant: 'destructive' });
    } else {
      toast({ title: 'Bolão criado!' });
      setCreateOpen(false);
      setForm({ lottery_type_id: '', title: '', description: '', price_per_quota: '', prize_amount: '', draw_date: '' });
      fetchData();
    }
  };

  const handlePublishResult = async () => {
    if (!selectedPool) return;
    setFormLoading(true);
    const { error } = await supabase.from('pools').update({
      result: { numbers: resultText },
      prize_amount: prizeAmount ? parseFloat(prizeAmount) : null,
      status: 'drawn',
    }).eq('id', selectedPool.id);
    setFormLoading(false);
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao publicar resultado.', variant: 'destructive' });
    } else {
      toast({ title: 'Resultado publicado!' });
      setResultOpen(false);
      setResultText('');
      setPrizeAmount('');
      fetchData();
    }
  };

  const handleToggleLotteryType = async (lt: Tables<'lottery_types'>) => {
    await supabase.from('lottery_types').update({ active: !lt.active }).eq('id', lt.id);
    fetchData();
  };

  const handleViewPurchases = async (pool: PoolWithType) => {
    setSelectedPool(pool);
    const { data: purchases } = await supabase
      .from('pool_purchases')
      .select('*')
      .eq('pool_id', pool.id)
      .order('created_at', { ascending: false });
    if (purchases && purchases.length > 0) {
      const userIds = [...new Set(purchases.map(p => p.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) ?? []);
      setPoolPurchases(purchases.map(p => ({ ...p, profile_name: profileMap.get(p.user_id) ?? undefined })));
    } else {
      setPoolPurchases([]);
    }
    setDetailOpen(true);
  };

  const handleClosePool = async (pool: PoolWithType) => {
    await supabase.from('pools').update({ status: 'closed' }).eq('id', pool.id);
    fetchData();
    toast({ title: 'Bolão fechado para novas compras.' });
  };

  const statusLabel: Record<string, string> = {
    open: 'Aberto', closed: 'Fechado', drawn: 'Sorteado', paid: 'Pago',
  };

  const statusColor: Record<string, string> = {
    open: 'bg-primary/20 text-primary', closed: 'bg-secondary/20 text-secondary',
    drawn: 'bg-accent text-accent-foreground', paid: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Painel <span className="text-gradient-gold">Admin</span>
          </h1>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
            <Plus className="mr-1.5 h-4 w-4" /> Novo Bolão
          </Button>
        </div>

        <Tabs defaultValue="pools" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="pools">Bolões</TabsTrigger>
            <TabsTrigger value="lotteries">Modalidades</TabsTrigger>
          </TabsList>

          <TabsContent value="pools">
            <div className="grid gap-4">
              {pools.map((pool, i) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-foreground">{pool.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[pool.status ?? 'open']}`}>
                        {statusLabel[pool.status ?? 'open']}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pool.lottery_types?.name} • R$ {pool.price_per_quota.toFixed(2)}/cota •{' '}
                      {pool.sold_quotas ?? 0} cotas vendidas
                      {pool.prize_amount ? ` • Prêmio: R$ ${Number(pool.prize_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleViewPurchases(pool)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Detalhes
                    </Button>
                    {pool.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={() => handleClosePool(pool)}>
                        Fechar
                      </Button>
                    )}
                    {(pool.status === 'open' || pool.status === 'closed') && (
                      <Button
                        size="sm"
                        className="bg-gradient-gold text-secondary-foreground hover:opacity-90"
                        onClick={() => {
                          setSelectedPool(pool);
                          setResultOpen(true);
                        }}
                      >
                        <Trophy className="mr-1 h-3.5 w-3.5" /> Resultado
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              {pools.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                  <p className="text-muted-foreground">Nenhum bolão criado ainda.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="lotteries">
            <div className="grid gap-3">
              {lotteryTypes.map((lt) => (
                <div key={lt.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: lt.color ?? '#666' }} />
                    <div>
                      <p className="font-display font-semibold text-foreground">{lt.name}</p>
                      <p className="text-xs text-muted-foreground">{lt.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{lt.active ? 'Ativo' : 'Inativo'}</span>
                    <Switch checked={lt.active ?? false} onCheckedChange={() => handleToggleLotteryType(lt)} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Pool Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Criar Novo Bolão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Modalidade *</Label>
              <Select value={form.lottery_type_id} onValueChange={(v) => setForm({ ...form, lottery_type_id: v })}>
                <SelectTrigger className="bg-muted">
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  {lotteryTypes.filter(lt => lt.active).map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input className="bg-muted" placeholder="Ex: Mega-Sena Concurso 2700" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea className="bg-muted" placeholder="Detalhes do bolão..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor por cota (R$) *</Label>
                <Input className="bg-muted" type="number" step="0.01" min="0.01" placeholder="10.00" value={form.price_per_quota} onChange={(e) => setForm({ ...form, price_per_quota: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Prêmio estimado (R$) *</Label>
                <Input className="bg-muted" type="number" step="0.01" min="0" placeholder="130000000" value={form.prize_amount} onChange={(e) => setForm({ ...form, prize_amount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data do sorteio</Label>
              <Input className="bg-muted" type="datetime-local" value={form.draw_date} onChange={(e) => setForm({ ...form, draw_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePool} disabled={formLoading} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
              {formLoading ? 'Criando...' : 'Criar Bolão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Publicar Resultado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{selectedPool?.title}</p>
            <div className="space-y-2">
              <Label>Números sorteados</Label>
              <Input className="bg-muted" placeholder="Ex: 05 - 12 - 23 - 34 - 45 - 56" value={resultText} onChange={(e) => setResultText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prêmio (R$)</Label>
              <Input className="bg-muted" type="number" step="0.01" placeholder="0.00" value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultOpen(false)}>Cancelar</Button>
            <Button onClick={handlePublishResult} disabled={formLoading} className="bg-gradient-gold text-secondary-foreground hover:opacity-90">
              {formLoading ? 'Publicando...' : 'Publicar Resultado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Detalhes do Bolão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <p className="font-display font-bold text-foreground">{selectedPool?.title}</p>
              <p className="text-sm text-muted-foreground">
                {selectedPool?.sold_quotas ?? 0} cotas vendidas •
                R$ {((selectedPool?.sold_quotas ?? 0) * (selectedPool?.price_per_quota ?? 0)).toFixed(2)} arrecadado
              </p>
              {selectedPool?.result && (
                <p className="text-sm font-medium text-primary">
                  Resultado: {(selectedPool.result as any).numbers}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Participantes ({poolPurchases.length})
              </h4>
              <div className="max-h-60 overflow-auto space-y-2">
                {poolPurchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{p.profile_name ?? 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at!).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center gap-1">
                        <Ticket className="h-3 w-3" /> {p.quantity} cota(s)
                      </p>
                      <p className="text-xs text-muted-foreground">R$ {p.total_paid.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {poolPurchases.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma compra ainda.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
