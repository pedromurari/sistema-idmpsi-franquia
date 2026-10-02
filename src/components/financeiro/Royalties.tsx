import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  calcularRoyalties,
  formatCurrency,
  lerDecimal,
  resumoFinanceiro,
  type Lancamento,
  type RegraRoyalties,
} from "@/lib/financeiro";
import { Campo, selectClass } from "./Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Royalties({
  franquiaId,
  mes,
  regra,
  dre,
  caixa,
}: {
  franquiaId: string;
  mes: string;
  regra: RegraRoyalties | null;
  dre: Lancamento[];
  caixa: Lancamento[];
}) {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const receita = regra
    ? resumoFinanceiro(regra.base === "caixa" ? caixa : dre).receita
    : 0;
  return (
    <Card className="p-5 space-y-3 border-primary/20">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            Royalties estimados — unidade inteira
          </h2>
          <p className="text-xs text-muted-foreground">
            Mês {mes.split("-").reverse().join("/")} · O filtro de turma não
            altera esta estimativa.
          </p>
        </div>
        {user?.role === "franqueador" && (
          <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
            {regra ? "Editar regra do mês" : "Configurar mês"}
          </Button>
        )}
      </div>
      {regra ? (
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(
              calcularRoyalties(receita, Number(regra.percentual)),
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {Number(regra.percentual).toLocaleString("pt-BR")}% sobre{" "}
            {formatCurrency(receita)} de receitas{" "}
            {regra.base === "caixa"
              ? "recebidas no mês"
              : "por competência do mês"}
            .
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sem regra para este mês. A administração precisa definir a base e o
          percentual.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Estimativa sobre a soma das receitas, sem dedução de despesas. Não gera
        cobrança, baixa ou despesa automática. Pode mudar ao corrigir
        lançamentos; não representa fechamento ou repasse confirmado.
      </p>
      {aberto && (
        <RegraDialog
          franquiaId={franquiaId}
          mes={mes}
          regra={regra}
          fechar={() => setAberto(false)}
        />
      )}
    </Card>
  );
}

function RegraDialog({
  franquiaId,
  mes,
  regra,
  fechar,
}: {
  franquiaId: string;
  mes: string;
  regra: RegraRoyalties | null;
  fechar: () => void;
}) {
  const client = useQueryClient();
  const [base, setBase] = useState(regra?.base ?? "");
  const [percentual, setPercentual] = useState(
    regra?.percentual.toString() ?? "",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    setErro("");
    setSalvando(true);
    try {
      if (base !== "caixa" && base !== "competencia")
        throw new Error("Selecione a base de cálculo.");
      const valores: { base: "caixa" | "competencia"; percentual: number } = {
        base,
        percentual: lerDecimal(percentual, 100, true),
      };
      const resultado = regra
        ? await supabase
            .from("franquia_royalties_regras")
            .update(valores)
            .eq("id", regra.id)
            .eq("franquia_id", franquiaId)
            .eq("updated_at", regra.updated_at)
            .select("id")
            .single()
        : await supabase
            .from("franquia_royalties_regras")
            .insert({
              ...valores,
              franquia_id: franquiaId,
              competencia: `${mes}-01`,
            })
            .select("id")
            .single();
      if (resultado.error)
        throw new Error(
          ["23505", "PGRST116"].includes(resultado.error.code)
            ? "A regra mudou ou o acesso foi revogado. Feche e recarregue antes de editar."
            : "Não foi possível salvar a regra. Tente novamente.",
        );
      await client.invalidateQueries({ queryKey: ["financeiro"] });
      toast.success("Regra mensal salva.");
      fechar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSalvando(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !salvando) fechar();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Royalties de {mes.split("-").reverse().join("/")}
          </DialogTitle>
          <DialogDescription>
            A regra vale apenas para este mês e esta unidade. Os outros meses
            permanecem como estão.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar}>
          <fieldset disabled={salvando} className="space-y-4">
            <Campo id="royalties-base" label="Base de cálculo">
              <select
                id="royalties-base"
                className={selectClass}
                required
                value={base}
                onChange={(e) => setBase(e.target.value as typeof base)}
              >
                <option value="" disabled>
                  Selecione uma base
                </option>
                <option value="caixa">Receita recebida (caixa)</option>
                <option value="competencia">Receita por competência</option>
              </select>
            </Campo>
            <Campo id="royalties-percentual" label="Percentual (%)">
              <Input
                id="royalties-percentual"
                inputMode="decimal"
                required
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                placeholder="De 0 a 100"
              />
            </Campo>
            <p className="text-xs text-muted-foreground">
              Use 0% quando a unidade estiver isenta no mês. O cálculo usa
              receita bruta registrada; deduções contratuais e cobrança não
              estão incluídas nesta etapa.
            </p>
            {erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit">
                {salvando ? "Salvando…" : "Salvar regra"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
