import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const JANELA_MESES = 6;

export function useComercialDados(franquiaId: string, mes: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comercial-dados", user?.id, franquiaId, mes],
    queryFn: async ({ signal }) => {
      const inicioMes = `${mes}-01`;
      const [ano, mesNum] = mes.split("-").map(Number);
      const fimMes = new Date(Date.UTC(mesNum === 12 ? ano + 1 : ano, mesNum === 12 ? 0 : mesNum, 0)).toISOString().slice(0, 10);
      const [leadsCanalMes, funil, vendasMes, vendasDiaSemana, cicloVenda, vendedorResumo] = await Promise.all([
        supabase.rpc("franquia_comercial_leads_canal_mes", { p_franquia_id: franquiaId, p_meses: JANELA_MESES }).abortSignal(signal),
        supabase.rpc("franquia_comercial_funil", { p_franquia_id: franquiaId, p_inicio: inicioMes, p_fim: fimMes }).abortSignal(signal),
        supabase.rpc("franquia_comercial_vendas_mes", { p_franquia_id: franquiaId, p_meses: JANELA_MESES }).abortSignal(signal),
        supabase.rpc("franquia_comercial_vendas_dia_semana", { p_franquia_id: franquiaId, p_meses: JANELA_MESES }).abortSignal(signal),
        supabase.rpc("franquia_comercial_ciclo_venda", { p_franquia_id: franquiaId, p_meses: JANELA_MESES }).abortSignal(signal),
        supabase.rpc("franquia_comercial_vendedor_resumo", { p_franquia_id: franquiaId, p_competencia: inicioMes }).abortSignal(signal),
      ]);
      for (const resultado of [leadsCanalMes, funil, vendasMes, vendasDiaSemana, cicloVenda, vendedorResumo])
        if (resultado.error) throw resultado.error;
      return {
        leadsCanalMes: leadsCanalMes.data ?? [],
        funil: funil.data ?? [],
        vendasMes: vendasMes.data ?? [],
        vendasDiaSemana: vendasDiaSemana.data ?? [],
        cicloVenda: cicloVenda.data?.[0] ?? { dias_medio: 0, amostras: 0 },
        vendedorResumo: vendedorResumo.data ?? [],
      };
    },
    enabled: !!user && !!franquiaId,
  });
}
