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
      terms_text: `TERMO ELETRÔNICO DE RECEBIMENTO, QUITAÇÃO PLENA E RENÚNCIA

Ao informar meu CPF e clicar em "ACEITAR", declaro expressamente, para todos os fins de direito, que:

Participação Voluntária
Participei de forma livre e voluntária do bolão online promovido por BolãoVIP, tendo previamente aceitado suas regras, condições de divisão e critérios de pagamento.

Recebimento Integral
Recebi integralmente o valor de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, referente à minha cota-parte do prêmio do concurso ${concurso}, modalidade ${lotteryName}, nada restando a receber.

Quitação Total e Irrevogável
Concedo à organizadora plena, geral, rasa, irrevogável e irretratável quitação, para nada mais reclamar, a qualquer título, judicial ou extrajudicialmente, no presente ou no futuro.

Responsabilidade Tributária
Declaro estar ciente de que eventuais tributos, declarações fiscais ou obrigações acessórias decorrentes do valor recebido são de minha exclusiva responsabilidade.

Renúncia e Extensão a Herdeiros
Declaro que esta quitação é firmada em caráter definitivo, obrigando-me, bem como meus herdeiros, sucessores e representantes legais, não podendo qualquer terceiro vinculado a mim pleitear direitos relacionados ao referido prêmio.

Validade Jurídica do Aceite Eletrônico
Reconheço que este aceite eletrônico constitui manifestação válida de vontade, com força de contrato e título de quitação, nos termos do Código Civil Brasileiro e da legislação aplicável a documentos e contratos eletrônicos.

Registro Eletrônico para Fins Probatórios
Estou ciente de que o sistema registrará automaticamente:
• Data e hora exatas do aceite: ${new Date().toLocaleString('pt-BR')}
• Endereço IP: ${clientIp}
• Dispositivo e navegador utilizados: ${device} - ${browser}
• Identificador único (hash criptográfico da transação): ${transactionHash}
• Registro interno vinculado ao meu CPF: ${cleanCpf}

Proteção de Dados
Autorizo o tratamento dos meus dados pessoais para fins legais, fiscais, operacionais, prevenção a fraudes e eventual defesa judicial, nos termos da Lei nº 13.709/2018 (LGPD).

Foro
Fica eleito o foro da comarca da sede da organizadora, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`,
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
      <DialogContent className="bg-card border-border w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
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
                <p className="font-semibold text-foreground text-sm">TERMO ELETRÔNICO DE RECEBIMENTO, QUITAÇÃO PLENA E RENÚNCIA</p>
                <p>Ao informar meu CPF e clicar em "ACEITAR", declaro expressamente, para todos os fins de direito, que:</p>
                
                <p className="font-semibold text-foreground">Participação Voluntária</p>
                <p>Participei de forma livre e voluntária do bolão online promovido por BolãoVIP, tendo previamente aceitado suas regras, condições de divisão e critérios de pagamento.</p>
                
                <p className="font-semibold text-foreground">Recebimento Integral</p>
                <p>
                  Recebi integralmente o valor de <strong className="text-foreground">R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> referente
                  à minha cota-parte do prêmio do <strong className="text-foreground">{concurso}</strong>, modalidade <strong className="text-foreground">{lotteryName}</strong>, nada restando a receber.
                </p>
                
                <p className="font-semibold text-foreground">Quitação Total e Irrevogável</p>
                <p>
                  Concedo à organizadora plena, geral, rasa, irrevogável e irretratável quitação, para nada mais reclamar, a qualquer título,
                  judicial ou extrajudicialmente, no presente ou no futuro.
                </p>
                
                <p className="font-semibold text-foreground">Responsabilidade Tributária</p>
                <p>
                  Declaro estar ciente de que eventuais tributos, declarações fiscais ou obrigações acessórias decorrentes do valor recebido são de minha exclusiva responsabilidade.
                </p>
                
                <p className="font-semibold text-foreground">Renúncia e Extensão a Herdeiros</p>
                <p>
                  Declaro que esta quitação é firmada em caráter definitivo, obrigando-me, bem como meus herdeiros, sucessores e representantes legais, não podendo qualquer terceiro vinculado a mim pleitear direitos relacionados ao referido prêmio.
                </p>
                
                <p className="font-semibold text-foreground">Validade Jurídica do Aceite Eletrônico</p>
                <p>
                  Reconheço que este aceite eletrônico constitui manifestação válida de vontade, com força de contrato e título de quitação, nos termos do Código Civil Brasileiro e da legislação aplicável a documentos e contratos eletrônicos.
                </p>
                
                <p className="font-semibold text-foreground">Registro Eletrônico para Fins Probatórios</p>
                <p>
                  Estou ciente de que o sistema registrará automaticamente data e hora exatas do aceite, endereço IP, dispositivo e navegador utilizados, identificador único (hash criptográfico da transação) e registro interno vinculado ao meu CPF.
                </p>
                
                <p className="font-semibold text-foreground">Proteção de Dados</p>
                <p>
                  Autorizo o tratamento dos meus dados pessoais para fins legais, fiscais, operacionais, prevenção a fraudes e eventual defesa judicial, nos termos da Lei nº 13.709/2018 (LGPD).
                </p>
                
                <p className="font-semibold text-foreground">Foro</p>
                <p>
                  Fica eleito o foro da comarca da sede da organizadora, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Nome Completo *</Label>
              <Input
                className="bg-muted text-xs sm:text-sm"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">CPF *</Label>
              <Input
                className="bg-muted text-xs sm:text-sm"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Chave PIX *</Label>
              <Input
                className="bg-muted text-xs sm:text-sm"
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
          <Button variant="outline" onClick={() => { setAccepted(false); onClose(); }} className="text-xs sm:text-sm">Cancelar</Button>
          <Button
            onClick={handleClaim}
            disabled={loading || !isFormValid}
            className="bg-gradient-green hover:opacity-90 text-primary-foreground text-xs sm:text-sm"
          >
            {loading ? 'Enviando...' : 'ACEITAR'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimPrizeDialog;
