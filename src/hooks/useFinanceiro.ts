import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  limitesMes,
  todasPaginas,
  type Lancamento,
  type RegraRoyalties,
  type Turma,
} from "@/lib/financeiro";

export function useTurmas(franquiaId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["turmas", user?.id, user?.role, franquiaId],
    queryFn: ({ signal }) =>
      todasPaginas<Turma>((de, ate) =>
        supabase
          .from("franquia_turmas")
          .select("*")
          .eq("franquia_id", franquiaId)
          .order("nome")
          .order("id")
          .range(de, ate)
          .abortSignal(signal),
      ),
    enabled: !!user && !!franquiaId,
  });
}

export function useFinanceiro(franquiaId: string, mes: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["financeiro", user?.id, user?.role, franquiaId, mes],
    queryFn: async ({ signal }) => {
      const { inicio, fim } = limitesMes(mes);
      const carregar = (coluna: "competencia" | "data_liquidacao") =>
        todasPaginas<Lancamento>((de, ate) =>
          supabase
            .from("franquia_dre_lancamentos")
            .select("*")
            .eq("franquia_id", franquiaId)
            .gte(coluna, inicio)
            .lt(coluna, fim)
            .order(coluna)
            .order("id")
            .range(de, ate)
            .abortSignal(signal),
        );
      const [dre, caixa, regra] = await Promise.all([
        carregar("competencia"),
        carregar("data_liquidacao"),
        supabase
          .from("franquia_royalties_regras")
          .select("*")
          .eq("franquia_id", franquiaId)
          .eq("competencia", inicio)
          .abortSignal(signal)
          .maybeSingle(),
      ]);
      if (regra.error) throw new Error(regra.error.message);
      return { dre, caixa, regra: regra.data as RegraRoyalties | null };
    },
    enabled: !!user && !!franquiaId,
  });
}
