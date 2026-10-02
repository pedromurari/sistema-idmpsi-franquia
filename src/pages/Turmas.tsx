import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RequerUnidade } from "@/components/RequerUnidade";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useTurmas } from "@/hooks/useFinanceiro";
import { supabase } from "@/integrations/supabase/client";
import { formatData, type Turma } from "@/lib/financeiro";
import {
  Campo,
  ErroCarregamento,
  cabecalhoTabela,
  selectClass,
} from "@/components/financeiro/Shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Turmas() {
  const { user } = useAuth();
  const { franquiaEfetiva } = useViewAs();
  if (!franquiaEfetiva) return <RequerUnidade />;
  return (
    <TurmasUnidade
      key={`${user?.id}:${franquiaEfetiva}`}
      franquiaId={franquiaEfetiva}
    />
  );
}

function TurmasUnidade({ franquiaId }: { franquiaId: string }) {
  const { user } = useAuth();
  const query = useTurmas(franquiaId);
  const [editando, setEditando] = useState<Turma | null | undefined>();
  if (query.isPending)
    return (
      <Loader2
        aria-label="Carregando turmas"
        className="h-6 w-6 animate-spin mx-auto"
      />
    );
  if (query.isError)
    return <ErroCarregamento retry={() => void query.refetch()} />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Turmas</h1>
          <p className="text-sm text-muted-foreground">
            Organize os cursos e acompanhe o financeiro de cada turma.
          </p>
        </div>
        {user?.role === "franqueador" && (
          <Button onClick={() => setEditando(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova turma
          </Button>
        )}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow className={cabecalhoTabela}>
              <TableHead>Turma / curso</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!query.data.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  Nenhuma turma cadastrada nesta unidade.
                </TableCell>
              </TableRow>
            )}
            {query.data.map((turma) => (
              <TableRow key={turma.id}>
                <TableCell>
                  <p className="font-semibold">{turma.nome}</p>
                  <p className="text-sm text-muted-foreground">{turma.curso}</p>
                </TableCell>
                <TableCell>
                  {formatData(turma.data_inicio)} a {formatData(turma.data_fim)}
                </TableCell>
                <TableCell>{turma.capacidade ?? "Não definida"}</TableCell>
                <TableCell>
                  <Badge variant={turma.ativo ? "default" : "outline"}>
                    {turma.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user?.role === "franqueador" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar turma ${turma.nome}`}
                      onClick={() => setEditando(turma)}
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
      <p className="text-xs text-muted-foreground">
        Capacidade é o limite planejado. Ocupação e vagas disponíveis serão
        calculadas quando houver matrículas.
      </p>
      {editando !== undefined && (
        <TurmaDialog
          franquiaId={franquiaId}
          turma={editando}
          fechar={() => setEditando(undefined)}
        />
      )}
    </div>
  );
}

function TurmaDialog({
  franquiaId,
  turma,
  fechar,
}: {
  franquiaId: string;
  turma: Turma | null;
  fechar: () => void;
}) {
  const client = useQueryClient();
  const [nome, setNome] = useState(turma?.nome ?? "");
  const [curso, setCurso] = useState(turma?.curso ?? "");
  const [inicio, setInicio] = useState(turma?.data_inicio ?? "");
  const [fim, setFim] = useState(turma?.data_fim ?? "");
  const [capacidade, setCapacidade] = useState(
    turma?.capacidade?.toString() ?? "",
  );
  const [ativo, setAtivo] = useState(turma?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    setErro("");
    if (!nome.trim() || !curso.trim()) {
      setErro("Preencha o nome e o curso.");
      return;
    }
    if (fim && (!inicio || fim < inicio)) {
      setErro("O término precisa ser igual ou posterior ao início.");
      return;
    }
    if (
      capacidade &&
      (!Number.isInteger(Number(capacidade)) ||
        Number(capacidade) < 1 ||
        Number(capacidade) > 10000)
    ) {
      setErro("Capacidade deve ser um inteiro entre 1 e 10000.");
      return;
    }
    setSalvando(true);
    try {
      const valores = {
        nome: nome.trim(),
        curso: curso.trim(),
        data_inicio: inicio || null,
        data_fim: fim || null,
        capacidade: capacidade ? Number(capacidade) : null,
        ativo,
      };
      const resultado = turma
        ? await supabase
            .from("franquia_turmas")
            .update(valores)
            .eq("id", turma.id)
            .eq("franquia_id", franquiaId)
            .eq("updated_at", turma.updated_at)
            .select("id")
            .single()
        : await supabase
            .from("franquia_turmas")
            .insert({ ...valores, franquia_id: franquiaId })
            .select("id")
            .single();
      if (resultado.error) throw resultado.error;
      await client.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma salva.");
      fechar();
    } catch (error) {
      const codigo = (error as { code?: string }).code;
      setErro(
        codigo === "23505"
          ? "Já existe uma turma com esse nome nesta unidade."
          : codigo === "PGRST116"
            ? "A turma mudou ou o acesso foi revogado. Feche e recarregue antes de editar."
            : "Não foi possível salvar a turma. Tente novamente.",
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
          <DialogTitle>{turma ? "Editar turma" : "Nova turma"}</DialogTitle>
          <DialogDescription>
            Dados da turma na unidade selecionada. Inativar preserva o
            histórico.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <fieldset disabled={salvando} className="space-y-4">
            <Campo id="turma-nome" label="Nome da turma">
              <Input
                id="turma-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
                required
              />
            </Campo>
            <Campo id="turma-curso" label="Curso">
              <Input
                id="turma-curso"
                value={curso}
                onChange={(e) => setCurso(e.target.value)}
                maxLength={160}
                required
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="turma-inicio" label="Início">
                <Input
                  id="turma-inicio"
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </Campo>
              <Campo id="turma-fim" label="Término">
                <Input
                  id="turma-fim"
                  type="date"
                  min={inicio || undefined}
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                />
              </Campo>
            </div>
            <Campo id="turma-capacidade" label="Capacidade (opcional)">
              <Input
                id="turma-capacidade"
                type="number"
                min={1}
                max={10000}
                step={1}
                value={capacidade}
                onChange={(e) => setCapacidade(e.target.value)}
              />
            </Campo>
            <Campo id="turma-status" label="Status">
              <select
                id="turma-status"
                className={selectClass}
                value={ativo ? "ativa" : "inativa"}
                onChange={(e) => setAtivo(e.target.value === "ativa")}
              >
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
            </Campo>
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
                {salvando ? "Salvando…" : "Salvar turma"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
