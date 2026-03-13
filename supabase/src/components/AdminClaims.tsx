import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

const TERMS_TEXT = `TERMO ELETRÔNICO DE RECEBIMENTO, QUITAÇÃO PLENA E RENÚNCIA

Ao informar meu CPF e clicar em "ACEITAR", declaro expressamente, para todos os fins de direito, que:

Participação Voluntária — Participei de forma livre e voluntária do bolão online promovido por Sorte Compartilhada, tendo previamente aceitado suas regras, condições de divisão e critérios de pagamento.

Quitação Total e Irrevogável — Concedo à organizadora plena, geral, rasa, irrevogável e irretratável quitação, para nada mais reclamar, a qualquer título, judicial ou extrajudicialmente, no presente ou no futuro.

Responsabilidade Tributária — Declaro estar ciente de que eventuais tributos, declarações fiscais ou obrigações acessórias decorrentes do valor recebido são de minha exclusiva responsabilidade.

Renúncia e Extensão a Herdeiros — Declaro que esta quitação é firmada em caráter definitivo, obrigando-me, bem como meus herdeiros, sucessores e representantes legais.

Validade Jurídica do Aceite Eletrônico — Reconheço que este aceite eletrônico constitui manifestação válida de vontade, com força de contrato e título de quitação, nos termos do Código Civil Brasileiro.

Registro Eletrônico — Estou ciente de que o sistema registrará automaticamente data e hora, endereço IP, dispositivo, navegador e hash criptográfico da transação vinculado ao meu CPF.

Proteção de Dados — Autorizo o tratamento dos meus dados pessoais nos termos da Lei nº 13.709/2018 (LGPD).

Foro — Fica eleito o foro da comarca da sede da organizadora, com renúncia expressa a qualquer outro.`;

const AdminClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contractDialog, setContractDialog] = useState<{ open: boolean; contract: any; claim: Claim | null }>({ open: false, contract: null, claim: null });
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
    if (newStatus === 'rejected') {
      setRejectionDialog({ open: true, claimId, reason: '' });
      return;
    }
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
    return <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border ${opt.color}`}>{opt.label}</span>;
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

  const buildContractForDisplay = (claim: Claim) => {
    const contract = claim.signed_contract || {};
    return {
      full_name: contract.full_name || claim.full_name,
      cpf: contract.cpf || claim.cpf,
      pix_key: contract.pix_key || claim.pix_key,
      amount: contract.amount || claim.amount,
      pool_title: contract.pool_title || claim.pool_title,
      lottery_name: contract.lottery_name || '—',
      concurso: contract.concurso || '—',
      signed_at: contract.signed_at || claim.created_at,
      client_ip: contract.client_ip || 'Não disponível',
      device: contract.device || 'Não disponível',
      browser: contract.browser || 'Não disponível',
      transaction_hash: contract.transaction_hash || 'Não disponível',
      terms_accepted: contract.terms_accepted ?? claim.accepted_terms,
    };
  };

  const exportToPdf = async (claim: Claim) => {
    try {
      const contract = buildContractForDisplay(claim);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text || '', maxWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += fontSize * 0.45;
        });
      };

      // Header
      addText('TERMO ELETRÔNICO DE RECEBIMENTO, QUITAÇÃO PLENA E RENÚNCIA', 14, true);
      yPosition += 6;

      // Contract info
      addText(`Nome: ${contract.full_name}`, 11);
      addText(`CPF: ${formatCpf(contract.cpf || '')}`, 11);
      addText(`Chave PIX: ${contract.pix_key}`, 11);
      addText(`Valor: R$ ${contract.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 11);
      addText(`Bolão: ${contract.pool_title}`, 11);
      addText(`Modalidade: ${contract.lottery_name}`, 11);
      addText(`Concurso: ${contract.concurso}`, 11);
      addText(`Assinado em: ${new Date(contract.signed_at).toLocaleString('pt-BR')}`, 11);
      yPosition += 6;

      // Acceptance data
      addText('DADOS DE ACEITE:', 11, true);
      yPosition += 2;
      addText(`Data e hora: ${new Date(contract.signed_at).toLocaleString('pt-BR')}`, 10);
      addText(`Endereço IP: ${contract.client_ip}`, 10);
      addText(`Dispositivo: ${contract.device} - ${contract.browser}`, 10);
      addText(`Hash da Transação: ${contract.transaction_hash}`, 10);
      yPosition += 6;

      // Full terms
      addText('TERMOS COMPLETOS:', 11, true);
      yPosition += 2;

      const termsWithAmount = TERMS_TEXT.replace(
        'Quitação Total e Irrevogável',
        `Recebimento Integral — Recebi integralmente o valor de R$ ${contract.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente à minha cota-parte do prêmio do ${contract.concurso}, modalidade ${contract.lottery_name}, nada restando a receber.\n\nQuitação Total e Irrevogável`
      );
      addText(termsWithAmount, 9);

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
            <div key={claim.id} className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-foreground text-sm sm:text-base">{claim.pool_title}</p>
                    {claim.purchase_quantity && (
                      <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
                        {claim.purchase_quantity} cota(s)
                      </span>
                    )}
                    {getStatusBadge(claim.status)}
                  </div>
                  <p className="font-display font-bold text-gradient-gold text-sm sm:text-base">
                    R$ {claim.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {new Date(claim.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Nome</p>
                    <p className="text-foreground text-xs sm:text-sm">{claim.full_name || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">CPF</p>
                  <p className="text-foreground font-mono text-[10px] sm:text-xs">{formatCpf(claim.cpf)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Chave PIX</p>
                    <p className="text-foreground break-all text-xs sm:text-sm">{claim.pix_key}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border">
                <Select value={claim.status} onValueChange={(v) => handleStatusChange(claim.id, v)}>
                  <SelectTrigger className="w-full sm:w-44 bg-muted h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContractDialog({ open: true, contract: buildContractForDisplay(claim), claim })}
                    className="text-xs h-8 flex-1 sm:flex-none"
                  >
                    <FileText className="mr-1 h-3 w-3" /> Contrato
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPdf(claim)}
                    className="text-xs h-8 flex-1 sm:flex-none"
                  >
                    <Download className="mr-1 h-3 w-3" /> PDF
                  </Button>
                  {(claim.status === 'pending' || claim.status === 'in_progress') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectionDialog({ open: true, claimId: claim.id, reason: '' })}
                      className="text-xs h-8 text-destructive hover:text-destructive flex-1 sm:flex-none"
                    >
                      Rejeitar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contract Dialog */}
      <Dialog open={contractDialog.open} onOpenChange={(o) => !o && setContractDialog({ open: false, contract: null, claim: null })}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display text-lg sm:text-xl">Contrato Assinado</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">Detalhes do contrato assinado pelo participante.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 pr-4">
            {contractDialog.contract && (
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">Nome</p><p className="text-foreground text-xs sm:text-sm">{contractDialog.contract.full_name}</p></div>
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">CPF</p><p className="text-foreground font-mono text-[10px] sm:text-xs">{formatCpf(contractDialog.contract.cpf || '')}</p></div>
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">Chave PIX</p><p className="text-foreground break-all text-xs sm:text-sm">{contractDialog.contract.pix_key}</p></div>
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">Valor</p><p className="text-foreground text-xs sm:text-sm">R$ {contractDialog.contract.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">Bolão</p><p className="text-foreground text-xs sm:text-sm">{contractDialog.contract.pool_title}</p></div>
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">Modalidade</p><p className="text-foreground text-xs sm:text-sm">{contractDialog.contract.lottery_name}</p></div>
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">Concurso</p><p className="text-foreground text-xs sm:text-sm">{contractDialog.contract.concurso}</p></div>
                  <div><p className="text-[10px] sm:text-xs text-muted-foreground">Assinado em</p><p className="text-foreground text-xs sm:text-sm">{new Date(contractDialog.contract.signed_at).toLocaleString('pt-BR')}</p></div>
                </div>

                <div className="rounded-lg bg-muted p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold">Dados de Aceite:</p>
                  <div className="text-[10px] sm:text-xs space-y-1">
                    <p><span className="text-muted-foreground">Data e hora:</span> <span className="text-foreground">{new Date(contractDialog.contract.signed_at).toLocaleString('pt-BR')}</span></p>
                    <p><span className="text-muted-foreground">Endereço IP:</span> <span className="text-foreground">{contractDialog.contract.client_ip}</span></p>
                    <p><span className="text-muted-foreground">Dispositivo:</span> <span className="text-foreground">{contractDialog.contract.device} - {contractDialog.contract.browser}</span></p>
                    <p><span className="text-muted-foreground">Hash:</span> <span className="text-foreground font-mono break-all">{contractDialog.contract.transaction_hash}</span></p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Termos Aceitos:</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{TERMS_TEXT}</p>
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 shrink-0 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContractDialog({ open: false, contract: null, claim: null })}
            >
              Fechar
            </Button>
            {contractDialog.claim && (
              <Button
                size="sm"
                onClick={() => {
                  exportToPdf(contractDialog.claim!);
                  setContractDialog({ open: false, contract: null, claim: null });
                }}
                className="bg-gradient-green hover:opacity-90 text-primary-foreground"
              >
                <Download className="mr-1 h-3.5 w-3.5" /> Exportar PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(o) => !o && setRejectionDialog({ open: false, claimId: '', reason: '' })}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl">Motivo da Recusa</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
              Informe o motivo da recusa. O usuário poderá visualizar este motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 sm:py-4">
            <Label htmlFor="rejection-reason" className="mb-2 block text-sm">Motivo *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Ex: CPF não confere com a chave PIX informada."
              className="bg-muted min-h-[100px]"
              value={rejectionDialog.reason}
              onChange={(e) => setRejectionDialog({ ...rejectionDialog, reason: e.target.value })}
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setRejectionDialog({ open: false, claimId: '', reason: '' })}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRejection}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
