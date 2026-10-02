import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Só 2 papéis aqui, de propósito -- esse sistema é enxuto (financeiro do
// franqueado), não herda a matriz de permissões do CRM interno.
export type FranquiaRole = 'franqueador' | 'franqueado';

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  role: FranquiaRole;
  /** null pro franqueador (vê todas as unidades); obrigatório pro franqueado. */
  franquiaId: string | null;
  ativo: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarUsuario = async (authUser: User): Promise<AppUser | null> => {
    const [{ data: profile, error: profileError }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from('franquia_profiles').select('*').eq('id', authUser.id).maybeSingle(),
      supabase.from('franquia_user_roles').select('role').eq('user_id', authUser.id).maybeSingle(),
    ]);

    if (profileError) { console.error('Erro ao buscar perfil:', profileError); return null; }
    if (!profile) return null;
    if (!profile.ativo) { await supabase.auth.signOut(); return null; }
    if (roleError) console.error('Erro ao buscar papel:', roleError);

    const role = (roleData?.role as FranquiaRole) || 'franqueado';
    // Sem vínculo não há escopo válido para navegar; a RLS também não libera unidade.
    if (role === 'franqueado' && !profile.franquia_id) {
      console.error('Franqueado sem unidade vinculada -- login bloqueado.');
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: profile.id,
      nome: profile.nome,
      email: profile.email,
      role,
      franquiaId: profile.franquia_id,
      ativo: profile.ativo,
    };
  };

  useEffect(() => {
    let geracao = 0;
    let ativo = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      const atual = ++geracao;
      if (event === 'SIGNED_OUT') queryClient.clear();
      if (newSession?.user) {
        // setTimeout(0) evita deadlock entre o callback do onAuthStateChange e
        // chamadas supabase feitas dentro dele (recomendação oficial do supabase-js).
        setTimeout(() => {
          if (!ativo || atual !== geracao) return;
          carregarUsuario(newSession.user).then((u) => {
            if (!ativo || atual !== geracao) return;
            setUser(u); setLoading(false);
          }).catch(() => {
            if (!ativo || atual !== geracao) return;
            setUser(null); setLoading(false);
          });
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (ativo && !s) setLoading(false);
    });

    return () => { ativo = false; geracao++; subscription.unsubscribe(); };
  }, [queryClient]);

  const login = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
