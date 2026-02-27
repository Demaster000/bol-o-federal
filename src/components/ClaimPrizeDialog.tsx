import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let browser = 'Desconhecido';
    let device = 'Desconhecido';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';
    if (ua.includes('Mobile')) device = 'Mobile';
    else if (ua.includes('Tablet')) device = 'Tablet';
    else device = 'Desktop';
    return { browser, device };
  };

  const getClientIp = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'Não disponível';
    }
  };

  const generateHash = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const generateSignedContract = async () => {
    const clientIp = await getClientIp();
    const { browser, device } = getDeviceInfo();
    const timestamp = new Date().toISOString();
    const transactionHash = generateHash(`${user?.id}${cpf}${timestamp}`);
    const cleanCpf = cpf.replace(/\D/g, '');

    return {
      signed_at: timestamp,
      user_id: user?.id,
      full_name: fullName.trim(),
      cpf: cleanCpf,
      pix_key: pixKey.trim(),
      pool_id: poolId,
      pool_title: poolTitle,
      lottery_name: lotteryName,
      concurso,
      amount,
      client_ip: clientIp,
      browser,
      device,
      transaction_hash: transactionHash,
      terms_accepted: true,
    };
  };

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
    const signedContract = await generateSignedContract();
    const { error } = await supabase.from('prize_claims').insert({
      user_id: user.id,
      pool_id: poolId,
      full_name: fullName.trim(),
      cpf: cleanCpf,
      pix_key: pixKey.trim(),
      amount,
      accepted_terms: true,
      signed_contract: signedContract,
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
      <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl">Receber Prêmio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pool info */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{lotteryName}</p>
            <p className="font-display font-bold text-sm text-foreground">{poolTitle}</p>
            <p className="font-display font-bold text-lg text-gradient-gold">
              R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* 90-day notice */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-foreground font-medium">
              Prazo máximo para recebimento: até <strong>90 dias</strong>.
            </p>
          </div>

          {/* Legal terms */}
          <div className="rounded-lg border border-border p-3">
            <p className="font-semibold text-foreground text-sm mb-2">TERMO DE RECEBIMENTO E QUITAÇÃO</p>
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>Ao informar meu CPF e clicar em "ACEITAR", declaro expressamente, para todos os fins de direito, que:</p>

              <p><strong className="text-foreground">Participação Voluntária</strong> — Participei de forma livre e voluntária do bolão online promovido por BolãoVIP, tendo previamente aceitado suas regras, condições de divisão e critérios de pagamento.</p>

              <p><strong className="text-foreground">Recebimento Integral</strong> — Recebi integralmente o valor de <strong className="text-foreground">R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> referente à minha cota-parte do prêmio do <strong className="text-foreground">{concurso}</strong>, modalidade <strong className="text-foreground">{lotteryName}</strong>, nada restando a receber.</p>

              <p><strong className="text-foreground">Quitação Total e Irrevogável</strong> — Concedo à organizadora plena, geral, rasa, irrevogável e irretratável quitação, para nada mais reclamar, a qualquer título, judicial ou extrajudicialmente, no presente ou no futuro.</p>

              <p><strong className="text-foreground">Responsabilidade Tributária</strong> — Declaro estar ciente de que eventuais tributos, declarações fiscais ou obrigações acessórias decorrentes do valor recebido são de minha exclusiva responsabilidade.</p>

              <p><strong className="text-foreground">Renúncia e Extensão a Herdeiros</strong> — Declaro que esta quitação é firmada em caráter definitivo, obrigando-me, bem como meus herdeiros, sucessores e representantes legais.</p>

              <p><strong className="text-foreground">Validade Jurídica do Aceite Eletrônico</strong> — Reconheço que este aceite eletrônico constitui manifestação válida de vontade, com força de contrato e título de quitação, nos termos do Código Civil Brasileiro.</p>

              <p><strong className="text-foreground">Registro Eletrônico</strong> — Estou ciente de que o sistema registrará automaticamente data e hora, endereço IP, dispositivo, navegador e hash criptográfico da transação vinculado ao meu CPF.</p>

              <p><strong className="text-foreground">Proteção de Dados</strong> — Autorizo o tratamento dos meus dados pessoais nos termos da Lei nº 13.709/2018 (LGPD).</p>

              <p><strong className="text-foreground">Foro</strong> — Fica eleito o foro da comarca da sede da organizadora, com renúncia expressa a qualquer outro.</p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Nome Completo *</Label>
              <Input
                className="bg-muted"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">CPF *</Label>
              <Input
                className="bg-muted"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                maxLength={14}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Chave PIX *</Label>
              <Input
                className="bg-muted"
                placeholder="CPF, e-mail, celular ou chave aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          </div>

          {/* Checkbox */}
          <label htmlFor="accept-claim-terms" className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <Checkbox
              id="accept-claim-terms"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-tight">
              Declaro que li e aceito os termos acima.
            </span>
          </label>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => { setAccepted(false); onClose(); }}>Cancelar</Button>
            <Button
              onClick={handleClaim}
              disabled={loading || !isFormValid}
              className="bg-gradient-green hover:opacity-90 text-primary-foreground"
            >
              {loading ? 'Enviando...' : 'ACEITAR'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimPrizeDialog;
