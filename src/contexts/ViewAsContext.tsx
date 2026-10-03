import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UnidadeResumo { id: string; nome: string; }

interface ViewAsContextType {
  /** Lista de unidades (só populada pro franqueador -- é o que a RLS libera). */
  unidades: UnidadeResumo[];
  recarregarUnidades: () => Promise<void>;
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

  const recarregarUnidades = useCallback(async () => {
    if (user?.role !== 'franqueador') { setUnidades([]); return; }
    const { data, error } = await supabase.from('franquias').select('id, nome').order('nome');
    if (error) { console.error('Erro ao carregar unidades para a área de trabalho:', error); return; }
    setUnidades((data as UnidadeResumo[]) ?? []);
  }, [user?.role]);

  useEffect(() => { void recarregarUnidades(); }, [recarregarUnidades]);

  // Reseta "ver como" ao trocar de usuário (login/logout) -- nunca carrega
  // escopo de uma sessão anterior pra outra pessoa.
  useEffect(() => { setViewAsId(null); }, [user?.id]);

  const franquiaEfetiva = user?.role === 'franqueado' ? user.franquiaId : viewAsId;

  return (
    <ViewAsContext.Provider value={{ unidades, recarregarUnidades, viewAsId, setViewAsId, franquiaEfetiva }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAs precisa estar dentro de <ViewAsProvider>');
  return ctx;
}
