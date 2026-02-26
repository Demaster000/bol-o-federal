import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BuyQuotaDialogProps {
  pool: (Tables<'pools'> & { lottery_types: Tables<'lottery_types'> | null }) | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BuyQuotaDialog = ({ pool, open, onClose, onSuccess }: BuyQuotaDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!pool) return null;

  const total = quantity * pool.price_per_quota;

  const handleBuy = async () => {
    if (!user) {
      toast({ title: 'Erro', description: 'Faça login para comprar cotas.', variant: 'destructive' });
      return;
    }

    if (!accepted) {
      toast({ title: 'Erro', description: 'Você precisa aceitar os termos para continuar.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('pool_purchases').insert({
      pool_id: pool.id,
      user_id: user.id,
      quantity,
      total_paid: total,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível comprar. Tente novamente.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso!', description: `Você comprou ${quantity} cota(s)!` });
      setQuantity(1);
      setAccepted(false);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAccepted(false); onClose(); } }}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-lg sm:text-xl">Comprar Cotas</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">{pool.lottery_types?.name}</p>
              <p className="font-display font-bold text-sm sm:text-base text-foreground">{pool.title}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Quantidade de cotas</Label>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 sm:w-20 text-center bg-muted text-xs sm:text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 sm:p-4 space-y-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Preço por cota</span>
                <span>R$ {pool.price_per_quota.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Quantidade</span>
                <span>{quantity}</span>
              </div>
              <div className="flex justify-between font-display font-bold text-base sm:text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-gradient-gold">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Consent Terms */}
            <div className="rounded-lg border border-border">
              <ScrollArea className="h-32 sm:h-40 p-3">
                <div className="text-xs text-muted-foreground space-y-2 pr-3">
                  <p className="font-semibold text-foreground text-xs sm:text-sm">Declaração de Consentimento</p>
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
              </ScrollArea>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="accept-terms"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
              />
              <label htmlFor="accept-terms" className="text-xs sm:text-sm text-muted-foreground cursor-pointer leading-tight">
                Declaro que li e aceito os termos acima.
              </label>
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 shrink-0 border-t border-border">
          <Button variant="outline" onClick={() => { setAccepted(false); onClose(); }} className="text-xs sm:text-sm">Cancelar</Button>
          <Button onClick={handleBuy} disabled={loading || !accepted} className="bg-gradient-green hover:opacity-90 text-primary-foreground text-xs sm:text-sm">
            {loading ? 'Processando...' : 'Confirmar Compra'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyQuotaDialog;
