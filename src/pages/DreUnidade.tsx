import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useFinanceiro, useTurmas } from "@/hooks/useFinanceiro";
import {
  filtrarTurma,
  formatCurrency,
  formatData,
  limitesMes,
  mesAtual,
  resumoFinanceiro,
  type Lancamento,
} from "@/lib/financeiro";
import {
  Campo,
  ErroCarregamento,
  Indicador,
  cabecalhoTabela,
  selectClass,
} from "@/components/financeiro/Shared";
import { LancamentoDialog } from "@/components/financeiro/LancamentoDialog";
import { Royalties } from "@/components/financeiro/Royalties";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DreUnidade() {
  const { user } = useAuth();
  const { franquiaEfetiva } = useViewAs();
  if (!franquiaEfetiva) return <Navigate to="/unidades" replace />;
  // Remonta filtros/formulários na troca de unidade ou sessão: nenhuma edição migra de escopo.
  return (
    <FinanceiroUnidade
      key={`${user?.id}:${franquiaEfetiva}`}
      franquiaId={franquiaEfetiva}
    />
  );
}

function FinanceiroUnidade({ franquiaId }: { franquiaId: string }) {
  const [mes, setMes] = useState(mesAtual);
  const [filtroMes, setFiltroMes] = useState(mes);
  const [erroMes, setErroMes] = useState("");
  const [turmaId, setTurmaId] = useState("todas");
  const [modo, setModo] = useState("competencia");
  const [editando, setEditando] = useState<Lancamento | null | undefined>();
  const [pagina, setPagina] = useState(0);
  const { user } = useAuth();
  const financeiro = useFinanceiro(franquiaId, mes);
  const turmas = useTurmas(franquiaId);
  const carregando = financeiro.isPending || turmas.isPending;
  const falhou = financeiro.isError || turmas.isError;
  const dados = financeiro.data;
  const itens = filtrarTurma(
    modo === "caixa" ? (dados?.caixa ?? []) : (dados?.dre ?? []),
    turmaId,
  );
  const resumo = resumoFinanceiro(itens);
  const nomesTurmas = new Map(
    turmas.data?.map((turma) => [turma.id, turma.nome]),
  );
  const ultimaPagina = Math.max(0, Math.ceil(itens.length / 25) - 1);
  const paginaAtual = Math.min(pagina, ultimaPagina);
  const visiveis = itens.slice(paginaAtual * 25, (paginaAtual + 1) * 25);
  const semBaixa = resumoFinanceiro(
    filtrarTurma(
      dados?.dre.filter((item) => !item.data_liquidacao) ?? [],
      turmaId,
    ),
  );
  function mudarMes(valor: string) {
    setFiltroMes(valor);
    try {
      limitesMes(valor);
      setMes(valor);
      setErroMes("");
      setPagina(0);
      setEditando(undefined);
    } catch {
      setErroMes("Escolha um mês válido para atualizar os dados.");
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Financeiro da unidade</h1>
          <p className="text-sm text-muted-foreground">
            DRE, caixa realizado e royalties mensais.
          </p>
        </div>
        {user?.role === "franqueador" && (
          <Button
            disabled={carregando || falhou || !!erroMes}
            onClick={() => setEditando(null)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        <Campo id="financeiro-mes" label="Mês de referência">
          <Input
            id="financeiro-mes"
            type="month"
            min="1900-01"
            max="9998-12"
            value={filtroMes}
            onChange={(e) => mudarMes(e.target.value)}
          />
        </Campo>
        <Campo id="financeiro-turma" label="Turma">
          <select
            id="financeiro-turma"
            className={selectClass}
            value={turmaId}
            onChange={(e) => {
              setTurmaId(e.target.value);
              setPagina(0);
            }}
          >
            <option value="todas">Todas as turmas + sem turma</option>
            <option value="sem-turma">Sem turma / geral da unidade</option>
            {turmas.data?.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
                {turma.ativo ? "" : " (inativa)"}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {erroMes && (
        <p role="alert" className="text-destructive text-sm">
          {erroMes}
        </p>
      )}
      <Tabs
        value={modo}
        onValueChange={(valor) => {
          setModo(valor);
          setPagina(0);
        }}
      >
        <TabsList>
          <TabsTrigger value="competencia">DRE por competência</TabsTrigger>
          <TabsTrigger value="caixa">Caixa realizado</TabsTrigger>
        </TabsList>
      </Tabs>
      {carregando ? (
        <Loader2
          className="h-6 w-6 animate-spin mx-auto"
          aria-label="Carregando financeiro"
        />
      ) : falhou ? (
        <ErroCarregamento
          retry={() => {
            void financeiro.refetch();
            void turmas.refetch();
          }}
        />
      ) : (
        !erroMes &&
        dados && (
          <>
            <p className="text-sm text-muted-foreground">
              {modo === "caixa"
                ? "Recebimentos e pagamentos integrais com baixa neste mês, mesmo que a competência seja de outro mês. O resultado é a movimentação líquida do período, sem saldo inicial."
                : "Receitas e despesas da competência selecionada, independentemente de recebimento ou pagamento."}
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <Indicador
                label={modo === "caixa" ? "Recebido" : "Receitas"}
                value={formatCurrency(resumo.receita)}
              />
              <Indicador
                label={modo === "caixa" ? "Pago" : "Despesas"}
                value={formatCurrency(resumo.despesa)}
              />
              <Indicador
                label={modo === "caixa" ? "Movimentação líquida" : "Resultado"}
                value={formatCurrency(resumo.resultado)}
              />
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className={cabecalhoTabela}>
                    <TableHead>Competência / baixa</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Categoria / descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!itens.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        {modo === "caixa"
                          ? "Nenhuma baixa registrada para este mês e filtro."
                          : "Nenhum lançamento nesta competência e filtro."}
                      </TableCell>
                    </TableRow>
                  )}
                  {visiveis.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p>
                          {item.competencia
                            .slice(0, 7)
                            .split("-")
                            .reverse()
                            .join("/")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.data_liquidacao
                            ? `Baixa: ${formatData(item.data_liquidacao)}`
                            : "Sem baixa informada"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {item.turma_id
                          ? (nomesTurmas.get(item.turma_id) ??
                            "Turma indisponível")
                          : "Sem turma"}
                      </TableCell>
                      <TableCell>
                        <p>{item.categoria}</p>
                        <p className="text-xs text-muted-foreground max-w-xs break-words">
                          {item.descricao ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {item.tipo === "receita" ? "Receita" : "Despesa"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(Number(item.valor))}
                      </TableCell>
                      <TableCell>
                        {user?.role === "franqueador" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditando(item)}
                            aria-label={`Editar ${item.categoria} de ${formatCurrency(Number(item.valor))}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            {itens.length > 25 && (
              <div className="flex items-center justify-end gap-3 text-sm">
                <span>
                  {itens.length} lançamentos · Página {paginaAtual + 1} de{" "}
                  {ultimaPagina + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual === 0}
                  onClick={() => setPagina(paginaAtual - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual === ultimaPagina}
                  onClick={() => setPagina(paginaAtual + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sem baixa informada na competência e turma selecionadas:{" "}
              {formatCurrency(semBaixa.receita)} em receitas e{" "}
              {formatCurrency(semBaixa.despesa)} em despesas. Isso não indica
              inadimplência. Registros antigos permanecem sem turma e sem baixa
              até serem classificados.
            </p>
            <Royalties
              key={mes}
              franquiaId={franquiaId}
              mes={mes}
              regra={dados.regra}
              dre={dados.dre}
              caixa={dados.caixa}
            />
          </>
        )
      )}
      {editando !== undefined && (
        <LancamentoDialog
          franquiaId={franquiaId}
          mes={mes}
          turmas={turmas.data ?? []}
          lancamento={editando}
          fechar={() => setEditando(undefined)}
        />
      )}
    </div>
  );
}
