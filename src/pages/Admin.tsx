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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trophy, Users, Ticket, Eye, DollarSign, Trash2, MessageSquare, Download } from 'lucide-react';
import AdminClaims from '@/components/AdminClaims';
import AdminWhatsApp from '@/components/AdminWhatsApp';
import { Navigate } from 'react-router-dom';

type PoolWithType = Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null };
type PurchaseWithProfile = Tables<'pool_purchases'> & { profile_name?: string; profile_phone?: string };

const DEFAULT_DESCRIPTION = `📋 COMO PARTICIPAR:

1️⃣ Clique em "Comprar Cota"
2️⃣ Escolha a quantidade de cotas desejada
3️⃣ Realize o pagamento via PIX (QR Code)
4️⃣ Aguarde a confirmação automática do pagamento
5️⃣ Pronto! Suas cotas estão garantidas! 🎉

🍀 Boa sorte a todos!`;

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [lotteryTypes, setLotteryTypes] = useState<Tables<'lottery_types'>[]>([]);
  const [pools, setPools] = useState<PoolWithType[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<PoolWithType | null>(null);
  const [poolPurchases, setPoolPurchases] = useState<PurchaseWithProfile[]>([]);

  // Form state
  const [form, setForm] = useState({
    lottery_type_id: '',
    title: '',
    description: DEFAULT_DESCRIPTION,
    price_per_quota: '',
    prize_amount: '',
    draw_date: '',
    unlimited_quotas: false,
    total_quotas: '100',
  });
  const [resultText, setResultText] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [exportFields, setExportFields] = useState({ name: true, phone: true, quotas: true, paid: true, date: false });

  const exportParticipants = () => {
    if (poolPurchases.length === 0) return;
    const headers: string[] = [];
    if (exportFields.name) headers.push('Nome');
    if (exportFields.phone) headers.push('WhatsApp');
    if (exportFields.quotas) headers.push('Cotas');
    if (exportFields.paid) headers.push('Total Pago');
    if (exportFields.date) headers.push('Data');

    const rows = poolPurchases.map(p => {
      const cols: string[] = [];
      if (exportFields.name) cols.push(p.profile_name ?? 'Usuário');
      if (exportFields.phone) cols.push(p.profile_phone ?? '—');
      if (exportFields.quotas) cols.push(String(p.quantity));
      if (exportFields.paid) cols.push(`R$ ${p.total_paid.toFixed(2)}`);
      if (exportFields.date) cols.push(new Date(p.created_at!).toLocaleDateString('pt-BR'));
      return cols.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes_${selectedPool?.title?.replace(/\s+/g, '_') ?? 'bolao'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    const priceVal = parseFloat(form.price_per_quota);
    const prizeVal = parseFloat(form.prize_amount);
    const totalQuotasVal = parseInt(form.total_quotas);

    if (isNaN(priceVal) || priceVal <= 0) {
      toast({ title: 'Erro', description: 'Valor por cota inválido.', variant: 'destructive' });
      return;
    }
    if (isNaN(prizeVal) || prizeVal < 0) {
      toast({ title: 'Erro', description: 'Prêmio estimado inválido.', variant: 'destructive' });
      return;
    }
    if (!form.unlimited_quotas && (isNaN(totalQuotasVal) || totalQuotasVal <= 0)) {
      toast({ title: 'Erro', description: 'Total de cotas inválido.', variant: 'destructive' });
      return;
    }

    setFormLoading(true);
    const { data: newPool, error } = await supabase.from('pools').insert({
      lottery_type_id: form.lottery_type_id,
      title: form.title,
      description: form.description || null,
      price_per_quota: priceVal,
      prize_amount: prizeVal,
      draw_date: form.draw_date || null,
      unlimited_quotas: form.unlimited_quotas,
      total_quotas: form.unlimited_quotas ? 999999 : totalQuotasVal,
    }).select().single();
    
    setFormLoading(false);
    if (error) {
      console.error('Create pool error:', error);
      toast({ title: 'Erro', description: `Não foi possível criar o bolão: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Bolão criado!' });
      // Trigger WhatsApp notification for new pool
      if (newPool) {
        try {
          const { data: session } = await supabase.auth.getSession();
          const token = session?.session?.access_token;
          fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ 
              type: 'new_pool', 
              data: { 
                id: newPool.id, 
                title: form.title, 
                price: parseFloat(form.price_per_quota), 
                prize: parseFloat(form.prize_amount), 
                draw_date: form.draw_date 
              } 
            }),
          }).catch(console.error);
        } catch (err) {
          console.error('WhatsApp notification error:', err);
        }
      }
      setCreateOpen(false);
      setForm({ lottery_type_id: '', title: '', description: DEFAULT_DESCRIPTION, price_per_quota: '', prize_amount: '', draw_date: '', unlimited_quotas: false, total_quotas: '100' });
      fetchData();
    }
  };

  const resetForm = () => {
    setForm({ lottery_type_id: '', title: '', description: DEFAULT_DESCRIPTION, price_per_quota: '', prize_amount: '', draw_date: '', unlimited_quotas: false, total_quotas: '100' });
    setIsEditing(false);
  };

  const handleEditPool = async () => {
    if (!selectedPool || !form.title || !form.price_per_quota || !form.prize_amount) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    const priceVal = parseFloat(form.price_per_quota);
    const prizeVal = parseFloat(form.prize_amount);
    const totalQuotasVal = parseInt(form.total_quotas);

    if (isNaN(priceVal) || priceVal <= 0) {
      toast({ title: 'Erro', description: 'Valor por cota inválido.', variant: 'destructive' });
      return;
    }
    if (isNaN(prizeVal) || prizeVal < 0) {
      toast({ title: 'Erro', description: 'Prêmio estimado inválido.', variant: 'destructive' });
      return;
    }
    if (!form.unlimited_quotas && (isNaN(totalQuotasVal) || totalQuotasVal <= 0)) {
      toast({ title: 'Erro', description: 'Total de cotas inválido.', variant: 'destructive' });
      return;
    }

    setFormLoading(true);
    const { error } = await supabase.from('pools').update({
      title: form.title,
      description: form.description || null,
      price_per_quota: priceVal,
      prize_amount: prizeVal,
      draw_date: form.draw_date || null,
      unlimited_quotas: form.unlimited_quotas,
      total_quotas: form.unlimited_quotas ? 999999 : totalQuotasVal,
    }).eq('id', selectedPool.id);
    setFormLoading(false);

    if (error) {
      console.error('Edit pool error:', error);
      toast({ title: 'Erro', description: `Não foi possível editar o bolão: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Bolão atualizado com sucesso!' });
      setEditOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleOpenEditDialog = (pool: PoolWithType) => {
    setSelectedPool(pool);
    setForm({
      lottery_type_id: pool.lottery_type_id,
      title: pool.title,
      description: pool.description || '',
      price_per_quota: String(pool.price_per_quota),
      prize_amount: String(pool.prize_amount || ''),
      draw_date: pool.draw_date || '',
      unlimited_quotas: pool.unlimited_quotas || false,
      total_quotas: String(pool.total_quotas || '100'),
    });
    setIsEditing(true);
    setEditOpen(true);
  };

  const handlePublishResult = async () => {
    if (!selectedPool) return;
    if (!resultText.trim()) {
      toast({ title: 'Erro', description: 'Informe os números sorteados.', variant: 'destructive' });
      return;
    }

    // Build update payload carefully
    const updateData: Record<string, any> = {
      result: { numbers: resultText.trim() },
      status: 'drawn',
    };

    // Only include prize_amount if the user provided a valid number
    if (prizeAmount.trim()) {
      const prizeVal = parseFloat(prizeAmount);
      if (isNaN(prizeVal) || prizeVal < 0) {
        toast({ title: 'Erro', description: 'Valor do prêmio inválido.', variant: 'destructive' });
        return;
      }
      updateData.prize_amount = prizeVal;
    }

    setFormLoading(true);
    const { error } = await supabase.from('pools').update(updateData).eq('id', selectedPool.id);

    if (!error) {
      // Notify all users who bought quotas for this pool
      const { data: purchases } = await supabase
        .from('pool_purchases')
        .select('user_id')
        .eq('pool_id', selectedPool.id);
      if (purchases && purchases.length > 0) {
        const uniqueUserIds = [...new Set(purchases.map(p => p.user_id))];
        const notifications = uniqueUserIds.map(userId => ({
          user_id: userId,
          pool_id: selectedPool.id,
          message: `O resultado do bolão "${selectedPool.title}" foi publicado! Acesse Meus Bolões para ver seu prêmio.`,
        }));
        await supabase.from('notifications').insert(notifications);
      }
    }

    setFormLoading(false);
    if (error) {
      console.error('Publish result error:', error);
      toast({ title: 'Erro', description: `Falha ao publicar resultado: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Resultado publicado e usuários notificados!' });
      // Trigger WhatsApp notification for result
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: 'result', data: { title: selectedPool.title, numbers: resultText.trim(), prize: prizeAmount || selectedPool.prize_amount } }),
        }).catch(console.error);
      } catch {}
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
      const profileMap = new Map(profiles?.map(p => [p.user_id, { name: p.full_name, phone: p.phone }]) ?? []);
      setPoolPurchases(purchases.map(p => {
        const profile = profileMap.get(p.user_id);
        return { 
          ...p, 
          profile_name: profile?.name ?? undefined,
          profile_phone: profile?.phone ?? undefined
        };
      }));
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

  const handleDeletePool = async (pool: PoolWithType) => {
    if (!window.confirm(`Tem certeza que deseja excluir o bolão "${pool.title}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    setFormLoading(true);
    const { error } = await supabase.from('pools').delete().eq('id', pool.id);
    setFormLoading(false);
    
    if (error) {
      console.error('Delete pool error:', error);
      toast({ title: 'Erro', description: `Falha ao excluir bolão: ${error.message}`, variant: 'destructive' });
    } else {
      toast({ title: 'Bolão excluído com sucesso!', description: 'O bolão foi removido e não aparecerá mais para os usuários.' });
      fetchData();
    }
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
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Painel <span className="text-gradient-gold">Admin</span>
          </h1>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="bg-gradient-green hover:opacity-90 text-primary-foreground shrink-0">
            <Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Novo Bolão</span><span className="sm:hidden">Novo</span>
          </Button>
        </div>

        <Tabs defaultValue="pools" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-muted grid grid-cols-3 sm:grid-cols-5 h-auto gap-1 p-1">
            <TabsTrigger value="pools" className="text-[11px] sm:text-sm py-2 data-[state=active]:bg-background">Bolões</TabsTrigger>
            <TabsTrigger value="claims" className="text-[11px] sm:text-sm py-2 data-[state=active]:bg-background">
              <DollarSign className="mr-1 h-3 w-3 hidden sm:inline" />Pagamentos
            </TabsTrigger>
            <TabsTrigger value="lotteries" className="text-[11px] sm:text-sm py-2 data-[state=active]:bg-background">Modalidades</TabsTrigger>
            <TabsTrigger value="pix-settings" className="text-[11px] sm:text-sm py-2 data-[state=active]:bg-background">PIX</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-[11px] sm:text-sm py-2 data-[state=active]:bg-background">
              <MessageSquare className="mr-1 h-3 w-3 hidden sm:inline" />WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pools">
            <div className="grid gap-4">
              {pools.map((pool, i) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-foreground text-sm sm:text-base">{pool.title}</h3>
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${statusColor[pool.status ?? 'open']}`}>
                        {statusLabel[pool.status ?? 'open']}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {pool.lottery_types?.name} • R$ {pool.price_per_quota.toFixed(2)}/cota •{' '}
                      {pool.sold_quotas ?? 0} vendidas
                      {pool.prize_amount ? ` • Prêmio: R$ ${Number(pool.prize_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleViewPurchases(pool)}>
                      <Eye className="mr-1 h-3 w-3" /> Detalhes
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleOpenEditDialog(pool)}>
                      <Pencil className="mr-1 h-3 w-3" /> Editar
                    </Button>
                    {pool.status === 'open' && (
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => handleClosePool(pool)}>
                        Fechar
                      </Button>
                    )}
                    {(pool.status === 'open' || pool.status === 'closed') && (
                      <Button
                        size="sm"
                        className="bg-gradient-gold text-secondary-foreground hover:opacity-90 text-xs h-8"
                        onClick={() => {
                          setSelectedPool(pool);
                          setPrizeAmount(pool.prize_amount ? String(pool.prize_amount) : '');
                          setResultOpen(true);
                        }}
                      >
                        <Trophy className="mr-1 h-3 w-3" /> Resultado
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => handleDeletePool(pool)}
                      disabled={formLoading}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Excluir
                    </Button>
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

          <TabsContent value="claims">
            <AdminClaims />
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

          <TabsContent value="pix-settings">
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">Integração Mercado Pago (PIX)</h3>
                <p className="text-sm text-muted-foreground">
                  O Access Token do Mercado Pago está configurado como variável de ambiente segura no backend.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground font-medium">MP_ACCESS_TOKEN</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Configurado</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Como funciona</h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>Ao comprar cotas, o usuário recebe um QR Code PIX gerado pela API do Mercado Pago.</li>
                  <li>O QR Code é válido por 30 minutos.</li>
                  <li>O sistema consulta o Mercado Pago a cada 5 segundos para confirmar o pagamento.</li>
                  <li>Opcionalmente, o webhook do Mercado Pago também confirma automaticamente.</li>
                  <li>A compra só é registrada após a confirmação do pagamento.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <h4 className="font-semibold text-foreground text-sm mb-2">⚠️ Webhook (Opcional)</h4>
                <p className="text-xs text-muted-foreground">
                  Configure a URL de notificação IPN no painel do Mercado Pago:
                </p>
                <code className="text-xs text-primary mt-1 block break-all">
                  {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID ?? 'seu-projeto'}.supabase.co/functions/v1/pix-webhook`}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Mesmo sem o webhook, o polling do frontend confirma o pagamento automaticamente.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp">
            <AdminWhatsApp />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Pool Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl">Criar Novo Bolão</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">Preencha os dados para criar um novo bolão.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                <div className="space-y-0.5">
                  <Label>Cotas Ilimitadas</Label>
                  <p className="text-xs text-muted-foreground">Permite vendas sem limite de estoque.</p>
                </div>
                <Switch 
                  checked={form.unlimited_quotas} 
                  onCheckedChange={(v) => setForm({ ...form, unlimited_quotas: v })} 
                />
              </div>

              {!form.unlimited_quotas && (
                <div className="space-y-2">
                  <Label>Total de Cotas *</Label>
                  <Input 
                    className="bg-muted" 
                    type="number" 
                    placeholder="100" 
                    value={form.total_quotas} 
                    onChange={(e) => setForm({ ...form, total_quotas: e.target.value })} 
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePool} disabled={formLoading} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
              {formLoading ? 'Criando...' : 'Criar Bolão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl">Publicar Resultado</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
              Informe os números sorteados para o bolão: {selectedPool?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Números sorteados *</Label>
                <Input className="bg-muted" placeholder="Ex: 05 - 12 - 23 - 34 - 45 - 56" value={resultText} onChange={(e) => setResultText(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prêmio (R$)</Label>
                <Input className="bg-muted" type="number" step="0.01" placeholder={selectedPool?.prize_amount ? String(selectedPool.prize_amount) : '0.00'} value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)} />
                <p className="text-xs text-muted-foreground">Deixe em branco para manter o valor atual.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setResultOpen(false)}>Cancelar</Button>
            <Button onClick={handlePublishResult} disabled={formLoading} className="bg-gradient-gold text-secondary-foreground hover:opacity-90">
              {formLoading ? 'Publicando...' : 'Publicar Resultado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl">Detalhes do Bolão</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">Informações e participantes do bolão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3 sm:p-4 space-y-1">
              <p className="font-display font-bold text-foreground text-sm sm:text-base">{selectedPool?.title}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedPool?.sold_quotas ?? 0} cotas vendidas •
                R$ {((selectedPool?.sold_quotas ?? 0) * (selectedPool?.price_per_quota ?? 0)).toFixed(2)} arrecadado
              </p>
              {selectedPool?.result && (
                <p className="text-xs sm:text-sm font-medium text-primary">
                  Resultado: {(selectedPool.result as any).numbers}
                </p>
              )}
            </div>

            {/* Export section */}
            {poolPurchases.length > 0 && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Exportar Participantes
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {[
                    { key: 'name' as const, label: 'Nome' },
                    { key: 'phone' as const, label: 'WhatsApp' },
                    { key: 'quotas' as const, label: 'Cotas' },
                    { key: 'paid' as const, label: 'Valor Pago' },
                    { key: 'date' as const, label: 'Data' },
                  ].map(field => (
                    <label key={field.key} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={exportFields[field.key]}
                        onCheckedChange={(v) => setExportFields(prev => ({ ...prev, [field.key]: v === true }))}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs text-foreground">{field.label}</span>
                    </label>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={exportParticipants}>
                  <Download className="mr-1 h-3 w-3" /> Exportar CSV
                </Button>
              </div>
            )}

            <div>
              <h4 className="font-display font-semibold text-foreground mb-2 flex items-center gap-1.5 text-sm">
                <Users className="h-4 w-4" /> Participantes ({poolPurchases.length})
              </h4>
              <div className="max-h-60 overflow-auto space-y-2">
                {poolPurchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2 sm:p-3 text-xs sm:text-sm">
                    <div>
                      <p className="font-medium text-foreground text-xs sm:text-sm">{p.profile_name ?? 'Usuário'}</p>
                      <div className="flex flex-col">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(p.created_at!).toLocaleDateString('pt-BR')}
                        </p>
                        {p.profile_phone && (
                          <p className="text-[10px] sm:text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                            <MessageSquare className="h-3 w-3" /> {p.profile_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center gap-1 text-xs">
                        <Ticket className="h-3 w-3" /> {p.quantity} cota(s)
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">R$ {p.total_paid.toFixed(2)}</p>
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

      {/* Edit Pool Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl">Editar Bolão</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">Atualize os dados do bolão.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                <div className="space-y-0.5">
                  <Label>Cotas Ilimitadas</Label>
                  <p className="text-xs text-muted-foreground">Permite vendas sem limite de estoque.</p>
                </div>
                <Switch 
                  checked={form.unlimited_quotas} 
                  onCheckedChange={(v) => setForm({ ...form, unlimited_quotas: v })} 
                />
              </div>

              {!form.unlimited_quotas && (
                <div className="space-y-2">
                  <Label>Total de Cotas *</Label>
                  <Input 
                    className="bg-muted" 
                    type="number" 
                    placeholder="100" 
                    value={form.total_quotas} 
                    onChange={(e) => setForm({ ...form, total_quotas: e.target.value })} 
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6 border-t border-border pt-4">
            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleEditPool} disabled={formLoading} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
              {formLoading ? 'Atualizando...' : 'Atualizar Bolão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
