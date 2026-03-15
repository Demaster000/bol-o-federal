import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Eye, EyeOff, LogIn, UserPlus, Gift } from 'lucide-react';
import logo from '@/assets/logo.png';

const Login = () => {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as 'login' | 'register') || 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [cpf, setCpf] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get redirect URL and referral code from query params
  const redirectUrl = searchParams.get('redirect') || '/';
  const poolId = searchParams.get('pool');
  const refCode = searchParams.get('ref');

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (poolId) {
        navigate(`/?pool=${poolId}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate, poolId]);

  // Build the redirect URL preserving the pool parameter
  const getRedirectUrl = () => {
    if (poolId) {
      return `/?pool=${poolId}`;
    }
    return redirectUrl;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: 'Informe seu e-mail', description: 'Digite seu e-mail no campo acima para receber o link de redefinição.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://sortecompartilhada.com.br/reset-password',
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'E-mail enviado! 📧', description: 'Verifique sua caixa de entrada para redefinir sua senha.' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const msg = error.message?.includes('Email not confirmed')
        ? 'Email ainda não confirmado. Verifique sua caixa de entrada.'
        : 'Email ou senha incorretos.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } else {
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
      navigate(getRedirectUrl());
    }
  };

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCpf(cpf)) {
      toast({ title: 'Erro', description: 'CPF inválido. Verifique e tente novamente.', variant: 'destructive' });
      return;
    }
    
    if (!fullName.trim()) {
      toast({ title: 'Erro', description: 'Por favor, insira seu nome completo.', variant: 'destructive' });
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
    const { error } = await signUp(email, password, fullName, phone, cpf, refCode || undefined);
    setLoading(false);
    
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Bem-vindo!', 
        description: 'Sua conta foi criada com sucesso. Você será redirecionado em breve.' 
      });
      // Aguardar um pouco para o usuário ver a mensagem, depois redirecionar
      setTimeout(() => {
        navigate(getRedirectUrl());
      }, 1500);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="relative w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center">
            <img src={logo} alt="Sorte Compartilhada" className="h-16 w-auto" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'login' 
              ? 'Entre para participar dos bolões' 
              : 'Cadastre-se para começar a jogar'}
          </p>
        </div>

        {/* Alert if redirected from pool link */}
        {poolId && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Autenticação obrigatória</p>
              <p className="text-xs text-amber-800 mt-1">
                Você precisa estar logado para comprar cotas do bolão.
              </p>
            </div>
          </div>
        )}

        {/* Referral alert */}
        {refCode && mode === 'register' && (
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 flex gap-3">
            <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Você foi indicado! 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastre-se e ao comprar cotas, quem te indicou ganha 1 cota grátis do mesmo sorteio!
              </p>
            </div>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex gap-2 rounded-lg border border-border bg-muted/50 p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium text-sm transition-all ${
              mode === 'login'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="h-4 w-4" />
            Entrar
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium text-sm transition-all ${
              mode === 'register'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Cadastro
          </button>
        </div>

        {/* Forms */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
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
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full text-center text-sm font-semibold text-primary hover:underline transition-colors py-2"
              >
                🔑 Esqueci minha senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-cpf">CPF</Label>
                <Input
                  id="register-cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  maxLength={14}
                  required
                  className="bg-muted"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-name">Nome completo</Label>
                <Input
                  id="register-name"
                  placeholder="Seu nome (conforme documento)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-muted"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-phone">WhatsApp</Label>
                <Input
                  id="register-phone"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="bg-muted"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="register-password"
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
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-muted pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                ⚠️ A chave PIX para recebimento de prêmios deverá estar <strong>no nome do titular</strong> cadastrado.
              </p>
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground font-display font-semibold"
              >
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </form>
          )}
        </div>

        {/* Info Text */}
        <p className="text-center text-xs text-muted-foreground">
          {mode === 'login' 
            ? 'Não tem conta? Clique em "Cadastro" acima para criar uma.'
            : 'Já tem conta? Clique em "Entrar" acima para fazer login.'}
        </p>
      </div>
    </div>
  );
};

export default Login;
