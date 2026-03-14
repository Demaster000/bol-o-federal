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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (currentSession: Session) => {
    let isAdminRole = false;
    
    // 1. Tentar ler do JWT (mais rápido e resolve o problema de app_metadata não populado)
    if (currentSession?.access_token) {
      try {
        // Decodificação robusta de JWT Base64Url
        const base64Url = currentSession.access_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const decodedToken = JSON.parse(jsonPayload);
        if (decodedToken?.app_metadata?.role === 'admin') {
          isAdminRole = true;
        }
      } catch (error) {
        console.error('Error decoding JWT:', error);
      }
    }

    // 2. Se não encontrou no JWT, tentar via user.app_metadata diretamente (fallback padrão)
    if (!isAdminRole && currentSession?.user?.app_metadata?.role === 'admin') {
      isAdminRole = true;
    }

    if (isAdminRole) {
      setIsAdmin(true);
    } else {
      // 3. Fallback final via RPC para garantir consistência com o banco
      try {
        const { data } = await supabase.rpc('has_role', { 
          _user_id: currentSession.user.id, 
          _role: 'admin' 
        });
        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin role via RPC:', error);
        setIsAdmin(false);
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session);
      }
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (!signInError && referralCode) {
        try {
          const { data: referrerUserId } = await supabase
            .rpc('lookup_referral_code', { _code: referralCode });
          
          if (referrerUserId) {
            const { data: currentUser } = await supabase.auth.getUser();
            if (currentUser?.user && referrerUserId !== currentUser.user.id) {
              await supabase.from('referrals').insert({
                referrer_id: referrerUserId,
                referred_id: currentUser.user.id,
              });
            }
          }
        } catch (e) {
          console.error('Referral tracking error:', e);
        }
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};