import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Users, Ticket, TrendingUp } from 'lucide-react';

const COLORS = ['#209869', '#930089', '#260085', '#F78100', '#A61324', '#00c437', '#CB8833', '#A0CF1B', '#002561', '#00838F'];

const AdminMetrics = () => {
  const [stats, setStats] = useState({ revenue: 0, participants: 0, avgTicket: 0, totalPools: 0 });
  const [revenueByLottery, setRevenueByLottery] = useState<{ name: string; value: number }[]>([]);
  const [purchasesByDay, setPurchasesByDay] = useState<{ date: string; total: number }[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const [purchasesRes, poolsRes] = await Promise.all([
        supabase.from('pool_purchases').select('*, pools(lottery_type_id, lottery_types(name))'),
        supabase.from('pools').select('*'),
      ]);

      const purchases = purchasesRes.data ?? [];
      const pools = poolsRes.data ?? [];

      const revenue = purchases.reduce((s, p) => s + (p.total_paid ?? 0), 0);
      const uniqueUsers = new Set(purchases.map(p => p.user_id)).size;
      const avgTicket = purchases.length > 0 ? revenue / purchases.length : 0;

      setStats({ revenue, participants: uniqueUsers, avgTicket, totalPools: pools.length });

      // Revenue by lottery type
      const byLottery: Record<string, number> = {};
      purchases.forEach((p: any) => {
        const name = p.pools?.lottery_types?.name ?? 'Outro';
        byLottery[name] = (byLottery[name] ?? 0) + (p.total_paid ?? 0);
      });
      setRevenueByLottery(Object.entries(byLottery).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

      // Purchases by day (last 14 days)
      const dayMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      purchases.forEach(p => {
        const day = p.created_at?.slice(0, 10);
        if (day && dayMap[day] !== undefined) {
          dayMap[day] += p.total_paid ?? 0;
        }
      });
      setPurchasesByDay(Object.entries(dayMap).map(([date, total]) => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        total,
      })));
    };
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Receita Total', value: `R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-primary' },
          { label: 'Participantes', value: stats.participants.toString(), icon: Users, color: 'text-secondary' },
          { label: 'Ticket Médio', value: `R$ ${stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-accent-foreground' },
          { label: 'Total de Bolões', value: stats.totalPools.toString(), icon: Ticket, color: 'text-primary' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="font-display font-bold text-base sm:text-lg text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-bold text-sm text-foreground mb-4">Receita (últimos 14 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchasesByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(60, 10%, 95%)' }}
                  formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                />
                <Bar dataKey="total" fill="hsl(152, 60%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-bold text-sm text-foreground mb-4">Receita por Modalidade</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByLottery} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {revenueByLottery.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMetrics;
