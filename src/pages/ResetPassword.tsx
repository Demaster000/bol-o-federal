import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import logo from '@/assets/logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event from the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setIsRecovery(true);
    }

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não conferem.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha atualizada!', description: 'Sua senha foi alterada com sucesso.' });
      navigate('/dashboard');
    }
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="absolute inset-0 bg-gradient-hero opacity-50" />
        <div className="relative w-full max-w-md space-y-6 text-center">
          <img src={logo} alt="Sorte Compartilhada" className="h-16 w-auto mx-auto" />
          <h1 className="font-display text-2xl font-bold text-foreground">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de redefinição de senha é inválido ou expirou.
          </p>
          <Button onClick={() => navigate('/login')} className="bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold">
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logo} alt="Sorte Compartilhada" className="h-16 w-auto mx-auto" />
          <div className="mt-4 mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
              <Input
                id="confirm-new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-muted"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
