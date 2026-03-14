import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, cpf: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async (currentSession: Session | null) => {
    if (!currentSession?.access_token) {
      setIsAdmin(false);
      return;
    }

    try {
      // Ler diretamente o JWT
      const payload = JSON.parse(
        atob(currentSession.access_token.split('.')[1])
      );

      const role = payload?.app_metadata?.role;

      if (role === 'admin') {
        setIsAdmin(true);
        return;
      }

      // Fallback RPC
      const { data, error } = await supabase.rpc('has_role', { 
        _user_id: payload.sub, 
        _role: 'admin' 
      });

      if (!error && data === true) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

    } catch (err) {
      console.error('Erro ao verificar admin:', err);
      setIsAdmin(false);
    }
  };

  const refreshAuth = async () => {
    setLoading(true);
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    await checkAdminStatus(currentSession);
    setLoading(false);
  };

  useEffect(() => {
    refreshAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await checkAdminStatus(currentSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string, cpf: string, referralCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName,
          phone: phone,
          cpf: cpf.replace(/\D/g, ''),
        },
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (!error) {
      await signIn(email, password);
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
      await checkAdminStatus(data.session);
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signUp, signIn, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};