import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { todasPaginas } from "@/lib/financeiro";
import type { VendedorPerfil } from "@/hooks/useComercial";

export type Tarefa = Database["public"]["Tables"]["franquia_tarefas"]["Row"];

export function useTarefas(franquiaId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tarefas", user?.id, franquiaId],
    queryFn: async ({ signal }) => {
      const [tarefas, papeisVendedor] = await Promise.all([
        todasPaginas<Tarefa>((de, ate) =>
          supabase.from("franquia_tarefas").select("*")
            .eq("franquia_id", franquiaId).order("created_at", { ascending: false })
            .order("id").range(de, ate).abortSignal(signal)),
        // Mesma limitacao do Comercial: so franqueador le franquia_user_roles/
        // franquia_profiles de outros usuarios (RLS de 0001).
        user?.role === "franqueador"
          ? supabase.from("franquia_user_roles").select("user_id").eq("role", "vendedor").abortSignal(signal)
          : Promise.resolve({ data: [] as { user_id: string }[] }),
      ]);
      const idsVendedores = (papeisVendedor.data ?? []).map((item) => item.user_id);
      const perfis = idsVendedores.length
        ? await supabase.from("franquia_profiles").select("id, nome")
            .eq("franquia_id", franquiaId).in("id", idsVendedores).abortSignal(signal)
        : { data: [] as VendedorPerfil[] };
      return { tarefas, vendedores: perfis.data ?? [] };
    },
    enabled: !!user && !!franquiaId,
  });
}
