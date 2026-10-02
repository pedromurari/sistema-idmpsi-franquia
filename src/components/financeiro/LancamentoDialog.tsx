import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  hoje,
  lerDecimal,
  limitesMes,
  type Lancamento,
  type Turma,
} from "@/lib/financeiro";
import { Campo, selectClass } from "./Shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LancamentoDialog({
  franquiaId,
  mes,
  turmas,
  lancamento,
  fechar,
}: {
  franquiaId: string;
  mes: string;
  turmas: Turma[];
  lancamento: Lancamento | null;
  fechar: () => void;
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [tipo, setTipo] = useState<"receita" | "despesa">(
    lancamento?.tipo ?? "receita",
  );
  const [competencia, setCompetencia] = useState(
    lancamento?.competencia.slice(0, 7) ?? mes,
  );
  const [turmaId, setTurmaId] = useState(lancamento?.turma_id ?? "");
  const [categoria, setCategoria] = useState(lancamento?.categoria ?? "");
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? "");
  const [valor, setValor] = useState(lancamento?.valor.toString() ?? "");
  const [liquidacao, setLiquidacao] = useState(
    lancamento?.data_liquidacao ?? "",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando || user?.role !== "franqueador") return;
    setErro("");
    setSalvando(true);
    try {
      if (!categoria.trim()) throw new Error("Informe a categoria.");
      if (liquidacao && liquidacao > hoje())
        throw new Error("A baixa realizada não pode ter data futura.");
      const valores = {
        tipo,
        competencia: limitesMes(competencia).inicio,
        turma_id: turmaId || null,
        categoria: categoria.trim(),
        descricao: descricao.trim() || null,
        valor: lerDecimal(valor, 9999999999.99),
        data_liquidacao: liquidacao || null,
      };
      const resultado = lancamento
        ? await supabase
            .from("franquia_dre_lancamentos")
            .update(valores)
            .eq("id", lancamento.id)
            .eq("franquia_id", franquiaId)
            .eq("updated_at", lancamento.updated_at)
            .select("id")
            .single()
        : await supabase
            .from("franquia_dre_lancamentos")
            .insert({
              ...valores,
              franquia_id: franquiaId,
              criado_por: user.id,
            })
            .select("id")
            .single();
      if (resultado.error)
        throw new Error(
          resultado.error.code === "PGRST116"
            ? "O lançamento mudou ou o acesso foi revogado. Feche e recarregue antes de editar."
            : "Não foi possível salvar o lançamento. Verifique os dados e tente novamente.",
        );
      await client.invalidateQueries({ queryKey: ["financeiro"] });
      toast.success("Lançamento salvo.");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lancamento ? "Editar lançamento" : "Novo lançamento"}
          </DialogTitle>
          <DialogDescription>
            Competência registra o resultado. A data da baixa registra a
            movimentação no caixa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar}>
          <fieldset disabled={salvando} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Campo id="lancamento-tipo" label="Tipo">
                <select
                  id="lancamento-tipo"
                  className={selectClass}
                  value={tipo}
                  onChange={(e) =>
                    setTipo(e.target.value as "receita" | "despesa")
                  }
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </Campo>
              <Campo id="lancamento-mes" label="Competência">
                <Input
                  id="lancamento-mes"
                  type="month"
                  min="1900-01"
                  max="9998-12"
                  required
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                />
              </Campo>
            </div>
            <Campo id="lancamento-turma" label="Turma">
              <select
                id="lancamento-turma"
                className={selectClass}
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
              >
                <option value="">Sem turma / geral da unidade</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                    {turma.ativo ? "" : " (inativa)"}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="lancamento-categoria" label="Categoria">
              <Input
                id="lancamento-categoria"
                required
                maxLength={120}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex.: mensalidade, aluguel"
              />
            </Campo>
            <Campo id="lancamento-descricao" label="Descrição (opcional)">
              <Input
                id="lancamento-descricao"
                maxLength={500}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </Campo>
            <Campo id="lancamento-valor" label="Valor (R$)">
              <Input
                id="lancamento-valor"
                inputMode="decimal"
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex.: 1250,00"
              />
            </Campo>
            <Campo
              id="lancamento-baixa"
              label={
                tipo === "receita"
                  ? "Recebido integralmente em (opcional)"
                  : "Pago integralmente em (opcional)"
              }
            >
              <Input
                id="lancamento-baixa"
                type="date"
                max={hoje()}
                value={liquidacao}
                onChange={(e) => setLiquidacao(e.target.value)}
              />
            </Campo>
            <p className="text-xs text-muted-foreground">
              Deixe a baixa vazia enquanto não houver confirmação do valor
              integral. Pagamentos parciais ainda não são suportados. Limpar
              essa data retira o lançamento do caixa, mantendo o DRE.
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
                {salvando ? "Salvando…" : "Salvar lançamento"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
