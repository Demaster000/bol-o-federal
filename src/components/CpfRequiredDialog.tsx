import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const CpfRequiredDialog = () => {
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('cpf')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.cpf) {
          setOpen(true);
        }
      });
  }, [user]);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const validateCpf = (cpf: string): boolean => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validateCpf(cpf)) {
      toast({ title: 'Erro', description: 'CPF inválido. Verifique e tente novamente.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ cpf: cpf.replace(/\D/g, '') } as any)
      .eq('user_id', user.id);
    setLoading(false);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
    } else {
      toast({ title: 'CPF cadastrado!', description: 'Seus dados foram atualizados com sucesso.' });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-md p-4 sm:p-6 [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl">CPF obrigatório</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Para sua segurança e para recebimento de prêmios, precisamos do seu CPF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              A chave PIX para recebimento de prêmios deverá estar <strong>no nome do titular</strong> deste CPF.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">CPF *</Label>
            <Input
              className="bg-muted"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              maxLength={14}
              autoFocus
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading || cpf.replace(/\D/g, '').length !== 11}
            className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
          >
            {loading ? 'Salvando...' : 'Salvar CPF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CpfRequiredDialog;
