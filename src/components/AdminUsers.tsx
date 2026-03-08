import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, User, Ticket, DollarSign } from 'lucide-react';

interface UserInfo {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  total_spent: number;
  total_quotas: number;
  purchases_count: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const [profilesRes, purchasesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('pool_purchases').select('user_id, quantity, total_paid'),
      ]);

      const profiles = profilesRes.data ?? [];
      const purchases = purchasesRes.data ?? [];

      const purchaseMap: Record<string, { spent: number; quotas: number; count: number }> = {};
      purchases.forEach(p => {
        if (!purchaseMap[p.user_id]) purchaseMap[p.user_id] = { spent: 0, quotas: 0, count: 0 };
        purchaseMap[p.user_id].spent += p.total_paid ?? 0;
        purchaseMap[p.user_id].quotas += p.quantity ?? 0;
        purchaseMap[p.user_id].count += 1;
      });

      setUsers(profiles.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        created_at: p.created_at,
        total_spent: purchaseMap[p.user_id]?.spent ?? 0,
        total_quotas: purchaseMap[p.user_id]?.quotas ?? 0,
        purchases_count: purchaseMap[p.user_id]?.count ?? 0,
      })));
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    !search || (u.full_name?.toLowerCase().includes(search.toLowerCase())) || (u.phone?.includes(search))
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="bg-muted pl-9 h-9 text-sm"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} usuário(s)</div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
        ) : filtered.map((u) => (
          <div key={u.user_id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{u.full_name ?? 'Sem nome'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {u.phone ?? '—'} • Cadastro: {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-right shrink-0">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground"><Ticket className="h-3 w-3" /><span className="text-[10px]">Cotas</span></div>
                  <p className="font-display font-bold text-xs text-foreground">{u.total_quotas}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-3 w-3" /><span className="text-[10px]">Gasto</span></div>
                  <p className="font-display font-bold text-xs text-foreground">R$ {u.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
