import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  statusAbertos,
  statusRotulo,
  sugestoesEmMarkdown,
  tipos,
  type StatusSugestao,
  type Sugestao,
} from "@/lib/sugestoes";
import { Campo, ErroCarregamento, selectClass } from "@/components/financeiro/Shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

export default function Sugestoes() {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState("abertas");
  const [area, setArea] = useState("todas");

  // Chave com o usuário: nenhuma lista de uma sessão aparece na seguinte.
  const query = useQuery({
    queryKey: ["sugestoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franquia_sugestoes")
        .select("id, autor_nome, rota, area, tipo, texto, status, resposta, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Sugestao[];
    },
  });

  const areas = useMemo(
    () => [...new Set((query.data ?? []).map((item) => item.area))].sort(),
    [query.data],
  );
  const visiveis = useMemo(
    () =>
      (query.data ?? []).filter(
        (item) =>
          (filtro === "todas"
            ? true
            : filtro === "abertas"
              ? statusAbertos.includes(item.status)
              : item.status === filtro) && (area === "todas" || item.area === area),
      ),
    [query.data, filtro, area],
  );

  async function copiar() {
    const pendentes = (query.data ?? []).filter((item) => statusAbertos.includes(item.status));
    try {
      await navigator.clipboard.writeText(sugestoesEmMarkdown(pendentes));
      toast.success(`${pendentes.length} sugestão(ões) pendente(s) copiada(s).`);
    } catch {
      toast.error("O navegador bloqueou a cópia. Tente de novo.");
    }
  }

  if (query.isPending)
    return <Loader2 aria-label="Carregando sugestões" className="h-6 w-6 animate-spin mx-auto" />;
  if (query.isError) return <ErroCarregamento retry={() => void query.refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sugestões da equipe</h1>
          <p className="text-sm text-muted-foreground">
            O que a equipe anotou em cada tela. Atualize o status conforme for tratando.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void copiar()}>
          <ClipboardCopy className="h-4 w-4" /> Copiar pendentes (Markdown)
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
        <Campo id="filtro-status" label="Status">
          <select id="filtro-status" className={selectClass} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="abertas">Pendentes (novo, em análise, em andamento)</option>
            <option value="todas">Todas</option>
            {Object.entries(statusRotulo).map(([valor, nome]) => (
              <option key={valor} value={valor}>{nome}</option>
            ))}
          </select>
        </Campo>
        <Campo id="filtro-area" label="Tela">
          <select id="filtro-area" className={selectClass} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="todas">Todas as telas</option>
            {areas.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </Campo>
      </div>

      {visiveis.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma sugestão neste filtro. O botão amarelo “Sugestão” aparece no canto de cada tela.
        </Card>
      ) : (
        <div className="space-y-3">
          {visiveis.map((item) => (
            <CartaoSugestao key={`${item.id}:${item.status}:${item.resposta ?? ""}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoSugestao({ item }: { item: Sugestao }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<StatusSugestao>(item.status);
  const [resposta, setResposta] = useState(item.resposta ?? "");
  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("franquia_sugestoes")
        .update({ status, resposta: resposta.trim() || null })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sugestão atualizada.");
      void client.invalidateQueries({ queryKey: ["sugestoes"] });
    },
    onError: () => toast.error("Não foi possível atualizar. Tente novamente."),
  });
  const alterado = status !== item.status || resposta.trim() !== (item.resposta ?? "");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge>{item.area}</Badge>
        <Badge variant="outline">{tipos[item.tipo]}</Badge>
        <span className="text-muted-foreground">
          {item.autor_nome} · {dataHora(item.created_at)}
        </span>
      </div>
      <p className="whitespace-pre-wrap">{item.texto}</p>
      <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto] items-end">
        <Campo id={`status-${item.id}`} label="Status">
          <select
            id={`status-${item.id}`}
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusSugestao)}
          >
            {Object.entries(statusRotulo).map(([valor, nome]) => (
              <option key={valor} value={valor}>{nome}</option>
            ))}
          </select>
        </Campo>
        <Campo id={`resposta-${item.id}`} label="Resposta / observação">
          <Input
            id={`resposta-${item.id}`}
            value={resposta}
            maxLength={2000}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Ex.: entra na fase E do comercial"
          />
        </Campo>
        <Button disabled={!alterado || salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </Card>
  );
}
