import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequerUnidade } from "@/components/RequerUnidade";
import { Campo, ErroCarregamento, selectClass } from "@/components/financeiro/Shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useTarefas, type Tarefa } from "@/hooks/useTarefas";
import { supabase } from "@/integrations/supabase/client";
import { formatData, hoje } from "@/lib/financeiro";

const colunas = [["pendente", "Pendente"], ["em_andamento", "Em andamento"], ["concluida", "Concluída"]] as const;
const prioridadeRotulo: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const prioridadeVariant: Record<string, "default" | "outline" | "destructive"> = { baixa: "outline", media: "default", alta: "destructive" };

export default function Tarefas() {
  const { user } = useAuth();
  const { franquiaEfetiva } = useViewAs();
  if (!franquiaEfetiva) return <RequerUnidade />;
  return <TarefasUnidade key={`${user?.id}:${franquiaEfetiva}`} franquiaId={franquiaEfetiva} />;
}

function TarefasUnidade({ franquiaId }: { franquiaId: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const souVendedor = user?.role === "vendedor";
  const query = useTarefas(franquiaId);
  const [somenteMinhas, setSomenteMinhas] = useState(souVendedor);
  const [editando, setEditando] = useState<Tarefa | null | undefined>();
  if (query.isPending) return <Loader2 aria-label="Carregando tarefas" className="h-6 w-6 animate-spin mx-auto" />;
  if (query.isError) return <ErroCarregamento retry={() => void query.refetch()} />;

  const { tarefas, vendedores } = query.data;
  const lista = tarefas.filter((t) => !somenteMinhas || t.responsavel_id === user?.id);

  function nomeResponsavel(id: string | null) {
    if (!id) return "Sem responsável";
    if (id === user?.id) return "Você";
    return vendedores.find((v) => v.id === id)?.nome ?? "Atribuído";
  }

  async function mudarStatus(tarefa: Tarefa, status: string) {
    const resultado = await supabase.from("franquia_tarefas").update({ status })
      .eq("id", tarefa.id).eq("franquia_id", franquiaId).eq("updated_at", tarefa.updated_at).select("id");
    if (resultado.error) return toast.error(resultado.error.message);
    if (!resultado.data?.length) return toast.error("A tarefa mudou desde a última atualização. Recarregue a página.");
    await client.invalidateQueries({ queryKey: ["tarefas"] });
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold">Operacional</h1>
        <p className="text-sm text-muted-foreground">Tarefas da secretaria e da equipe da unidade.</p></div>
      {user?.role !== "vendedor" && <Button onClick={() => setEditando(null)} className="gap-2"><Plus className="h-4 w-4" /> Nova tarefa</Button>}
    </div>
    <div className="flex gap-2">
      {souVendedor && <Button size="sm" variant={somenteMinhas ? "default" : "outline"} onClick={() => setSomenteMinhas(!somenteMinhas)}>
        Minhas tarefas · {tarefas.filter((t) => t.responsavel_id === user?.id).length}</Button>}
    </div>
    <div className="flex gap-3 overflow-x-auto pb-3" aria-label="Kanban de tarefas">
      {colunas.map(([valor, titulo]) => {
        const itens = lista.filter((t) => t.status === valor);
        return <section key={valor} className="w-72 min-w-72 rounded-lg border bg-muted/30 p-3 space-y-3" aria-label={titulo}>
          <h2 className="font-semibold flex justify-between"><span>{titulo}</span><span className="text-muted-foreground">{itens.length}</span></h2>
          {itens.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhuma tarefa</p>}
          {itens.map((tarefa) => {
            const podeMexer = user?.role !== "vendedor" || tarefa.responsavel_id === user?.id;
            return <Card key={tarefa.id} className="p-3 space-y-2">
              <div className="flex justify-between gap-2"><strong className="text-sm break-words">{tarefa.titulo}</strong>
                {user?.role !== "vendedor" && <Button variant="ghost" size="icon" aria-label={`Editar ${tarefa.titulo}`} onClick={() => setEditando(tarefa)}><Pencil className="h-4 w-4" /></Button>}</div>
              {tarefa.descricao && <p className="text-xs text-muted-foreground break-words">{tarefa.descricao}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={prioridadeVariant[tarefa.prioridade]}>{prioridadeRotulo[tarefa.prioridade]}</Badge>
                {tarefa.prazo && <span className={`text-xs ${tarefa.prazo < hoje() && tarefa.status !== "concluida" ? "text-destructive" : "text-muted-foreground"}`}>Prazo: {formatData(tarefa.prazo)}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{nomeResponsavel(tarefa.responsavel_id)}</p>
              {podeMexer && <div className="flex gap-2">
                {valor !== "pendente" && <Button size="sm" variant="outline" className="flex-1" onClick={() => void mudarStatus(tarefa, colunas[colunas.findIndex(([v]) => v === valor) - 1][0])}>← Voltar</Button>}
                {valor !== "concluida" && <Button size="sm" className="flex-1" onClick={() => void mudarStatus(tarefa, colunas[colunas.findIndex(([v]) => v === valor) + 1][0])}>Avançar →</Button>}
              </div>}
            </Card>;
          })}
        </section>;
      })}
    </div>
    {editando !== undefined && <TarefaDialog franquiaId={franquiaId} tarefa={editando} vendedores={vendedores} fechar={() => setEditando(undefined)} />}
  </div>;
}

function TarefaDialog({ franquiaId, tarefa, vendedores, fechar }:
  { franquiaId: string; tarefa: Tarefa | null; vendedores: { id: string; nome: string }[]; fechar: () => void }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  const [responsavelId, setResponsavelId] = useState(tarefa?.responsavel_id ?? "");
  const [prioridade, setPrioridade] = useState(tarefa?.prioridade ?? "media");
  const [prazo, setPrazo] = useState(tarefa?.prazo ?? "");
  const [status, setStatus] = useState(tarefa?.status ?? "pendente");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    setErro("");
    const tituloLimpo = titulo.trim();
    if (tituloLimpo.length < 2) return setErro("Informe um título.");
    setSalvando(true);
    const valores = {
      titulo: tituloLimpo, descricao: descricao.trim() || null, responsavel_id: responsavelId || null,
      prioridade, prazo: prazo || null, status,
    };
    const resultado = tarefa
      ? await supabase.from("franquia_tarefas").update(valores).eq("id", tarefa.id)
          .eq("franquia_id", franquiaId).eq("updated_at", tarefa.updated_at).select("id")
      : await supabase.from("franquia_tarefas").insert({ ...valores, franquia_id: franquiaId }).select("id");
    setSalvando(false);
    if (resultado.error) { setErro(resultado.error.message); return; }
    if (!resultado.data?.length) return setErro("Esta tarefa mudou desde que você abriu o formulário. Feche e abra novamente.");
    await client.invalidateQueries({ queryKey: ["tarefas"] });
    toast.success(tarefa ? "Tarefa atualizada." : "Tarefa criada.");
    fechar();
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) fechar(); }}><DialogContent>
    <DialogHeader><DialogTitle>{tarefa ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
      <DialogDescription>Tarefas da operação desta unidade.</DialogDescription></DialogHeader>
    <form onSubmit={(e) => void salvar(e)} className="space-y-4"><fieldset disabled={salvando} className="space-y-4">
      <Campo id="tarefa-titulo" label="Título *"><Input id="tarefa-titulo" value={titulo} maxLength={160} onChange={(e) => setTitulo(e.target.value)} required /></Campo>
      <Campo id="tarefa-descricao" label="Descrição"><textarea id="tarefa-descricao" className={`${selectClass} min-h-20`} value={descricao} maxLength={2000} onChange={(e) => setDescricao(e.target.value)} /></Campo>
      <div className="grid sm:grid-cols-2 gap-4">
        <Campo id="tarefa-responsavel" label="Responsável"><select id="tarefa-responsavel" className={selectClass} value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
          <option value="">Sem responsável definido</option>
          {user && <option value={user.id}>Eu mesmo ({user.nome})</option>}
          {vendedores.filter((v) => v.id !== user?.id).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
        </select></Campo>
        <Campo id="tarefa-prioridade" label="Prioridade"><select id="tarefa-prioridade" className={selectClass} value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
          {Object.entries(prioridadeRotulo).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select></Campo>
        <Campo id="tarefa-prazo" label="Prazo"><Input id="tarefa-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></Campo>
        <Campo id="tarefa-status" label="Status"><select id="tarefa-status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          {colunas.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select></Campo>
      </div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button type="submit">{salvando ? "Salvando…" : "Salvar tarefa"}</Button></div>
    </fieldset></form>
  </DialogContent></Dialog>;
}
