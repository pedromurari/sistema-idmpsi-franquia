import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { limitesMes, todasPaginas } from "@/lib/financeiro";

export type Lead = Database["public"]["Tables"]["franquia_leads"]["Row"];
export type MetaTurma = Database["public"]["Tables"]["franquia_metas_turma"]["Row"];
export type LeadEtapa = Database["public"]["Tables"]["franquia_lead_etapas"]["Row"];

export function useComercial(franquiaId: string, mes: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comercial", user?.id, franquiaId, mes],
    queryFn: async ({ signal }) => {
      const { inicio, fim } = limitesMes(mes);
      const [leads, metas, etapas] = await Promise.all([
        todasPaginas<Lead>((de, ate) => supabase.from("franquia_leads").select("*")
          .eq("franquia_id", franquiaId).order("created_at", { ascending: false })
          .order("id").range(de, ate).abortSignal(signal)),
        todasPaginas<MetaTurma>((de, ate) => supabase.from("franquia_metas_turma").select("*")
          .eq("franquia_id", franquiaId).eq("competencia", inicio).order("turma_id")
          .range(de, ate).abortSignal(signal)),
        todasPaginas<LeadEtapa>((de, ate) => supabase.from("franquia_lead_etapas").select("*")
          .eq("franquia_id", franquiaId).eq("etapa_nova", "matricula")
          .gte("created_at", `${inicio}T00:00:00`).lt("created_at", `${fim}T00:00:00`)
          .order("created_at").order("id").range(de, ate).abortSignal(signal)),
      ]);
      return { leads, metas, etapas };
    },
    enabled: !!user && !!franquiaId,
  });
}
