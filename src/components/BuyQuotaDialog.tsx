import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { user } = useAuth();
  const { toast } = useToast();

  if (!pool) return null;

  const total = quantity * pool.price_per_quota;

  const handleBuy = async () => {
    if (!user) {
      toast({ title: 'Erro', description: 'Faça login para comprar cotas.', variant: 'destructive' });
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
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Comprar Cotas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">{pool.lottery_types?.name}</p>
            <p className="font-display font-bold text-foreground">{pool.title}</p>
          </div>

          <div className="space-y-2">
            <Label>Quantidade de cotas</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
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
                className="w-20 text-center bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-1">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleBuy} disabled={loading} className="bg-gradient-green hover:opacity-90 text-primary-foreground">
            {loading ? 'Processando...' : 'Confirmar Compra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuyQuotaDialog;
