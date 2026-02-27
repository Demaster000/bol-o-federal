import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus } from 'lucide-react';
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
      <DialogContent className="bg-card border-border w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl">Comprar Cotas</DialogTitle>
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
            <Button variant="outline" onClick={() => { setAccepted(false); onClose(); }}>Cancelar</Button>
            <Button onClick={handleBuy} disabled={loading || !accepted} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
              {loading ? 'Processando...' : 'Confirmar Compra'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyQuotaDialog;
