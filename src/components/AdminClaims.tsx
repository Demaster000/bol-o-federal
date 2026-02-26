import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, FileText, User, Key } from 'lucide-react';

interface Claim {
  id: string;
  user_id: string;
  pool_id: string;
  full_name: string;
  cpf: string;
  pix_key: string;
  amount: number;
  status: string;
  accepted_terms: boolean;
  signed_contract: any;
  created_at: string;
  pool_title?: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'in_progress', label: 'Em Progresso', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'paid', label: 'Pago', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'rejected', label: 'Rejeitado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const AdminClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contractDialog, setContractDialog] = useState<{ open: boolean; contract: any }>({ open: false, contract: null });
  const { toast } = useToast();

  const fetchClaims = async () => {
    const { data } = await supabase
      .from('prize_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const poolIds = [...new Set(data.map(c => c.pool_id))];
      const { data: pools } = await supabase.from('pools').select('id, title').in('id', poolIds);
      const poolMap = new Map(pools?.map(p => [p.id, p.title]) ?? []);
      setClaims(data.map(c => ({ ...c, pool_title: poolMap.get(c.pool_id) ?? 'Bolão' })));
    } else {
      setClaims([]);
    }
  };

  useEffect(() => { fetchClaims(); }, []);

  const handleStatusChange = async (claimId: string, newStatus: string) => {
    const { error } = await supabase.from('prize_claims').update({ status: newStatus }).eq('id', claimId);
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar status.', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado!' });
      fetchClaims();
    }
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
    return <span className={`text-xs px-2 py-0.5 rounded-full border ${opt.color}`}>{opt.label}</span>;
  };

  const formatCpf = (cpf: string) =>
    cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  return (
    <div className="space-y-4">
      {claims.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">Nenhuma solicitação de prêmio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map(claim => (
            <div key={claim.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-foreground">{claim.pool_title}</p>
                    {getStatusBadge(claim.status)}
                  </div>
                  <p className="font-display font-bold text-gradient-gold">
                    R$ {claim.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(claim.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="text-foreground">{claim.full_name || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="text-foreground font-mono text-xs">{formatCpf(claim.cpf)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Chave PIX</p>
                    <p className="text-foreground break-all">{claim.pix_key}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t border-border">
                <Select value={claim.status} onValueChange={(v) => handleStatusChange(claim.id, v)}>
                  <SelectTrigger className="w-full sm:w-44 bg-muted h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {claim.signed_contract && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContractDialog({ open: true, contract: claim.signed_contract })}
                  >
                    <FileText className="mr-1 h-3.5 w-3.5" /> Ver Contrato
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={contractDialog.open} onOpenChange={(o) => !o && setContractDialog({ open: false, contract: null })}>
        <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Contrato Assinado</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            {contractDialog.contract && (
              <div className="space-y-3 text-sm pr-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-muted-foreground">Nome</p><p className="text-foreground">{contractDialog.contract.full_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">CPF</p><p className="text-foreground font-mono">{formatCpf(contractDialog.contract.cpf || '')}</p></div>
                  <div><p className="text-xs text-muted-foreground">Chave PIX</p><p className="text-foreground break-all">{contractDialog.contract.pix_key}</p></div>
                  <div><p className="text-xs text-muted-foreground">Valor</p><p className="text-foreground">R$ {contractDialog.contract.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bolão</p><p className="text-foreground">{contractDialog.contract.pool_title}</p></div>
                  <div><p className="text-xs text-muted-foreground">Modalidade</p><p className="text-foreground">{contractDialog.contract.lottery_name}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Assinado em</p><p className="text-foreground">{new Date(contractDialog.contract.signed_at).toLocaleString('pt-BR')}</p></div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{contractDialog.contract.terms_text}</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClaims;
