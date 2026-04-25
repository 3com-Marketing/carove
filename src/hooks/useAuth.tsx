import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: { id: string; email: string; full_name: string; role: string } | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileErr) {
      // No expulsamos en caso de error de red / RLS — solo logueamos y dejamos
      // al user dentro con profile null. Algún componente verá un loading vacío
      // pero al menos no se queda fuera.
      console.warn('[useAuth] fetchProfile: error reading profiles', profileErr);
      return;
    }

    if (!profileData) {
      console.warn('[useAuth] fetchProfile: no profile row found for user_id', userId,
        '— el usuario está autenticado pero no tiene fila en profiles. Crea una con UPDATE/INSERT.');
      return;
    }

    // Solo expulsa si active === false explícito. NULL o undefined = considerar activo.
    if (profileData.active === false) {
      console.warn('[useAuth] fetchProfile: profile marked inactive, signing out');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    setProfile({
      id: profileData.id,
      email: profileData.email,
      full_name: profileData.full_name,
      role: roleData?.role || profileData.role || 'vendedor',
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signup = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message || null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
