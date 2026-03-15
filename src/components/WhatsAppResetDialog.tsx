import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, MessageCircle, ArrowLeft, ShieldCheck, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WhatsAppResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'phone' | 'code' | 'success';

const WhatsAppResetDialog = ({ open, onOpenChange }: WhatsAppResetDialogProps) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setMaskedEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setLoading(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleRequestCode = async () => {
    if (!phone.trim()) {
      toast({ title: 'Erro', description: 'Informe seu número de WhatsApp.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-reset-password', {
        body: { action: 'request_code', phone },
      });
      if (error || data?.error) {
        toast({ title: 'Erro', description: data?.error || 'Erro ao enviar código.', variant: 'destructive' });
      } else {
        if (data?.email) setMaskedEmail(data.email);
        toast({ title: 'Código enviado! 📱', description: 'Verifique seu WhatsApp.' });
        setStep('code');
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro de conexão.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleVerifyAndReset = async () => {
    if (!code.trim() || code.length !== 6) {
      toast({ title: 'Erro', description: 'Informe o código de 6 dígitos.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não conferem.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-reset-password', {
        body: { action: 'verify_and_reset', phone, code, new_password: password },
      });
      if (error || data?.error) {
        toast({ title: 'Erro', description: data?.error || 'Código inválido ou expirado.', variant: 'destructive' });
      } else {
        setStep('success');
        toast({ title: 'Senha atualizada! ✅', description: 'Agora você pode fazer login com a nova senha.' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro de conexão.', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="h-5 w-5 text-primary" />
            {step === 'success' ? 'Senha redefinida!' : 'Redefinir senha'}
          </DialogTitle>
        </DialogHeader>

        {step === 'phone' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o número de WhatsApp cadastrado na sua conta. Enviaremos um código de verificação.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-phone">WhatsApp</Label>
              <Input
                id="reset-phone"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-muted"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleRequestCode}
              disabled={loading}
              className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
            >
              {loading ? 'Enviando...' : '📱 Enviar código via WhatsApp'}
            </Button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            {maskedEmail && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">E-mail de login associado:</p>
                  <p className="text-sm font-semibold text-foreground">{maskedEmail}</p>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Digite o código de 6 dígitos enviado para seu WhatsApp e escolha sua nova senha.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Código de verificação</Label>
              <Input
                id="reset-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-muted text-center text-lg tracking-widest font-mono"
                maxLength={6}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-muted pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirmar nova senha</Label>
              <Input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-muted"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('phone')}
                disabled={loading}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleVerifyAndReset}
                disabled={loading}
                className="flex-1 bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
              >
                {loading ? 'Verificando...' : '🔐 Redefinir senha'}
              </Button>
            </div>
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={loading}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Não recebeu? Reenviar código
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            {maskedEmail && (
              <p className="text-sm font-medium text-foreground">
                Login: <span className="text-primary">{maskedEmail}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Sua senha foi atualizada com sucesso! Agora você pode fazer login com a nova senha.
            </p>
            <Button
              onClick={() => handleClose(false)}
              className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
            >
              Voltar ao login
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppResetDialog;
