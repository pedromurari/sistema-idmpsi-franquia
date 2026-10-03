import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, LayoutGrid, ListFilter, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { todasPaginas } from "@/lib/financeiro";
import { SOCIAL_STATUS, SOCIAL_TIPOS } from "@/lib/social";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErroCarregamento } from "@/components/financeiro/Shared";

type Post = Database["public"]["Tables"]["franquia_social_posts"]["Row"];
type Escopo = "franqueadora" | "unidade";
type Formulario = Pick<Post, "titulo" | "legenda" | "tipo" | "status" | "data_publicacao" | "media_url" | "observacoes">;
const hojeLocal = () => { const agora = new Date(); return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`; };
const vazio = (data?: string): Formulario => ({ titulo: "", legenda: "", tipo: "reel", status: "planejado",
  data_publicacao: data || hojeLocal(), media_url: null, observacoes: "" });
const dataBR = (valor: string | null) => valor ? `${valor.slice(8, 10)}/${valor.slice(5, 7)}/${valor.slice(0, 4)}` : "Sem data";
const classeCampo = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function SocialMidia({ escopo }: { escopo: Escopo }) {
  const { user } = useAuth();
  const { unidades, viewAsId } = useViewAs();
  const cache = useQueryClient();
  const admin = user?.role === "franqueador";
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string | null>(null);
  const unidadeId = escopo === "unidade" ? (admin ? unidadeSelecionada || viewAsId || unidades[0]?.id : user?.franquiaId) : null;
  const [visualizacao, setVisualizacao] = useState<"grade" | "calendario" | "kanban">("grade");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editando, setEditando] = useState<Post | null | undefined>();
  const [form, setForm] = useState<Formulario>(() => vazio());
  const [salvando, setSalvando] = useState(false);
  const chave = ["social-midia", escopo, unidadeId];
  const consulta = useQuery({ queryKey: chave, enabled: !!user && (escopo === "franqueadora" ? admin : !!unidadeId),
    queryFn: ({ signal }) => todasPaginas<Post>((de, ate) => {
      let query = supabase.from("franquia_social_posts").select("*").eq("escopo", escopo);
      query = escopo === "franqueadora" ? query.is("franquia_id", null) : query.eq("franquia_id", unidadeId!);
      return query.order("data_publicacao", { ascending: true, nullsFirst: false }).order("id")
        .range(de, ate).abortSignal(signal);
    }) });
  const posts = consulta.data ?? [];
  const filtrados = posts.filter((post) => (statusFiltro === "todos" || post.status === statusFiltro) &&
    `${post.titulo} ${post.legenda} ${post.observacoes}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));

  function abrir(post?: Post, data?: string) {
    setEditando(post ?? null);
    setForm(post ? { titulo: post.titulo, legenda: post.legenda, tipo: post.tipo, status: post.status,
      data_publicacao: post.data_publicacao, media_url: post.media_url, observacoes: post.observacoes } : vazio(data));
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!user || (escopo === "unidade" && !unidadeId) || salvando) return;
    if (["agendado", "publicado"].includes(form.status) && (!form.media_url || !form.legenda.trim() || !form.data_publicacao)) {
      toast.error("Para programar ou publicar, informe data, legenda e link do conteúdo."); return;
    }
    setSalvando(true);
    const valores = { ...form, titulo: form.titulo.trim(), legenda: form.legenda.trim(),
      observacoes: form.observacoes.trim(), media_url: form.media_url?.trim() || null,
      data_publicacao: form.data_publicacao || null };
    const resultado = editando
      ? await supabase.from("franquia_social_posts").update(valores).eq("id", editando.id)
          .eq("updated_at", editando.updated_at).select("id")
      : await supabase.from("franquia_social_posts").insert({ ...valores, escopo,
          franquia_id: escopo === "unidade" ? unidadeId : null, criado_por: user.id }).select("id");
    setSalvando(false);
    if (resultado.error || !resultado.data?.length) {
      toast.error("Não foi possível salvar. Recarregue a página e tente novamente."); return;
    }
    setEditando(undefined);
    await cache.invalidateQueries({ queryKey: ["social-midia"] });
    toast.success(editando ? "Conteúdo atualizado." : "Conteúdo criado.");
  }

  async function mudarStatus(post: Post, status: string) {
    if (["agendado", "publicado"].includes(status) && (!post.media_url || !post.legenda.trim() || !post.data_publicacao)) {
      toast.error("Adicione o link do conteúdo e a legenda antes de programar."); return;
    }
    const { data, error } = await supabase.from("franquia_social_posts").update({ status })
      .eq("id", post.id).eq("updated_at", post.updated_at).select("id");
    if (error || !data?.length) { toast.error("Não foi possível mover o conteúdo. Atualize a página."); return; }
    await cache.invalidateQueries({ queryKey: ["social-midia"] });
  }

  async function excluir(post: Post) {
    if (!window.confirm(`Excluir “${post.titulo}” do planejamento?`)) return;
    const { error } = await supabase.from("franquia_social_posts").delete().eq("id", post.id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    setEditando(undefined);
    await cache.invalidateQueries({ queryKey: ["social-midia"] });
    toast.success("Conteúdo excluído.");
  }

  const dias = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(primeiro); inicio.setDate(1 - primeiro.getDay());
    return Array.from({ length: 42 }, (_, indice) => {
      const dia = new Date(inicio); dia.setDate(inicio.getDate() + indice);
      return { chave: `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`,
        numero: dia.getDate(), atual: dia.getMonth() === mes.getMonth() };
    });
  }, [mes]);

  if (escopo === "franqueadora" && !admin) return null;
  if (escopo === "unidade" && !unidadeId) return <Card className="p-6 text-sm text-muted-foreground">
    Nenhuma unidade disponível para planejar conteúdos. Cadastre uma unidade primeiro.
  </Card>;
  const conteudo = (post: Post) => <Card key={post.id} className="p-3 space-y-2 hover:border-primary/40">
    <button className="w-full text-left" onClick={() => abrir(post)}>
      <p className="font-semibold text-sm line-clamp-2">{post.titulo}</p>
      <p className="text-xs text-muted-foreground mt-1">{dataBR(post.data_publicacao)} · {SOCIAL_TIPOS.find((tipo) => tipo.id === post.tipo)?.label}</p>
    </button>
    <div className="flex items-center gap-2">
      <select aria-label={`Status de ${post.titulo}`} value={post.status} onChange={(e) => void mudarStatus(post, e.target.value)}
        className="min-w-0 flex-1 rounded border bg-background p-1 text-xs">
        {SOCIAL_STATUS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      {post.media_url && <a href={post.media_url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir mídia de ${post.titulo}`}><ExternalLink className="h-4 w-4 text-primary" /></a>}
    </div>
    {!post.media_url && <p className="text-xs text-amber-700">Arquivo/link pendente</p>}
  </Card>;

  return <div className="mx-auto max-w-[1600px] space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h1 className="text-2xl font-bold">Social mídia · {escopo === "franqueadora" ? "Franqueadora" : "Unidade"}</h1>
      <p className="text-sm text-muted-foreground">Planeje conteúdos, acompanhe a produção e organize a publicação.</p>
    </div><Button onClick={() => abrir()} disabled={escopo === "unidade" && !unidadeId}><Plus className="mr-2 h-4 w-4" /> Novo conteúdo</Button></div>

    {escopo === "unidade" && admin && <div className="max-w-sm"><Label htmlFor="social-unidade">Unidade</Label>
      <select id="social-unidade" className={classeCampo} value={unidadeId ?? ""} onChange={(e) => setUnidadeSelecionada(e.target.value)}>
        {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
      </select></div>}
    <Card className="p-4 border-primary/20 bg-primary/5"><p className="font-semibold">Calendário editorial</p>
      <p className="text-sm text-muted-foreground">“Programado” registra a data no planejamento. A publicação na rede social continua manual até conectar uma conta da plataforma.</p></Card>

    <div className="flex flex-wrap gap-2 items-center"><div className="relative flex-1 min-w-48 max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input aria-label="Buscar conteúdos" className="pl-9" placeholder="Buscar conteúdo..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
      <select aria-label="Filtrar status" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
        <option value="todos">Todos os status</option>{SOCIAL_STATUS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <div className="flex rounded-md border p-1 gap-1">{(["grade", "calendario", "kanban"] as const).map((modo) => <Button key={modo} size="sm" variant={visualizacao === modo ? "default" : "ghost"} onClick={() => setVisualizacao(modo)}>
        {modo === "grade" ? <LayoutGrid className="mr-1 h-4 w-4" /> : modo === "calendario" ? <CalendarDays className="mr-1 h-4 w-4" /> : <ListFilter className="mr-1 h-4 w-4" />}{modo === "calendario" ? "Calendário" : modo === "kanban" ? "Kanban" : "Grade"}</Button>)}</div>
    </div>
    {consulta.isPending && <Loader2 aria-label="Carregando social mídia" className="mx-auto h-6 w-6 animate-spin" />}
    {consulta.isError && <ErroCarregamento retry={() => void consulta.refetch()} />}
    {consulta.isSuccess && <>
      <p className="text-xs text-muted-foreground">{filtrados.length} conteúdo(s) · {filtrados.filter((p) => p.status === "publicado").length} publicado(s)</p>
      {visualizacao === "grade" && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtrados.map(conteudo)}</div>}
      {visualizacao === "kanban" && <div className="flex gap-3 overflow-x-auto pb-3">{SOCIAL_STATUS.map((fase) => <section key={fase.id} className="w-64 shrink-0 rounded-lg border bg-muted/30" aria-label={fase.label}>
        <h2 className={`${fase.cor} rounded-t-lg px-3 py-2 text-sm font-semibold text-white flex justify-between`}>{fase.label}<span>{filtrados.filter((p) => p.status === fase.id).length}</span></h2>
        <div className="p-2 space-y-2">{filtrados.filter((p) => p.status === fase.id).map(conteudo)}</div></section>)}</div>}
      {visualizacao === "calendario" && <Card className="overflow-hidden"><div className="flex items-center justify-between p-3 border-b">
        <Button size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="font-semibold capitalize">{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(mes)}</h2>
        <Button size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
        <div className="grid grid-cols-7 text-center text-xs font-semibold bg-muted/50">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => <div key={dia} className="p-2">{dia}</div>)}</div>
        <div className="grid grid-cols-7">{dias.map((dia) => <div key={dia.chave} className={`min-h-24 border-t border-r p-1 ${dia.atual ? "" : "bg-muted/30 text-muted-foreground"}`}>
          <button className="text-xs font-medium rounded px-1 hover:bg-primary/10" onClick={() => abrir(undefined, dia.chave)} title={`Novo conteúdo em ${dataBR(dia.chave)}`}>{dia.numero}</button>
          <div className="mt-1 space-y-1">{filtrados.filter((post) => post.data_publicacao === dia.chave).map((post) => <button key={post.id} onClick={() => abrir(post)}
            className="block w-full truncate rounded bg-primary/10 px-1 text-left text-[10px] text-primary" title={post.titulo}>{post.titulo}</button>)}</div>
        </div>)}</div></Card>}
      {filtrados.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">Nenhum conteúdo encontrado. Crie o primeiro pelo botão acima.</Card>}
    </>}

    <Dialog open={editando !== undefined} onOpenChange={(aberto) => { if (!aberto) setEditando(undefined); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editando ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle>
        <DialogDescription>Organize o conteúdo para a {escopo === "franqueadora" ? "franqueadora" : "unidade selecionada"}.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => void salvar(e)} className="space-y-3"><div><Label htmlFor="social-titulo">Título *</Label><Input id="social-titulo" required maxLength={160} minLength={2} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="social-data">Data planejada</Label><Input id="social-data" type="date" value={form.data_publicacao ?? ""} onChange={(e) => setForm({ ...form, data_publicacao: e.target.value || null })} /></div>
            <div><Label htmlFor="social-tipo">Tipo</Label><select id="social-tipo" className={classeCampo} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{SOCIAL_TIPOS.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.label}</option>)}</select></div></div>
          <div><Label htmlFor="social-status">Status</Label><select id="social-status" className={classeCampo} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{SOCIAL_STATUS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
          <div><Label htmlFor="social-midia-url">Link do vídeo ou arte</Label><Input id="social-midia-url" type="url" placeholder="https://drive.google.com/..." maxLength={2000} value={form.media_url ?? ""} onChange={(e) => setForm({ ...form, media_url: e.target.value })} /></div>
          <div><Label htmlFor="social-legenda">Legenda</Label><textarea id="social-legenda" className={`${classeCampo} min-h-24`} maxLength={5000} value={form.legenda} onChange={(e) => setForm({ ...form, legenda: e.target.value })} /></div>
          <div><Label htmlFor="social-observacoes">Observações internas</Label><textarea id="social-observacoes" className={`${classeCampo} min-h-20`} maxLength={5000} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-between gap-2 pt-2">{editando ? <Button type="button" variant="destructive" onClick={() => void excluir(editando)}><Trash2 className="mr-1 h-4 w-4" /> Excluir</Button> : <span />}
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setEditando(undefined)}>Cancelar</Button><Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button></div></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
