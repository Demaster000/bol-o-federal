import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, FileText, User, Key, Download } from 'lucide-react';

interface Claim {
  id: string;
  user_id: string;
  pool_id: string;
  purchase_id: string | null;
  full_name: string;
  cpf: string;
  pix_key: string;
  amount: number;
  status: string;
  accepted_terms: boolean;
  signed_contract: any;
  created_at: string;
  pool_title?: string;
  purchase_quantity?: number;
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
  const [rejectionDialog, setRejectionDialog] = useState<{ open: boolean; claimId: string; reason: string }>({ open: false, claimId: '', reason: '' });
  const { toast } = useToast();

  const fetchClaims = async () => {
    const { data } = await supabase
      .from('prize_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const poolIds = [...new Set(data.map(c => c.pool_id))];
      const purchaseIds = [...new Set(data.map((c: any) => c.purchase_id).filter(Boolean))];
      const [poolsRes, purchasesRes] = await Promise.all([
        supabase.from('pools').select('id, title').in('id', poolIds),
        purchaseIds.length > 0
          ? supabase.from('pool_purchases').select('id, quantity').in('id', purchaseIds)
          : Promise.resolve({ data: [] }),
      ]);
      const poolMap = new Map(poolsRes.data?.map(p => [p.id, p.title]) ?? []);
      const purchaseMap = new Map((purchasesRes.data as any[])?.map(p => [p.id, p.quantity]) ?? []);
      setClaims(data.map((c: any) => ({
        ...c,
        pool_title: poolMap.get(c.pool_id) ?? 'Bolão',
        purchase_quantity: purchaseMap.get(c.purchase_id) ?? null,
      })));
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

  const handleConfirmRejection = async () => {
    if (!rejectionDialog.claimId || !rejectionDialog.reason.trim()) {
      toast({ title: 'Erro', description: 'Informe um motivo para a recusa.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('prize_claims')
      .update({ status: 'rejected', rejection_reason: rejectionDialog.reason })
      .eq('id', rejectionDialog.claimId);
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao rejeitar solicitação.', variant: 'destructive' });
    } else {
      toast({ title: 'Solicitação rejeitada!', description: 'O motivo foi registrado.' });
      setRejectionDialog({ open: false, claimId: '', reason: '' });
      fetchClaims();
    }
  };

  const exportToPdf = async (contract: any) => {
    try {
      // Importar a biblioteca jsPDF dinamicamente
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Função para adicionar texto com quebra de linha
      const addTextWithLineBreak = (text: string, fontSize: number = 10, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        if (isBold) {
          doc.setFont(undefined, 'bold');
        } else {
          doc.setFont(undefined, 'normal');
        }

        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
      };

      // Cabeçalho
      addTextWithLineBreak('TERMO ELETRÔNICO DE RECEBIMENTO, QUITAÇÃO PLENA E RENÚNCIA', 12, true);
      yPosition += 3;

      // Informações do contrato
      addTextWithLineBreak(`Nome: ${contract.full_name}`, 10);
      addTextWithLineBreak(`CPF: ${formatCpf(contract.cpf || '')}`, 10);
      addTextWithLineBreak(`Chave PIX: ${contract.pix_key}`, 10);
      addTextWithLineBreak(`Valor: R$ ${contract.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 10);
      addTextWithLineBreak(`Bolão: ${contract.pool_title}`, 10);
      addTextWithLineBreak(`Modalidade: ${contract.lottery_name}`, 10);
      addTextWithLineBreak(`Assinado em: ${new Date(contract.signed_at).toLocaleString('pt-BR')}`, 10);
      yPosition += 3;

      // Dados de aceite
      addTextWithLineBreak('Dados de Aceite:', 10, true);
      addTextWithLineBreak(`Data e hora: ${new Date(contract.signed_at).toLocaleString('pt-BR')}`, 9);
      addTextWithLineBreak(`Endereço IP: ${contract.client_ip}`, 9);
      addTextWithLineBreak(`Dispositivo: ${contract.device} - ${contract.browser}`, 9);
      addTextWithLineBreak(`Hash da Transação: ${contract.transaction_hash}`, 9);
      yPosition += 3;

      // Texto do contrato
      addTextWithLineBreak('Termo Completo:', 10, true);
      addTextWithLineBreak(contract.terms_text, 9);

      // Salvar o PDF
      doc.save(`contrato_${contract.cpf}_${new Date().getTime()}.pdf`);
      toast({ title: 'Sucesso!', description: 'Contrato exportado em PDF.' });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({ title: 'Erro', description: 'Falha ao exportar contrato em PDF.', variant: 'destructive' });
    }
  };

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
                    {claim.purchase_quantity && (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
                        {claim.purchase_quantity} cota(s)
                      </span>
                    )}
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
                    <p className="text-foreground text-xs sm:text-sm">{claim.full_name || '—'}</p>
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
                    <p className="text-foreground break-all text-xs sm:text-sm">{claim.pix_key}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t border-border">
                <Select value={claim.status} onValueChange={(v) => handleStatusChange(claim.id, v)}>
                  <SelectTrigger className="w-full sm:w-44 bg-muted h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {claim.signed_contract && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContractDialog({ open: true, contract: claim.signed_contract })}
                      className="text-xs sm:text-sm"
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" /> Ver Contrato
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPdf(claim.signed_contract)}
                      className="text-xs sm:text-sm"
                    >
                      <Download className="mr-1 h-3.5 w-3.5" /> Exportar PDF
                    </Button>
                  </>
                )}
                {claim.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectionDialog({ open: true, claimId: claim.id, reason: '' })}
                    className="text-xs sm:text-sm text-red-500 hover:text-red-600"
                  >
                    Rejeitar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={contractDialog.open} onOpenChange={(o) => !o && setContractDialog({ open: false, contract: null })}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display text-lg sm:text-xl">Contrato Assinado</DialogTitle>
            <DialogDescription className="text-muted-foreground">Detalhes do contrato assinado pelo participante.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 pr-4">
            {contractDialog.contract && (
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><p className="text-xs text-muted-foreground">Nome</p><p className="text-foreground text-xs sm:text-sm">{contractDialog.contract.full_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">CPF</p><p className="text-foreground font-mono text-xs">{formatCpf(contractDialog.contract.cpf || '')}</p></div>
                  <div><p className="text-xs text-muted-foreground">Chave PIX</p><p className="text-foreground break-all text-xs sm:text-sm">{contractDialog.contract.pix_key}</p></div>
                  <div><p className="text-xs text-muted-foreground">Valor</p><p className="text-foreground text-xs sm:text-sm">R$ {contractDialog.contract.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bolão</p><p className="text-foreground text-xs sm:text-sm">{contractDialog.contract.pool_title}</p></div>
                  <div><p className="text-xs text-muted-foreground">Modalidade</p><p className="text-foreground text-xs sm:text-sm">{contractDialog.contract.lottery_name}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Assinado em</p><p className="text-foreground text-xs sm:text-sm">{new Date(contractDialog.contract.signed_at).toLocaleString('pt-BR')}</p></div>
                </div>

                <div className="rounded-lg bg-muted p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold">Dados de Aceite:</p>
                  <div className="text-xs space-y-1">
                    <p><span className="text-muted-foreground">Data e hora:</span> {new Date(contractDialog.contract.signed_at).toLocaleString('pt-BR')}</p>
                    <p><span className="text-muted-foreground">Endereço IP:</span> {contractDialog.contract.client_ip}</p>
                    <p><span className="text-muted-foreground">Dispositivo:</span> {contractDialog.contract.device} - {contractDialog.contract.browser}</p>
                    <p><span className="text-muted-foreground">Hash da Transação:</span> {contractDialog.contract.transaction_hash}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{contractDialog.contract.terms_text}</p>
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 shrink-0 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setContractDialog({ open: false, contract: null })}
              className="text-xs sm:text-sm"
            >
              Fechar
            </Button>
            {contractDialog.contract && (
              <Button
                onClick={() => {
                  exportToPdf(contractDialog.contract);
                  setContractDialog({ open: false, contract: null });
                }}
                className="bg-gradient-green hover:opacity-90 text-primary-foreground text-xs sm:text-sm"
              >
                <Download className="mr-1 h-3.5 w-3.5" /> Exportar PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(o) => !o && setRejectionDialog({ open: false, claimId: '', reason: '' })}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Motivo da Recusa</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Informe o motivo pelo qual esta solicitação de pagamento está sendo recusada. O usuário poderá visualizar este motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason" className="mb-2 block">Motivo *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Ex: CPF não confere com a chave PIX informada."
              className="bg-muted min-h-[100px]"
              value={rejectionDialog.reason}
              onChange={(e) => setRejectionDialog({ ...rejectionDialog, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setRejectionDialog({ open: false, claimId: '', reason: '' })}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmRejection} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Confirmar Recusa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClaims;
