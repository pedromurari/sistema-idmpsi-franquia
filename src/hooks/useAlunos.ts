import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { todasPaginas } from "@/lib/financeiro";

export type Aluno = Database["public"]["Tables"]["franquia_alunos"]["Row"];
export type LeadElegivel = Pick<Database["public"]["Tables"]["franquia_leads"]["Row"],
  "id" | "nome" | "email" | "telefone" | "turma_id">;

export function useAlunos(franquiaId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["alunos", user?.id, franquiaId],
    queryFn: async ({ signal }) => {
      const [alunos, leadsAluno] = await Promise.all([
        todasPaginas<Aluno>((de, ate) =>
          supabase.from("franquia_alunos").select("*")
            .eq("franquia_id", franquiaId).order("nome").order("id")
            .range(de, ate).abortSignal(signal)),
        todasPaginas<LeadElegivel>((de, ate) =>
          supabase.from("franquia_leads").select("id, nome, email, telefone, turma_id")
            .eq("franquia_id", franquiaId).in("etapa", ["aluno", "formado", "pos_graduacao"])
            .order("nome").order("id").range(de, ate).abortSignal(signal)),
      ]);
      const comFicha = new Set(alunos.filter((a) => a.lead_id).map((a) => a.lead_id));
      return { alunos, leadsElegiveis: leadsAluno.filter((l) => !comFicha.has(l.id)) };
    },
    enabled: !!user && !!franquiaId,
  });
}
