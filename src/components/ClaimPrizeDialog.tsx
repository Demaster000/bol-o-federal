import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

interface ClaimPrizeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  poolId: string;
  poolTitle: string;
  lotteryName: string;
  concurso: string;
  amount: number;
}

const ClaimPrizeDialog = ({ open, onClose, onSuccess, poolId, poolTitle, lotteryName, concurso, amount }: ClaimPrizeDialogProps) => {
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const generateSignedContract = () => ({
    signed_at: new Date().toISOString(),
    user_id: user?.id,
    full_name: fullName.trim(),
    cpf: cpf.replace(/\D/g, ''),
    pix_key: pixKey.trim(),
    pool_id: poolId,
    pool_title: poolTitle,
    lottery_name: lotteryName,
    concurso,
    amount,
    terms_text: `TERMO ELETRÔNICO DE RECEBIMENTO E QUITAÇÃO DE PRÊMIO - Eu, ${fullName.trim()}, CPF ${cpf}, declaro que participei voluntariamente do bolão online organizado pela plataforma BolãoVIP. Estou ciente das regras do bolão previamente aceitas no momento da adesão. Recebi integralmente o valor de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente à minha cota-parte no prêmio do ${concurso}, modalidade ${lotteryName}. Dou plena, rasa, geral e irrevogável quitação. Autorizo o tratamento dos meus dados pessoais nos termos da LGPD. O prazo máximo para recebimento é de até 90 dias úteis.`,
  });

  const handleClaim = async () => {
    if (!user) return;
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!fullName.trim()) {
      toast({ title: 'Erro', description: 'Informe seu nome completo.', variant: 'destructive' });
      return;
    }
    if (cleanCpf.length !== 11) {
      toast({ title: 'Erro', description: 'CPF inválido.', variant: 'destructive' });
      return;
    }
    if (!pixKey.trim()) {
      toast({ title: 'Erro', description: 'Informe sua chave PIX.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('prize_claims').insert({
      user_id: user.id,
      pool_id: poolId,
      full_name: fullName.trim(),
      cpf: cleanCpf,
      pix_key: pixKey.trim(),
      amount,
      accepted_terms: true,
      signed_contract: generateSignedContract(),
    });
    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Aviso', description: 'Você já solicitou o recebimento deste prêmio.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: 'Não foi possível solicitar. Tente novamente.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Solicitação enviada!', description: 'Seu prêmio será transferido em até 90 dias.' });
      setFullName('');
      setCpf('');
      setPixKey('');
      setAccepted(false);
      onSuccess();
      onClose();
    }
  };

  const isFormValid = accepted && fullName.trim().length > 0 && cpf.replace(/\D/g, '').length === 11 && pixKey.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAccepted(false); onClose(); } }}>
      <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-lg sm:text-xl">Receber Prêmio</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3 sm:p-4 space-y-1">
              <p className="text-xs sm:text-sm text-muted-foreground">{lotteryName}</p>
              <p className="font-display font-bold text-sm sm:text-base text-foreground">{poolTitle}</p>
              <p className="font-display font-bold text-base sm:text-lg text-gradient-gold">
                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs sm:text-sm text-foreground font-medium">
                Prazo máximo para recebimento: até <strong>90 dias</strong>.
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground text-sm">TERMO ELETRÔNICO DE RECEBIMENTO E QUITAÇÃO DE PRÊMIO</p>
                <p>Ao informar meu CPF e clicar em "ACEITAR", declaro para todos os fins de direito que:</p>
                <p>Participei voluntariamente do bolão online organizado pela plataforma BolãoVIP.</p>
                <p>Estou ciente das regras do bolão previamente aceitas no momento da adesão.</p>
                <p>
                  Recebi integralmente o valor de <strong className="text-foreground">R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> referente
                  à minha cota-parte no prêmio do <strong className="text-foreground">{concurso}</strong>, modalidade <strong className="text-foreground">{lotteryName}</strong>.
                </p>
                <p>
                  Dou plena, rasa, geral e irrevogável quitação, nada mais tendo a reclamar, a qualquer título,
                  judicial ou extrajudicialmente.
                </p>
                <p>
                  Autorizo o tratamento dos meus dados pessoais exclusivamente para fins legais, fiscais e
                  contratuais, nos termos da Lei nº 13.709/2018 (LGPD).
                </p>
                <p>
                  O prazo máximo para o recebimento do prêmio é de até 90 (noventa) dias a contar
                  da data de aceitação deste termo.
                </p>
                <p>
                  Este aceite eletrônico possui validade jurídica, nos termos da legislação brasileira aplicável
                  a contratos digitais.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                className="bg-muted"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input
                className="bg-muted"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label>Chave PIX *</Label>
              <Input
                className="bg-muted"
                placeholder="CPF, e-mail, celular ou chave aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="accept-claim-terms"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
              />
              <label htmlFor="accept-claim-terms" className="text-xs sm:text-sm text-muted-foreground cursor-pointer leading-tight">
                Declaro que li e aceito os termos acima.
              </label>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 shrink-0 border-t border-border">
          <Button variant="outline" onClick={() => { setAccepted(false); onClose(); }}>Cancelar</Button>
          <Button
            onClick={handleClaim}
            disabled={loading || !isFormValid}
            className="bg-gradient-green hover:opacity-90 text-primary-foreground"
          >
            {loading ? 'Enviando...' : 'ACEITAR'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimPrizeDialog;
