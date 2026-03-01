import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus, Copy, Check, Loader2, QrCode, Clock } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface BuyQuotaDialogProps {
  pool: (Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null }) | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PixState = {
  step: 'form' | 'pix' | 'success' | 'error' | 'expired';
  paymentId?: string;
  qrCode?: string;
  qrCodeImage?: string;
  totalAmount?: number;
  expiresAt?: string;
};

const BuyQuotaDialog = ({ pool, open, onClose, onSuccess }: BuyQuotaDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pixState, setPixState] = useState<PixState>({ step: 'form' });
  const [timeLeft, setTimeLeft] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const total = pool ? quantity * pool.price_per_quota : 0;

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (pixState.step !== 'pix' || !pixState.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(pixState.expiresAt!).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        setPixState(prev => ({ ...prev, step: 'expired' }));
        if (pollRef.current) clearInterval(pollRef.current);
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [pixState.step, pixState.expiresAt]);

  if (!pool) return null;

  const startPolling = (paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pix-check-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ payment_id: paymentId }),
          }
        );

        const data = await response.json();

        if (data.status === 'paid') {
          setPixState(prev => ({ ...prev, step: 'success' }));
          if (pollRef.current) clearInterval(pollRef.current);
          toast({ title: 'Pagamento confirmado!', description: 'Suas cotas foram registradas com sucesso.' });
          onSuccess();
        } else if (data.status === 'expired') {
          setPixState(prev => ({ ...prev, step: 'expired' }));
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleGeneratePix = async () => {
    if (!user) {
      toast({ title: 'Erro', description: 'Faça login para comprar cotas.', variant: 'destructive' });
      return;
    }
    if (!accepted) {
      toast({ title: 'Erro', description: 'Você precisa aceitar os termos para continuar.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pix-create-charge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ pool_id: pool.id, quantity }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }

      setPixState({
        step: 'pix',
        paymentId: data.payment_id,
        qrCode: data.qr_code,
        qrCodeImage: data.qr_code_image,
        totalAmount: data.total_amount,
        expiresAt: data.expires_at,
      });

      // Start polling for payment confirmation
      startPolling(data.payment_id);
    } catch (err: any) {
      console.error('PIX error:', err);
      toast({ title: 'Erro', description: err.message || 'Falha ao gerar cobrança PIX.', variant: 'destructive' });
      setPixState({ step: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixState.qrCode) {
      navigator.clipboard.writeText(pixState.qrCode);
      setCopied(true);
      toast({ title: 'Código copiado!', description: 'Cole no app do seu banco.' });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPixState({ step: 'form' });
    setQuantity(1);
    setAccepted(false);
    setCopied(false);
    onClose();
  };

  // PIX success screen
  if (pixState.step === 'success') {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-lg p-4 sm:p-6">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Pagamento Confirmado!</h2>
            <p className="text-muted-foreground">Suas {quantity} cota(s) foram registradas com sucesso.</p>
            <Button onClick={handleClose} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // PIX expired screen
  if (pixState.step === 'expired') {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-lg p-4 sm:p-6">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <Clock className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">PIX Expirado</h2>
            <p className="text-muted-foreground">O tempo para pagamento expirou. Gere um novo QR Code.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
              <Button onClick={() => setPixState({ step: 'form' })} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
                Tentar Novamente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // PIX QR Code screen
  if (pixState.step === 'pix') {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl">Pagar com PIX</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escaneie o QR Code ou copie o código para pagar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Timer */}
            <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Expira em: <strong>{timeLeft}</strong>
              </span>
            </div>

            {/* Amount */}
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">Valor a pagar</p>
              <p className="font-display font-bold text-2xl text-gradient-gold">
                R$ {(pixState.totalAmount ?? total).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {quantity} cota(s) • {pool.title}
              </p>
            </div>

            {/* QR Code Image */}
            {pixState.qrCodeImage && (
              <div className="flex justify-center">
                <div className="bg-white rounded-xl p-4">
                  <img
                    src={pixState.qrCodeImage}
                    alt="QR Code PIX"
                    className="w-48 h-48 sm:w-56 sm:h-56"
                  />
                </div>
              </div>
            )}

            {/* Copy code */}
            {pixState.qrCode && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Código PIX (Copia e Cola)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={pixState.qrCode}
                    className="bg-muted text-xs font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopyPixCode}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Aguardando confirmação do pagamento...</span>
            </div>

            <div className="pt-2 border-t border-border">
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Form screen (default)
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAccepted(false); handleClose(); } }}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl">Comprar Cotas</DialogTitle>
          <DialogDescription className="text-muted-foreground">Selecione a quantidade e pague via PIX.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{pool.lottery_types?.name}</p>
            <p className="font-display font-bold text-sm text-foreground">{pool.title}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Quantidade de cotas</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center bg-muted text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço por cota</span>
              <span>R$ {pool.price_per_quota.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantidade</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between font-display font-bold text-lg pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-gradient-gold">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 flex items-center gap-3">
            <QrCode className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Pagamento via PIX</p>
              <p className="text-xs text-muted-foreground">QR Code válido por 30 minutos</p>
            </div>
          </div>

          {/* Consent Terms */}
          <div className="rounded-lg border border-border p-3">
            <p className="font-semibold text-foreground text-sm mb-2">Declaração de Consentimento</p>
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                Ao efetuar o Pix da cota, o participante declara ciência e aceitação plena das regras acima,
                constituindo acordo consensual e informal, independente da Caixa Econômica Federal, regido pela
                liberdade contratual (art. 421 e ss. do Código Civil) e boa-fé objetiva (art. 422 do CC).
                Este bolão não é oficial da Caixa.
              </p>
              <p>
                10% do prêmio será destinado à plataforma como taxa de administração. O valor do prêmio por
                cota apresentado já considera esse desconto.
              </p>
              <p>
                Pagamento de prêmio acima de 2.500 UFESP (R$ 96 mil em 2026) incidirá ITCMD de 4% + 1% de
                assessoria jurídica.
              </p>
            </div>
          </div>

          <label htmlFor="accept-buy-terms" className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <Checkbox
              id="accept-buy-terms"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-tight">
              Declaro que li e aceito os termos acima.
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleGeneratePix}
              disabled={loading || !accepted}
              className="bg-gradient-green hover:opacity-90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Gerar QR Code PIX
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyQuotaDialog;
