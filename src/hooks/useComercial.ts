import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { limitesMes, todasPaginas } from "@/lib/financeiro";

export type Lead = Database["public"]["Tables"]["franquia_leads"]["Row"];
export type MetaTurma = Database["public"]["Tables"]["franquia_metas_turma"]["Row"];
export type LeadEtapa = Database["public"]["Tables"]["franquia_lead_etapas"]["Row"];
export type Canal = Database["public"]["Tables"]["franquia_canais"]["Row"];
export type Campanha = Database["public"]["Tables"]["franquia_campanhas"]["Row"];
export type VendedorPerfil = { id: string; nome: string };

export function useComercial(franquiaId: string, mes: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comercial", user?.id, franquiaId, mes],
    queryFn: async ({ signal }) => {
      const { inicio, fim } = limitesMes(mes);
      const [leads, metas, etapas, canais, campanhas, papeisVendedor] = await Promise.all([
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
        todasPaginas<Canal>((de, ate) => supabase.from("franquia_canais").select("*")
          .or(`franquia_id.is.null,franquia_id.eq.${franquiaId}`)
          .order("nome").order("id").range(de, ate).abortSignal(signal)),
        todasPaginas<Campanha>((de, ate) => supabase.from("franquia_campanhas").select("*")
          .eq("franquia_id", franquiaId).order("nome").order("id")
          .range(de, ate).abortSignal(signal)),
        // RLS de franquia_user_roles/franquia_profiles só libera leitura de
        // terceiros pro franqueador -- franqueado/vendedor não conseguem
        // resolver nome de outro usuário mesmo tentando (nem deveriam).
        user?.role === "franqueador"
          ? supabase.from("franquia_user_roles").select("user_id").eq("role", "vendedor").abortSignal(signal)
          : Promise.resolve({ data: [] as { user_id: string }[] }),
      ]);
      const idsVendedores = (papeisVendedor.data ?? []).map((item) => item.user_id);
      const perfis = idsVendedores.length
        ? await supabase.from("franquia_profiles").select("id, nome")
            .eq("franquia_id", franquiaId).in("id", idsVendedores).abortSignal(signal)
        : { data: [] as VendedorPerfil[] };
      return {
        leads, metas, etapas, campanhas,
        canais: canais.filter((canal) => !canal.franquia_id || canal.franquia_id === franquiaId),
        vendedores: perfis.data ?? [],
      };
    },
    enabled: !!user && !!franquiaId,
  });
}
