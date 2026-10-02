import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UnidadeResumo { id: string; nome: string; }

interface ViewAsContextType {
  /** Lista de unidades (só populada pro franqueador -- é o que a RLS libera). */
  unidades: UnidadeResumo[];
  /** Unidade que o franqueador escolheu "ver como". null = visão geral da rede. */
  viewAsId: string | null;
  setViewAsId: (id: string | null) => void;
  /** franquia_id efetivo pras telas usarem: a própria (franqueado) ou a escolhida (franqueador). */
  franquiaEfetiva: string | null;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unidades, setUnidades] = useState<UnidadeResumo[]>([]);
  const [viewAsId, setViewAsId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'franqueador') { setUnidades([]); return; }
    supabase.from('franquias').select('id, nome').order('nome').then(({ data, error }) => {
      if (error) { console.error('Erro ao carregar unidades pro seletor "ver como":', error); return; }
      setUnidades((data as UnidadeResumo[]) ?? []);
    });
  }, [user?.role]);

  // Reseta "ver como" ao trocar de usuário (login/logout) -- nunca carrega
  // escopo de uma sessão anterior pra outra pessoa.
  useEffect(() => { setViewAsId(null); }, [user?.id]);

  const franquiaEfetiva = user?.role === 'franqueado' ? user.franquiaId : viewAsId;

  return (
    <ViewAsContext.Provider value={{ unidades, viewAsId, setViewAsId, franquiaEfetiva }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAs precisa estar dentro de <ViewAsProvider>');
  return ctx;
}
